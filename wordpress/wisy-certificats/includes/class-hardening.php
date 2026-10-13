<?php
/**
 * Fermeture des accès publics du type « certificat » (constat du 13/10/2026 sur wisysafety.be) :
 *
 *   - /wp-json/wp/v2/certificat listait publiquement les certificats (titre = nom du titulaire) ;
 *   - chaque certificat avait une page publique /certificat/<nom>/ référencée dans le sitemap ;
 *   - /wp-json/wp/v2/media?mime_type=application/pdf listait les PDF des certificats.
 *
 * Une fois l'extension activée (réglages « Durcissement », actifs par défaut) :
 *   - le type « certificat » n'a plus de page publique, d'archive, de flux, de recherche ni d'API REST
 *     publique ; il reste éditable dans l'administration ;
 *   - les pièces jointes rattachées à un certificat disparaissent de l'API médias publique et de
 *     leurs pages de pièce jointe ;
 *   - le type est retiré des sitemaps.
 *
 * LIMITE : un ancien PDF reste téléchargeable à son adresse directe (wp-content/uploads/…) tant qu'il
 * n'a pas été copié dans le coffre privé puis retiré de la médiathèque (écran « Reprise »).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Hardening {

	/** @var int[]|null */
	private static $cert_ids = null;

	public static function init() {
		add_filter( 'register_post_type_args', array( __CLASS__, 'post_type_args' ), 99, 2 );
		add_action( 'init', array( __CLASS__, 'ensure_post_type' ), 20 );
		add_filter( 'rest_pre_dispatch', array( __CLASS__, 'guard_rest' ), 10, 3 );
		add_filter( 'rest_attachment_query', array( __CLASS__, 'hide_certificate_media' ), 10, 2 );
		add_filter( 'wp_sitemaps_post_types', array( __CLASS__, 'sitemaps' ) );
		add_action( 'template_redirect', array( __CLASS__, 'block_attachment_pages' ), 1 );
		add_filter( 'wp_robots', array( __CLASS__, 'robots' ) );
	}

	/** Arguments privés appliqués au type « certificat », quel que soit l'outil qui l'enregistre (CPT UI…). */
	public static function private_args() {
		return array(
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_nav_menus'   => false,
			'show_in_admin_bar'   => true,
			'show_in_rest'        => false,
			'has_archive'         => false,
			'rewrite'             => false,
			'query_var'           => false,
			'can_export'          => true,
		);
	}

	public static function post_type_args( $args, $post_type ) {
		if ( Wisy_Cert_Schema::POST_TYPE !== $post_type || ! Wisy_Cert_Settings::get( 'harden_cpt' ) ) {
			return $args;
		}
		return array_merge( (array) $args, self::private_args() );
	}

	/** Si le type n'est plus enregistré par CPT UI (extension désactivée), l'extension l'enregistre elle-même. */
	public static function ensure_post_type() {
		if ( post_type_exists( Wisy_Cert_Schema::POST_TYPE ) ) {
			return;
		}
		register_post_type(
			Wisy_Cert_Schema::POST_TYPE,
			array_merge(
				self::private_args(),
				array(
					'labels'          => array(
						'name'          => 'Certificats',
						'singular_name' => 'Certificat',
						'add_new'       => 'Ajouter',
						'add_new_item'  => 'Ajouter un certificat',
						'edit_item'     => 'Modifier le certificat',
						'all_items'     => 'Tous les certificats',
						'search_items'  => 'Rechercher un certificat',
						'not_found'     => 'Aucun certificat',
					),
					'menu_icon'       => 'dashicons-awards',
					'supports'        => array( 'title' ),
					'capability_type' => 'post',
					'map_meta_cap'    => true,
				)
			)
		);
	}

	/** Identifiants des certificats (mémorisés pendant la requête). */
	public static function cert_ids() {
		if ( null === self::$cert_ids ) {
			self::$cert_ids = array_map(
				'intval',
				get_posts(
					array(
						'post_type'        => Wisy_Cert_Schema::POST_TYPE,
						'post_status'      => 'any',
						'posts_per_page'   => -1,
						'fields'           => 'ids',
						'no_found_rows'    => true,
						'suppress_filters' => true,
					)
				)
			);
		}
		return self::$cert_ids;
	}

	private static function is_certificate_attachment( $attachment_id ) {
		$parent = (int) wp_get_post_parent_id( (int) $attachment_id );
		return $parent && Wisy_Cert_Schema::POST_TYPE === get_post_type( $parent );
	}

	/** Bloque l'API REST standard des certificats (et de leurs PDF) pour qui n'a pas le droit de les modifier. */
	public static function guard_rest( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result;
		}
		$route = (string) $request->get_route();
		if ( preg_match( '#^/wp/v2/' . preg_quote( Wisy_Cert_Schema::POST_TYPE, '#' ) . '(/|$)#', $route ) && ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error( 'rest_no_route', 'Aucune route ne correspond à l’URL et à la méthode de la requête.', array( 'status' => 404 ) );
		}
		if ( Wisy_Cert_Settings::get( 'harden_media' ) && preg_match( '#^/wp/v2/media/(\d+)#', $route, $m ) && ! current_user_can( 'upload_files' ) && self::is_certificate_attachment( (int) $m[1] ) ) {
			return new WP_Error( 'rest_post_invalid_id', 'ID de publication non valide.', array( 'status' => 404 ) );
		}
		return $result;
	}

	public static function hide_certificate_media( $args, $request ) {
		if ( ! Wisy_Cert_Settings::get( 'harden_media' ) || current_user_can( 'upload_files' ) ) {
			return $args;
		}
		$ids = self::cert_ids();
		if ( $ids ) {
			$existing                   = isset( $args['post_parent__not_in'] ) ? (array) $args['post_parent__not_in'] : array();
			$args['post_parent__not_in'] = array_values( array_unique( array_merge( $existing, $ids ) ) );
		}
		return $args;
	}

	public static function sitemaps( $post_types ) {
		unset( $post_types[ Wisy_Cert_Schema::POST_TYPE ] );
		return $post_types;
	}

	/** Pages de pièce jointe d'un PDF de certificat : 404 pour le public. */
	public static function block_attachment_pages() {
		if ( ! Wisy_Cert_Settings::get( 'harden_media' ) || ! is_attachment() ) {
			return;
		}
		$id = (int) get_queried_object_id();
		if ( $id && self::is_certificate_attachment( $id ) && ! current_user_can( 'upload_files' ) ) {
			global $wp_query;
			$wp_query->set_404();
			status_header( 404 );
			nocache_headers();
		}
	}

	public static function robots( $robots ) {
		if ( is_singular( Wisy_Cert_Schema::POST_TYPE ) || ( is_attachment() && self::is_certificate_attachment( (int) get_queried_object_id() ) ) ) {
			$robots['noindex']  = true;
			$robots['nofollow'] = true;
		}
		return $robots;
	}
}
