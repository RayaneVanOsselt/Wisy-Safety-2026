<?php
/**
 * Clé secrète de l'extension : signe les liens PDF temporaires, l'index de recherche et les compteurs
 * anti-abus. Elle ne quitte jamais le serveur.
 *
 * Source, par ordre de priorité :
 *   1. la constante WISY_CERT_SECRET dans wp-config.php (recommandé : hors de la base de données) ;
 *   2. sinon une clé aléatoire de 256 bits générée à l'activation (option non chargée automatiquement).
 *
 * Changer de clé invalide l'index : il est reconstruit automatiquement (voir Wisy_Cert_Repository).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Secret {

	const OPTION = 'wisy_cert_secret';

	/** @var array<string,string> */
	private static $derived = array();

	public static function source() {
		return ( defined( 'WISY_CERT_SECRET' ) && strlen( (string) WISY_CERT_SECRET ) >= 32 ) ? 'constant' : 'option';
	}

	private static function master() {
		if ( 'constant' === self::source() ) {
			return (string) WISY_CERT_SECRET;
		}
		$s = get_option( self::OPTION );
		if ( ! is_string( $s ) || strlen( $s ) < 64 ) {
			$s = bin2hex( random_bytes( 32 ) );
			delete_option( self::OPTION );
			add_option( self::OPTION, $s, '', 'no' );
		}
		return $s;
	}

	/**
	 * Sous-clé dédiée à un usage (« lookup », « document », « ratelimit »…), pour qu'une clé ne serve
	 * jamais à deux choses.
	 */
	public static function key( $purpose ) {
		if ( ! isset( self::$derived[ $purpose ] ) ) {
			self::$derived[ $purpose ] = hash_hmac( 'sha256', 'wisy-cert:' . $purpose, self::master(), true );
		}
		return self::$derived[ $purpose ];
	}

	/** Empreinte courte (non secrète) de la clé de l'index : détecte un index construit avec une autre clé. */
	public static function fingerprint() {
		return substr( hash_hmac( 'sha256', 'fingerprint', self::key( 'lookup' ) ), 0, 16 );
	}

	/** Remet le cache à zéro (tests). */
	public static function flush() {
		self::$derived = array();
	}
}
