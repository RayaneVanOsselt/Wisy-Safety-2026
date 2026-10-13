<?php
/**
 * API publique de vérification — espace de noms « wisy-certificats/v1 ».
 *
 *   POST /wp-json/wisy-certificats/v1/verify    lastName, birthDate (AAAA-MM-JJ) [, challenge]
 *   POST /wp-json/wisy-certificats/v1/document  token  → le PDF (ou une page d'erreur lisible)
 *   GET  /wp-json/wisy-certificats/v1/health    état du service (aucune donnée)
 *
 * Contrat détaillé : docs/README-CERTIFICATS.md § API. Points essentiels :
 *   - les données personnelles voyagent dans le CORPS de la requête, jamais dans l'URL (une requête
 *     qui les place dans l'adresse est refusée) ;
 *   - le corps est limité à 2 Ko ; chaque champ est revalidé ici, quoi qu'ait vérifié le navigateur ;
 *   - la réponse ne contient que les champs listés dans public_certificate() — jamais la date de
 *     naissance, les coordonnées de l'employeur, le motif de révocation ou l'identifiant interne ;
 *   - « aucun résultat » ne dit pas si le nom existe ou si seule la date est fausse ;
 *   - réponses non mises en cache (Cache-Control: no-store) et non indexables.
 *
 * CORS : n'est PAS une authentification. Les origines autorisées (réglages) sont contrôlées côté
 * serveur (403 sinon). L'en-tête Access-Control-Allow-Origin est géré en tenant compte de
 * l'hébergeur : sur wisysafety.be, nginx ajoute déjà « * » aux réponses réussies ; l'envoyer une
 * seconde fois rendrait la réponse illisible pour le navigateur (voir detect_host_cors()).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_REST {

	const NS           = 'wisy-certificats/v1';
	const MAX_BODY     = 2048;
	const CORS_PROBE   = 'wisy_cert_cors_probe';
	const STATUS_ORDER = array( 'valid' => 0, 'undetermined' => 1, 'expired' => 2, 'revoked' => 3 );

	/** Réponse binaire (PDF) ou HTML à écrire telle quelle dans rest_pre_serve_request. */
	private static $raw = null;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_filter( 'rest_post_dispatch', array( __CLASS__, 'secure_headers' ), 20, 3 );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'serve' ), 20, 4 );
	}

	public static function routes() {
		register_rest_route(
			self::NS,
			'/verify',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'verify' ),
				/* Point d'accès public PAR NATURE : protégé par validation stricte, origine, limitation des tentatives. */
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/document',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'document' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'health' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/* ================================================================== points d'accès */

	public static function health( WP_REST_Request $request ) {
		$challenge = null;
		if ( Wisy_Cert_Settings::turnstile_enabled() ) {
			$challenge = array(
				'provider' => 'turnstile',
				'siteKey'  => (string) Wisy_Cert_Settings::get( 'turnstile_site_key' ),
			);
		}
		return self::json(
			array(
				'status'    => 'ok',
				'api'       => 1,
				'timezone'  => Wisy_Cert_Settings::timezone()->getName(),
				'challenge' => $challenge,
			),
			200
		);
	}

	public static function verify( WP_REST_Request $request ) {
		$denied = self::guard( $request, 'verify' );
		if ( $denied ) {
			return $denied;
		}
		$params = self::body_params( $request );

		if ( Wisy_Cert_Settings::turnstile_enabled() ) {
			$check = self::verify_turnstile( isset( $params['challenge'] ) ? (string) $params['challenge'] : '' );
			if ( true !== $check ) {
				return $check;
			}
		}

		$today = Wisy_Cert_Settings::today();
		$last  = Wisy_Cert_Normalizer::clean_name( isset( $params['lastName'] ) ? $params['lastName'] : '' );
		list( $birth, $birth_error ) = Wisy_Cert_Normalizer::validate_birth_date_input( isset( $params['birthDate'] ) ? $params['birthDate'] : '', $today );
		$fields     = array();
		$name_error = Wisy_Cert_Normalizer::validate_name( $last );
		if ( '' !== $name_error ) {
			$fields['lastName'] = $name_error;
		}
		if ( '' !== $birth_error ) {
			$fields['birthDate'] = $birth_error;
		}
		if ( $fields ) {
			Wisy_Cert_Stats::bump( 'invalid' );
			return self::error( 'invalid_input', 'Les informations saisies ne sont pas valides.', 400, array( 'fields' => $fields ) );
		}

		/* Verrou par nom : trop d'échecs pour ce nom, quelle que soit l'adresse IP. */
		$name_key = Wisy_Cert_Normalizer::name_key( $last );
		$lock     = Wisy_Cert_Rate_Limiter::peek( 'name-fail', $name_key, (int) Wisy_Cert_Settings::get( 'limit_name_failures' ) );
		if ( ! $lock['allowed'] ) {
			return self::rate_limited( $lock['retry_after'] );
		}

		$ids = Wisy_Cert_Repository::find( $last, $birth );
		if ( ! $ids ) {
			Wisy_Cert_Rate_Limiter::hit( 'name-fail', $name_key, (int) Wisy_Cert_Settings::get( 'limit_name_failures' ), DAY_IN_SECONDS );
			Wisy_Cert_Stats::bump( 'not_found' );
			return self::json(
				array(
					'status'    => 'not_found',
					'checkedAt' => self::now_iso(),
					'today'     => $today,
					'timezone'  => Wisy_Cert_Settings::timezone()->getName(),
				),
				200
			);
		}

		$certs = array();
		foreach ( $ids as $id ) {
			$certs[] = self::public_certificate( Wisy_Cert_Repository::get( $id ), $today );
		}
		usort(
			$certs,
			static function ( $a, $b ) {
				$sa = self::STATUS_ORDER[ $a['status'] ];
				$sb = self::STATUS_ORDER[ $b['status'] ];
				if ( $sa !== $sb ) {
					return $sa - $sb;
				}
				return strcmp( (string) $b['trainingDate'], (string) $a['trainingDate'] );
			}
		);
		Wisy_Cert_Stats::bump( 'found' );
		return self::json(
			array(
				'status'       => 'found',
				'count'        => count( $certs ),
				'checkedAt'    => self::now_iso(),
				'today'        => $today,
				'timezone'     => Wisy_Cert_Settings::timezone()->getName(),
				'certificates' => $certs,
			),
			200
		);
	}

	/**
	 * LISTE BLANCHE des champs publiés. Tout ajout ici doit être justifié (minimisation RGPD).
	 */
	public static function public_certificate( array $rec, $today ) {
		$status = Wisy_Cert_Status::compute( $rec, $today, (string) Wisy_Cert_Settings::get( 'no_expiry_policy' ) );
		$doc    = array( 'available' => false, 'reason' => 'missing' );
		$file   = Wisy_Cert_Documents::current( $rec['id'] );
		if ( Wisy_Cert_Status::REVOKED === $status ) {
			$doc['reason'] = 'revoked';
		} elseif ( ! Wisy_Cert_Settings::get( 'pdf_public' ) || ! empty( $rec['pdf_hidden'] ) ) {
			$doc['reason'] = 'not_authorized';
		} elseif ( $file ) {
			$ttl = Wisy_Cert_Settings::document_ttl();
			$doc = array(
				'available' => true,
				'token'     => self::issue_token( $rec['id'], (int) $file['id'], $ttl ),
				'expiresIn' => $ttl,
				'sizeBytes' => (int) $file['size_bytes'],
			);
		}
		$or_null = static function ( $v ) {
			return ( '' === (string) $v ) ? null : (string) $v;
		};
		return array(
			'holder'        => Wisy_Cert_Repository::display_name( $rec ),
			'training'      => (string) $rec['training'],
			'diplomaNumber' => $or_null( $rec['diploma_number'] ),
			'trainingDate'  => $or_null( $rec['training_date'] ),
			'issueDate'     => $or_null( $rec['issue_date'] ),
			'expiryDate'    => $or_null( $rec['expiry_date'] ),
			'status'        => $status,
			'document'      => $doc,
		);
	}

	public static function document( WP_REST_Request $request ) {
		$denied = self::guard( $request, 'document' );
		if ( $denied ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return self::html_error( $denied->get_status(), 429 === $denied->get_status() ? 'Trop de demandes de documents. Réessayez dans quelques minutes.' : 'Accès refusé.' );
		}
		$params  = self::body_params( $request );
		$payload = self::read_token( isset( $params['token'] ) ? (string) $params['token'] : '' );
		if ( is_string( $payload ) ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return 'expired' === $payload
				? self::html_error( 410, 'Ce lien a expiré. Relancez la vérification pour obtenir un nouveau lien vers le PDF.' )
				: self::html_error( 403, 'Ce lien n’est pas valide. Relancez la vérification depuis la page Certificats.' );
		}
		$cert_id = (int) $payload['c'];
		$doc_id  = (int) $payload['d'];
		$post    = get_post( $cert_id );
		if ( ! $post || Wisy_Cert_Schema::POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return self::html_error( 404, 'Ce certificat n’est plus disponible. Contactez Wisy Safety.' );
		}
		$rec    = Wisy_Cert_Repository::get( $cert_id );
		$status = Wisy_Cert_Status::current( $rec );
		$file   = Wisy_Cert_Documents::current( $cert_id );
		if ( Wisy_Cert_Status::REVOKED === $status || ! Wisy_Cert_Settings::get( 'pdf_public' ) || ! empty( $rec['pdf_hidden'] ) ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return self::html_error( 403, 'Ce document n’est pas consultable en ligne. Contactez Wisy Safety.' );
		}
		/* Le jeton désigne UN document précis : s'il a été remplacé depuis, l'ancien lien ne sert plus. */
		if ( ! $file || (int) $file['id'] !== $doc_id ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return self::html_error( 410, 'Ce document a été mis à jour. Relancez la vérification pour obtenir le nouveau PDF.' );
		}
		$bytes = Wisy_Cert_Documents::content( $doc_id, $cert_id );
		if ( null === $bytes || ! hash_equals( (string) $file['sha256'], hash( 'sha256', $bytes ) ) ) {
			Wisy_Cert_Stats::bump( 'document_denied' );
			return self::html_error( 500, 'Le document est momentanément indisponible. Contactez Wisy Safety.' );
		}
		Wisy_Cert_Stats::bump( 'document' );
		$ref      = preg_replace( '/[^A-Za-z0-9_-]+/', '-', (string) $rec['diploma_number'] );
		$filename = 'certificat-wisy-safety' . ( $ref ? '-' . trim( $ref, '-' ) : '' ) . '.pdf';
		self::$raw = $bytes;
		$response = new WP_REST_Response( null, 200 );
		$response->header( 'Content-Type', 'application/pdf' );
		$response->header( 'Content-Disposition', 'inline; filename="' . $filename . '"' );
		$response->header( 'Content-Length', (string) strlen( $bytes ) );
		return $response;
	}

	/* ================================================================== contrôles communs */

	/**
	 * Origine, taille, absence de données dans l'URL, limitation par IP.
	 *
	 * @return WP_REST_Response|null Réponse d'erreur, ou null si la requête peut continuer.
	 */
	private static function guard( WP_REST_Request $request, $endpoint ) {
		$origin = self::origin();
		if ( '' !== $origin ? ! self::origin_allowed( $origin ) : (bool) Wisy_Cert_Settings::get( 'require_origin' ) ) {
			Wisy_Cert_Stats::bump( 'origin_denied' );
			return self::error( 'origin_not_allowed', 'Origine non autorisée.', 403 );
		}
		if ( strlen( (string) $request->get_body() ) > self::MAX_BODY ) {
			Wisy_Cert_Stats::bump( 'invalid' );
			return self::error( 'payload_too_large', 'Requête trop volumineuse.', 413 );
		}
		$query = $request->get_query_params();
		foreach ( array( 'lastName', 'birthDate', 'token', 'challenge' ) as $sensitive ) {
			if ( isset( $query[ $sensitive ] ) ) {
				Wisy_Cert_Stats::bump( 'invalid' );
				return self::error( 'params_in_url', 'Les informations doivent être envoyées dans le corps de la requête, jamais dans l’adresse.', 400 );
			}
		}
		$ip = Wisy_Cert_Rate_Limiter::client_ip();
		if ( 'document' === $endpoint ) {
			$r = Wisy_Cert_Rate_Limiter::hit( 'doc', $ip, (int) Wisy_Cert_Settings::get( 'limit_documents' ), (int) Wisy_Cert_Settings::get( 'window_ip_short' ) );
			return $r['allowed'] ? null : self::rate_limited( $r['retry_after'] );
		}
		$short = Wisy_Cert_Rate_Limiter::hit( 'ip-short', $ip, (int) Wisy_Cert_Settings::get( 'limit_ip_short' ), (int) Wisy_Cert_Settings::get( 'window_ip_short' ) );
		$day   = Wisy_Cert_Rate_Limiter::hit( 'ip-day', $ip, (int) Wisy_Cert_Settings::get( 'limit_ip_day' ), DAY_IN_SECONDS );
		if ( ! $short['allowed'] || ! $day['allowed'] ) {
			return self::rate_limited( max( $short['allowed'] ? 0 : $short['retry_after'], $day['allowed'] ? 0 : $day['retry_after'] ) );
		}
		return null;
	}

	/** Paramètres du CORPS uniquement (formulaire encodé ou JSON). */
	private static function body_params( WP_REST_Request $request ) {
		$json = $request->get_json_params();
		if ( is_array( $json ) && $json ) {
			return $json;
		}
		$body = $request->get_body_params();
		return is_array( $body ) ? $body : array();
	}

	public static function origin() {
		$o = get_http_origin();
		return $o ? Wisy_Cert_Settings::normalize_origin( (string) $o ) : '';
	}

	public static function origin_allowed( $origin ) {
		return '' !== $origin && in_array( $origin, (array) Wisy_Cert_Settings::get( 'allowed_origins' ), true );
	}

	private static function verify_turnstile( $token ) {
		if ( '' === $token || strlen( $token ) > 2048 ) {
			return self::error( 'challenge_required', 'Vérification anti-robot requise.', 403 );
		}
		$res = wp_remote_post(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			array(
				'timeout' => 6,
				'body'    => array(
					'secret'   => (string) WISY_CERT_TURNSTILE_SECRET,
					'response' => $token,
					'remoteip' => Wisy_Cert_Rate_Limiter::client_ip(),
				),
			)
		);
		if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
			return self::error( 'unavailable', 'Service momentanément indisponible.', 503 );
		}
		$data = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		if ( empty( $data['success'] ) ) {
			return self::error( 'challenge_failed', 'Vérification anti-robot échouée.', 403 );
		}
		return true;
	}

	/* ================================================================== jetons PDF */

	private static function b64url( $bin ) {
		return rtrim( strtr( base64_encode( $bin ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
	}

	private static function b64url_decode( $s ) {
		$s = strtr( (string) $s, '-_', '+/' );
		$r = base64_decode( $s . str_repeat( '=', ( 4 - strlen( $s ) % 4 ) % 4 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		return false === $r ? '' : $r;
	}

	/** Jeton signé (HMAC-SHA256) : certificat + document précis + expiration. Aucune donnée personnelle. */
	public static function issue_token( $cert_id, $doc_id, $ttl ) {
		$payload = self::b64url(
			(string) wp_json_encode(
				array(
					'c' => (int) $cert_id,
					'd' => (int) $doc_id,
					'e' => time() + (int) $ttl,
					'n' => bin2hex( random_bytes( 6 ) ),
				)
			)
		);
		return $payload . '.' . self::b64url( hash_hmac( 'sha256', $payload, Wisy_Cert_Secret::key( 'document' ), true ) );
	}

	/** @return array|string Charge utile, ou « invalid » / « expired ». */
	public static function read_token( $token ) {
		if ( strlen( $token ) > 400 || ! preg_match( '/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/', $token ) ) {
			return 'invalid';
		}
		list( $payload, $sig ) = explode( '.', $token, 2 );
		$expected              = self::b64url( hash_hmac( 'sha256', $payload, Wisy_Cert_Secret::key( 'document' ), true ) );
		if ( ! hash_equals( $expected, $sig ) ) {
			return 'invalid';
		}
		$data = json_decode( self::b64url_decode( $payload ), true );
		if ( ! is_array( $data ) || ! isset( $data['c'], $data['d'], $data['e'] ) ) {
			return 'invalid';
		}
		if ( (int) $data['e'] < time() ) {
			return 'expired';
		}
		return $data;
	}

	/* ================================================================== réponses */

	private static function now_iso() {
		$now = new DateTimeImmutable( 'now', Wisy_Cert_Settings::timezone() );
		return $now->format( DATE_ATOM );
	}

	private static function json( array $data, $status ) {
		return new WP_REST_Response( $data, $status );
	}

	private static function error( $code, $message, $status, array $extra = array() ) {
		return new WP_REST_Response( array_merge( array( 'code' => $code, 'message' => $message ), $extra ), $status );
	}

	private static function rate_limited( $retry_after ) {
		Wisy_Cert_Stats::bump( 'limited' );
		$r = self::error( 'rate_limited', 'Trop de tentatives. Réessayez plus tard.', 429, array( 'retryAfter' => (int) $retry_after ) );
		$r->header( 'Retry-After', (string) (int) $retry_after );
		return $r;
	}

	/** Page HTML minimale (le PDF s'ouvre dans un nouvel onglet : un JSON y serait illisible). */
	private static function html_error( $status, $message ) {
		$page    = esc_url( (string) Wisy_Cert_Settings::get( 'verification_page' ) );
		$contact = esc_html( (string) Wisy_Cert_Settings::get( 'contact_email' ) );
		self::$raw = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Wisy Safety — Certificat</title>'
			. '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4FAF9;color:#1B2D28;font:16px/1.6 system-ui,sans-serif}main{max-width:32rem;margin:1.5rem;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 18px 44px rgba(27,45,40,.14);border-top:5px solid #1F6F64}h1{font-size:1.25rem;margin:0 0 .75rem}a{color:#1F6F64;font-weight:600}</style></head>'
			. '<body><main><h1>Certificat Wisy Safety</h1><p>' . esc_html( $message ) . '</p><p><a href="' . $page . '">Retour à la vérification des certificats</a> · <a href="mailto:' . $contact . '">' . $contact . '</a></p></main></body></html>';
		$response = new WP_REST_Response( null, (int) $status );
		$response->header( 'Content-Type', 'text/html; charset=utf-8' );
		return $response;
	}

	/** En-têtes de confidentialité sur TOUTES les réponses de l'espace de noms (erreurs comprises). */
	public static function secure_headers( $response, $server, $request ) {
		if ( ! self::is_ours( $request ) || ! ( $response instanceof WP_HTTP_Response ) ) {
			return $response;
		}
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		$response->header( 'Expires', '0' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		$response->header( 'Referrer-Policy', 'no-referrer' );
		$response->header( 'X-Robots-Tag', 'noindex, nofollow, noarchive' );
		$response->header( 'Vary', 'Origin' );
		return $response;
	}

	private static function is_ours( $request ) {
		return ( $request instanceof WP_REST_Request ) && 0 === strpos( (string) $request->get_route(), '/' . self::NS );
	}

	/**
	 * Dernière étape avant l'envoi : en-têtes CORS maîtrisés, puis contenu brut (PDF/HTML) si besoin.
	 */
	public static function serve( $served, $result, $request, $server ) {
		if ( ! self::is_ours( $request ) ) {
			return $served;
		}
		/* WordPress renvoie par défaut l'origine reçue + « credentials » : on remplace par notre politique. */
		foreach ( array( 'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers', 'Access-Control-Expose-Headers' ) as $h ) {
			header_remove( $h );
		}
		$origin = self::origin();
		$status = ( $result instanceof WP_HTTP_Response ) ? (int) $result->get_status() : 200;
		if ( self::origin_allowed( $origin ) && self::plugin_sends_cors( $status ) ) {
			header( 'Access-Control-Allow-Origin: ' . $origin );
			header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
			header( 'Access-Control-Allow-Headers: Content-Type' );
			header( 'Access-Control-Expose-Headers: Retry-After' );
			header( 'Access-Control-Max-Age: 600' );
		}
		if ( null !== self::$raw ) {
			echo self::$raw; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- PDF binaire ou page déjà échappée.
			self::$raw = null;
			return true;
		}
		return $served;
	}

	/* ================================================================== CORS et hébergeur */

	/**
	 * Faut-il que l'extension envoie Access-Control-Allow-Origin pour ce code HTTP ?
	 * Mode « plugin » : toujours. Mode « host » ou « auto » détecté : seulement là où l'hébergeur ne le fait pas.
	 */
	public static function plugin_sends_cors( $status ) {
		$mode = (string) Wisy_Cert_Settings::get( 'cors_mode' );
		if ( 'plugin' === $mode ) {
			return true;
		}
		$probe = get_option( self::CORS_PROBE );
		if ( 'host' === $mode ) {
			$host_ok  = true;
			$host_err = is_array( $probe ) && ! empty( $probe['error'] );
		} else {
			if ( ! is_array( $probe ) ) {
				return true;
			}
			$host_ok  = ! empty( $probe['success'] );
			$host_err = ! empty( $probe['error'] );
		}
		return $status < 400 ? ! $host_ok : ! $host_err;
	}

	/**
	 * Teste si le serveur web ajoute lui-même Access-Control-Allow-Origin (réponse réussie ET réponse
	 * d'erreur), avec une origine fictive que l'extension n'autorise jamais. Résultat mémorisé.
	 */
	public static function detect_host_cors() {
		$args   = array(
			'timeout'   => 8,
			'headers'   => array( 'Origin' => 'https://wisy-probe.invalid' ),
			'sslverify' => apply_filters( 'https_local_ssl_verify', false ),
		);
		$ok     = wp_remote_get( rest_url( self::NS . '/health' ), $args );
		$err    = wp_remote_get( rest_url( self::NS . '/verify' ), $args );
		$result = array(
			'checked_at' => time(),
			'reachable'  => ! is_wp_error( $ok ) && 200 === (int) wp_remote_retrieve_response_code( $ok ),
			'success'    => ! is_wp_error( $ok ) && '' !== self::header_value( $ok, 'access-control-allow-origin' ),
			'error'      => ! is_wp_error( $err ) && '' !== self::header_value( $err, 'access-control-allow-origin' ),
			'raw'        => is_wp_error( $ok ) ? $ok->get_error_message() : self::header_value( $ok, 'access-control-allow-origin' ),
		);
		if ( $result['reachable'] ) {
			update_option( self::CORS_PROBE, $result, false );
		}
		return $result;
	}

	private static function header_value( $response, $name ) {
		$v = wp_remote_retrieve_header( $response, $name );
		return is_array( $v ) ? implode( ', ', $v ) : (string) $v;
	}
}
