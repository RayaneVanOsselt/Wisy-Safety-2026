<?php
/**
 * Plugin Name:       Wisy Certificats — Vérification sécurisée
 * Plugin URI:        https://www.wisysafety.be/certificats.html
 * Description:       Registre des certificats de formation Wisy Safety et API de vérification (nom de famille + date de naissance) pour la page « Certificats » du site public. Données minimisées, PDF conservés hors de la médiathèque publique, tentatives limitées côté serveur.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Wisy Safety
 * License:           GPL-2.0-or-later
 * Text Domain:       wisy-certificats
 *
 * Documentation complète : docs/README-CERTIFICATS.md (dépôt du site).
 */

defined( 'ABSPATH' ) || exit;

define( 'WISY_CERT_VERSION', '1.0.0' );
define( 'WISY_CERT_FILE', __FILE__ );
define( 'WISY_CERT_DIR', plugin_dir_path( __FILE__ ) );
define( 'WISY_CERT_URL', plugin_dir_url( __FILE__ ) );

require_once WISY_CERT_DIR . 'includes/class-schema.php';
require_once WISY_CERT_DIR . 'includes/class-settings.php';
require_once WISY_CERT_DIR . 'includes/class-secret.php';
require_once WISY_CERT_DIR . 'includes/class-normalizer.php';
require_once WISY_CERT_DIR . 'includes/class-status.php';
require_once WISY_CERT_DIR . 'includes/class-documents.php';
require_once WISY_CERT_DIR . 'includes/class-repository.php';
require_once WISY_CERT_DIR . 'includes/class-rate-limiter.php';
require_once WISY_CERT_DIR . 'includes/class-stats.php';
require_once WISY_CERT_DIR . 'includes/class-hardening.php';
require_once WISY_CERT_DIR . 'includes/class-rest.php';
require_once WISY_CERT_DIR . 'includes/class-csv-import.php';
require_once WISY_CERT_DIR . 'includes/class-legacy.php';
require_once WISY_CERT_DIR . 'includes/class-plugin.php';

if ( is_admin() ) {
	require_once WISY_CERT_DIR . 'admin/class-admin.php';
	require_once WISY_CERT_DIR . 'admin/class-admin-pages.php';
}

register_activation_hook( __FILE__, array( 'Wisy_Cert_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Wisy_Cert_Plugin', 'deactivate' ) );

Wisy_Cert_Plugin::boot();
