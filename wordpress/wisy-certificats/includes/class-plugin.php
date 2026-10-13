<?php
/**
 * Démarrage, activation, désactivation.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Plugin {

	const FLUSH_OPTION     = 'wisy_cert_flush_rewrite';
	const ACTIVATED_OPTION = 'wisy_cert_just_activated';

	public static function boot() {
		Wisy_Cert_Hardening::init();
		Wisy_Cert_REST::init();
		add_action( 'init', array( __CLASS__, 'init' ), 30 );
		add_action( 'before_delete_post', array( 'Wisy_Cert_Documents', 'on_delete_post' ) );
		if ( is_admin() ) {
			add_action( 'plugins_loaded', array( __CLASS__, 'admin' ) );
		}
	}

	public static function init() {
		Wisy_Cert_Schema::register_meta();
		Wisy_Cert_Documents::maybe_install();
		/* Les règles de réécriture sont recalculées APRÈS l'application des réglages privés du type « certificat ». */
		if ( get_option( self::FLUSH_OPTION ) ) {
			delete_option( self::FLUSH_OPTION );
			flush_rewrite_rules( false );
		}
	}

	public static function admin() {
		if ( class_exists( 'Wisy_Cert_Admin' ) ) {
			Wisy_Cert_Admin::init();
		}
		if ( class_exists( 'Wisy_Cert_Admin_Pages' ) ) {
			Wisy_Cert_Admin_Pages::init();
		}
	}

	public static function activate() {
		Wisy_Cert_Documents::install();
		Wisy_Cert_Settings::update( array() );
		Wisy_Cert_Secret::key( 'lookup' );
		Wisy_Cert_Repository::reindex_all();
		update_option( self::FLUSH_OPTION, 1, false );
		update_option( self::ACTIVATED_OPTION, 1, false );
		delete_option( Wisy_Cert_REST::CORS_PROBE );
	}

	public static function deactivate() {
		/* Rien n'est supprimé : certificats, PDF du coffre, réglages et clé restent en place. */
		delete_option( self::ACTIVATED_OPTION );
		flush_rewrite_rules( false );
	}
}
