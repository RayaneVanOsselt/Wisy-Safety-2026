<?php
/**
 * Réglages de l'extension (une seule option, non chargée automatiquement).
 *
 * Aucun secret n'est stocké ici : la clé de signature est gérée par Wisy_Cert_Secret, la clé secrète
 * Turnstile vit uniquement dans wp-config.php (constante WISY_CERT_TURNSTILE_SECRET).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Settings {

	const OPTION = 'wisy_cert_settings';

	/** En-têtes d'adresse IP acceptés si un proxy de confiance est déclaré. */
	const IP_HEADERS = array(
		''                      => 'Adresse directe (REMOTE_ADDR) — recommandé sans proxy',
		'HTTP_CF_CONNECTING_IP' => 'Cloudflare (CF-Connecting-IP)',
		'HTTP_X_REAL_IP'        => 'Proxy / hébergeur (X-Real-IP)',
		'HTTP_X_FORWARDED_FOR'  => 'Proxy / hébergeur (X-Forwarded-For, 1re adresse)',
	);

	/** @var array|null */
	private static $cache = null;

	public static function defaults() {
		return array(
			'allowed_origins'      => array( 'https://rayanevanosselt.github.io', 'https://www.wisysafety.be', 'https://wisysafety.be' ),
			'require_origin'       => true,
			'cors_mode'            => 'auto',
			'ip_header'            => '',
			'limit_ip_short'       => 10,
			'window_ip_short'      => 600,
			'limit_ip_day'         => 60,
			'limit_name_failures'  => 8,
			'limit_documents'      => 30,
			'no_expiry_policy'     => 'undetermined',
			'pdf_public'           => true,
			'document_ttl'         => 600,
			'timezone'             => 'Europe/Brussels',
			'max_pdf_mb'           => 5,
			'harden_cpt'           => true,
			'harden_media'         => true,
			'turnstile_site_key'   => '',
			'contact_email'        => 'info@wisysafety.be',
			'verification_page'    => 'https://rayanevanosselt.github.io/Wisy-Safety-2026/certificats.html',
		);
	}

	public static function all() {
		if ( null === self::$cache ) {
			$stored      = get_option( self::OPTION, array() );
			self::$cache = array_merge( self::defaults(), is_array( $stored ) ? $stored : array() );
		}
		return self::$cache;
	}

	public static function get( $key ) {
		$all = self::all();
		return array_key_exists( $key, $all ) ? $all[ $key ] : null;
	}

	/** Remet le cache à zéro (tests, mise à jour). */
	public static function flush() {
		self::$cache = null;
	}

	/**
	 * Enregistre des réglages après nettoyage strict.
	 *
	 * @param array $input Valeurs brutes (formulaire).
	 * @return array Réglages enregistrés.
	 */
	public static function update( array $input ) {
		$clean = self::sanitize( array_merge( self::all(), $input ) );
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $clean, '', 'no' );
		} else {
			update_option( self::OPTION, $clean, false );
		}
		self::flush();
		return $clean;
	}

	public static function sanitize( array $in ) {
		$d   = self::defaults();
		$in  = array_merge( $d, $in );
		$out = array();

		$origins = $in['allowed_origins'];
		if ( is_string( $origins ) ) {
			$origins = preg_split( '/[\s,]+/', $origins );
		}
		$out['allowed_origins'] = array();
		foreach ( (array) $origins as $o ) {
			$o = self::normalize_origin( (string) $o );
			if ( $o && ! in_array( $o, $out['allowed_origins'], true ) ) {
				$out['allowed_origins'][] = $o;
			}
		}

		$out['require_origin'] = ! empty( $in['require_origin'] );
		$out['cors_mode']      = in_array( $in['cors_mode'], array( 'auto', 'plugin', 'host' ), true ) ? $in['cors_mode'] : $d['cors_mode'];
		$out['ip_header']      = array_key_exists( (string) $in['ip_header'], self::IP_HEADERS ) ? (string) $in['ip_header'] : '';

		$ints = array(
			'limit_ip_short'      => array( 1, 1000 ),
			'window_ip_short'     => array( 60, 86400 ),
			'limit_ip_day'        => array( 1, 10000 ),
			'limit_name_failures' => array( 1, 1000 ),
			'limit_documents'     => array( 1, 1000 ),
			'document_ttl'        => array( 60, 3600 ),
			'max_pdf_mb'          => array( 1, 20 ),
		);
		foreach ( $ints as $k => $range ) {
			$v         = isset( $in[ $k ] ) ? (int) $in[ $k ] : (int) $d[ $k ];
			$out[ $k ] = max( $range[0], min( $range[1], $v ) );
		}

		$out['no_expiry_policy'] = in_array( $in['no_expiry_policy'], array( 'undetermined', 'valid' ), true ) ? $in['no_expiry_policy'] : 'undetermined';
		$out['pdf_public']       = ! empty( $in['pdf_public'] );
		$out['harden_cpt']       = ! empty( $in['harden_cpt'] );
		$out['harden_media']     = ! empty( $in['harden_media'] );

		$tz              = (string) $in['timezone'];
		$out['timezone'] = in_array( $tz, timezone_identifiers_list(), true ) ? $tz : $d['timezone'];

		$key                       = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $in['turnstile_site_key'] );
		$out['turnstile_site_key'] = substr( $key, 0, 100 );

		$mail                 = sanitize_email( (string) $in['contact_email'] );
		$out['contact_email'] = is_email( $mail ) ? $mail : $d['contact_email'];

		$page                     = esc_url_raw( (string) $in['verification_page'], array( 'https', 'http' ) );
		$out['verification_page'] = $page ? $page : $d['verification_page'];

		return $out;
	}

	/** « https://exemple.be/chemin » → « https://exemple.be » ; rejette tout ce qui n'est pas une origine http(s). */
	public static function normalize_origin( $o ) {
		$o = trim( $o );
		if ( '' === $o ) {
			return '';
		}
		$p = wp_parse_url( $o );
		if ( empty( $p['scheme'] ) || empty( $p['host'] ) || ! in_array( strtolower( $p['scheme'] ), array( 'https', 'http' ), true ) ) {
			return '';
		}
		$origin = strtolower( $p['scheme'] ) . '://' . strtolower( $p['host'] );
		if ( ! empty( $p['port'] ) ) {
			$origin .= ':' . (int) $p['port'];
		}
		return $origin;
	}

	/** Fuseau horaire des règles de validité. */
	public static function timezone() {
		try {
			return new DateTimeZone( (string) self::get( 'timezone' ) );
		} catch ( Exception $e ) {
			return new DateTimeZone( 'Europe/Brussels' );
		}
	}

	/** Date du jour (AAAA-MM-JJ) dans le fuseau des règles de validité. */
	public static function today() {
		$now = new DateTimeImmutable( 'now', self::timezone() );
		return $now->format( 'Y-m-d' );
	}

	/** Durée de vie d'un lien PDF (secondes). La constante WISY_CERT_DOCUMENT_TTL (wp-config.php) prime. */
	public static function document_ttl() {
		if ( defined( 'WISY_CERT_DOCUMENT_TTL' ) ) {
			return max( 2, (int) WISY_CERT_DOCUMENT_TTL );
		}
		return (int) self::get( 'document_ttl' );
	}

	/** Turnstile actif seulement si la clé publique est réglée ET la clé secrète définie dans wp-config.php. */
	public static function turnstile_enabled() {
		return '' !== (string) self::get( 'turnstile_site_key' ) && defined( 'WISY_CERT_TURNSTILE_SECRET' ) && '' !== (string) WISY_CERT_TURNSTILE_SECRET;
	}
}
