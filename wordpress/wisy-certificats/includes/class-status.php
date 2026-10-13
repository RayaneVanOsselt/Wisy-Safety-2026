<?php
/**
 * Règles métier de validité (une seule implémentation, utilisée par l'API ET par l'administration).
 *
 *   1. « révoqué » coché                       → revoked  (prime sur toute date)
 *   2. date « valable jusqu'au » renseignée    → valid si aujourd'hui ≤ cette date (jour inclus), sinon expired
 *   3. pas de date d'expiration               → réglage « sans date d'expiration » :
 *                                                 undetermined (par défaut : « validité à confirmer »)
 *                                                 ou valid (si Wisy Safety décide que ces certificats n'expirent pas)
 *
 * « Aujourd'hui » = date civile dans le fuseau des réglages (Europe/Brussels par défaut).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Status {

	const VALID        = 'valid';
	const EXPIRED      = 'expired';
	const REVOKED      = 'revoked';
	const UNDETERMINED = 'undetermined';

	/**
	 * @param array  $record           Certificat (voir Wisy_Cert_Repository::get()).
	 * @param string $today            AAAA-MM-JJ.
	 * @param string $no_expiry_policy undetermined | valid.
	 */
	public static function compute( array $record, $today, $no_expiry_policy = 'undetermined' ) {
		if ( ! empty( $record['revoked'] ) ) {
			return self::REVOKED;
		}
		$expiry = isset( $record['expiry_date'] ) ? (string) $record['expiry_date'] : '';
		if ( '' !== $expiry ) {
			return ( strcmp( $today, $expiry ) <= 0 ) ? self::VALID : self::EXPIRED;
		}
		return ( 'valid' === $no_expiry_policy ) ? self::VALID : self::UNDETERMINED;
	}

	/** Statut d'un certificat à la date du jour, selon les réglages. */
	public static function current( array $record ) {
		return self::compute( $record, Wisy_Cert_Settings::today(), (string) Wisy_Cert_Settings::get( 'no_expiry_policy' ) );
	}

	public static function label( $status ) {
		$labels = array(
			self::VALID        => 'Valide',
			self::EXPIRED      => 'Expiré',
			self::REVOKED      => 'Révoqué',
			self::UNDETERMINED => 'Validité non précisée',
		);
		return isset( $labels[ $status ] ) ? $labels[ $status ] : $status;
	}

	/**
	 * Contrôles de cohérence d'un certificat (administration, imports). Ne modifie rien.
	 *
	 * @return array<int, array{level:string, code:string, message:string}>
	 */
	public static function issues( array $record ) {
		$out = array();
		$add = static function ( $level, $code, $message ) use ( &$out ) {
			$out[] = array( 'level' => $level, 'code' => $code, 'message' => $message );
		};
		if ( '' === (string) $record['last_name'] ) {
			$add( 'error', 'missing_last_name', 'Nom de famille manquant : le certificat ne peut pas être trouvé par la recherche.' );
		}
		if ( '' === (string) $record['birth_date'] ) {
			$add( 'error', 'missing_birth_date', 'Date de naissance manquante : le certificat ne peut pas être trouvé par la recherche.' );
		}
		if ( '' === (string) $record['training'] ) {
			$add( 'error', 'missing_training', 'Formation suivie manquante.' );
		}
		if ( '' === (string) $record['diploma_number'] ) {
			$add( 'warning', 'missing_diploma', 'Numéro de diplôme manquant.' );
		}
		if ( '' === (string) $record['expiry_date'] && empty( $record['revoked'] ) ) {
			$add( 'warning', 'missing_expiry', 'Pas de date de validité : statut « ' . self::label( self::current( $record ) ) . ' » selon les réglages.' );
		}
		$training = (string) $record['training_date'];
		if ( '' !== $training && '' !== (string) $record['expiry_date'] && strcmp( (string) $record['expiry_date'], $training ) < 0 ) {
			$add( 'error', 'expiry_before_training', 'La date de validité précède la date de formation.' );
		}
		if ( '' !== $training && '' !== (string) $record['issue_date'] && strcmp( (string) $record['issue_date'], $training ) < 0 ) {
			$add( 'warning', 'issue_before_training', 'La date de délivrance précède la date de formation.' );
		}
		if ( '' !== (string) $record['birth_date'] && '' !== $training && strcmp( (string) $record['birth_date'], $training ) >= 0 ) {
			$add( 'error', 'birth_after_training', 'La date de naissance est postérieure à la date de formation.' );
		}
		if ( '' !== $training && strcmp( $training, Wisy_Cert_Settings::today() ) > 0 ) {
			$add( 'warning', 'training_in_future', 'La date de formation est dans le futur.' );
		}
		return $out;
	}
}
