<?php
/**
 * Coffre privé des PDF de certificats.
 *
 * Les PDF sont stockés dans une table dédiée de la base de données (« {prefix}wisy_cert_documents »),
 * et NON dans wp-content/uploads :
 *   - aucune adresse publique n'existe pour eux : ils ne sont servis que par l'API, après une
 *     vérification réussie et avec un jeton signé valable quelques minutes ;
 *   - la protection ne dépend pas du serveur web (votre hébergeur utilise nginx, qui ignore les
 *     fichiers .htaccess : un dossier « protégé » dans uploads resterait téléchargeable) ;
 *   - les PDF sont inclus dans toute sauvegarde de la base de données.
 *
 * Les anciens PDF de la médiathèque (pièces jointes publiques) sont COPIÉS ici par la « Reprise » ;
 * l'original n'est supprimé que sur action explicite, après contrôle de l'empreinte SHA-256.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Documents {

	const DB_VERSION        = '1';
	const DB_VERSION_OPTION = 'wisy_cert_db_version';

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'wisy_cert_documents';
	}

	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		$sql     = "CREATE TABLE {$table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  certificate_id bigint(20) unsigned NOT NULL,
  original_name varchar(190) NOT NULL DEFAULT '',
  mime varchar(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes bigint(20) unsigned NOT NULL DEFAULT 0,
  sha256 char(64) NOT NULL DEFAULT '',
  source varchar(40) NOT NULL DEFAULT 'upload',
  content longtext NOT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY certificate_id (certificate_id)
) {$charset};";
		dbDelta( $sql );
		update_option( self::DB_VERSION_OPTION, self::DB_VERSION, false );
	}

	public static function maybe_install() {
		if ( get_option( self::DB_VERSION_OPTION ) !== self::DB_VERSION ) {
			self::install();
		}
	}

	public static function table_exists() {
		global $wpdb;
		$table = self::table();
		return $table === $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
	}

	/** Taille maximale acceptée (octets). */
	public static function max_bytes() {
		return (int) Wisy_Cert_Settings::get( 'max_pdf_mb' ) * 1024 * 1024;
	}

	/**
	 * Contrôle qu'un contenu est bien un PDF acceptable.
	 *
	 * @return string '' si valide, sinon message d'erreur.
	 */
	public static function validate_pdf( $bytes ) {
		$len = strlen( (string) $bytes );
		if ( 0 === $len ) {
			return 'Le fichier est vide.';
		}
		if ( $len > self::max_bytes() ) {
			return 'Le fichier dépasse la taille maximale (' . (int) Wisy_Cert_Settings::get( 'max_pdf_mb' ) . ' Mo).';
		}
		if ( 0 !== strncmp( (string) $bytes, '%PDF-', 5 ) ) {
			return 'Le fichier n’est pas un PDF valide.';
		}
		if ( function_exists( 'finfo_open' ) ) {
			$fi   = finfo_open( FILEINFO_MIME_TYPE );
			$mime = $fi ? finfo_buffer( $fi, substr( (string) $bytes, 0, 65536 ) ) : '';
			if ( $fi ) {
				finfo_close( $fi );
			}
			if ( $mime && ! in_array( $mime, array( 'application/pdf', 'application/x-pdf' ), true ) ) {
				return 'Le fichier n’est pas un PDF valide (' . $mime . ').';
			}
		}
		return '';
	}

	/**
	 * Enregistre (ou remplace) le PDF d'un certificat.
	 *
	 * @return int|WP_Error Identifiant du document.
	 */
	public static function store( $certificate_id, $bytes, $original_name = '', $source = 'upload' ) {
		global $wpdb;
		$error = self::validate_pdf( $bytes );
		if ( '' !== $error ) {
			return new WP_Error( 'wisy_cert_pdf_invalid', $error );
		}
		$name = sanitize_file_name( (string) $original_name );
		$ok   = $wpdb->insert(
			self::table(),
			array(
				'certificate_id' => (int) $certificate_id,
				'original_name'  => substr( $name, 0, 190 ),
				'mime'           => 'application/pdf',
				'size_bytes'     => strlen( $bytes ),
				'sha256'         => hash( 'sha256', $bytes ),
				'source'         => substr( (string) $source, 0, 40 ),
				'content'        => base64_encode( $bytes ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions -- stockage binaire sûr en LONGTEXT.
				'created_at'     => current_time( 'mysql', true ),
			),
			array( '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s' )
		);
		if ( false === $ok ) {
			return new WP_Error( 'wisy_cert_pdf_db', 'Le PDF n’a pas pu être enregistré dans la base de données.' );
		}
		$doc_id   = (int) $wpdb->insert_id;
		$previous = (int) get_post_meta( $certificate_id, Wisy_Cert_Schema::DOCUMENT_META, true );
		update_post_meta( $certificate_id, Wisy_Cert_Schema::DOCUMENT_META, $doc_id );
		/* Une seule version conservée : l'ancienne est retirée APRÈS l'enregistrement réussi de la nouvelle. */
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE certificate_id = %d AND id <> %d', (int) $certificate_id, $doc_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- nom de table interne.
		if ( $previous && $previous !== $doc_id ) {
			do_action( 'wisy_cert_document_replaced', $certificate_id, $previous, $doc_id );
		}
		return $doc_id;
	}

	/** Métadonnées du document courant d'un certificat (sans le contenu), ou null. */
	public static function current( $certificate_id ) {
		global $wpdb;
		$doc_id = (int) get_post_meta( $certificate_id, Wisy_Cert_Schema::DOCUMENT_META, true );
		if ( ! $doc_id ) {
			return null;
		}
		$row = $wpdb->get_row(
			$wpdb->prepare( 'SELECT id, certificate_id, original_name, mime, size_bytes, sha256, source, created_at FROM ' . self::table() . ' WHERE id = %d AND certificate_id = %d', $doc_id, (int) $certificate_id ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);
		return $row ? $row : null;
	}

	/** Contenu binaire d'un document, uniquement s'il appartient bien au certificat demandé. */
	public static function content( $doc_id, $certificate_id ) {
		global $wpdb;
		$b64 = $wpdb->get_var( $wpdb->prepare( 'SELECT content FROM ' . self::table() . ' WHERE id = %d AND certificate_id = %d', (int) $doc_id, (int) $certificate_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( ! is_string( $b64 ) || '' === $b64 ) {
			return null;
		}
		$bytes = base64_decode( $b64, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		return ( false === $bytes ) ? null : $bytes;
	}

	public static function delete_for( $certificate_id ) {
		global $wpdb;
		$wpdb->delete( self::table(), array( 'certificate_id' => (int) $certificate_id ), array( '%d' ) );
		delete_post_meta( $certificate_id, Wisy_Cert_Schema::DOCUMENT_META );
	}

	/** Suppression définitive d'un certificat (corbeille vidée) : son PDF privé disparaît avec lui. */
	public static function on_delete_post( $post_id ) {
		if ( Wisy_Cert_Schema::POST_TYPE === get_post_type( $post_id ) ) {
			self::delete_for( $post_id );
		}
	}

	/* ------------------------------------------------------------------ anciens PDF (médiathèque) */

	/**
	 * PDF de la médiathèque rattachés à un certificat (ancien système) : pièces jointes dont le parent
	 * est le certificat, plus éventuellement une métadonnée contenant un ID ou une URL de pièce jointe.
	 *
	 * @return int[] Identifiants de pièces jointes (le plus récent d'abord).
	 */
	public static function legacy_attachments( $certificate_id, $meta_key = '' ) {
		$ids = array();
		if ( '' !== $meta_key ) {
			$raw = get_post_meta( $certificate_id, $meta_key, true );
			if ( is_array( $raw ) ) {
				$raw = isset( $raw['ID'] ) ? $raw['ID'] : ( isset( $raw['id'] ) ? $raw['id'] : ( isset( $raw['url'] ) ? $raw['url'] : '' ) );
			}
			$raw = trim( (string) $raw );
			if ( ctype_digit( $raw ) ) {
				$ids[] = (int) $raw;
			} elseif ( '' !== $raw && preg_match( '#^https?://#i', $raw ) ) {
				$found = attachment_url_to_postid( $raw );
				if ( $found ) {
					$ids[] = (int) $found;
				}
			}
		}
		$children = get_children(
			array(
				'post_parent'    => (int) $certificate_id,
				'post_type'      => 'attachment',
				'post_mime_type' => 'application/pdf',
				'post_status'    => 'inherit',
				'orderby'        => 'date',
				'order'          => 'DESC',
				'fields'         => 'ids',
			)
		);
		foreach ( (array) $children as $child ) {
			$ids[] = (int) $child;
		}
		$ids = array_values( array_unique( array_filter( $ids ) ) );
		return array_values(
			array_filter(
				$ids,
				static function ( $id ) {
					return 'attachment' === get_post_type( $id ) && 'application/pdf' === get_post_mime_type( $id );
				}
			)
		);
	}

	/**
	 * Copie un PDF de la médiathèque dans le coffre privé (idempotent : rien n'est fait si le coffre
	 * contient déjà exactement ce fichier).
	 *
	 * @return array{status:string, message:string}
	 */
	public static function import_attachment( $certificate_id, $attachment_id, $dry_run = false ) {
		$path = get_attached_file( $attachment_id );
		if ( ! $path || ! is_readable( $path ) ) {
			return array( 'status' => 'error', 'message' => 'Fichier de la pièce jointe #' . (int) $attachment_id . ' introuvable sur le serveur.' );
		}
		$size = filesize( $path );
		if ( $size > self::max_bytes() ) {
			return array( 'status' => 'error', 'message' => 'PDF trop volumineux (' . size_format( $size ) . ').' );
		}
		$bytes   = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$current = self::current( $certificate_id );
		if ( $current && hash_equals( (string) $current['sha256'], hash( 'sha256', (string) $bytes ) ) ) {
			return array( 'status' => 'unchanged', 'message' => 'PDF déjà dans le coffre privé.' );
		}
		$error = self::validate_pdf( $bytes );
		if ( '' !== $error ) {
			return array( 'status' => 'error', 'message' => $error );
		}
		if ( $dry_run ) {
			return array( 'status' => 'planned', 'message' => 'PDF de la médiathèque (#' . (int) $attachment_id . ') à copier dans le coffre privé.' );
		}
		$res = self::store( $certificate_id, $bytes, basename( $path ), 'legacy:' . (int) $attachment_id );
		if ( is_wp_error( $res ) ) {
			return array( 'status' => 'error', 'message' => $res->get_error_message() );
		}
		return array( 'status' => 'copied', 'message' => 'PDF copié dans le coffre privé (empreinte vérifiée).' );
	}

	/**
	 * Pièces jointes publiques dont une copie IDENTIQUE (SHA-256) est dans le coffre : seules celles-ci
	 * peuvent être supprimées de la médiathèque.
	 *
	 * @return array<int, array{certificate:int, attachment:int, url:string}>
	 */
	public static function public_copies() {
		$out   = array();
		$certs = get_posts(
			array(
				'post_type'      => Wisy_Cert_Schema::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		foreach ( $certs as $cid ) {
			$current = self::current( $cid );
			foreach ( self::legacy_attachments( $cid ) as $att ) {
				$path = get_attached_file( $att );
				$same = $current && $path && is_readable( $path ) && hash_equals( (string) $current['sha256'], (string) hash_file( 'sha256', $path ) );
				$out[] = array(
					'certificate' => (int) $cid,
					'attachment'  => (int) $att,
					'url'         => (string) wp_get_attachment_url( $att ),
					'secured'     => (bool) $same,
				);
			}
		}
		return $out;
	}
}
