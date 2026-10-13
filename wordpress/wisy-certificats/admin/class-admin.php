<?php
/**
 * Fiche d'édition d'un certificat, colonnes de la liste, téléchargement du PDF par l'équipe.
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Admin {

	const NOTICE_TRANSIENT = 'wisy_cert_notice_';

	/** Formations proposées dans la liste de suggestions (texte libre : d'autres formations peuvent être saisies). */
	const TRAINING_SUGGESTIONS = array( 'VCA Base', 'VCA Ligne hiérarchique (VOL)', 'Nacelles élévatrices (PEMP)', 'BEPS — Premier secours', 'Diisocyanates', 'Fibre optique', 'Certificateur PEB' );

	public static function init() {
		$pt = Wisy_Cert_Schema::POST_TYPE;
		add_action( 'add_meta_boxes_' . $pt, array( __CLASS__, 'meta_boxes' ) );
		add_action( 'save_post_' . $pt, array( __CLASS__, 'save' ), 10, 2 );
		add_filter( 'wp_insert_post_data', array( __CLASS__, 'fill_title' ), 10, 2 );
		add_action( 'post_edit_form_tag', array( __CLASS__, 'form_enctype' ) );
		add_action( 'admin_notices', array( __CLASS__, 'notices' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'manage_' . $pt . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . $pt . '_posts_custom_column', array( __CLASS__, 'column' ), 10, 2 );
		add_filter( 'manage_edit-' . $pt . '_sortable_columns', array( __CLASS__, 'sortable' ) );
		add_action( 'pre_get_posts', array( __CLASS__, 'sort_query' ) );
		add_action( 'admin_post_wisy_cert_admin_pdf', array( __CLASS__, 'download_pdf' ) );
		add_filter( 'is_protected_meta', array( __CLASS__, 'protect_meta' ), 10, 2 );
	}

	public static function is_screen() {
		$s = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		return $s && Wisy_Cert_Schema::POST_TYPE === $s->post_type;
	}

	public static function assets() {
		if ( self::is_screen() ) {
			wp_enqueue_style( 'wisy-cert-admin', WISY_CERT_URL . 'admin/admin.css', array(), WISY_CERT_VERSION );
		}
	}

	public static function protect_meta( $protected, $key ) {
		return ( 0 === strpos( (string) $key, Wisy_Cert_Schema::PREFIX ) ) ? true : $protected;
	}

	public static function form_enctype( $post ) {
		if ( $post && Wisy_Cert_Schema::POST_TYPE === $post->post_type ) {
			echo ' enctype="multipart/form-data"';
		}
	}

	public static function meta_boxes() {
		add_meta_box( 'wisy-cert-data', 'Données du certificat (Wisy Certificats)', array( __CLASS__, 'render_box' ), Wisy_Cert_Schema::POST_TYPE, 'normal', 'high' );
		add_meta_box( 'wisy-cert-preview', 'Vérification publique — aperçu', array( __CLASS__, 'render_preview' ), Wisy_Cert_Schema::POST_TYPE, 'side', 'high' );
	}

	/* ================================================================== fiche */

	public static function render_box( $post ) {
		$rec    = Wisy_Cert_Repository::get( $post->ID );
		$fields = Wisy_Cert_Schema::fields();
		wp_nonce_field( 'wisy_cert_save_' . $post->ID, 'wisy_cert_nonce' );
		echo '<div class="wisy-cert-box">';
		echo '<p class="wisy-cert-intro">Les champs marqués <span class="wisy-req">*</span> sont nécessaires pour que le certificat soit <strong>trouvé par la recherche publique</strong> (nom de famille + date de naissance). Seuls les champs marqués <span class="wisy-pub">public</span> peuvent apparaître dans le résultat de la vérification. Un certificat n’est vérifiable que s’il est <strong>publié</strong>.</p>';
		foreach ( Wisy_Cert_Schema::groups() as $group => $label ) {
			echo '<fieldset class="wisy-cert-group wisy-cert-group--' . esc_attr( $group ) . '"><legend>' . esc_html( $label ) . '</legend><div class="wisy-cert-grid">';
			foreach ( $fields as $field => $def ) {
				if ( $def['group'] !== $group ) {
					continue;
				}
				self::render_field( $field, $def, $rec[ $field ] );
			}
			echo '</div></fieldset>';
		}
		echo '<datalist id="wisy-cert-trainings">';
		foreach ( self::training_suggestions() as $t ) {
			echo '<option value="' . esc_attr( $t ) . '"></option>';
		}
		echo '</datalist>';
		self::render_pdf( $post->ID );
		echo '</div>';
	}

	private static function training_suggestions() {
		global $wpdb;
		$used = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value <> '' ORDER BY meta_value LIMIT 50", Wisy_Cert_Schema::meta_key( 'training' ) ) );
		return array_values( array_unique( array_merge( self::TRAINING_SUGGESTIONS, array_map( 'strval', (array) $used ) ) ) );
	}

	private static function render_field( $field, array $def, $value ) {
		$id    = 'wisy-cert-' . $field;
		$name  = 'wisy_cert[' . $field . ']';
		$req   = in_array( $def['required'], array( 'yes', 'search' ), true ) ? ' <span class="wisy-req" aria-hidden="true">*</span>' : '';
		$pub   = $def['public'] ? ' <span class="wisy-pub">public</span>' : ' <span class="wisy-priv">interne</span>';
		$wide  = in_array( $def['type'], array( 'textarea' ), true ) || in_array( $field, array( 'training', 'other_last_names' ), true ) ? ' wisy-cert-field--wide' : '';
		$help  = $def['help'] ? '<span class="description" id="' . esc_attr( $id ) . '-help">' . esc_html( $def['help'] ) . '</span>' : '';
		$descr = $def['help'] ? ' aria-describedby="' . esc_attr( $id ) . '-help"' : '';
		echo '<div class="wisy-cert-field' . esc_attr( $wide ) . '">';
		if ( 'bool' === $def['type'] ) {
			echo '<label class="wisy-cert-check" for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( (bool) $value, true, false ) . $descr . '> ' . esc_html( $def['label'] ) . '</label>' . $help; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- attributs échappés ci-dessus.
			echo '</div>';
			return;
		}
		echo '<label for="' . esc_attr( $id ) . '">' . esc_html( $def['label'] ) . $req . $pub . '</label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- balises fixes.
		$max = isset( $def['max'] ) ? ' maxlength="' . (int) $def['max'] . '"' : '';
		switch ( $def['type'] ) {
			case 'textarea':
				echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="3"' . $max . $descr . '>' . esc_textarea( (string) $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				break;
			case 'date':
				echo '<input type="date" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" min="1900-01-01" max="2100-12-31"' . $descr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				break;
			default:
				$type = in_array( $def['type'], array( 'email', 'tel' ), true ) ? $def['type'] : 'text';
				$list = 'training' === $field ? ' list="wisy-cert-trainings"' : '';
				echo '<input type="' . esc_attr( $type ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" autocomplete="off" spellcheck="false"' . $max . $list . $descr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo $help . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- échappé à la construction.
	}

	private static function render_pdf( $post_id ) {
		$doc    = Wisy_Cert_Documents::current( $post_id );
		$legacy = Wisy_Cert_Documents::legacy_attachments( $post_id );
		echo '<fieldset class="wisy-cert-group"><legend>Document PDF (coffre privé)</legend>';
		if ( $doc ) {
			$url = wp_nonce_url( admin_url( 'admin-post.php?action=wisy_cert_admin_pdf&post=' . (int) $post_id ), 'wisy_cert_admin_pdf_' . $post_id );
			echo '<p class="wisy-cert-doc"><span class="dashicons dashicons-pdf" aria-hidden="true"></span> <strong>' . esc_html( $doc['original_name'] ? $doc['original_name'] : 'certificat.pdf' ) . '</strong> — ' . esc_html( size_format( (int) $doc['size_bytes'] ) ) . ' — ajouté le ' . esc_html( get_date_from_gmt( $doc['created_at'], 'd/m/Y H:i' ) ) . ' — empreinte <code>' . esc_html( substr( $doc['sha256'], 0, 12 ) ) . '…</code> · <a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">Ouvrir</a></p>';
			echo '<label class="wisy-cert-check"><input type="checkbox" name="wisy_cert_pdf_remove" value="1"> Retirer ce PDF</label>';
		} else {
			echo '<p>Aucun PDF dans le coffre privé : le résultat de la vérification indiquera « PDF non disponible ».</p>';
		}
		if ( $legacy ) {
			$url = wp_get_attachment_url( $legacy[0] );
			echo '<div class="wisy-cert-legacy"><p><strong>PDF de la médiathèque rattaché</strong> (ancien système, <em>adresse publique</em> : <a href="' . esc_url( (string) $url ) . '" target="_blank" rel="noopener">voir</a>).</p>';
			echo '<label class="wisy-cert-check"><input type="checkbox" name="wisy_cert_pdf_import_legacy" value="1"' . checked( ! $doc, true, false ) . '> Copier ce PDF dans le coffre privé à l’enregistrement</label></div>';
		}
		echo '<p><label for="wisy-cert-pdf">' . ( $doc ? 'Remplacer par un nouveau PDF' : 'Ajouter le PDF' ) . '</label><br><input type="file" id="wisy-cert-pdf" name="wisy_cert_pdf" accept="application/pdf,.pdf"> <span class="description">PDF uniquement, ' . (int) Wisy_Cert_Settings::get( 'max_pdf_mb' ) . ' Mo maximum. Stocké dans la base de données, jamais dans la médiathèque publique.</span></p>';
		echo '</fieldset>';
	}

	public static function render_preview( $post ) {
		$rec    = Wisy_Cert_Repository::get( $post->ID );
		$status = Wisy_Cert_Status::current( $rec );
		$issues = Wisy_Cert_Status::issues( $rec );
		$dups   = Wisy_Cert_Repository::find_by_diploma( $rec['diploma_number'], $post->ID );
		$found  = (bool) get_post_meta( $post->ID, Wisy_Cert_Schema::LOOKUP_META, false );
		echo '<div class="wisy-cert-preview">';
		echo '<p class="wisy-status wisy-status--' . esc_attr( $status ) . '">' . esc_html( Wisy_Cert_Status::label( $status ) ) . '</p>';
		echo '<ul class="wisy-cert-checks">';
		echo '<li class="' . ( 'publish' === $post->post_status ? 'ok' : 'ko' ) . '">' . ( 'publish' === $post->post_status ? 'Publié : vérifiable' : 'Non publié : introuvable par la recherche' ) . '</li>';
		echo '<li class="' . ( $found ? 'ok' : 'ko' ) . '">' . ( $found ? 'Index de recherche à jour' : 'Pas encore trouvable (nom ou date de naissance manquant)' ) . '</li>';
		$doc = Wisy_Cert_Documents::current( $post->ID );
		echo '<li class="' . ( $doc ? 'ok' : 'warn' ) . '">' . ( $doc ? 'PDF disponible' : 'Pas de PDF' ) . '</li>';
		echo '</ul>';
		if ( $dups ) {
			echo '<p class="wisy-issue wisy-issue--error">Même numéro de diplôme que : ';
			foreach ( $dups as $d ) {
				echo '<a href="' . esc_url( (string) get_edit_post_link( $d ) ) . '">#' . (int) $d . '</a> ';
			}
			echo '</p>';
		}
		foreach ( $issues as $issue ) {
			echo '<p class="wisy-issue wisy-issue--' . esc_attr( $issue['level'] ) . '">' . esc_html( $issue['message'] ) . '</p>';
		}
		echo '<p class="description">Le public voit : nom et prénom, formation, n° de diplôme, dates de formation, de délivrance et de validité, statut, et le PDF si autorisé. Jamais la date de naissance ni les données de l’employeur.</p>';
		echo '</div>';
	}

	/* ================================================================== enregistrement */

	/** Titre automatique « Prénom Nom » si le titre est vide. */
	public static function fill_title( $data, $postarr ) {
		if ( Wisy_Cert_Schema::POST_TYPE !== $data['post_type'] || '' !== trim( (string) $data['post_title'] ) ) {
			return $data;
		}
		$id = isset( $postarr['ID'] ) ? (int) $postarr['ID'] : 0;
		if ( ! $id || empty( $_POST['wisy_cert_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['wisy_cert_nonce'] ) ), 'wisy_cert_save_' . $id ) ) {
			return $data;
		}
		$in = isset( $_POST['wisy_cert'] ) && is_array( $_POST['wisy_cert'] ) ? wp_unslash( $_POST['wisy_cert'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- nettoyé ci-dessous.
		$name = trim( Wisy_Cert_Normalizer::clean_name( isset( $in['first_name'] ) ? $in['first_name'] : '' ) . ' ' . Wisy_Cert_Normalizer::clean_name( isset( $in['last_name'] ) ? $in['last_name'] : '' ) );
		if ( '' !== $name ) {
			$data['post_title'] = wp_slash( $name );
		}
		return $data;
	}

	public static function save( $post_id, $post ) {
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( empty( $_POST['wisy_cert_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['wisy_cert_nonce'] ) ), 'wisy_cert_save_' . $post_id ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$in     = isset( $_POST['wisy_cert'] ) && is_array( $_POST['wisy_cert'] ) ? wp_unslash( $_POST['wisy_cert'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- chaque champ est nettoyé par type.
		$values = array();
		$errors = array();
		foreach ( Wisy_Cert_Schema::fields() as $field => $def ) {
			if ( 'bool' === $def['type'] ) {
				$values[ $field ] = ! empty( $in[ $field ] );
				continue;
			}
			$raw = isset( $in[ $field ] ) && is_scalar( $in[ $field ] ) ? trim( (string) $in[ $field ] ) : '';
			switch ( $def['type'] ) {
				case 'date':
					$iso = '' === $raw ? '' : Wisy_Cert_Normalizer::parse_date( $raw, 'Y-m-d' );
					if ( null === $iso ) {
						$errors[] = $def['label'] . ' : date invalide, valeur précédente conservée.';
						continue 2;
					}
					$values[ $field ] = $iso;
					break;
				case 'email':
					$e = Wisy_Cert_Normalizer::clean_email( $raw );
					if ( null === $e ) {
						$errors[] = $def['label'] . ' : adresse invalide, valeur précédente conservée.';
						continue 2;
					}
					$values[ $field ] = $e;
					break;
				case 'tel':
					$p = Wisy_Cert_Normalizer::clean_phone( $raw );
					if ( null === $p ) {
						$errors[] = $def['label'] . ' : numéro invalide, valeur précédente conservée.';
						continue 2;
					}
					$values[ $field ] = $p;
					break;
				case 'textarea':
					$values[ $field ] = Wisy_Cert_Normalizer::clean_textarea( $raw, isset( $def['max'] ) ? $def['max'] : 1000 );
					break;
				default:
					if ( in_array( $field, array( 'last_name', 'first_name' ), true ) ) {
						$clean = Wisy_Cert_Normalizer::clean_name( $raw );
						if ( '' !== $clean && '' !== Wisy_Cert_Normalizer::validate_name( $clean ) ) {
							$errors[] = $def['label'] . ' : caractères non autorisés (lettres, espaces, tirets, apostrophes), valeur précédente conservée.';
							continue 2;
						}
						$values[ $field ] = $clean;
					} elseif ( 'other_last_names' === $field ) {
						$values[ $field ] = implode( ' ; ', Wisy_Cert_Normalizer::split_names( $raw ) );
					} else {
						$values[ $field ] = Wisy_Cert_Normalizer::clean_text( $raw, isset( $def['max'] ) ? $def['max'] : 160 );
					}
			}
		}
		if ( ! empty( $values['revoked'] ) && empty( $values['revoked_date'] ) ) {
			$values['revoked_date'] = Wisy_Cert_Settings::today();
		}
		Wisy_Cert_Repository::save( $post_id, $values );

		/* PDF : retrait, copie depuis la médiathèque, ou nouvel envoi (le nouvel envoi prime). */
		if ( ! empty( $_POST['wisy_cert_pdf_remove'] ) ) {
			Wisy_Cert_Documents::delete_for( $post_id );
		}
		if ( ! empty( $_POST['wisy_cert_pdf_import_legacy'] ) ) {
			$legacy = Wisy_Cert_Documents::legacy_attachments( $post_id );
			if ( $legacy ) {
				$res = Wisy_Cert_Documents::import_attachment( $post_id, $legacy[0] );
				if ( 'error' === $res['status'] ) {
					$errors[] = 'PDF de la médiathèque : ' . $res['message'];
				}
			}
		}
		if ( isset( $_FILES['wisy_cert_pdf'] ) && is_array( $_FILES['wisy_cert_pdf'] ) && isset( $_FILES['wisy_cert_pdf']['error'] ) && UPLOAD_ERR_NO_FILE !== (int) $_FILES['wisy_cert_pdf']['error'] ) {
			$file = $_FILES['wisy_cert_pdf']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- contrôlé ci-dessous (erreur, upload, contenu).
			if ( UPLOAD_ERR_OK !== (int) $file['error'] || empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
				$errors[] = 'Le PDF n’a pas pu être envoyé (taille maximale du serveur dépassée ?).';
			} else {
				$bytes = file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				$res   = Wisy_Cert_Documents::store( $post_id, (string) $bytes, isset( $file['name'] ) ? (string) $file['name'] : '', 'upload' );
				if ( is_wp_error( $res ) ) {
					$errors[] = $res->get_error_message();
				}
			}
		}
		if ( $errors ) {
			set_transient( self::NOTICE_TRANSIENT . get_current_user_id(), $errors, 120 );
		}
	}

	public static function notices() {
		$key    = self::NOTICE_TRANSIENT . get_current_user_id();
		$errors = get_transient( $key );
		if ( is_array( $errors ) && $errors ) {
			delete_transient( $key );
			echo '<div class="notice notice-error"><p><strong>Wisy Certificats :</strong></p><ul>';
			foreach ( $errors as $e ) {
				echo '<li>' . esc_html( $e ) . '</li>';
			}
			echo '</ul></div>';
		}
		if ( get_option( Wisy_Cert_Plugin::ACTIVATED_OPTION ) && current_user_can( 'manage_options' ) ) {
			delete_option( Wisy_Cert_Plugin::ACTIVATED_OPTION );
			$url = admin_url( 'edit.php?post_type=' . Wisy_Cert_Schema::POST_TYPE . '&page=wisy-cert-dashboard' );
			echo '<div class="notice notice-success"><p><strong>Wisy Certificats est actif.</strong> Les certificats ne sont plus listés publiquement. Étape suivante : <a href="' . esc_url( $url ) . '">ouvrir le tableau de bord</a> puis lancer la « Reprise des anciennes données ».</p></div>';
		}
	}

	/* ================================================================== liste */

	public static function columns( $cols ) {
		$out = array();
		foreach ( $cols as $k => $v ) {
			$out[ $k ] = $v;
			if ( 'title' === $k ) {
				$out['wisy_training'] = 'Formation';
				$out['wisy_diploma']  = 'N° diplôme';
				$out['wisy_expiry']   = 'Valable jusqu’au';
				$out['wisy_status']   = 'Statut';
				$out['wisy_check']    = 'Vérifiable';
			}
		}
		return $out;
	}

	public static function column( $col, $post_id ) {
		if ( 0 !== strpos( $col, 'wisy_' ) ) {
			return;
		}
		$rec = Wisy_Cert_Repository::get( $post_id );
		switch ( $col ) {
			case 'wisy_training':
				echo esc_html( $rec['training'] );
				break;
			case 'wisy_diploma':
				echo '<code>' . esc_html( $rec['diploma_number'] ) . '</code>';
				break;
			case 'wisy_expiry':
				echo esc_html( $rec['expiry_date'] ? mysql2date( 'd/m/Y', $rec['expiry_date'] ) : '—' );
				break;
			case 'wisy_status':
				$s = Wisy_Cert_Status::current( $rec );
				echo '<span class="wisy-status wisy-status--' . esc_attr( $s ) . '">' . esc_html( Wisy_Cert_Status::label( $s ) ) . '</span>';
				break;
			case 'wisy_check':
				$errors = array_filter( Wisy_Cert_Status::issues( $rec ), static function ( $i ) {
					return 'error' === $i['level'];
				} );
				$doc    = Wisy_Cert_Documents::current( $post_id );
				echo $errors ? '<span class="wisy-flag wisy-flag--ko" title="' . esc_attr( implode( ' ', wp_list_pluck( $errors, 'message' ) ) ) . '">À corriger</span>' : '<span class="wisy-flag wisy-flag--ok">Oui</span>';
				echo $doc ? ' <span class="dashicons dashicons-pdf" title="PDF disponible" aria-label="PDF disponible"></span>' : '';
				break;
		}
	}

	public static function sortable( $cols ) {
		$cols['wisy_expiry'] = 'wisy_expiry';
		return $cols;
	}

	public static function sort_query( $q ) {
		if ( is_admin() && $q->is_main_query() && 'wisy_expiry' === $q->get( 'orderby' ) ) {
			$q->set( 'meta_key', Wisy_Cert_Schema::meta_key( 'expiry_date' ) );
			$q->set( 'orderby', 'meta_value' );
		}
	}

	/* ================================================================== PDF (équipe) */

	public static function download_pdf() {
		$post_id = isset( $_GET['post'] ) ? (int) $_GET['post'] : 0;
		check_admin_referer( 'wisy_cert_admin_pdf_' . $post_id );
		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_die( 'Accès refusé.', 403 );
		}
		$doc   = Wisy_Cert_Documents::current( $post_id );
		$bytes = $doc ? Wisy_Cert_Documents::content( (int) $doc['id'], $post_id ) : null;
		if ( null === $bytes ) {
			wp_die( 'Aucun PDF pour ce certificat.', 404 );
		}
		nocache_headers();
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: inline; filename="certificat-' . (int) $post_id . '.pdf"' );
		header( 'Content-Length: ' . strlen( $bytes ) );
		header( 'X-Content-Type-Options: nosniff' );
		echo $bytes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- PDF binaire.
		exit;
	}
}
