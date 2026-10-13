<?php
/**
 * Limitation des tentatives, côté serveur (jamais côté navigateur).
 *
 * Compteurs à fenêtre fixe stockés en transients WordPress (en mémoire si un cache objet est installé,
 * sinon dans la base). Les identifiants (adresse IP, nom recherché) ne sont JAMAIS stockés en clair :
 * seule une empreinte HMAC tronquée sert de nom de compteur, et elle expire avec la fenêtre.
 *
 * Trois verrous complémentaires (valeurs réglables) :
 *   - par adresse IP, fenêtre courte (10 recherches / 10 min) ;
 *   - par adresse IP, par jour (60 recherches / 24 h) ;
 *   - par NOM recherché : 8 échecs / 24 h, quelle que soit l'adresse IP. Empêche d'essayer toutes les
 *     dates de naissance possibles pour un même nom, même depuis de nombreuses adresses.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Rate_Limiter {

	private static function key( $bucket, $id ) {
		return 'wisy_rl_' . substr( hash_hmac( 'sha256', $bucket . '|' . $id, Wisy_Cert_Secret::key( 'ratelimit' ) ), 0, 32 );
	}

	/**
	 * Compte une tentative.
	 *
	 * @return array{allowed:bool, retry_after:int, count:int}
	 */
	public static function hit( $bucket, $id, $limit, $window ) {
		$key  = self::key( $bucket, $id );
		$now  = time();
		$data = get_transient( $key );
		if ( ! is_array( $data ) || ! isset( $data['c'], $data['r'] ) || (int) $data['r'] <= $now ) {
			$data = array( 'c' => 0, 'r' => $now + (int) $window );
		}
		++$data['c'];
		set_transient( $key, $data, max( 1, (int) $data['r'] - $now ) );
		return array(
			'allowed'     => $data['c'] <= (int) $limit,
			'retry_after' => max( 1, (int) $data['r'] - $now ),
			'count'       => (int) $data['c'],
		);
	}

	/** Lit un compteur sans l'incrémenter. */
	public static function peek( $bucket, $id, $limit ) {
		$data = get_transient( self::key( $bucket, $id ) );
		$now  = time();
		if ( ! is_array( $data ) || ! isset( $data['c'], $data['r'] ) || (int) $data['r'] <= $now ) {
			return array( 'allowed' => true, 'retry_after' => 0, 'count' => 0 );
		}
		return array(
			'allowed'     => (int) $data['c'] < (int) $limit,
			'retry_after' => max( 1, (int) $data['r'] - $now ),
			'count'       => (int) $data['c'],
		);
	}

	/**
	 * Adresse du visiteur. Un en-tête de proxy n'est lu QUE s'il est déclaré dans les réglages
	 * (sinon n'importe qui pourrait le falsifier pour contourner la limite).
	 * Les adresses IPv6 sont regroupées par préfixe /64 (une connexion en dispose généralement d'un entier).
	 */
	public static function client_ip() {
		$ip     = '';
		$header = (string) Wisy_Cert_Settings::get( 'ip_header' );
		if ( '' !== $header && ! empty( $_SERVER[ $header ] ) ) {
			$parts = explode( ',', sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) ) );
			$cand  = trim( $parts[0] );
			if ( filter_var( $cand, FILTER_VALIDATE_IP ) ) {
				$ip = $cand;
			}
		}
		if ( '' === $ip && ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$cand = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
			if ( filter_var( $cand, FILTER_VALIDATE_IP ) ) {
				$ip = $cand;
			}
		}
		if ( '' === $ip ) {
			return '0.0.0.0';
		}
		if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
			$packed = inet_pton( $ip );
			if ( false !== $packed ) {
				return bin2hex( substr( $packed, 0, 8 ) ) . '::/64';
			}
		}
		return $ip;
	}
}
