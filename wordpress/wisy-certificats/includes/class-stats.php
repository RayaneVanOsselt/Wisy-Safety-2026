<?php
/**
 * Statistiques d'usage AGRÉGÉES par jour (aucune donnée personnelle : ni nom, ni date, ni adresse IP).
 * Conservées 90 jours, puis effacées automatiquement. Servent à repérer un usage anormal.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Stats {

	const OPTION         = 'wisy_cert_stats';
	const RETENTION_DAYS = 90;

	/** found | not_found | invalid | limited | document | document_denied | origin_denied */
	public static function bump( $event ) {
		$allowed = array( 'found', 'not_found', 'invalid', 'limited', 'document', 'document_denied', 'origin_denied' );
		if ( ! in_array( $event, $allowed, true ) ) {
			return;
		}
		$day   = Wisy_Cert_Settings::today();
		$stats = get_option( self::OPTION, array() );
		if ( ! is_array( $stats ) ) {
			$stats = array();
		}
		if ( ! isset( $stats[ $day ] ) || ! is_array( $stats[ $day ] ) ) {
			$stats[ $day ] = array();
		}
		$stats[ $day ][ $event ] = isset( $stats[ $day ][ $event ] ) ? (int) $stats[ $day ][ $event ] + 1 : 1;
		$limit                   = gmdate( 'Y-m-d', time() - self::RETENTION_DAYS * DAY_IN_SECONDS );
		foreach ( array_keys( $stats ) as $d ) {
			if ( strcmp( (string) $d, $limit ) < 0 ) {
				unset( $stats[ $d ] );
			}
		}
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $stats, '', 'no' );
		} else {
			update_option( self::OPTION, $stats, false );
		}
	}

	/** Totaux sur les N derniers jours. */
	public static function totals( $days = 30 ) {
		$stats = get_option( self::OPTION, array() );
		$from  = gmdate( 'Y-m-d', time() - (int) $days * DAY_IN_SECONDS );
		$tot   = array( 'found' => 0, 'not_found' => 0, 'invalid' => 0, 'limited' => 0, 'document' => 0, 'document_denied' => 0, 'origin_denied' => 0 );
		foreach ( (array) $stats as $d => $row ) {
			if ( strcmp( (string) $d, $from ) < 0 || ! is_array( $row ) ) {
				continue;
			}
			foreach ( $row as $k => $n ) {
				if ( isset( $tot[ $k ] ) ) {
					$tot[ $k ] += (int) $n;
				}
			}
		}
		return $tot;
	}

	/** Lignes jour par jour (les plus récentes d'abord). */
	public static function days( $days = 14 ) {
		$stats = get_option( self::OPTION, array() );
		$stats = is_array( $stats ) ? $stats : array();
		krsort( $stats );
		return array_slice( $stats, 0, (int) $days, true );
	}
}
