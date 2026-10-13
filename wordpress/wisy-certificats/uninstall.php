<?php
/**
 * Désinstallation (suppression de l'extension depuis l'écran Extensions).
 *
 * PAR SÉCURITÉ, LES DONNÉES NE SONT PAS SUPPRIMÉES : les certificats (articles « certificat »), leurs
 * champs et le coffre des PDF restent dans la base. Seuls les réglages techniques et compteurs
 * sont effacés. Pour tout effacer volontairement, ajoutez d'abord dans wp-config.php :
 *     define( 'WISY_CERT_UNINSTALL_DELETE_DATA', true );
 *
 * @package Wisy_Certificats
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'wisy_cert_settings' );
delete_option( 'wisy_cert_stats' );
delete_option( 'wisy_cert_cors_probe' );
delete_option( 'wisy_cert_flush_rewrite' );
delete_option( 'wisy_cert_just_activated' );
delete_option( 'wisy_cert_legacy_map' );

if ( defined( 'WISY_CERT_UNINSTALL_DELETE_DATA' ) && true === WISY_CERT_UNINSTALL_DELETE_DATA ) {
	global $wpdb;
	$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'wisy_cert_documents' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE %s", $wpdb->esc_like( '_wisy_cert_' ) . '%' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	delete_option( 'wisy_cert_secret' );
	delete_option( 'wisy_cert_index_fp' );
	delete_option( 'wisy_cert_db_version' );
}
