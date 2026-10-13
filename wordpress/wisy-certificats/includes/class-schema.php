<?php
/**
 * Modèle de données d'un certificat : la SEULE définition des champs (libellés, type, obligation, visibilité).
 *
 * Chaque certificat est un article WordPress du type « certificat » (celui qui existe déjà sur le site) ;
 * ses données sont des métadonnées privées préfixées « _wisy_cert_ » (le « _ » les cache de l'écran
 * « Champs personnalisés » et de l'API REST standard). Rien n'est exposé tant que ce n'est pas marqué
 * `public` ci-dessous ET choisi explicitement dans Wisy_Cert_REST::public_certificate().
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_Schema {

	/** Type de contenu existant sur le site (créé avec CPT UI). */
	const POST_TYPE = 'certificat';

	/** Préfixe des métadonnées gérées par l'extension. */
	const PREFIX = '_wisy_cert_';

	/** Index de recherche : empreintes HMAC « nom normalisé | date de naissance » (plusieurs valeurs possibles). */
	const LOOKUP_META = '_wisy_cert_lookup';

	/** Empreinte de la clé ayant servi à construire l'index de CE certificat. */
	const LOOKUP_FP_META = '_wisy_cert_lookup_fp';

	/** Identifiant du PDF courant dans la table privée des documents. */
	const DOCUMENT_META = '_wisy_cert_document_id';

	/** Date de la reprise depuis les anciens champs (traçabilité). */
	const MIGRATED_META = '_wisy_cert_migrated_at';

	/**
	 * Définition des champs.
	 *
	 * type      : text | date | email | tel | bool | textarea
	 * required  : 'yes' (obligatoire), 'search' (obligatoire pour être trouvé par la recherche), 'recommended', 'no'
	 * public    : true si la valeur PEUT apparaître dans le résultat public de la vérification
	 * group     : section de la fiche d'édition
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function fields() {
		return array(
			'last_name'        => array( 'label' => 'Nom de famille', 'type' => 'text', 'required' => 'search', 'public' => true, 'group' => 'holder', 'max' => 80,
				'help' => 'Tel qu’écrit sur le certificat. Sert à la recherche (casse, accents, espaces et tirets ignorés).' ),
			'first_name'       => array( 'label' => 'Prénom', 'type' => 'text', 'required' => 'recommended', 'public' => true, 'group' => 'holder', 'max' => 80, 'help' => '' ),
			'other_last_names' => array( 'label' => 'Autres noms de famille', 'type' => 'text', 'required' => 'no', 'public' => false, 'group' => 'holder', 'max' => 160,
				'help' => 'Facultatif : nom d’usage, nom de naissance… séparés par « ; ». Ils permettent aussi de retrouver le certificat.' ),
			'birth_date'       => array( 'label' => 'Date de naissance', 'type' => 'date', 'required' => 'search', 'public' => false, 'group' => 'holder',
				'help' => 'Jamais affichée au public. Sans elle, le certificat ne peut pas être trouvé.' ),
			'training'         => array( 'label' => 'Formation suivie', 'type' => 'text', 'required' => 'yes', 'public' => true, 'group' => 'training', 'max' => 160, 'help' => '' ),
			'diploma_number'   => array( 'label' => 'Numéro de diplôme', 'type' => 'text', 'required' => 'recommended', 'public' => true, 'group' => 'training', 'max' => 60,
				'help' => 'Unique. Sert aussi à éviter les doublons lors des imports.' ),
			'training_date'    => array( 'label' => 'Date de formation', 'type' => 'date', 'required' => 'recommended', 'public' => true, 'group' => 'training', 'help' => 'Jour où la formation (ou l’examen) a eu lieu.' ),
			'issue_date'       => array( 'label' => 'Date de délivrance', 'type' => 'date', 'required' => 'no', 'public' => true, 'group' => 'training', 'help' => 'Jour où le certificat a été délivré, s’il diffère.' ),
			'expiry_date'      => array( 'label' => 'Valable jusqu’au', 'type' => 'date', 'required' => 'recommended', 'public' => true, 'group' => 'training',
				'help' => 'Dernier jour de validité (inclus). Vide = règle « sans date d’expiration » des réglages.' ),
			'revoked'          => array( 'label' => 'Certificat révoqué', 'type' => 'bool', 'required' => 'no', 'public' => true, 'group' => 'status',
				'help' => 'Prime sur la date de validité : le certificat est affiché « révoqué » et son PDF n’est jamais proposé.' ),
			'revoked_date'     => array( 'label' => 'Date de révocation', 'type' => 'date', 'required' => 'no', 'public' => false, 'group' => 'status', 'help' => 'Usage interne.' ),
			'revoked_reason'   => array( 'label' => 'Motif de révocation (interne)', 'type' => 'textarea', 'required' => 'no', 'public' => false, 'group' => 'status', 'max' => 500, 'help' => 'Jamais affiché au public.' ),
			'pdf_hidden'       => array( 'label' => 'Ne pas proposer le PDF au public', 'type' => 'bool', 'required' => 'no', 'public' => false, 'group' => 'status',
				'help' => 'Le résultat de la vérification reste affiché, sans bouton PDF.' ),
			'employer_name'    => array( 'label' => 'Entreprise (employeur)', 'type' => 'text', 'required' => 'no', 'public' => false, 'group' => 'employer', 'max' => 160, 'help' => 'Usage interne — jamais affiché au public.' ),
			'employer_phone'   => array( 'label' => 'Téléphone de l’employeur', 'type' => 'tel', 'required' => 'no', 'public' => false, 'group' => 'employer', 'max' => 30, 'help' => 'Usage interne — jamais affiché au public.' ),
			'employer_email'   => array( 'label' => 'E-mail de l’entreprise', 'type' => 'email', 'required' => 'no', 'public' => false, 'group' => 'employer', 'max' => 160, 'help' => 'Usage interne — jamais affiché au public.' ),
			'internal_note'    => array( 'label' => 'Note interne', 'type' => 'textarea', 'required' => 'no', 'public' => false, 'group' => 'employer', 'max' => 1000, 'help' => 'Jamais affichée au public.' ),
		);
	}

	/** Libellés des sections de la fiche d'édition. */
	public static function groups() {
		return array(
			'holder'   => 'Titulaire',
			'training' => 'Formation et validité',
			'status'   => 'Statut et publication',
			'employer' => 'Employeur et suivi (interne)',
		);
	}

	/** Clé de métadonnée d'un champ. */
	public static function meta_key( $field ) {
		return self::PREFIX . $field;
	}

	/** Toutes les clés de métadonnées gérées (pour les exclure de la découverte des anciens champs). */
	public static function managed_meta_keys() {
		$keys = array( self::LOOKUP_META, self::LOOKUP_FP_META, self::DOCUMENT_META, self::MIGRATED_META );
		foreach ( array_keys( self::fields() ) as $f ) {
			$keys[] = self::meta_key( $f );
		}
		return $keys;
	}

	/** Enregistre les métadonnées (jamais exposées dans l'API REST standard). */
	public static function register_meta() {
		foreach ( self::fields() as $field => $def ) {
			register_post_meta(
				self::POST_TYPE,
				self::meta_key( $field ),
				array(
					'type'          => 'bool' === $def['type'] ? 'boolean' : 'string',
					'single'        => true,
					'show_in_rest'  => false,
					'auth_callback' => static function ( $allowed, $meta_key, $post_id ) {
						return current_user_can( 'edit_post', $post_id );
					},
				)
			);
		}
	}
}
