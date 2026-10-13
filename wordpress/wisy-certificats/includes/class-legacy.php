<?php
/**
 * Reprise des certificats déjà présents dans WordPress (ancien système : titre = nom complet,
 * métadonnées propres au thème ou à ACF, PDF dans la médiathèque).
 *
 * Les noms techniques des anciens champs ne sont PAS supposés : l'écran « Reprise » les DÉCOUVRE dans la
 * base (clés de métadonnées réellement utilisées par les certificats, avec leur taux de remplissage et
 * le format détecté), propose une correspondance que l'administrateur vérifie, puis :
 *
 *   - SIMULATION : rapport par certificat, rien n'est écrit ;
 *   - REPRISE    : écrit les champs de l'extension (« _wisy_cert_* ») sur LES MÊMES certificats. Les
 *                  anciennes métadonnées ne sont ni modifiées ni supprimées (elles restent la sauvegarde).
 *                  Un champ déjà rempli n'est pas écrasé (sauf option explicite). Relancer la reprise
 *                  ne crée rien en double ;
 *   - PDF        : copie des PDF de la médiathèque dans le coffre privé (empreinte SHA-256 contrôlée).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Legacy {

	const MAP_OPTION = 'wisy_cert_legacy_map';

	/** Source spéciale : le titre de l'article. */
	const TITLE = '@title';

	/** Source spéciale du PDF : pièces jointes rattachées au certificat. */
	const ATTACHED = '@attached';

	/** Façons de lire le titre quand il contient le nom complet. */
	const TITLE_MODES = array(
		'first_last'     => 'Prénom Nom (le 1er mot est le prénom)',
		'last_first'     => 'Nom Prénom (le dernier mot est le prénom)',
		'uppercase_last' => 'Le nom est écrit EN MAJUSCULES (ex. « DUPONT Jean »)',
	);

	/** Clés techniques à ne jamais proposer. */
	private static function ignored_key( $key ) {
		if ( in_array( $key, Wisy_Cert_Schema::managed_meta_keys(), true ) ) {
			return true;
		}
		$ignored = array( '_edit_lock', '_edit_last', '_wp_old_slug', '_wp_old_date', '_wp_page_template', '_wp_trash_meta_status', '_wp_trash_meta_time', '_wp_desired_post_slug', '_encloseme', '_pingme' );
		return in_array( $key, $ignored, true ) || 0 === strpos( $key, '_elementor' ) || 0 === strpos( $key, '_oembed' ) || 0 === strpos( $key, '_tenweb' ) || 0 === strpos( $key, Wisy_Cert_Schema::PREFIX );
	}

	/**
	 * Découverte des métadonnées utilisées par les certificats.
	 *
	 * @return array<string, array{count:int, kind:string, format:?string, recognised:int, total:int, samples:string[]}>
	 */
	public static function discover() {
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT pm.meta_key AS k, COUNT(DISTINCT pm.post_id) AS n FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type = %s AND p.post_status NOT IN ('trash','auto-draft') GROUP BY pm.meta_key ORDER BY n DESC, pm.meta_key ASC",
				Wisy_Cert_Schema::POST_TYPE
			),
			ARRAY_A
		);
		$out = array();
		foreach ( (array) $rows as $row ) {
			$key = (string) $row['k'];
			if ( self::ignored_key( $key ) ) {
				continue;
			}
			$values = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT pm.meta_value FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type = %s AND pm.meta_key = %s AND pm.meta_value <> '' LIMIT 50",
					Wisy_Cert_Schema::POST_TYPE,
					$key
				)
			);
			/* Référence de champ ACF (« _nom » → « field_abc123 ») : ce n'est pas une donnée. */
			if ( '_' === $key[0] && $values && count( array_filter( $values, static function ( $v ) {
				return 0 === strpos( (string) $v, 'field_' );
			} ) ) === count( $values ) ) {
				continue;
			}
			$out[ $key ] = array_merge( array( 'count' => (int) $row['n'] ), self::profile( $values ) );
		}
		return $out;
	}

	/** Nature probable d'une liste de valeurs (date, e-mail, téléphone, pièce jointe, texte). */
	public static function profile( array $values ) {
		$values = array_values( array_filter( array_map( 'strval', $values ), 'strlen' ) );
		$total  = count( $values );
		list( $fmt, $recognised ) = Wisy_Cert_Normalizer::detect_date_format( $values );
		$kind = 'text';
		if ( $total && $fmt && $recognised === $total ) {
			$kind = 'date';
		} elseif ( $total && count( array_filter( $values, 'is_email' ) ) === $total ) {
			$kind = 'email';
		} elseif ( $total && count( array_filter( $values, static function ( $v ) {
			return null !== Wisy_Cert_Normalizer::clean_phone( $v ) && '' !== Wisy_Cert_Normalizer::clean_phone( $v ) && ! preg_match( '/^\d{8}$/', $v );
		} ) ) === $total ) {
			$kind = 'phone';
		} elseif ( $total && count( array_filter( $values, static function ( $v ) {
			return ctype_digit( $v ) && 'attachment' === get_post_type( (int) $v );
		} ) ) === $total ) {
			$kind = 'attachment';
		} elseif ( $total && count( array_filter( $values, static function ( $v ) {
			return (bool) preg_match( '#^https?://\S+\.pdf$#i', $v );
		} ) ) === $total ) {
			$kind = 'attachment';
		}
		$samples = array();
		foreach ( array_slice( $values, 0, 3 ) as $v ) {
			$samples[] = 'date' === $kind ? self::mask_date_like( $v ) : Wisy_Cert_Normalizer::mask( $v );
		}
		return array( 'kind' => $kind, 'format' => 'date' === $kind ? $fmt : null, 'recognised' => (int) $recognised, 'total' => $total, 'samples' => $samples );
	}

	private static function mask_date_like( $v ) {
		return preg_replace( '/\d/', '•', substr( (string) $v, 0, 2 ) ) . preg_replace( '/\d/', '•', substr( (string) $v, 2 ) );
	}

	/** Correspondance proposée d'après les noms des clés (à VÉRIFIER par l'administrateur). */
	public static function guess( array $discovered ) {
		$rules = array(
			'last_name'      => '/(^|_)(nom|name|lastname|last_name|surname|nom_famille|nom_de_famille)$/i',
			'first_name'     => '/(prenom|firstname|first_name|given)/i',
			'birth_date'     => '/(naissance|birth|dob|ne_le)/i',
			'diploma_number' => '/(diplome|diploma|numero|number|num_cert|reference|ref)/i',
			'training'       => '/(^|_)(formation|training|cours|course)(_suivie)?$/i',
			'training_date'  => '/(date_formation|date_de_formation|training_date|date_session|date_examen)/i',
			'issue_date'     => '/(delivrance|issue|emission|date_obtention)/i',
			'expiry_date'    => '/(expir|validite|valid|echeance|fin_validite)/i',
			'employer_name'  => '/(entreprise|societe|employeur|company|employer)$/i',
			'employer_phone' => '/(tel|phone|gsm)/i',
			'employer_email' => '/(mail)/i',
		);
		$map = array();
		foreach ( $rules as $field => $re ) {
			foreach ( $discovered as $key => $info ) {
				$plain = ltrim( $key, '_' );
				if ( preg_match( $re, $plain ) && ! in_array( $key, $map, true ) ) {
					$map[ $field ] = $key;
					break;
				}
			}
		}
		if ( empty( $map['last_name'] ) ) {
			$map['last_name']  = self::TITLE;
			$map['title_mode'] = 'first_last';
		}
		$map['pdf'] = self::ATTACHED;
		foreach ( $discovered as $key => $info ) {
			if ( 'attachment' === $info['kind'] ) {
				$map['pdf'] = $key;
				break;
			}
		}
		return $map;
	}

	public static function saved_map() {
		$m = get_option( self::MAP_OPTION );
		return is_array( $m ) ? $m : array();
	}

	public static function save_map( array $map ) {
		update_option( self::MAP_OPTION, $map, false );
	}

	/** Découpe le titre (nom complet) selon le mode choisi. Renvoie [nom, prénom, ambigu]. */
	public static function split_title( $title, $mode ) {
		$title = Wisy_Cert_Normalizer::clean_name( wp_strip_all_tags( html_entity_decode( (string) $title, ENT_QUOTES, 'UTF-8' ) ) );
		$words = '' === $title ? array() : explode( ' ', $title );
		$n     = count( $words );
		if ( 0 === $n ) {
			return array( '', '', false );
		}
		if ( 1 === $n ) {
			return array( $words[0], '', true );
		}
		if ( 'uppercase_last' === $mode ) {
			$upper = array();
			$other = array();
			foreach ( $words as $w ) {
				$is_upper = ( function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $w, 'UTF-8' ) : strtoupper( $w ) ) === $w && preg_match( '/\p{L}{2}/u', $w );
				if ( $is_upper ) {
					$upper[] = $w;
				} else {
					$other[] = $w;
				}
			}
			if ( $upper && $other ) {
				return array( implode( ' ', $upper ), implode( ' ', $other ), false );
			}
			return array( implode( ' ', array_slice( $words, 1 ) ), $words[0], true );
		}
		if ( 'last_first' === $mode ) {
			return array( implode( ' ', array_slice( $words, 0, $n - 1 ) ), $words[ $n - 1 ], $n > 2 );
		}
		return array( implode( ' ', array_slice( $words, 1 ) ), $words[0], $n > 2 );
	}

	/**
	 * Simulation ou reprise.
	 *
	 * @param array $map     champ => clé source (ou @title), + title_mode, + date formats (fmt_<champ>), + pdf.
	 * @param array $options dry_run, overwrite, copy_pdf.
	 */
	public static function run( array $map, array $options ) {
		$options = array_merge( array( 'dry_run' => true, 'overwrite' => false, 'copy_pdf' => true ), $options );
		$fields  = Wisy_Cert_Schema::fields();
		$summary = array( 'total' => 0, 'updated' => 0, 'unchanged' => 0, 'errors' => 0, 'warnings' => 0, 'not_searchable' => 0, 'pdf_copied' => 0, 'pdf_missing' => 0 );
		$rows    = array();
		$diplomas = array();

		foreach ( Wisy_Cert_Repository::all_ids() as $id ) {
			++$summary['total'];
			$post    = get_post( $id );
			$current = Wisy_Cert_Repository::get( $id );
			$row     = array( 'id' => $id, 'title' => $post ? $post->post_title : '', 'status' => $post ? $post->post_status : '', 'action' => 'unchanged', 'messages' => array(), 'pdf' => '' );
			$values  = array();

			foreach ( $fields as $field => $def ) {
				if ( empty( $map[ $field ] ) ) {
					continue;
				}
				$source = (string) $map[ $field ];
				if ( self::TITLE === $source ) {
					if ( ! in_array( $field, array( 'last_name', 'first_name' ), true ) ) {
						continue;
					}
					list( $ln, $fn, $ambiguous ) = self::split_title( $post ? $post->post_title : '', isset( $map['title_mode'] ) ? $map['title_mode'] : 'first_last' );
					$raw = 'last_name' === $field ? $ln : $fn;
					if ( $ambiguous && 'last_name' === $field ) {
						$row['messages'][] = array( 'warning', 'Nom déduit du titre « ' . ( $post ? $post->post_title : '' ) . ' » : vérifiez le nom de famille et le prénom.' );
					}
				} else {
					$raw = get_post_meta( $id, $source, true );
					if ( is_array( $raw ) ) {
						$raw = implode( ' ', array_filter( array_map( 'strval', $raw ) ) );
					}
					$raw = trim( (string) $raw );
				}
				if ( '' === $raw ) {
					continue;
				}
				$clean = self::clean_value( $field, $def, $raw, isset( $map[ 'fmt_' . $field ] ) ? $map[ 'fmt_' . $field ] : 'auto' );
				if ( is_array( $clean ) ) {
					$row['messages'][] = $clean;
					continue;
				}
				$values[ $field ] = $clean;
			}
			/* Le prénom tiré du titre ne doit pas écraser un prénom issu d'un vrai champ. */
			if ( self::TITLE === ( isset( $map['last_name'] ) ? $map['last_name'] : '' ) && empty( $map['first_name'] ) ) {
				list( , $fn ) = self::split_title( $post ? $post->post_title : '', isset( $map['title_mode'] ) ? $map['title_mode'] : 'first_last' );
				if ( '' !== $fn ) {
					$values['first_name'] = $fn;
				}
			}

			$changes = array();
			foreach ( $values as $field => $v ) {
				$has = 'bool' === $fields[ $field ]['type'] ? (bool) $current[ $field ] : '' !== (string) $current[ $field ];
				if ( $has && ! $options['overwrite'] ) {
					if ( (string) $current[ $field ] !== (string) $v && 'bool' !== $fields[ $field ]['type'] ) {
						$row['messages'][] = array( 'warning', $fields[ $field ]['label'] . ' déjà renseigné : conservé (ancienne valeur différente ignorée).' );
					}
					continue;
				}
				if ( (string) $current[ $field ] !== (string) $v ) {
					$changes[ $field ] = $v;
				}
			}

			$after = array_merge( $current, $changes );
			foreach ( Wisy_Cert_Status::issues( $after ) as $issue ) {
				$row['messages'][] = array( $issue['level'], $issue['message'] );
			}
			if ( '' === $after['last_name'] || '' === $after['birth_date'] ) {
				++$summary['not_searchable'];
			}
			if ( '' !== $after['diploma_number'] ) {
				$k = strtolower( $after['diploma_number'] );
				if ( isset( $diplomas[ $k ] ) ) {
					$row['messages'][] = array( 'error', 'Numéro de diplôme identique au certificat #' . $diplomas[ $k ] . ' : doublon à vérifier.' );
				} else {
					$diplomas[ $k ] = $id;
				}
			}

			if ( $changes ) {
				$row['action'] = 'updated';
				$row['messages'][] = array( 'info', 'Champs repris : ' . implode( ', ', array_map( static function ( $f ) use ( $fields ) {
					return $fields[ $f ]['label'];
				}, array_keys( $changes ) ) ) . '.' );
				++$summary['updated'];
				if ( ! $options['dry_run'] ) {
					Wisy_Cert_Repository::save( $id, $changes );
					update_post_meta( $id, Wisy_Cert_Schema::MIGRATED_META, gmdate( 'c' ) );
				}
			} else {
				++$summary['unchanged'];
			}

			/* PDF. */
			if ( $options['copy_pdf'] ) {
				$pdf_source = isset( $map['pdf'] ) ? (string) $map['pdf'] : self::ATTACHED;
				$attachments = Wisy_Cert_Documents::legacy_attachments( $id, self::ATTACHED === $pdf_source ? '' : $pdf_source );
				if ( ! $attachments ) {
					if ( ! Wisy_Cert_Documents::current( $id ) ) {
						$row['pdf'] = 'Aucun PDF trouvé.';
						++$summary['pdf_missing'];
					} else {
						$row['pdf'] = 'PDF déjà dans le coffre privé.';
					}
				} else {
					if ( count( $attachments ) > 1 ) {
						$row['messages'][] = array( 'warning', count( $attachments ) . ' PDF rattachés : le plus récent est repris.' );
					}
					$res        = Wisy_Cert_Documents::import_attachment( $id, $attachments[0], (bool) $options['dry_run'] );
					$row['pdf'] = $res['message'];
					if ( 'error' === $res['status'] ) {
						$row['messages'][] = array( 'error', 'PDF : ' . $res['message'] );
					} elseif ( in_array( $res['status'], array( 'copied', 'planned' ), true ) ) {
						++$summary['pdf_copied'];
					}
				}
			}

			$levels = array_map( 'current', $row['messages'] );
			if ( in_array( 'error', $levels, true ) ) {
				++$summary['errors'];
			} elseif ( in_array( 'warning', $levels, true ) ) {
				++$summary['warnings'];
			}
			$rows[] = $row;
		}
		if ( ! $options['dry_run'] ) {
			self::save_map( $map );
		}
		return array( 'summary' => $summary, 'rows' => $rows );
	}

	/** @return mixed Valeur nettoyée, ou array( niveau, message ) si elle est rejetée. */
	private static function clean_value( $field, array $def, $raw, $format ) {
		switch ( $def['type'] ) {
			case 'date':
				$iso = Wisy_Cert_Normalizer::parse_date( $raw, $format ? $format : 'auto' );
				return null === $iso ? array( 'error', $def['label'] . ' illisible (« ' . Wisy_Cert_Normalizer::mask( $raw ) . ' ») : non reprise, à corriger à la main.' ) : $iso;
			case 'bool':
				$b = Wisy_Cert_Normalizer::parse_bool( $raw );
				return null === $b ? array( 'warning', $def['label'] . ' : valeur non reconnue, ignorée.' ) : $b;
			case 'email':
				$e = Wisy_Cert_Normalizer::clean_email( $raw );
				return null === $e ? array( 'warning', $def['label'] . ' invalide : ignoré.' ) : $e;
			case 'tel':
				$p = Wisy_Cert_Normalizer::clean_phone( $raw );
				return null === $p ? array( 'warning', $def['label'] . ' invalide : ignoré.' ) : $p;
			case 'textarea':
				return Wisy_Cert_Normalizer::clean_textarea( $raw, isset( $def['max'] ) ? $def['max'] : 1000 );
			default:
				if ( in_array( $field, array( 'last_name', 'first_name' ), true ) ) {
					$clean = Wisy_Cert_Normalizer::clean_name( html_entity_decode( $raw, ENT_QUOTES, 'UTF-8' ) );
					return '' !== Wisy_Cert_Normalizer::validate_name( $clean ) ? array( 'error', $def['label'] . ' contient des caractères inattendus : non repris.' ) : $clean;
				}
				return Wisy_Cert_Normalizer::clean_text( $raw, isset( $def['max'] ) ? $def['max'] : 160 );
		}
	}
}
