<?php
/**
 * TESTS UNIQUEMENT — données 100 % FICTIVES pour le WordPress de test (WordPress Playground).
 * Jamais exécuté en production : ce fichier n'est pas dans l'extension (wordpress/wisy-certificats).
 *
 * Crée :
 *   1. trois certificats « ancien système » (titre = nom complet, métadonnées type ACF, PDF public
 *      dans la médiathèque) pour tester la REPRISE ;
 *   2. les certificats du CSV tests/wordpress/fixtures/certificats-test.csv via l'import de l'extension ;
 *   3. des PDF dans le coffre privé, un brouillon, et les réglages du banc d'essai.
 *
 * Lancé par tests/wordpress/run-integration.js (étape « runPHP » du blueprint).
 */

if ( ! defined( 'WISY_TEST_MODE' ) ) {
	exit( "WISY_TEST_MODE absent : seed refusé.\n" );
}

$pdf = file_get_contents( '/fixtures-gen/certificat-test.pdf' );

/* Permaliens « jolis » comme en production (/wp-json/…). */
global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );
flush_rewrite_rules( false );

/* ---------- 1. Ancien système ---------- */
function wisy_test_legacy( $title, array $meta, $pdf = null ) {
	$id = wp_insert_post( array( 'post_type' => 'certificat', 'post_status' => 'publish', 'post_title' => $title ), true );
	foreach ( $meta as $k => $v ) {
		update_post_meta( $id, $k, $v );
	}
	if ( $pdf ) {
		$up = wp_upload_bits( 'certificat-' . $id . '.pdf', null, $pdf );
		$att = wp_insert_attachment( array( 'post_mime_type' => 'application/pdf', 'post_title' => 'Certificat ' . $id, 'post_status' => 'inherit' ), $up['file'], $id );
		update_post_meta( $id, 'certificat_pdf', $att );
	}
	return $id;
}
$legacy = array(
	'lefevre'  => wisy_test_legacy( 'Jean-Marc Lefèvre', array( 'date_naissance' => '19850327', '_date_naissance' => 'field_6512a1', 'numero_diplome' => 'TEST-OLD-0001', 'formation' => 'VCA Base', 'date_formation' => '20240315', 'date_validite' => '15/03/2034', 'telephone_employeur' => '+32 2 000 00 09', 'email_entreprise' => 'contact@fictive.test' ), $pdf ),
	'vandamme' => wisy_test_legacy( 'Sofia Van Damme', array( 'date_naissance' => '19900101', '_date_naissance' => 'field_6512a1', 'numero_diplome' => 'TEST-OLD-0002', 'formation' => 'BEPS — Premier secours', 'date_formation' => '20190101', 'date_validite' => '01/01/2020' ) ),
	'ali'      => wisy_test_legacy( 'Ali', array( 'numero_diplome' => 'TEST-OLD-0003', 'formation' => 'Fibre optique', 'date_validite' => '31/12/2030' ) ),
);

/* ---------- 2. Import CSV (même code que l'écran « Importer ») ---------- */
$csv    = file_get_contents( '/fixtures/certificats-test.csv' );
$report = Wisy_Cert_CSV_Import::run( $csv, array( 'dry_run' => false, 'update_existing' => true, 'status' => 'publish' ) );

$ids = array();
foreach ( $report['rows'] as $row ) {
	if ( $row['post_id'] ) {
		$ids[ $row['line'] ] = $row['post_id'];
	}
}
/* Lignes du CSV : 2 Dupont VCA, 3 Dupont PEMP, 4 Müller (révoqué), 5 D'Hondt (sans expiration), 6 Ngô, 7 Leroy (PDF masqué), 8 Martin (→ brouillon), 9 Sans-Date. */
foreach ( array( 2, 4, 7, 8 ) as $line ) {
	Wisy_Cert_Documents::store( $ids[ $line ], $pdf, 'certificat-test.pdf', 'test' );
}
wp_update_post( array( 'ID' => $ids[8], 'post_status' => 'draft' ) );

/* ---------- 3. Réglages du banc d'essai ---------- */
Wisy_Cert_Settings::update(
	array(
		'allowed_origins'     => array( 'http://127.0.0.1:4310', 'http://localhost:4310', 'https://rayanevanosselt.github.io' ),
		'ip_header'           => 'HTTP_X_REAL_IP',
		'cors_mode'           => 'plugin',
		'limit_ip_short'      => 10,
		'limit_ip_day'        => 60,
		'limit_name_failures' => 8,
		'limit_documents'     => 30,
	)
);

update_option( 'wisy_test_fixture', array( 'legacy' => $legacy, 'csv' => $ids, 'csv_summary' => $report['summary'] ), false );
echo "SEED OK\n";
