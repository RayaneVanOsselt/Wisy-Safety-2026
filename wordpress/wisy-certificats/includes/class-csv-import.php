<?php
/**
 * Import de certificats depuis un fichier CSV (Excel « CSV UTF-8 » ou « CSV (séparateur : point-virgule) »).
 *
 * Procédure (voir docs/README-CERTIFICATS.md § Import) :
 *   1. SIMULATION (par défaut) : rien n'est écrit ; rapport ligne par ligne ;
 *   2. IMPORT : mêmes contrôles, puis écriture. Une nouvelle exécution du même fichier ne crée aucun
 *      doublon : une ligne est rattachée à un certificat existant par son identifiant WordPress
 *      (colonne id_wordpress) ou par son numéro de diplôme.
 *
 * Règles :
 *   - une date illisible (« 31/02/1990 », « 1990 », « 03/04/90 ») fait REJETER la ligne : aucune date n'est devinée ;
 *   - une ligne sans date de naissance est importée mais signalée « non vérifiable » (introuvable par la recherche) ;
 *   - une cellule vide ne modifie pas la valeur existante (on ne peut pas effacer un champ par CSV) ;
 *   - le fichier n'est jamais conservé sur le serveur (lu depuis le dossier temporaire de PHP).
 *
 * @package Wisy_Certificats
 */

defined( 'ABSPATH' ) || exit;

final class Wisy_Cert_CSV_Import {

	const MAX_BYTES = 2097152; // 2 Mo.
	const MAX_ROWS  = 5000;

	/** En-têtes acceptés (après normalisation : minuscules, sans accents, « _ » pour séparateur). */
	const HEADERS = array(
		'id_wordpress'            => 'post_id',
		'id'                      => 'post_id',
		'nom'                     => 'last_name',
		'nom_de_famille'          => 'last_name',
		'last_name'               => 'last_name',
		'prenom'                  => 'first_name',
		'first_name'              => 'first_name',
		'autres_noms'             => 'other_last_names',
		'autres_noms_de_famille'  => 'other_last_names',
		'date_naissance'          => 'birth_date',
		'date_de_naissance'       => 'birth_date',
		'birth_date'              => 'birth_date',
		'numero_diplome'          => 'diploma_number',
		'numero_de_diplome'       => 'diploma_number',
		'n_diplome'               => 'diploma_number',
		'diploma_number'          => 'diploma_number',
		'formation'               => 'training',
		'formation_suivie'        => 'training',
		'training'                => 'training',
		'date_formation'          => 'training_date',
		'date_de_formation'       => 'training_date',
		'date_delivrance'         => 'issue_date',
		'date_de_delivrance'      => 'issue_date',
		'date_expiration'         => 'expiry_date',
		'date_d_expiration'       => 'expiry_date',
		'date_validite'           => 'expiry_date',
		'date_de_validite'        => 'expiry_date',
		'valable_jusqu_au'        => 'expiry_date',
		'revoque'                 => 'revoked',
		'motif_revocation'        => 'revoked_reason',
		'date_revocation'         => 'revoked_date',
		'masquer_pdf'             => 'pdf_hidden',
		'entreprise'              => 'employer_name',
		'employeur'               => 'employer_name',
		'telephone_employeur'     => 'employer_phone',
		'email_entreprise'        => 'employer_email',
		'note_interne'            => 'internal_note',
	);

	/** Colonnes du modèle téléchargeable (ordre conseillé). */
	const TEMPLATE = array( 'id_wordpress', 'nom', 'prenom', 'autres_noms', 'date_naissance', 'formation', 'numero_diplome', 'date_formation', 'date_delivrance', 'date_expiration', 'revoque', 'motif_revocation', 'date_revocation', 'masquer_pdf', 'entreprise', 'telephone_employeur', 'email_entreprise', 'note_interne' );

	public static function template_csv() {
		return "\xEF\xBB\xBF" . implode( ';', self::TEMPLATE ) . "\r\n";
	}

	/**
	 * @param string $contents Contenu brut du fichier.
	 * @param array  $options  dry_run (bool), update_existing (bool), status (publish|draft).
	 * @return array{ok:bool, error:string, rows:array, summary:array}
	 */
	public static function run( $contents, array $options ) {
		$options = array_merge( array( 'dry_run' => true, 'update_existing' => true, 'status' => 'publish' ), $options );
		$result  = array( 'ok' => false, 'error' => '', 'rows' => array(), 'summary' => array( 'created' => 0, 'updated' => 0, 'unchanged' => 0, 'skipped' => 0, 'errors' => 0, 'warnings' => 0, 'not_searchable' => 0 ) );

		if ( strlen( $contents ) > self::MAX_BYTES ) {
			$result['error'] = 'Fichier trop volumineux (2 Mo maximum).';
			return $result;
		}
		$contents = self::to_utf8( $contents );
		$table    = self::parse( $contents );
		if ( count( $table ) < 2 ) {
			$result['error'] = 'Le fichier ne contient aucune ligne de données (ligne d’en-tête + au moins une ligne).';
			return $result;
		}
		if ( count( $table ) - 1 > self::MAX_ROWS ) {
			$result['error'] = 'Trop de lignes (' . self::MAX_ROWS . ' maximum par fichier).';
			return $result;
		}

		$map     = array();
		$unknown = array();
		foreach ( $table[0] as $i => $h ) {
			$n = self::header_key( $h );
			if ( isset( self::HEADERS[ $n ] ) ) {
				$map[ $i ] = self::HEADERS[ $n ];
			} elseif ( '' !== $n ) {
				$unknown[] = (string) $h;
			}
		}
		if ( ! in_array( 'last_name', $map, true ) || ! in_array( 'training', $map, true ) ) {
			$result['error'] = 'Colonnes obligatoires absentes : « nom » et « formation » (utilisez le modèle).';
			return $result;
		}

		$seen_diplomas = array();
		$fields        = Wisy_Cert_Schema::fields();
		$count         = count( $table );
		for ( $r = 1; $r < $count; $r++ ) {
			$line = $r + 1;
			$cols = $table[ $r ];
			if ( ! array_filter( array_map( 'trim', array_map( 'strval', $cols ) ), 'strlen' ) ) {
				continue; // ligne vide.
			}
			$raw = array();
			foreach ( $map as $i => $field ) {
				$raw[ $field ] = isset( $cols[ $i ] ) ? trim( (string) $cols[ $i ] ) : '';
			}
			$row = array( 'line' => $line, 'action' => '', 'label' => '', 'messages' => array(), 'post_id' => 0 );

			list( $values, $errors, $warnings ) = self::validate_row( $raw, $fields );
			$row['label'] = trim( ( isset( $values['first_name'] ) ? $values['first_name'] . ' ' : '' ) . ( isset( $values['last_name'] ) ? $values['last_name'] : '' ) );

			if ( ! empty( $values['diploma_number'] ) ) {
				$dkey = strtolower( $values['diploma_number'] );
				if ( isset( $seen_diplomas[ $dkey ] ) ) {
					$errors[] = 'Numéro de diplôme déjà présent ligne ' . $seen_diplomas[ $dkey ] . ' du fichier.';
				} else {
					$seen_diplomas[ $dkey ] = $line;
				}
			}

			/* Rattachement à un certificat existant. */
			$target = 0;
			if ( ! $errors && ! empty( $raw['post_id'] ) ) {
				$pid = (int) $raw['post_id'];
				if ( $pid > 0 && Wisy_Cert_Schema::POST_TYPE === get_post_type( $pid ) ) {
					$target = $pid;
				} else {
					$errors[] = 'id_wordpress ' . $raw['post_id'] . ' : aucun certificat avec cet identifiant.';
				}
			}
			if ( ! $errors && ! $target && ! empty( $values['diploma_number'] ) ) {
				$same = Wisy_Cert_Repository::find_by_diploma( $values['diploma_number'] );
				if ( count( $same ) > 1 ) {
					$errors[] = 'Plusieurs certificats existants portent déjà ce numéro de diplôme : corrigez-les avant d’importer.';
				} elseif ( 1 === count( $same ) ) {
					$target = (int) $same[0];
				}
			}
			if ( ! $errors && ! $target && ! empty( $values['birth_date'] ) ) {
				$dup = self::potential_duplicate( $values );
				if ( $dup ) {
					$errors[] = 'Doublon potentiel : le certificat #' . $dup . ' a déjà le même titulaire, la même date de naissance et la même formation (ajoutez un numéro de diplôme ou id_wordpress pour le mettre à jour).';
				}
			}

			if ( $errors ) {
				$row['action']   = 'error';
				$row['messages'] = array_merge( $errors, $warnings );
				++$result['summary']['errors'];
				$result['rows'][] = $row;
				continue;
			}
			if ( empty( $values['birth_date'] ) && ! $target ) {
				$warnings[] = 'Sans date de naissance : certificat NON vérifiable par la recherche publique.';
				++$result['summary']['not_searchable'];
			}
			$row['messages'] = $warnings;
			if ( $warnings ) {
				++$result['summary']['warnings'];
			}

			if ( $target ) {
				$row['post_id'] = $target;
				if ( ! $options['update_existing'] ) {
					$row['action'] = 'skipped';
					$row['messages'][] = 'Certificat existant (#' . $target . ') : mise à jour désactivée.';
					++$result['summary']['skipped'];
					$result['rows'][] = $row;
					continue;
				}
				$current = Wisy_Cert_Repository::get( $target );
				$changes = array();
				foreach ( $values as $f => $v ) {
					if ( 'bool' === $fields[ $f ]['type'] ) {
						if ( (bool) $v !== (bool) $current[ $f ] ) {
							$changes[ $f ] = (bool) $v;
						}
					} elseif ( (string) $v !== (string) $current[ $f ] ) {
						$changes[ $f ] = $v;
					}
				}
				if ( ! $changes ) {
					$row['action'] = 'unchanged';
					++$result['summary']['unchanged'];
				} else {
					$row['action']     = 'updated';
					$row['messages'][] = 'Champs modifiés : ' . implode( ', ', array_map( static function ( $f ) use ( $fields ) {
						return $fields[ $f ]['label'];
					}, array_keys( $changes ) ) ) . '.';
					++$result['summary']['updated'];
					if ( ! $options['dry_run'] ) {
						Wisy_Cert_Repository::save( $target, $changes );
					}
				}
			} else {
				$row['action'] = 'created';
				++$result['summary']['created'];
				if ( ! $options['dry_run'] ) {
					$pid = wp_insert_post(
						array(
							'post_type'   => Wisy_Cert_Schema::POST_TYPE,
							'post_status' => 'draft' === $options['status'] ? 'draft' : 'publish',
							'post_title'  => Wisy_Cert_Repository::display_name( array_merge( array( 'first_name' => '', 'last_name' => '' ), $values ) ),
						),
						true
					);
					if ( is_wp_error( $pid ) ) {
						$row['action']     = 'error';
						$row['messages'][] = 'Création impossible : ' . $pid->get_error_message();
						--$result['summary']['created'];
						++$result['summary']['errors'];
					} else {
						$row['post_id'] = (int) $pid;
						Wisy_Cert_Repository::save( (int) $pid, $values );
					}
				}
			}
			$result['rows'][] = $row;
		}
		if ( $unknown ) {
			$result['unknown_columns'] = $unknown;
		}
		$result['ok'] = true;
		return $result;
	}

	/**
	 * Valide une ligne. Renvoie [valeurs nettoyées (uniquement les cellules NON vides), erreurs, avertissements].
	 */
	public static function validate_row( array $raw, array $fields ) {
		$values   = array();
		$errors   = array();
		$warnings = array();
		foreach ( $raw as $field => $v ) {
			if ( 'post_id' === $field || '' === $v ) {
				continue;
			}
			$def = $fields[ $field ];
			switch ( $def['type'] ) {
				case 'date':
					$iso = Wisy_Cert_Normalizer::parse_date( $v, 'auto' );
					if ( null === $iso ) {
						$errors[] = $def['label'] . ' illisible : « ' . $v . ' » (formats acceptés : JJ/MM/AAAA ou AAAA-MM-JJ).';
					} else {
						$values[ $field ] = $iso;
					}
					break;
				case 'bool':
					$b = Wisy_Cert_Normalizer::parse_bool( $v );
					if ( null === $b ) {
						$errors[] = $def['label'] . ' : valeur « ' . $v . ' » non reconnue (oui / non).';
					} else {
						$values[ $field ] = $b;
					}
					break;
				case 'email':
					$e = Wisy_Cert_Normalizer::clean_email( $v );
					if ( null === $e ) {
						$errors[] = $def['label'] . ' invalide : « ' . $v . ' ».';
					} else {
						$values[ $field ] = $e;
					}
					break;
				case 'tel':
					$p = Wisy_Cert_Normalizer::clean_phone( $v );
					if ( null === $p ) {
						$errors[] = $def['label'] . ' invalide : « ' . $v . ' ».';
					} else {
						$values[ $field ] = $p;
					}
					break;
				case 'textarea':
					$values[ $field ] = Wisy_Cert_Normalizer::clean_textarea( $v, isset( $def['max'] ) ? $def['max'] : 1000 );
					break;
				default:
					if ( in_array( $field, array( 'last_name', 'first_name' ), true ) ) {
						$clean = Wisy_Cert_Normalizer::clean_name( $v );
						$err   = Wisy_Cert_Normalizer::validate_name( $clean );
						if ( '' !== $err ) {
							$errors[] = $def['label'] . ' invalide : « ' . $v . ' ».';
						} else {
							$values[ $field ] = $clean;
						}
					} else {
						$values[ $field ] = Wisy_Cert_Normalizer::clean_text( $v, isset( $def['max'] ) ? $def['max'] : 160 );
					}
			}
		}
		if ( empty( $values['last_name'] ) && ! $errors ) {
			$errors[] = 'Nom de famille manquant.';
		}
		if ( empty( $values['training'] ) && ! $errors ) {
			$errors[] = 'Formation manquante.';
		}
		if ( ! $errors ) {
			$probe = array_merge( array_fill_keys( array_keys( $fields ), '' ), $values );
			foreach ( Wisy_Cert_Status::issues( $probe ) as $issue ) {
				if ( 'error' === $issue['level'] && ! in_array( $issue['code'], array( 'missing_birth_date', 'missing_last_name', 'missing_training' ), true ) ) {
					$errors[] = $issue['message'];
				}
			}
		}
		return array( $values, $errors, $warnings );
	}

	/** Certificat existant avec même nom, même date de naissance et même formation (sans numéro de diplôme distinctif). */
	private static function potential_duplicate( array $values ) {
		$ids = Wisy_Cert_Repository::find( $values['last_name'], $values['birth_date'] );
		foreach ( $ids as $id ) {
			$rec = Wisy_Cert_Repository::get( $id );
			if ( 0 === strcasecmp( remove_accents( $rec['training'] ), remove_accents( $values['training'] ) )
				&& ( empty( $values['training_date'] ) || $rec['training_date'] === $values['training_date'] ) ) {
				return (int) $id;
			}
		}
		return 0;
	}

	public static function header_key( $h ) {
		$h = strtolower( remove_accents( trim( (string) $h ) ) );
		$h = preg_replace( '/[^a-z0-9]+/', '_', $h );
		return trim( (string) $h, '_' );
	}

	/** UTF-8 sans BOM ; un fichier Excel Windows (CP1252) est converti. */
	public static function to_utf8( $s ) {
		if ( 0 === strncmp( $s, "\xEF\xBB\xBF", 3 ) ) {
			$s = substr( $s, 3 );
		}
		if ( function_exists( 'mb_check_encoding' ) && ! mb_check_encoding( $s, 'UTF-8' ) ) {
			$s = mb_convert_encoding( $s, 'UTF-8', 'Windows-1252' );
		}
		return $s;
	}

	/** Découpe le CSV (séparateur détecté sur la ligne d'en-tête : « ; », « , » ou tabulation). */
	public static function parse( $s ) {
		$first = strtok( $s, "\n" );
		$delim = ';';
		$best  = -1;
		foreach ( array( ';', ',', "\t" ) as $d ) {
			$n = substr_count( (string) $first, $d );
			if ( $n > $best ) {
				$best  = $n;
				$delim = $d;
			}
		}
		$fh = fopen( 'php://temp', 'r+' );
		fwrite( $fh, $s );
		rewind( $fh );
		$rows = array();
		while ( false !== ( $cols = fgetcsv( $fh, 0, $delim, '"', '' ) ) ) {
			if ( null === $cols || array( null ) === $cols ) {
				continue;
			}
			$rows[] = $cols;
		}
		fclose( $fh );
		return $rows;
	}
}
