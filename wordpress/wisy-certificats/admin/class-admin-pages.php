<?php
/**
 * Écrans de gestion : tableau de bord (qualité des données, sécurité, activité), import CSV,
 * reprise des anciennes données, réglages. Réservés aux administrateurs (manage_options).
 *
 * Les rapports d'import et de reprise sont affichés dans la réponse au formulaire et ne sont
 * jamais enregistrés (ils contiennent des noms).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Admin_Pages {

	const CAP = 'manage_options';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_wisy_cert_template', array( __CLASS__, 'download_template' ) );
		add_action( 'admin_init', array( __CLASS__, 'maintenance' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
	}

	private static function parent() {
		return 'edit.php?post_type=' . Wisy_Cert_Schema::POST_TYPE;
	}

	public static function page_url( $slug ) {
		return admin_url( self::parent() . '&page=' . $slug );
	}

	public static function menu() {
		add_submenu_page( self::parent(), 'Vérification — tableau de bord', 'Tableau de bord', self::CAP, 'wisy-cert-dashboard', array( __CLASS__, 'dashboard' ) );
		add_submenu_page( self::parent(), 'Importer des certificats (CSV)', 'Importer (CSV)', self::CAP, 'wisy-cert-import', array( __CLASS__, 'import' ) );
		add_submenu_page( self::parent(), 'Reprise des anciennes données', 'Reprise des données', self::CAP, 'wisy-cert-legacy', array( __CLASS__, 'legacy' ) );
		add_submenu_page( self::parent(), 'Réglages de la vérification', 'Réglages', self::CAP, 'wisy-cert-settings', array( __CLASS__, 'settings' ) );
	}

	public static function assets( $hook ) {
		if ( false !== strpos( (string) $hook, 'wisy-cert-' ) ) {
			wp_enqueue_style( 'wisy-cert-admin', WISY_CERT_URL . 'admin/admin.css', array(), WISY_CERT_VERSION );
		}
	}

	/** Index reconstruit si la clé a changé ; détection CORS de l'hébergeur au plus une fois par jour. */
	public static function maintenance() {
		if ( ! current_user_can( self::CAP ) || wp_doing_ajax() ) {
			return;
		}
		Wisy_Cert_Repository::maybe_reindex();
		$probe = get_option( Wisy_Cert_REST::CORS_PROBE );
		$stale = ! is_array( $probe ) || ( time() - (int) $probe['checked_at'] ) > WEEK_IN_SECONDS;
		if ( $stale && ! get_transient( 'wisy_cert_probe_attempt' ) ) {
			set_transient( 'wisy_cert_probe_attempt', 1, DAY_IN_SECONDS );
			Wisy_Cert_REST::detect_host_cors();
		}
	}

	private static function header( $title, $lead ) {
		echo '<div class="wrap wisy-cert-wrap"><h1 class="wisy-cert-title"><span class="dashicons dashicons-awards" aria-hidden="true"></span> ' . esc_html( $title ) . '</h1>';
		echo '<p class="wisy-cert-lead">' . wp_kses( $lead, array( 'strong' => array(), 'code' => array(), 'a' => array( 'href' => array() ) ) ) . '</p>';
		echo '<nav class="wisy-cert-tabs">';
		$tabs = array( 'wisy-cert-dashboard' => 'Tableau de bord', 'wisy-cert-import' => 'Importer (CSV)', 'wisy-cert-legacy' => 'Reprise des données', 'wisy-cert-settings' => 'Réglages' );
		$cur  = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- navigation.
		foreach ( $tabs as $slug => $label ) {
			echo '<a class="' . ( $slug === $cur ? 'is-active' : '' ) . '" href="' . esc_url( self::page_url( $slug ) ) . '">' . esc_html( $label ) . '</a>';
		}
		echo '</nav>';
	}

	private static function footer() {
		echo '<p class="wisy-cert-foot">Wisy Certificats ' . esc_html( WISY_CERT_VERSION ) . ' · Documentation : <code>docs/README-CERTIFICATS.md</code> (dépôt du site).</p></div>';
	}

	/** Contrôle commun des formulaires : nonce + droits. */
	private static function posted( $action ) {
		if ( 'POST' !== ( isset( $_SERVER['REQUEST_METHOD'] ) ? $_SERVER['REQUEST_METHOD'] : '' ) || empty( $_POST['wisy_cert_action'] ) || $action !== $_POST['wisy_cert_action'] ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			return false;
		}
		check_admin_referer( 'wisy_cert_' . $action );
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		return true;
	}

	/* ================================================================== tableau de bord */

	public static function dashboard() {
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		$notice = '';
		if ( self::posted( 'reindex' ) ) {
			$n      = Wisy_Cert_Repository::reindex_all();
			$notice = 'Index de recherche reconstruit (' . (int) $n . ' certificats).';
		}
		if ( self::posted( 'probe' ) ) {
			$p      = Wisy_Cert_REST::detect_host_cors();
			$notice = $p['reachable'] ? 'Test CORS effectué.' : 'Test impossible : le serveur ne parvient pas à interroger sa propre API (' . esc_html( (string) $p['raw'] ) . ').';
		}

		$ids    = Wisy_Cert_Repository::all_ids();
		$count  = array( 'total' => count( $ids ), 'publish' => 0, 'searchable' => 0, 'valid' => 0, 'expired' => 0, 'revoked' => 0, 'undetermined' => 0, 'no_pdf' => 0 );
		$issues = array();
		$diplos = array();
		foreach ( $ids as $id ) {
			$rec = Wisy_Cert_Repository::get( $id );
			$st  = Wisy_Cert_Status::current( $rec );
			if ( 'publish' === $rec['status'] ) {
				++$count['publish'];
				++$count[ $st ];
				if ( get_post_meta( $id, Wisy_Cert_Schema::LOOKUP_META, false ) ) {
					++$count['searchable'];
				}
			}
			if ( ! Wisy_Cert_Documents::current( $id ) ) {
				++$count['no_pdf'];
			}
			$list = array_filter( Wisy_Cert_Status::issues( $rec ), static function ( $i ) {
				return 'error' === $i['level'];
			} );
			if ( '' !== $rec['diploma_number'] ) {
				$k = strtolower( $rec['diploma_number'] );
				if ( isset( $diplos[ $k ] ) ) {
					$list[] = array( 'level' => 'error', 'code' => 'dup', 'message' => 'Même numéro de diplôme que #' . $diplos[ $k ] . '.' );
				} else {
					$diplos[ $k ] = $id;
				}
			}
			if ( $list ) {
				$issues[ $id ] = $list;
			}
		}
		$public  = Wisy_Cert_Documents::public_copies();
		$exposed = count( $public );

		self::header( 'Vérification des certificats', 'Registre des certificats de formation et API de vérification utilisée par la page « Certificats » du site.' );
		if ( $notice ) {
			echo '<div class="notice notice-success"><p>' . esc_html( $notice ) . '</p></div>';
		}

		echo '<div class="wisy-kpis">';
		self::kpi( $count['total'], 'certificats', 'dont ' . $count['publish'] . ' publiés' );
		self::kpi( $count['searchable'], 'vérifiables', 'publiés, avec nom et date de naissance', $count['searchable'] < $count['publish'] ? 'warn' : 'ok' );
		self::kpi( $count['valid'], 'valides', 'à la date du ' . mysql2date( 'd/m/Y', Wisy_Cert_Settings::today() ), 'ok' );
		self::kpi( $count['expired'], 'expirés', '', '' );
		self::kpi( $count['revoked'], 'révoqués', '', '' );
		self::kpi( $count['undetermined'], 'sans date de validité', 'statut « validité non précisée »', $count['undetermined'] ? 'warn' : '' );
		self::kpi( $count['no_pdf'], 'sans PDF privé', '', $count['no_pdf'] ? 'warn' : 'ok' );
		self::kpi( $exposed, 'PDF encore publics', 'médiathèque — à retirer après reprise', $exposed ? 'ko' : 'ok' );
		echo '</div>';

		echo '<h2>À corriger</h2>';
		if ( ! $issues ) {
			echo '<p class="wisy-ok">Aucune erreur bloquante détectée.</p>';
		} else {
			echo '<table class="widefat striped wisy-table"><thead><tr><th>Certificat</th><th>Problème</th></tr></thead><tbody>';
			foreach ( array_slice( $issues, 0, 200, true ) as $id => $list ) {
				echo '<tr><td><a href="' . esc_url( (string) get_edit_post_link( $id ) ) . '">' . esc_html( get_the_title( $id ) ? get_the_title( $id ) : '#' . $id ) . '</a></td><td>' . esc_html( implode( ' ', wp_list_pluck( $list, 'message' ) ) ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}

		echo '<h2>Sécurité et connexion</h2><ul class="wisy-diag">';
		$api   = rest_url( Wisy_Cert_REST::NS );
		$probe = get_option( Wisy_Cert_REST::CORS_PROBE );
		self::diag( true, 'Adresse de l’API à indiquer dans la page Certificats du site : <code>' . esc_html( untrailingslashit( $api ) ) . '</code>' );
		self::diag( is_ssl() || 0 === strpos( $api, 'https://' ), 'HTTPS ' . ( 0 === strpos( $api, 'https://' ) ? 'actif' : 'INACTIF : les données circuleraient en clair' ) );
		self::diag( (bool) Wisy_Cert_Settings::get( 'allowed_origins' ), 'Origines autorisées : <code>' . esc_html( implode( ', ', (array) Wisy_Cert_Settings::get( 'allowed_origins' ) ) ) . '</code>' );
		if ( is_array( $probe ) ) {
			$txt = $probe['success'] ? 'l’hébergeur ajoute déjà « Access-Control-Allow-Origin » aux réponses réussies (« ' . esc_html( (string) $probe['raw'] ) . ' ») : l’extension ne le double pas' : 'l’hébergeur n’ajoute pas d’en-tête CORS : l’extension l’envoie elle-même';
			self::diag( true, 'CORS (test du ' . esc_html( wp_date( 'd/m/Y H:i', (int) $probe['checked_at'] ) ) . ') : ' . $txt . '.' );
		} else {
			self::diag( false, 'CORS : test de l’hébergeur pas encore effectué (bouton ci-dessous).' );
		}
		self::diag( 'constant' === Wisy_Cert_Secret::source(), 'Clé secrète : ' . ( 'constant' === Wisy_Cert_Secret::source() ? 'définie dans wp-config.php (recommandé)' : 'générée et stockée dans la base (fonctionne ; plus sûr : constante WISY_CERT_SECRET dans wp-config.php)' ), 'constant' === Wisy_Cert_Secret::source() ? 'ok' : 'warn' );
		self::diag( Wisy_Cert_Documents::table_exists(), 'Coffre privé des PDF (table ' . esc_html( Wisy_Cert_Documents::table() ) . ')' );
		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$proxy  = array();
		foreach ( array_keys( Wisy_Cert_Settings::IP_HEADERS ) as $h ) {
			if ( $h && ! empty( $_SERVER[ $h ] ) ) {
				$proxy[] = $h;
			}
		}
		$private = $remote && ! filter_var( $remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
		self::diag( ! $private || '' !== (string) Wisy_Cert_Settings::get( 'ip_header' ), 'Adresse IP vue par WordPress pour votre visite : ' . ( $private ? 'adresse de proxy (' . esc_html( $remote ) . ')' : 'adresse publique' ) . ( $proxy ? ' — en-têtes de proxy présents : <code>' . esc_html( implode( ', ', $proxy ) ) . '</code>' : '' ) . ( $private && '' === (string) Wisy_Cert_Settings::get( 'ip_header' ) ? '. <strong>Choisissez l’en-tête de proxy dans les réglages</strong>, sinon tous les visiteurs partagent la même limite.' : '' ), $private && '' === (string) Wisy_Cert_Settings::get( 'ip_header' ) ? 'ko' : 'ok' );
		self::diag( (bool) Wisy_Cert_Settings::get( 'harden_cpt' ), 'Liste publique des certificats (API REST, pages, sitemap) : ' . ( Wisy_Cert_Settings::get( 'harden_cpt' ) ? 'fermée' : 'OUVERTE' ) );
		self::diag( Wisy_Cert_Settings::turnstile_enabled() || '' === (string) Wisy_Cert_Settings::get( 'turnstile_site_key' ), 'Anti-robot Cloudflare Turnstile : ' . ( Wisy_Cert_Settings::turnstile_enabled() ? 'actif' : 'non activé (facultatif)' ), Wisy_Cert_Settings::turnstile_enabled() ? 'ok' : 'info' );
		echo '</ul>';
		echo '<div class="wisy-actions">';
		self::button( 'reindex', 'Reconstruire l’index de recherche', 'secondary' );
		self::button( 'probe', 'Tester la connexion CORS', 'secondary' );
		echo '</div>';

		$t = Wisy_Cert_Stats::totals( 30 );
		echo '<h2>Activité des 30 derniers jours</h2><p class="description">Compteurs agrégés par jour, sans aucune donnée personnelle (ni nom, ni date, ni adresse IP). Conservés 90 jours.</p>';
		echo '<div class="wisy-kpis wisy-kpis--small">';
		self::kpi( $t['found'], 'vérifications réussies' );
		self::kpi( $t['not_found'], 'sans résultat' );
		self::kpi( $t['invalid'], 'saisies invalides' );
		self::kpi( $t['limited'], 'tentatives bloquées', 'limitation de débit', $t['limited'] > 50 ? 'warn' : '' );
		self::kpi( $t['document'], 'PDF consultés' );
		self::kpi( $t['origin_denied'] + $t['document_denied'], 'accès refusés' );
		echo '</div>';
		self::footer();
	}

	private static function kpi( $n, $label, $sub = '', $tone = '' ) {
		echo '<div class="wisy-kpi' . ( $tone ? ' wisy-kpi--' . esc_attr( $tone ) : '' ) . '"><span class="wisy-kpi__n">' . (int) $n . '</span><span class="wisy-kpi__l">' . esc_html( $label ) . '</span>' . ( $sub ? '<span class="wisy-kpi__s">' . esc_html( $sub ) . '</span>' : '' ) . '</div>';
	}

	private static function diag( $ok, $html, $tone = null ) {
		$tone = $tone ? $tone : ( $ok ? 'ok' : 'ko' );
		echo '<li class="wisy-diag--' . esc_attr( $tone ) . '">' . wp_kses( $html, array( 'code' => array(), 'strong' => array() ) ) . '</li>';
	}

	private static function button( $action, $label, $class = 'primary', $extra = '' ) {
		echo '<form method="post" class="wisy-inline">';
		wp_nonce_field( 'wisy_cert_' . $action );
		echo '<input type="hidden" name="wisy_cert_action" value="' . esc_attr( $action ) . '">' . $extra; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- champs fixes.
		submit_button( $label, $class, 'submit', false );
		echo '</form>';
	}

	/* ================================================================== import CSV */

	public static function download_template() {
		check_admin_referer( 'wisy_cert_template' );
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="modele-import-certificats.csv"' );
		echo Wisy_Cert_CSV_Import::template_csv(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV fixe.
		exit;
	}

	public static function import() {
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		$report = null;
		$error  = '';
		$dry    = true;
		if ( self::posted( 'import' ) ) {
			$dry = empty( $_POST['wisy_cert_mode'] ) || 'import' !== $_POST['wisy_cert_mode'];
			if ( empty( $_FILES['wisy_cert_csv']['tmp_name'] ) || UPLOAD_ERR_OK !== (int) $_FILES['wisy_cert_csv']['error'] || ! is_uploaded_file( $_FILES['wisy_cert_csv']['tmp_name'] ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
				$error = 'Choisissez un fichier CSV.';
			} else {
				$contents = file_get_contents( $_FILES['wisy_cert_csv']['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Security.ValidatedSanitizedInput
				$report   = Wisy_Cert_CSV_Import::run(
					(string) $contents,
					array(
						'dry_run'         => $dry,
						'update_existing' => ! empty( $_POST['wisy_cert_update'] ),
						'status'          => ( isset( $_POST['wisy_cert_status'] ) && 'draft' === $_POST['wisy_cert_status'] ) ? 'draft' : 'publish',
					)
				);
				if ( ! $report['ok'] ) {
					$error  = $report['error'];
					$report = null;
				}
			}
		}
		self::header( 'Importer des certificats (CSV)', 'Ajoutez ou mettez à jour plusieurs certificats à partir d’un tableur. <strong>Commencez toujours par une simulation</strong> : rien n’est écrit tant que vous ne choisissez pas « Importer ».' );
		$tpl = wp_nonce_url( admin_url( 'admin-post.php?action=wisy_cert_template' ), 'wisy_cert_template' );
		echo '<div class="wisy-card"><h2>1. Préparer le fichier</h2><ol>';
		echo '<li><a class="button" href="' . esc_url( $tpl ) . '">Télécharger le modèle CSV</a> — une ligne par certificat.</li>';
		echo '<li>Colonnes obligatoires : <code>nom</code> et <code>formation</code>. Pour être vérifiable, un certificat doit aussi avoir <code>date_naissance</code>.</li>';
		echo '<li>Dates au format <code>JJ/MM/AAAA</code> (ex. 27/03/1985) ou <code>AAAA-MM-JJ</code>. Une date illisible fait rejeter la ligne : rien n’est deviné.</li>';
		echo '<li><code>revoque</code> et <code>masquer_pdf</code> : <code>oui</code> ou <code>non</code>. Une cellule vide ne modifie jamais une valeur existante.</li>';
		echo '<li>Dans Excel : « Enregistrer sous » → « CSV UTF-8 (délimité par des virgules) » ou « CSV (séparateur : point-virgule) ».</li>';
		echo '<li>Pas de doublon à la réimportation : une ligne met à jour le certificat qui a le même <code>id_wordpress</code> ou le même <code>numero_diplome</code>.</li>';
		echo '<li>Les PDF s’ajoutent ensuite certificat par certificat (fiche du certificat → « Document PDF »).</li>';
		echo '</ol></div>';

		echo '<form method="post" enctype="multipart/form-data" class="wisy-card"><h2>2. Simuler, puis importer</h2>';
		wp_nonce_field( 'wisy_cert_import' );
		echo '<input type="hidden" name="wisy_cert_action" value="import">';
		echo '<p><label for="wisy-cert-csv"><strong>Fichier CSV</strong> (2 Mo maximum)</label><br><input type="file" id="wisy-cert-csv" name="wisy_cert_csv" accept=".csv,text/csv" required></p>';
		echo '<fieldset><legend><strong>Mode</strong></legend><label><input type="radio" name="wisy_cert_mode" value="simulate"' . checked( $dry, true, false ) . '> Simulation (aucune écriture)</label><br><label><input type="radio" name="wisy_cert_mode" value="import"' . checked( $dry, false, false ) . '> Importer pour de bon</label></fieldset>';
		echo '<p><label><input type="checkbox" name="wisy_cert_update" value="1" checked> Mettre à jour les certificats existants (même id_wordpress ou même numéro de diplôme)</label></p>';
		echo '<p><label for="wisy-cert-status">Nouveaux certificats : </label><select id="wisy-cert-status" name="wisy_cert_status"><option value="publish">publiés (vérifiables tout de suite)</option><option value="draft">brouillons (à relire, puis publier)</option></select></p>';
		submit_button( 'Lancer', 'primary', 'submit', false );
		echo '</form>';

		if ( $error ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html( $error ) . '</p></div>';
		}
		if ( $report ) {
			self::render_import_report( $report, $dry );
		}
		self::footer();
	}

	private static function render_import_report( array $report, $dry ) {
		$s = $report['summary'];
		echo '<div class="wisy-card"><h2>' . ( $dry ? 'Résultat de la simulation (rien n’a été écrit)' : 'Résultat de l’import' ) . '</h2>';
		echo '<div class="wisy-kpis wisy-kpis--small">';
		self::kpi( $s['created'], $dry ? 'à créer' : 'créés', '', 'ok' );
		self::kpi( $s['updated'], $dry ? 'à mettre à jour' : 'mis à jour', '', 'ok' );
		self::kpi( $s['unchanged'], 'inchangés' );
		self::kpi( $s['skipped'], 'ignorés' );
		self::kpi( $s['errors'], 'lignes en erreur', $dry ? 'non importées' : 'non importées', $s['errors'] ? 'ko' : '' );
		self::kpi( $s['not_searchable'], 'sans date de naissance', 'non vérifiables', $s['not_searchable'] ? 'warn' : '' );
		echo '</div>';
		if ( ! empty( $report['unknown_columns'] ) ) {
			echo '<p class="wisy-issue wisy-issue--warning">Colonnes ignorées (non reconnues) : ' . esc_html( implode( ', ', $report['unknown_columns'] ) ) . '</p>';
		}
		$labels = array( 'created' => $dry ? 'À créer' : 'Créé', 'updated' => $dry ? 'À mettre à jour' : 'Mis à jour', 'unchanged' => 'Inchangé', 'skipped' => 'Ignoré', 'error' => 'Erreur' );
		echo '<table class="widefat striped wisy-table"><thead><tr><th>Ligne</th><th>Titulaire</th><th>Action</th><th>Détails</th></tr></thead><tbody>';
		foreach ( $report['rows'] as $row ) {
			$link = $row['post_id'] ? ' <a href="' . esc_url( (string) get_edit_post_link( $row['post_id'] ) ) . '">#' . (int) $row['post_id'] . '</a>' : '';
			echo '<tr class="wisy-row--' . esc_attr( $row['action'] ) . '"><td>' . (int) $row['line'] . '</td><td>' . esc_html( $row['label'] ) . $link . '</td><td>' . esc_html( $labels[ $row['action'] ] ) . '</td><td>' . esc_html( implode( ' ', $row['messages'] ) ) . '</td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $link échappé.
		}
		echo '</tbody></table>';
		if ( $dry && ! $s['errors'] ) {
			echo '<p class="wisy-ok">Aucune erreur : vous pouvez relancer avec le même fichier en mode « Importer pour de bon ».</p>';
		}
		echo '</div>';
	}

	/* ================================================================== reprise */

	public static function legacy() {
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		$discovered = Wisy_Cert_Legacy::discover();
		$map        = Wisy_Cert_Legacy::saved_map();
		if ( ! $map ) {
			$map = Wisy_Cert_Legacy::guess( $discovered );
		}
		$report = null;
		$notice = '';
		$dry    = true;
		if ( self::posted( 'legacy' ) ) {
			$map = self::read_map( $discovered );
			$dry = empty( $_POST['wisy_cert_mode'] ) || 'run' !== $_POST['wisy_cert_mode'];
			$report = Wisy_Cert_Legacy::run(
				$map,
				array(
					'dry_run'   => $dry,
					'overwrite' => ! empty( $_POST['wisy_cert_overwrite'] ),
					'copy_pdf'  => ! empty( $_POST['wisy_cert_copy_pdf'] ),
				)
			);
		}
		if ( self::posted( 'unpublish_pdf' ) ) {
			if ( empty( $_POST['wisy_cert_backup_done'] ) ) {
				$notice = 'Cochez la case de confirmation de sauvegarde pour retirer les PDF publics.';
			} else {
				$removed = 0;
				foreach ( Wisy_Cert_Documents::public_copies() as $copy ) {
					if ( $copy['secured'] && wp_delete_attachment( $copy['attachment'], true ) ) {
						++$removed;
					}
				}
				$notice = $removed . ' PDF public(s) retiré(s) de la médiathèque (une copie identique reste dans le coffre privé).';
			}
		}

		self::header( 'Reprise des anciennes données', 'Reprend les certificats déjà présents dans WordPress <strong>sans rien supprimer</strong> : les anciens champs restent intacts et servent de sauvegarde. Étapes : vérifier la correspondance des champs → <strong>simuler</strong> → lancer la reprise → retirer les PDF publics.' );
		if ( $notice ) {
			echo '<div class="notice notice-info inline"><p>' . esc_html( $notice ) . '</p></div>';
		}

		echo '<div class="wisy-card"><h2>1. Champs trouvés dans vos certificats</h2>';
		echo '<p class="description">Découverts dans la base de données (valeurs masquées). « Taux » = nombre de certificats où le champ est rempli.</p>';
		if ( ! $discovered ) {
			echo '<p>Aucun champ personnalisé trouvé : seules les données du titre (nom complet) et les PDF rattachés peuvent être repris.</p>';
		} else {
			$kinds = array( 'date' => 'date', 'email' => 'e-mail', 'phone' => 'téléphone', 'attachment' => 'pièce jointe / PDF', 'text' => 'texte' );
			echo '<table class="widefat striped wisy-table"><thead><tr><th>Clé technique</th><th>Taux</th><th>Type détecté</th><th>Exemples (masqués)</th></tr></thead><tbody>';
			foreach ( $discovered as $key => $info ) {
				$fmt = $info['format'] ? ' — ' . Wisy_Cert_Normalizer::DATE_FORMATS[ $info['format'] ] . ' (' . $info['recognised'] . '/' . $info['total'] . ' lisibles)' : '';
				echo '<tr><td><code>' . esc_html( $key ) . '</code></td><td>' . (int) $info['count'] . ' / ' . count( Wisy_Cert_Repository::all_ids() ) . '</td><td>' . esc_html( $kinds[ $info['kind'] ] . $fmt ) . '</td><td>' . esc_html( implode( ' · ', $info['samples'] ) ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}
		echo '</div>';

		echo '<form method="post" class="wisy-card"><h2>2. Correspondance des champs</h2><p class="description">Proposition automatique d’après les noms des clés : <strong>vérifiez chaque ligne</strong>. « — » = ne pas reprendre ce champ.</p>';
		wp_nonce_field( 'wisy_cert_legacy' );
		echo '<input type="hidden" name="wisy_cert_action" value="legacy"><table class="form-table wisy-map"><tbody>';
		foreach ( Wisy_Cert_Schema::fields() as $field => $def ) {
			$cur = isset( $map[ $field ] ) ? (string) $map[ $field ] : '';
			echo '<tr><th scope="row"><label for="wisy-map-' . esc_attr( $field ) . '">' . esc_html( $def['label'] ) . '</label></th><td><select id="wisy-map-' . esc_attr( $field ) . '" name="wisy_map[' . esc_attr( $field ) . ']"><option value="">—</option>';
			if ( in_array( $field, array( 'last_name', 'first_name' ), true ) ) {
				echo '<option value="' . esc_attr( Wisy_Cert_Legacy::TITLE ) . '"' . selected( $cur, Wisy_Cert_Legacy::TITLE, false ) . '>Titre du certificat (nom complet)</option>';
			}
			foreach ( $discovered as $key => $info ) {
				echo '<option value="' . esc_attr( $key ) . '"' . selected( $cur, $key, false ) . '>' . esc_html( $key ) . '</option>';
			}
			echo '</select>';
			if ( 'date' === $def['type'] ) {
				$fcur = isset( $map[ 'fmt_' . $field ] ) ? (string) $map[ 'fmt_' . $field ] : ( ( $cur && isset( $discovered[ $cur ]['format'] ) && $discovered[ $cur ]['format'] ) ? $discovered[ $cur ]['format'] : 'auto' );
				echo ' <select name="wisy_map[fmt_' . esc_attr( $field ) . ']" aria-label="Format de ' . esc_attr( $def['label'] ) . '">';
				foreach ( Wisy_Cert_Normalizer::DATE_FORMATS as $f => $l ) {
					echo '<option value="' . esc_attr( $f ) . '"' . selected( $fcur, $f, false ) . '>' . esc_html( $l ) . '</option>';
				}
				echo '</select>';
			}
			echo '</td></tr>';
		}
		$mode = isset( $map['title_mode'] ) ? (string) $map['title_mode'] : 'first_last';
		echo '<tr><th scope="row"><label for="wisy-map-title-mode">Si le nom vient du titre</label></th><td><select id="wisy-map-title-mode" name="wisy_map[title_mode]">';
		foreach ( Wisy_Cert_Legacy::TITLE_MODES as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $mode, $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select><p class="description">Les titres de plus de deux mots sont signalés « à vérifier » (noms composés).</p></td></tr>';
		$pdf = isset( $map['pdf'] ) ? (string) $map['pdf'] : Wisy_Cert_Legacy::ATTACHED;
		echo '<tr><th scope="row"><label for="wisy-map-pdf">PDF</label></th><td><select id="wisy-map-pdf" name="wisy_map[pdf]"><option value="' . esc_attr( Wisy_Cert_Legacy::ATTACHED ) . '"' . selected( $pdf, Wisy_Cert_Legacy::ATTACHED, false ) . '>PDF rattachés au certificat dans la médiathèque</option>';
		foreach ( $discovered as $key => $info ) {
			echo '<option value="' . esc_attr( $key ) . '"' . selected( $pdf, $key, false ) . '>Champ ' . esc_html( $key ) . ' (ID ou adresse de la pièce jointe)</option>';
		}
		echo '</select></td></tr></tbody></table>';
		echo '<p><label><input type="checkbox" name="wisy_cert_copy_pdf" value="1" checked> Copier les PDF de la médiathèque dans le coffre privé</label><br><label><input type="checkbox" name="wisy_cert_overwrite" value="1"> Écraser les champs déjà remplis dans l’extension (déconseillé)</label></p>';
		echo '<fieldset><legend><strong>Mode</strong></legend><label><input type="radio" name="wisy_cert_mode" value="simulate"' . checked( $dry, true, false ) . '> Simulation (aucune écriture)</label><br><label><input type="radio" name="wisy_cert_mode" value="run"' . checked( $dry, false, false ) . '> Lancer la reprise</label></fieldset>';
		submit_button( 'Lancer', 'primary', 'submit', false );
		echo '</form>';

		if ( $report ) {
			self::render_legacy_report( $report, $dry );
		}

		$copies  = Wisy_Cert_Documents::public_copies();
		$secured = count( array_filter( wp_list_pluck( $copies, 'secured' ) ) );
		echo '<div class="wisy-card"><h2>3. Retirer les PDF publics</h2>';
		echo '<p>Les anciens PDF sont dans la médiathèque, <strong>téléchargeables par quiconque connaît leur adresse</strong>, même après la fermeture des listes publiques. Une fois copiés dans le coffre privé (étape 2), retirez-les de la médiathèque.</p>';
		echo '<p>' . (int) count( $copies ) . ' PDF public(s) rattaché(s) à des certificats, dont <strong>' . (int) $secured . '</strong> avec une copie identique (SHA-256) dans le coffre privé. Seuls ceux-ci seront retirés.</p>';
		echo '<p class="wisy-issue wisy-issue--warning">Avant de retirer les PDF : faites une <strong>sauvegarde complète</strong> du site (fichiers + base). La page de l’ancien site qui affichait ces PDF ne pourra plus les montrer : faites-le après la mise en ligne de la nouvelle page Certificats.</p>';
		if ( $secured ) {
			self::button( 'unpublish_pdf', 'Retirer de la médiathèque les ' . $secured . ' PDF sécurisés', 'delete', '<label class="wisy-confirm"><input type="checkbox" name="wisy_cert_backup_done" value="1" required> J’ai fait une sauvegarde complète du site</label> ' );
		}
		echo '</div>';
		self::footer();
	}

	private static function read_map( array $discovered ) {
		$in      = isset( $_POST['wisy_map'] ) && is_array( $_POST['wisy_map'] ) ? wp_unslash( $_POST['wisy_map'] ) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput -- nonce vérifié par posted(), valeurs comparées à des listes fermées.
		$allowed = array_keys( $discovered );
		$map     = array();
		foreach ( Wisy_Cert_Schema::fields() as $field => $def ) {
			$v = isset( $in[ $field ] ) ? (string) $in[ $field ] : '';
			if ( in_array( $v, $allowed, true ) || ( Wisy_Cert_Legacy::TITLE === $v && in_array( $field, array( 'last_name', 'first_name' ), true ) ) ) {
				$map[ $field ] = $v;
			}
			$f = isset( $in[ 'fmt_' . $field ] ) ? (string) $in[ 'fmt_' . $field ] : '';
			if ( 'date' === $def['type'] && isset( Wisy_Cert_Normalizer::DATE_FORMATS[ $f ] ) ) {
				$map[ 'fmt_' . $field ] = $f;
			}
		}
		$mode              = isset( $in['title_mode'] ) ? (string) $in['title_mode'] : 'first_last';
		$map['title_mode'] = isset( Wisy_Cert_Legacy::TITLE_MODES[ $mode ] ) ? $mode : 'first_last';
		$pdf               = isset( $in['pdf'] ) ? (string) $in['pdf'] : Wisy_Cert_Legacy::ATTACHED;
		$map['pdf']        = in_array( $pdf, $allowed, true ) ? $pdf : Wisy_Cert_Legacy::ATTACHED;
		return $map;
	}

	private static function render_legacy_report( array $report, $dry ) {
		$s = $report['summary'];
		echo '<div class="wisy-card"><h2>' . ( $dry ? 'Simulation de la reprise (rien n’a été écrit)' : 'Reprise effectuée' ) . '</h2><div class="wisy-kpis wisy-kpis--small">';
		self::kpi( $s['total'], 'certificats examinés' );
		self::kpi( $s['updated'], $dry ? 'à compléter' : 'complétés', '', 'ok' );
		self::kpi( $s['unchanged'], 'déjà à jour' );
		self::kpi( $s['errors'], 'avec erreur', 'à corriger à la main', $s['errors'] ? 'ko' : '' );
		self::kpi( $s['not_searchable'], 'non vérifiables', 'nom ou date de naissance manquant', $s['not_searchable'] ? 'warn' : '' );
		self::kpi( $s['pdf_copied'], $dry ? 'PDF à copier' : 'PDF copiés', '', 'ok' );
		self::kpi( $s['pdf_missing'], 'sans PDF', '', $s['pdf_missing'] ? 'warn' : '' );
		echo '</div><table class="widefat striped wisy-table"><thead><tr><th>Certificat</th><th>Action</th><th>Contrôles</th><th>PDF</th></tr></thead><tbody>';
		foreach ( $report['rows'] as $row ) {
			echo '<tr><td><a href="' . esc_url( (string) get_edit_post_link( $row['id'] ) ) . '">' . esc_html( $row['title'] ? $row['title'] : '#' . $row['id'] ) . '</a>' . ( 'publish' !== $row['status'] ? ' <em>(' . esc_html( $row['status'] ) . ')</em>' : '' ) . '</td><td>' . esc_html( 'updated' === $row['action'] ? ( $dry ? 'À compléter' : 'Complété' ) : 'Inchangé' ) . '</td><td>';
			foreach ( $row['messages'] as $m ) {
				echo '<span class="wisy-issue wisy-issue--' . esc_attr( $m[0] ) . '">' . esc_html( $m[1] ) . '</span> ';
			}
			echo '</td><td>' . esc_html( $row['pdf'] ) . '</td></tr>';
		}
		echo '</tbody></table></div>';
	}

	/* ================================================================== réglages */

	public static function settings() {
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		$saved = false;
		if ( self::posted( 'settings' ) ) {
			$in    = isset( $_POST['wisy_settings'] ) && is_array( $_POST['wisy_settings'] ) ? wp_unslash( $_POST['wisy_settings'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- Wisy_Cert_Settings::sanitize().
			foreach ( array( 'require_origin', 'pdf_public', 'harden_cpt', 'harden_media' ) as $b ) {
				$in[ $b ] = ! empty( $in[ $b ] );
			}
			Wisy_Cert_Settings::update( $in );
			update_option( Wisy_Cert_Plugin::FLUSH_OPTION, 1, false );
			delete_transient( 'wisy_cert_probe_attempt' );
			$saved = true;
		}
		$s = Wisy_Cert_Settings::all();
		self::header( 'Réglages de la vérification', 'Valeurs par défaut prudentes. Les clés secrètes ne se règlent pas ici : elles vont dans <code>wp-config.php</code> (voir la documentation).' );
		if ( $saved ) {
			echo '<div class="notice notice-success inline"><p>Réglages enregistrés.</p></div>';
		}
		echo '<form method="post" class="wisy-card">';
		wp_nonce_field( 'wisy_cert_settings' );
		echo '<input type="hidden" name="wisy_cert_action" value="settings"><table class="form-table"><tbody>';

		echo '<tr><th scope="row"><label for="ws-origins">Sites autorisés à interroger l’API</label></th><td><textarea id="ws-origins" name="wisy_settings[allowed_origins]" rows="4" class="large-text code">' . esc_textarea( implode( "\n", (array) $s['allowed_origins'] ) ) . '</textarea><p class="description">Une origine par ligne (protocole + domaine, sans chemin), par ex. <code>https://rayanevanosselt.github.io</code>. Toute autre origine reçoit « 403 ».</p></td></tr>';
		echo '<tr><th scope="row">Origine obligatoire</th><td><label><input type="checkbox" name="wisy_settings[require_origin]" value="1"' . checked( $s['require_origin'], true, false ) . '> Refuser les requêtes sans en-tête « Origin » (scripts hors navigateur)</label></td></tr>';
		echo '<tr><th scope="row"><label for="ws-cors">En-tête CORS</label></th><td><select id="ws-cors" name="wisy_settings[cors_mode]">';
		foreach ( array( 'auto' => 'Automatique (détecte ce que l’hébergeur ajoute déjà) — recommandé', 'plugin' => 'Toujours envoyé par l’extension', 'host' => 'Géré par l’hébergeur (réponses réussies)' ) as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $s['cors_mode'], $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select></td></tr>';
		echo '<tr><th scope="row"><label for="ws-ip">Adresse IP des visiteurs</label></th><td><select id="ws-ip" name="wisy_settings[ip_header]">';
		foreach ( Wisy_Cert_Settings::IP_HEADERS as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $s['ip_header'], $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select><p class="description">Ne choisissez un en-tête de proxy que si votre hébergeur ou Cloudflare est devant le site (voir le diagnostic du tableau de bord).</p></td></tr>';

		echo '<tr><th scope="row">Limites de tentatives</th><td class="wisy-limits">';
		self::num( 'limit_ip_short', $s, 'recherches par adresse IP par fenêtre de' );
		self::num( 'window_ip_short', $s, 'secondes ;' );
		self::num( 'limit_ip_day', $s, 'recherches par adresse IP par 24 h ;' );
		self::num( 'limit_name_failures', $s, 'échecs par nom recherché par 24 h ;' );
		self::num( 'limit_documents', $s, 'ouvertures de PDF par adresse IP par fenêtre.' );
		echo '</td></tr>';

		echo '<tr><th scope="row"><label for="ws-noexp">Certificat sans date de validité</label></th><td><select id="ws-noexp" name="wisy_settings[no_expiry_policy]"><option value="undetermined"' . selected( $s['no_expiry_policy'], 'undetermined', false ) . '>« Validité non précisée » — contacter Wisy Safety (recommandé)</option><option value="valid"' . selected( $s['no_expiry_policy'], 'valid', false ) . '>Valide sans limite de durée</option></select><p class="description">Ne choisissez « valide » que si cette règle est confirmée pour TOUTES vos formations.</p></td></tr>';
		echo '<tr><th scope="row"><label for="ws-tz">Fuseau horaire des validités</label></th><td><input id="ws-tz" type="text" name="wisy_settings[timezone]" value="' . esc_attr( $s['timezone'] ) . '" class="regular-text"><p class="description">« Valide à la date du jour » est évalué dans ce fuseau (Europe/Brussels).</p></td></tr>';
		echo '<tr><th scope="row">PDF</th><td><label><input type="checkbox" name="wisy_settings[pdf_public]" value="1"' . checked( $s['pdf_public'], true, false ) . '> Proposer le PDF après une vérification réussie (jamais pour un certificat révoqué)</label><br>';
		self::num( 'document_ttl', $s, 'secondes de validité du lien PDF ;' );
		self::num( 'max_pdf_mb', $s, 'Mo maximum par PDF.' );
		echo '</td></tr>';
		echo '<tr><th scope="row">Durcissement</th><td><label><input type="checkbox" name="wisy_settings[harden_cpt]" value="1"' . checked( $s['harden_cpt'], true, false ) . '> Retirer les certificats de l’API REST publique, des pages publiques, de la recherche et du sitemap</label><br><label><input type="checkbox" name="wisy_settings[harden_media]" value="1"' . checked( $s['harden_media'], true, false ) . '> Masquer les PDF de certificats de l’API médias publique</label></td></tr>';
		echo '<tr><th scope="row"><label for="ws-ts">Cloudflare Turnstile (facultatif)</label></th><td><input id="ws-ts" type="text" name="wisy_settings[turnstile_site_key]" value="' . esc_attr( $s['turnstile_site_key'] ) . '" class="regular-text code" autocomplete="off"><p class="description">Clé de site (publique). Actif seulement si la clé secrète est aussi définie dans wp-config.php : <code>define( \'WISY_CERT_TURNSTILE_SECRET\', \'…\' );</code> ' . ( defined( 'WISY_CERT_TURNSTILE_SECRET' ) ? '(clé secrète détectée)' : '(clé secrète absente)' ) . '</p></td></tr>';
		echo '<tr><th scope="row"><label for="ws-page">Page de vérification</label></th><td><input id="ws-page" type="url" name="wisy_settings[verification_page]" value="' . esc_attr( $s['verification_page'] ) . '" class="large-text"><p class="description">Lien « Retour » des pages d’erreur des PDF.</p></td></tr>';
		echo '<tr><th scope="row"><label for="ws-mail">E-mail de contact</label></th><td><input id="ws-mail" type="email" name="wisy_settings[contact_email]" value="' . esc_attr( $s['contact_email'] ) . '" class="regular-text"></td></tr>';
		echo '</tbody></table>';
		submit_button( 'Enregistrer les réglages' );
		echo '</form>';
		self::footer();
	}

	private static function num( $key, array $s, $suffix ) {
		echo '<label class="wisy-num"><input type="number" min="1" name="wisy_settings[' . esc_attr( $key ) . ']" value="' . (int) $s[ $key ] . '" class="small-text"> ' . esc_html( $suffix ) . '</label> ';
	}
}
