<?php
/**
 * TESTS UNIQUEMENT — extension « must-use » du WordPress de test. Jamais livrée (hors de l'extension).
 *
 * 1. Enregistre le type « certificat » comme le fait CPT UI sur wisysafety.be (public, API REST active),
 *    pour vérifier que l'extension le rend bien privé.
 * 2. Expose des routes d'instrumentation « wisy-test/v1 » (seulement si WISY_TEST_MODE est défini).
 */

add_action(
	'init',
	static function () {
		register_post_type(
			'certificat',
			array(
				'label'        => 'Certificats',
				'public'       => true,
				'show_in_rest' => true,
				'rest_base'    => 'certificat',
				'has_archive'  => false,
				'rewrite'      => array( 'slug' => 'certificat' ),
				'supports'     => array( 'title', 'editor', 'custom-fields' ),
			)
		);
	},
	10
);

if ( ! defined( 'WISY_TEST_MODE' ) ) {
	return;
}

add_action(
	'rest_api_init',
	static function () {
		$ns   = 'wisy-test/v1';
		$open = '__return_true';
		register_rest_route( $ns, '/fixture', array( 'methods' => 'GET', 'permission_callback' => $open, 'callback' => static function () {
			return get_option( 'wisy_test_fixture' );
		} ) );
		register_rest_route( $ns, '/legacy', array( 'methods' => 'POST', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			$map = Wisy_Cert_Legacy::guess( Wisy_Cert_Legacy::discover() );
			$res = Wisy_Cert_Legacy::run( $map, array( 'dry_run' => (bool) $r->get_param( 'dry' ), 'copy_pdf' => true ) );
			$rows = array();
			foreach ( $res['rows'] as $row ) {
				$rows[] = array( 'id' => $row['id'], 'action' => $row['action'], 'levels' => array_map( 'current', $row['messages'] ), 'pdf' => $row['pdf'] );
			}
			return array( 'map' => $map, 'summary' => $res['summary'], 'rows' => $rows, 'discovered' => array_keys( Wisy_Cert_Legacy::discover() ) );
		} ) );
		register_rest_route( $ns, '/import', array( 'methods' => 'POST', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			$res = Wisy_Cert_CSV_Import::run( file_get_contents( '/fixtures/certificats-test.csv' ), array( 'dry_run' => (bool) $r->get_param( 'dry' ) ) );
			return array( 'summary' => $res['summary'], 'actions' => wp_list_pluck( $res['rows'], 'action' ) );
		} ) );
		register_rest_route( $ns, '/replace-pdf', array( 'methods' => 'POST', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			$pdf = file_get_contents( '/fixtures-gen/certificat-test.pdf' ) . "\n% version 2\n";
			return array( 'doc' => Wisy_Cert_Documents::store( (int) $r->get_param( 'id' ), $pdf, 'v2.pdf', 'test' ) );
		} ) );
		register_rest_route( $ns, '/token', array( 'methods' => 'GET', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			$doc = Wisy_Cert_Documents::current( (int) $r->get_param( 'id' ) );
			return array( 'token' => Wisy_Cert_REST::issue_token( (int) $r->get_param( 'id' ), $doc ? (int) $doc['id'] : 0, (int) $r->get_param( 'ttl' ) ), 'sha256' => $doc ? $doc['sha256'] : null );
		} ) );
		register_rest_route( $ns, '/record', array( 'methods' => 'GET', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			$id = (int) $r->get_param( 'id' );
			return array( 'record' => Wisy_Cert_Repository::get( $id ), 'lookups' => count( get_post_meta( $id, Wisy_Cert_Schema::LOOKUP_META, false ) ), 'doc' => Wisy_Cert_Documents::current( $id ), 'public_copies' => Wisy_Cert_Documents::public_copies() );
		} ) );
		register_rest_route( $ns, '/login', array( 'methods' => 'GET', 'permission_callback' => $open, 'callback' => static function () {
			wp_set_current_user( 1 );
			wp_set_auth_cookie( 1, false, false );
			return array( 'ok' => true );
		} ) );
		/* Simule un hébergeur qui ajoute lui-même « Access-Control-Allow-Origin » (cas de wisysafety.be). */
		register_rest_route( $ns, '/host-cors', array( 'methods' => 'POST', 'permission_callback' => $open, 'callback' => static function ( $r ) {
			if ( $r->get_param( 'reset' ) ) {
				delete_option( Wisy_Cert_REST::CORS_PROBE );
				Wisy_Cert_Settings::update( array( 'cors_mode' => 'plugin' ) );
				return array( 'ok' => true );
			}
			$real = Wisy_Cert_REST::detect_host_cors(); // vraie sonde (ici : aucun en-tête ajouté par le serveur de test)
			update_option( Wisy_Cert_REST::CORS_PROBE, array( 'checked_at' => time(), 'reachable' => true, 'success' => true, 'error' => false, 'raw' => '*' ), false );
			Wisy_Cert_Settings::update( array( 'cors_mode' => 'auto' ) );
			return array( 'ok' => true, 'probe_here' => $real );
		} ) );
		register_rest_route( $ns, '/inspect', array( 'methods' => 'GET', 'permission_callback' => $open, 'callback' => static function () {
			global $wpdb;
			$pii   = array( 'Dupont', 'Müller', 'Lefèvre', 'Hondt', 'Leroy', '1992-05-14', '19920514', '14/05/1992', '1978-11-02', '1985-03-27', 'dupont', 'muller' );
			$leaks = array();
			/* Compteurs de limitation, statistiques, sondes : aucune donnée personnelle ne doit y figurer. */
			$rows = $wpdb->get_results( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE '%wisy_rl_%' OR option_name IN ('wisy_cert_stats','wisy_cert_cors_probe','wisy_cert_settings')", ARRAY_A );
			foreach ( $rows as $row ) {
				foreach ( $pii as $p ) {
					if ( false !== stripos( $row['option_name'] . ' ' . $row['option_value'], $p ) ) {
						$leaks[] = $row['option_name'] . ' contient « ' . $p . ' »';
					}
				}
			}
			$log  = WP_CONTENT_DIR . '/debug.log';
			$text = file_exists( $log ) ? (string) file_get_contents( $log ) : '';
			foreach ( $pii as $p ) {
				if ( false !== stripos( $text, $p ) ) {
					$leaks[] = 'debug.log contient « ' . $p . ' »';
				}
			}
			$rl = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '_transient_wisy_rl_%'" );
			$plugin_lines = array_values( array_filter( explode( "\n", $text ), static function ( $l ) {
				return false !== stripos( $l, 'wisy-cert' );
			} ) );
			return array( 'leaks' => $leaks, 'rate_limit_counters' => $rl, 'debug_log_bytes' => strlen( $text ), 'plugin_log_lines' => $plugin_lines, 'debug_log_tail' => substr( $text, -2000 ), 'stats' => get_option( 'wisy_cert_stats' ) );
		} ) );
	}
);
