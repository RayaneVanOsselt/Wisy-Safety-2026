<?php
/**
 * Normalisation et validation des entrées (noms, dates, coordonnées).
 *
 * POLITIQUE DE COMPARAISON DES NOMS (documentée dans docs/README-CERTIFICATS.md) :
 *   - espaces de début/fin et espaces multiples ignorés ;
 *   - casse ignorée (« DUPONT » = « Dupont ») ;
 *   - accents ignorés (« Lefèvre » = « Lefevre ») : de nombreux claviers étrangers ou de téléphone
 *     ne permettent pas de les saisir ; la date de naissance EXACTE reste exigée, et le nom complet
 *     enregistré est affiché dans le résultat pour confirmation par la personne qui vérifie ;
 *   - séparateurs ignorés : espaces, tirets, apostrophes et points (« Van Damme » = « Vandamme »
 *     = « van-damme », « D'Hondt » = « Dhondt ») ;
 *   - aucune recherche approximative : pas de « commence par », pas de distance d'édition, pas de
 *     correspondance partielle. Un nom incomplet ne trouve rien.
 *
 * DATES : stockées et comparées en ISO 8601 (AAAA-MM-JJ, sans heure). Une valeur illisible ou
 * ambiguë n'est JAMAIS remplacée par une valeur par défaut : elle est rejetée et signalée.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Normalizer {

	const NAME_MAX = 80;

	/** Formats de date reconnus lors des reprises/imports (jamais pour la recherche publique : ISO strict). */
	const DATE_FORMATS = array(
		'auto'      => 'Automatique (AAAA-MM-JJ, AAAAMMJJ, JJ/MM/AAAA)',
		'Y-m-d'     => 'AAAA-MM-JJ',
		'Ymd'       => 'AAAAMMJJ (champ date ACF)',
		'd/m/Y'     => 'JJ/MM/AAAA',
		'm/d/Y'     => 'MM/JJ/AAAA (format américain)',
		'timestamp' => 'Horodatage Unix',
	);

	/** Nettoie une saisie de nom pour l'affichage/stockage (espaces, longueur), sans changer son orthographe. */
	public static function clean_name( $value ) {
		$value = is_scalar( $value ) ? (string) $value : '';
		$value = wp_check_invalid_utf8( $value );
		$value = preg_replace( '/[\x{0000}-\x{001F}\x{007F}\x{200B}-\x{200D}\x{FEFF}]/u', '', $value );
		$value = preg_replace( '/[\s\x{00A0}\x{202F}]+/u', ' ', (string) $value );
		return trim( (string) $value );
	}

	/**
	 * Valide un nom de famille saisi (recherche publique, imports).
	 *
	 * @return string '' si valide, sinon le code d'erreur : required | too_long | invalid.
	 */
	public static function validate_name( $clean ) {
		if ( '' === $clean ) {
			return 'required';
		}
		if ( self::length( $clean ) > self::NAME_MAX ) {
			return 'too_long';
		}
		/* Lettres de toutes les écritures (+ signes diacritiques combinants), espaces, tirets, apostrophes, points. */
		if ( ! preg_match( "/^[\\p{L}\\p{M}](?:[\\p{L}\\p{M}\\x{0020}'\\x{2019}\\x{2018}\\x{02BC}\\-\\x{2010}\\x{2011}.])*$/u", $clean ) ) {
			return 'invalid';
		}
		if ( '' === self::name_key( $clean ) ) {
			return 'invalid';
		}
		return '';
	}

	/** Clé de comparaison d'un nom (voir la politique en tête de fichier). */
	public static function name_key( $value ) {
		$s = self::clean_name( $value );
		if ( '' === $s ) {
			return '';
		}
		if ( class_exists( 'Normalizer' ) ) {
			$n = Normalizer::normalize( $s, Normalizer::FORM_C );
			if ( is_string( $n ) ) {
				$s = $n;
			}
		}
		$s = remove_accents( $s );
		$s = function_exists( 'mb_strtolower' ) ? mb_strtolower( $s, 'UTF-8' ) : strtolower( $s );
		/* Restes de diacritiques combinants (si remove_accents n'a pas pu décomposer). */
		$s = preg_replace( '/\p{M}+/u', '', $s );
		/* Séparateurs : espaces, tirets (toutes variantes), apostrophes (toutes variantes), points. */
		$s = preg_replace( "/[\\s\\x{00A0}\\x{202F}\\-\\x{2010}-\\x{2015}\\x{2212}'\\x{2018}\\x{2019}\\x{02BC}\\x{0060}\\x{00B4}.]+/u", '', (string) $s );
		return (string) $s;
	}

	/** Découpe « nom1 ; nom2 » en noms nettoyés distincts. */
	public static function split_names( $value ) {
		$out = array();
		foreach ( preg_split( '/[;,\n]+/', (string) $value ) as $part ) {
			$part = self::clean_name( $part );
			if ( '' !== $part && '' === self::validate_name( $part ) ) {
				$out[] = $part;
			}
		}
		return array_values( array_unique( $out ) );
	}

	/**
	 * Date de la recherche publique : AAAA-MM-JJ strict, date réelle, entre 1900-01-01 et aujourd'hui.
	 *
	 * @return array{0:string,1:string} [date ISO ou '', code d'erreur ou ''].
	 */
	public static function validate_birth_date_input( $value, $today ) {
		$value = is_scalar( $value ) ? trim( (string) $value ) : '';
		if ( '' === $value ) {
			return array( '', 'required' );
		}
		if ( strlen( $value ) > 10 || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m ) ) {
			return array( '', 'invalid' );
		}
		if ( ! checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ) {
			return array( '', 'invalid' );
		}
		if ( $value < '1900-01-01' ) {
			return array( '', 'out_of_range' );
		}
		if ( $value > $today ) {
			return array( '', 'future' );
		}
		return array( $value, '' );
	}

	/**
	 * Lit une date stockée ou importée. Renvoie AAAA-MM-JJ, ou null si la valeur est vide,
	 * illisible ou ambiguë (jamais de valeur inventée).
	 *
	 * @param mixed  $value  Valeur brute.
	 * @param string $format Voir DATE_FORMATS.
	 */
	public static function parse_date( $value, $format = 'auto' ) {
		if ( is_int( $value ) && 'timestamp' === $format ) {
			$value = (string) $value;
		}
		if ( ! is_scalar( $value ) ) {
			return null;
		}
		$v = trim( (string) $value );
		if ( '' === $v ) {
			return null;
		}
		$y = 0;
		$m = 0;
		$d = 0;
		switch ( $format ) {
			case 'Y-m-d':
				if ( ! preg_match( '/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/', $v, $p ) ) {
					return null;
				}
				list( , $y, $m, $d ) = $p;
				break;
			case 'Ymd':
				if ( ! preg_match( '/^(\d{4})(\d{2})(\d{2})$/', $v, $p ) ) {
					return null;
				}
				list( , $y, $m, $d ) = $p;
				break;
			case 'd/m/Y':
				if ( ! preg_match( '#^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$#', $v, $p ) ) {
					return null;
				}
				list( , $d, $m, $y ) = $p;
				break;
			case 'm/d/Y':
				if ( ! preg_match( '#^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$#', $v, $p ) ) {
					return null;
				}
				list( , $m, $d, $y ) = $p;
				break;
			case 'timestamp':
				if ( ! preg_match( '/^\d{9,10}$/', $v ) ) {
					return null;
				}
				$dt = new DateTimeImmutable( '@' . $v );
				$dt = $dt->setTimezone( Wisy_Cert_Settings::timezone() );
				return $dt->format( 'Y-m-d' );
			default: /* auto */
				if ( preg_match( '/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/', $v, $p ) ) {
					list( , $y, $m, $d ) = $p;
				} elseif ( preg_match( '/^(\d{4})(\d{2})(\d{2})$/', $v, $p ) ) {
					list( , $y, $m, $d ) = $p;
				} elseif ( preg_match( '#^(\d{4})/(\d{1,2})/(\d{1,2})$#', $v, $p ) ) {
					list( , $y, $m, $d ) = $p;
				} elseif ( preg_match( '#^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$#', $v, $p ) ) {
					/* Convention belge : jour / mois / année. */
					list( , $d, $m, $y ) = $p;
				} else {
					return null;
				}
		}
		$y = (int) $y;
		$m = (int) $m;
		$d = (int) $d;
		if ( $y < 1900 || $y > 2100 || ! checkdate( $m, $d, $y ) ) {
			return null;
		}
		return sprintf( '%04d-%02d-%02d', $y, $m, $d );
	}

	/** Détecte le format d'une liste d'exemples (découverte des anciens champs). */
	public static function detect_date_format( array $samples ) {
		$score = array( 'Ymd' => 0, 'Y-m-d' => 0, 'd/m/Y' => 0, 'timestamp' => 0 );
		$total = 0;
		foreach ( $samples as $s ) {
			$s = trim( (string) $s );
			if ( '' === $s ) {
				continue;
			}
			++$total;
			foreach ( array_keys( $score ) as $f ) {
				if ( null !== self::parse_date( $s, $f ) ) {
					++$score[ $f ];
				}
			}
		}
		if ( 0 === $total ) {
			return array( null, 0, 0 );
		}
		arsort( $score );
		$best = key( $score );
		return array( $score[ $best ] > 0 ? $best : null, $score[ $best ], $total );
	}

	public static function clean_text( $value, $max = 160 ) {
		$v = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';
		return self::truncate( $v, $max );
	}

	public static function clean_textarea( $value, $max = 1000 ) {
		$v = is_scalar( $value ) ? sanitize_textarea_field( (string) $value ) : '';
		return self::truncate( $v, $max );
	}

	/** @return string|null '' si vide, null si invalide. */
	public static function clean_email( $value ) {
		$v = is_scalar( $value ) ? trim( (string) $value ) : '';
		if ( '' === $v ) {
			return '';
		}
		$e = sanitize_email( $v );
		return ( $e && is_email( $e ) && strlen( $e ) <= 160 ) ? $e : null;
	}

	/** @return string|null '' si vide, null si invalide. */
	public static function clean_phone( $value ) {
		$v = is_scalar( $value ) ? trim( (string) $value ) : '';
		if ( '' === $v ) {
			return '';
		}
		$v = preg_replace( '/\s+/', ' ', $v );
		return ( preg_match( '/^\+?[0-9 .\/()\-]{6,30}$/', $v ) && preg_match_all( '/\d/', $v ) >= 6 ) ? $v : null;
	}

	/** Interprète « oui / non / 1 / 0 / vrai / x… » (imports). Renvoie null si illisible. */
	public static function parse_bool( $value ) {
		$v = strtolower( remove_accents( trim( (string) $value ) ) );
		if ( '' === $v ) {
			return false;
		}
		if ( in_array( $v, array( '1', 'oui', 'o', 'yes', 'y', 'true', 'vrai', 'x', 'revoque', 'revoked' ), true ) ) {
			return true;
		}
		if ( in_array( $v, array( '0', 'non', 'n', 'no', 'false', 'faux', 'actif', 'valide' ), true ) ) {
			return false;
		}
		return null;
	}

	/** Masque une valeur personnelle pour les écrans d'aperçu (« Dupont » → « D••••• »). */
	public static function mask( $value ) {
		$v = (string) $value;
		if ( '' === $v ) {
			return '';
		}
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $v ) ) {
			return substr( $v, 0, 2 ) . '••-••-••';
		}
		$len   = self::length( $v );
		$first = function_exists( 'mb_substr' ) ? mb_substr( $v, 0, 1, 'UTF-8' ) : substr( $v, 0, 1 );
		return $first . str_repeat( '•', max( 2, min( 8, $len - 1 ) ) );
	}

	public static function length( $s ) {
		return function_exists( 'mb_strlen' ) ? mb_strlen( (string) $s, 'UTF-8' ) : strlen( (string) $s );
	}

	private static function truncate( $s, $max ) {
		if ( self::length( $s ) <= $max ) {
			return $s;
		}
		return function_exists( 'mb_substr' ) ? mb_substr( $s, 0, $max, 'UTF-8' ) : substr( $s, 0, $max );
	}
}
