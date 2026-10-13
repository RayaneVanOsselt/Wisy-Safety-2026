<?php
/**
 * Lecture, écriture et recherche des certificats.
 *
 * RECHERCHE : aucune requête « LIKE », aucun parcours de la base. Chaque certificat publié porte une
 * ou plusieurs empreintes HMAC-SHA256( clé secrète, nom normalisé | date de naissance ) dans la
 * métadonnée _wisy_cert_lookup. Une vérification calcule l'empreinte de la saisie et cherche une
 * égalité EXACTE (requête préparée par WP_Query). Sans la clé, l'index ne permet de retrouver ni
 * les noms ni les dates de naissance.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Repository {

	const INDEX_FP_OPTION = 'wisy_cert_index_fp';

	/** Nombre maximal de certificats renvoyés pour une même personne. */
	const MAX_RESULTS = 20;

	/**
	 * Certificat sous forme de tableau normalisé (toutes les clés de Wisy_Cert_Schema::fields()).
	 */
	public static function get( $post_id ) {
		$rec = array( 'id' => (int) $post_id );
		foreach ( Wisy_Cert_Schema::fields() as $field => $def ) {
			$v = get_post_meta( $post_id, Wisy_Cert_Schema::meta_key( $field ), true );
			if ( 'bool' === $def['type'] ) {
				$rec[ $field ] = ! empty( $v ) && '0' !== $v;
			} else {
				$rec[ $field ] = is_scalar( $v ) ? (string) $v : '';
			}
		}
		$post            = get_post( $post_id );
		$rec['status']   = $post ? $post->post_status : '';
		$rec['created']  = $post ? $post->post_date_gmt : '';
		$rec['modified'] = $post ? $post->post_modified_gmt : '';
		return $rec;
	}

	/**
	 * Écrit les champs fournis (les champs absents de $values ne sont pas touchés), puis reconstruit
	 * l'index de recherche du certificat. Les valeurs doivent déjà être validées.
	 */
	public static function save( $post_id, array $values ) {
		$fields = Wisy_Cert_Schema::fields();
		foreach ( $values as $field => $value ) {
			if ( ! isset( $fields[ $field ] ) ) {
				continue;
			}
			$key = Wisy_Cert_Schema::meta_key( $field );
			if ( 'bool' === $fields[ $field ]['type'] ) {
				if ( $value ) {
					update_post_meta( $post_id, $key, '1' );
				} else {
					delete_post_meta( $post_id, $key );
				}
				continue;
			}
			$value = (string) $value;
			if ( '' === $value ) {
				delete_post_meta( $post_id, $key );
			} else {
				update_post_meta( $post_id, $key, $value );
			}
		}
		self::reindex( $post_id );
	}

	/** Empreinte de recherche d'un couple (clé de nom, date ISO). */
	public static function lookup_hash( $name_key, $birth_iso ) {
		return hash_hmac( 'sha256', 'v1|' . $name_key . '|' . $birth_iso, Wisy_Cert_Secret::key( 'lookup' ) );
	}

	/** Toutes les empreintes d'un certificat (nom principal + autres noms), vide s'il n'est pas « trouvable ». */
	public static function lookup_hashes( array $rec ) {
		$birth = Wisy_Cert_Normalizer::parse_date( $rec['birth_date'], 'Y-m-d' );
		if ( ! $birth ) {
			return array();
		}
		$names = array_merge( array( $rec['last_name'] ), Wisy_Cert_Normalizer::split_names( $rec['other_last_names'] ) );
		$out   = array();
		foreach ( $names as $n ) {
			$k = Wisy_Cert_Normalizer::name_key( $n );
			if ( '' !== $k ) {
				$out[] = self::lookup_hash( $k, $birth );
			}
		}
		return array_values( array_unique( $out ) );
	}

	public static function reindex( $post_id ) {
		delete_post_meta( $post_id, Wisy_Cert_Schema::LOOKUP_META );
		foreach ( self::lookup_hashes( self::get( $post_id ) ) as $h ) {
			add_post_meta( $post_id, Wisy_Cert_Schema::LOOKUP_META, $h );
		}
		update_post_meta( $post_id, Wisy_Cert_Schema::LOOKUP_FP_META, Wisy_Cert_Secret::fingerprint() );
	}

	/** Reconstruit tout l'index (activation, changement de clé, bouton du tableau de bord). */
	public static function reindex_all() {
		$ids = self::all_ids();
		foreach ( $ids as $id ) {
			self::reindex( $id );
		}
		update_option( self::INDEX_FP_OPTION, Wisy_Cert_Secret::fingerprint(), false );
		return count( $ids );
	}

	/** L'index a-t-il été construit avec la clé actuelle ? Sinon, reconstruction (appelé dans l'admin). */
	public static function maybe_reindex() {
		if ( get_option( self::INDEX_FP_OPTION ) !== Wisy_Cert_Secret::fingerprint() ) {
			self::reindex_all();
		}
	}

	/** Identifiants de tous les certificats (hors corbeille). */
	public static function all_ids( $statuses = array( 'publish', 'draft', 'pending', 'private', 'future' ) ) {
		return array_map(
			'intval',
			get_posts(
				array(
					'post_type'        => Wisy_Cert_Schema::POST_TYPE,
					'post_status'      => $statuses,
					'posts_per_page'   => -1,
					'fields'           => 'ids',
					'no_found_rows'    => true,
					'orderby'          => 'ID',
					'order'            => 'ASC',
					'suppress_filters' => true,
				)
			)
		);
	}

	/**
	 * Recherche publique : certificats PUBLIÉS dont le nom ET la date de naissance correspondent exactement.
	 *
	 * @param string $last_name Nom saisi (nettoyé et validé).
	 * @param string $birth_iso AAAA-MM-JJ (validée).
	 * @return int[] Identifiants.
	 */
	public static function find( $last_name, $birth_iso ) {
		$key = Wisy_Cert_Normalizer::name_key( $last_name );
		if ( '' === $key || '' === $birth_iso ) {
			return array();
		}
		$hash = self::lookup_hash( $key, $birth_iso );
		$q    = new WP_Query(
			array(
				'post_type'              => Wisy_Cert_Schema::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => self::MAX_RESULTS,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'suppress_filters'       => true,
				'update_post_term_cache' => false,
				'ignore_sticky_posts'    => true,
				'orderby'                => 'ID',
				'order'                  => 'DESC',
				'meta_query'             => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- égalité exacte sur une clé indexée.
					array(
						'key'     => Wisy_Cert_Schema::LOOKUP_META,
						'value'   => $hash,
						'compare' => '=',
					),
				),
			)
		);
		$ids = array();
		foreach ( (array) $q->posts as $id ) {
			/* Double contrôle sur les données réelles : un index périmé ne peut jamais renvoyer le mauvais certificat. */
			$rec = self::get( (int) $id );
			foreach ( self::lookup_hashes( $rec ) as $h ) {
				if ( hash_equals( $h, $hash ) ) {
					$ids[] = (int) $id;
					break;
				}
			}
		}
		return $ids;
	}

	/** Autres certificats portant le même numéro de diplôme (contrôle des doublons). */
	public static function find_by_diploma( $diploma, $exclude_id = 0 ) {
		$diploma = trim( (string) $diploma );
		if ( '' === $diploma ) {
			return array();
		}
		return array_values(
			array_diff(
				array_map(
					'intval',
					get_posts(
						array(
							'post_type'        => Wisy_Cert_Schema::POST_TYPE,
							'post_status'      => array( 'publish', 'draft', 'pending', 'private', 'future' ),
							'posts_per_page'   => 10,
							'fields'           => 'ids',
							'no_found_rows'    => true,
							'suppress_filters' => true,
							'meta_query'       => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
								array(
									'key'     => Wisy_Cert_Schema::meta_key( 'diploma_number' ),
									'value'   => $diploma,
									'compare' => '=',
								),
							),
						)
					)
				),
				array( (int) $exclude_id )
			)
		);
	}

	/** Nom affiché : « Prénom NOM » tel qu'enregistré. */
	public static function display_name( array $rec ) {
		return trim( $rec['first_name'] . ' ' . $rec['last_name'] );
	}
}
