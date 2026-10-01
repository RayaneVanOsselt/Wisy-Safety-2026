// =========================================================================
// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
// Source unique : js/faq-data.js  →  `node scripts/sync-faq-edge.js`
// (tests/edge-sync.test.js échoue si ce fichier n'est plus à jour).
// =========================================================================

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  synonyms: string[];
  relatedQuestions: string[];
  action?: string;
  provisional?: boolean;
}

export const FAQ_VERIFIED_AT = "2026-09-26";

export const FAQ_ITEMS: FaqItem[] = [
  {
    "id": "faq-choisir-adaptee",
    "category": "choisir",
    "question": "Comment choisir la formation adaptée à mon besoin ?",
    "answer": "Notre catalogue s'organise autour de quatre domaines : Sécurité, Secours, Technique et Management.\n\nPartez de votre objectif — travailler en sécurité sur chantier, maîtriser les gestes de premiers secours, conduire une nacelle élévatrice ou manipuler des substances dangereuses — puis explorez les formations correspondantes depuis la page Formations.\n\nSi vous hésitez, notre équipe vous aide à identifier la formation la plus adaptée à votre situation.",
    "keywords": [
      "choisir",
      "orientation",
      "catalogue",
      "domaines",
      "objectif",
      "conseil",
      "quelle formation"
    ],
    "synonyms": [
      "quelle formation choisir",
      "aide au choix",
      "je ne sais pas quelle formation",
      "conseiller",
      "orienter",
      "hésiter",
      "être conseillé"
    ],
    "relatedQuestions": [
      "faq-choisir-catalogue",
      "faq-choisir-vca-difference",
      "faq-inscription-comment"
    ],
    "action": "formations"
  },
  {
    "id": "faq-choisir-catalogue",
    "category": "choisir",
    "question": "Quelles formations proposez-vous ?",
    "answer": "Nous proposons aujourd'hui six formations :\n- VCA Base\n- VCA Ligne hiérarchique\n- Nacelles élévatrices\n- Fibre optique\n- BEPS – Premier secours\n- Diisocyanates & substances dangereuses\n\nLe détail de chaque programme est présenté sur la page Formations.",
    "keywords": [
      "formations",
      "catalogue",
      "liste",
      "offre",
      "programme",
      "six formations",
      "vca",
      "nacelle",
      "fibre",
      "beps",
      "diisocyanates"
    ],
    "synonyms": [
      "cours",
      "que proposez-vous",
      "quelles formations",
      "domaines",
      "thèmes",
      "sujets",
      "toutes les formations"
    ],
    "relatedQuestions": [
      "faq-choisir-adaptee",
      "faq-deroulement-duree",
      "faq-inscription-comment"
    ],
    "action": "formations"
  },
  {
    "id": "faq-choisir-vca-difference",
    "category": "choisir",
    "question": "Quelle est la différence entre la VCA Base et la VCA Ligne hiérarchique ?",
    "answer": "- VCA Base (1 jour) : elle s'adresse à l'ensemble des collaborateurs de terrain et couvre les fondamentaux de la sécurité.\n- VCA Ligne hiérarchique : elle vise les personnes qui encadrent du personnel opérationnel et prépare à l'examen officiel VOL-VCA (sécurité de base et connaissances propres à l'encadrement). Les deux diplômes sont valables 10 ans.",
    "keywords": [
      "vca",
      "vca base",
      "ligne hiérarchique",
      "différence",
      "base",
      "cadre",
      "responsable",
      "encadrement",
      "b-vca",
      "vol-vca"
    ],
    "synonyms": [
      "comparer",
      "lequel choisir",
      "niveau",
      "manager",
      "chef d'équipe",
      "superviseur"
    ],
    "relatedQuestions": [
      "faq-deroulement-duree",
      "faq-attestations-vca-examen",
      "faq-choisir-catalogue"
    ]
  },
  {
    "id": "faq-choisir-langues",
    "category": "choisir",
    "question": "Les formations sont-elles disponibles en plusieurs langues ?",
    "answer": "Cela dépend de la formation. La formation Nacelles élévatrices est par exemple proposée en français, en néerlandais et en anglais. Pour connaître les langues disponibles pour une formation ou une session précise, contactez-nous.",
    "keywords": [
      "langue",
      "langues",
      "français",
      "néerlandais",
      "anglais",
      "nl",
      "fr",
      "en"
    ],
    "synonyms": [
      "flamand",
      "dutch",
      "english",
      "traduction",
      "en néerlandais",
      "en anglais",
      "bilingue",
      "nederlands"
    ],
    "relatedQuestions": [
      "faq-inscription-prerequis",
      "faq-deroulement-lieu",
      "faq-entreprises-sur-site"
    ],
    "action": "contact"
  },
  {
    "id": "faq-inscription-comment",
    "category": "inscription",
    "question": "Comment s'inscrire à une formation ?",
    "answer": "Vous pouvez vous inscrire directement en ligne depuis la page Inscription : choisissez votre formation, indiquez le nombre de participants et renseignez vos coordonnées.\n\nSi vous préférez être accompagné dans votre choix, contactez-nous et nous finalisons l'inscription avec vous.",
    "keywords": [
      "inscription",
      "inscrire",
      "s'inscrire",
      "réserver",
      "formulaire",
      "en ligne"
    ],
    "synonyms": [
      "m'inscrire",
      "je veux m'inscrire",
      "réservation",
      "enregistrer",
      "participer",
      "comment faire",
      "procédure",
      "démarches"
    ],
    "relatedQuestions": [
      "faq-inscription-informations",
      "faq-inscription-participants",
      "faq-tarifs-paiement"
    ],
    "action": "inscription"
  },
  {
    "id": "faq-inscription-prerequis",
    "category": "inscription",
    "question": "Quels sont les prérequis pour participer ?",
    "answer": "Les prérequis éventuels dépendent de la formation choisie. La formation Nacelles élévatrices, par exemple, s'adresse aux opérateurs, aux techniciens de maintenance, au personnel d'entretien et à toute personne amenée à utiliser une nacelle dans le cadre de son travail.\n\nPour connaître les prérequis précis d'une formation, contactez-nous.",
    "keywords": [
      "prérequis",
      "conditions",
      "niveau requis",
      "public",
      "destinataires",
      "pour qui"
    ],
    "synonyms": [
      "pré-requis",
      "conditions d'accès",
      "est-ce pour moi",
      "qui peut participer",
      "expérience",
      "diplôme",
      "âge",
      "profil",
      "à qui s'adresse"
    ],
    "relatedQuestions": [
      "faq-choisir-adaptee",
      "faq-inscription-comment",
      "faq-contact-contact"
    ],
    "action": "contact"
  },
  {
    "id": "faq-inscription-informations",
    "category": "inscription",
    "question": "Quelles informations dois-je fournir pour m'inscrire ?",
    "answer": "L'inscription en ligne vous demande :\n- les formations souhaitées et le nombre de participants ;\n- les coordonnées de la personne responsable de l'inscription ;\n- les informations de facturation : entreprise, numéro de TVA et adresse.\n\nCes informations figurent sur votre confirmation et votre facture.",
    "keywords": [
      "informations",
      "données",
      "coordonnées",
      "facturation",
      "tva",
      "documents",
      "renseignements"
    ],
    "synonyms": [
      "documents à fournir",
      "ce qu'il faut fournir",
      "papiers",
      "numéro de tva",
      "adresse de facturation",
      "champs du formulaire",
      "dossier",
      "pièces"
    ],
    "relatedQuestions": [
      "faq-inscription-comment",
      "faq-inscription-participants",
      "faq-tarifs-tva"
    ],
    "action": "inscription"
  },
  {
    "id": "faq-inscription-participants",
    "category": "inscription",
    "question": "Dois-je connaître le nom des participants dès l'inscription ?",
    "answer": "Non. Lors de l'inscription en ligne, vous pouvez renseigner les participants pour chaque formation, ou les communiquer plus tard, après la confirmation de l'inscription.",
    "keywords": [
      "participants",
      "noms",
      "plus tard",
      "liste",
      "communiquer"
    ],
    "synonyms": [
      "noms des participants",
      "sans les noms",
      "ajouter des noms plus tard",
      "stagiaires",
      "personnes",
      "prénoms"
    ],
    "relatedQuestions": [
      "faq-inscription-informations",
      "faq-entreprises-plusieurs",
      "faq-inscription-confirmation"
    ]
  },
  {
    "id": "faq-inscription-plusieurs-formations",
    "category": "inscription",
    "question": "Puis-je m'inscrire à plusieurs formations en une seule fois ?",
    "answer": "Oui. Le parcours d'inscription vous permet d'ajouter une ou plusieurs formations, puis d'ajuster le nombre de participants pour chacune. Le récapitulatif de votre inscription se met à jour au fur et à mesure.",
    "keywords": [
      "plusieurs formations",
      "sélection",
      "ajouter",
      "cumuler",
      "récapitulatif"
    ],
    "synonyms": [
      "combiner",
      "plusieurs cours",
      "deux formations",
      "enchaîner",
      "panier",
      "en une seule fois"
    ],
    "relatedQuestions": [
      "faq-entreprises-plusieurs",
      "faq-tarifs-prix",
      "faq-inscription-comment"
    ],
    "action": "inscription"
  },
  {
    "id": "faq-inscription-dates",
    "category": "inscription",
    "question": "Puis-je choisir la date de ma formation ?",
    "answer": "Les sessions sont publiées dans l'agenda et sur la page de chaque formation dès qu'elles sont confirmées, chacune avec son lien d'inscription. Si aucune session n'y figure encore pour la formation qui vous intéresse, contactez-nous pour connaître les prochaines disponibilités.",
    "keywords": [
      "dates",
      "session",
      "sessions",
      "calendrier",
      "agenda",
      "planning",
      "quand",
      "prochaine",
      "disponibilités",
      "délai"
    ],
    "synonyms": [
      "prochaines dates",
      "agenda",
      "horaires de la formation",
      "à quelle date",
      "délais",
      "date de début",
      "jour de la formation",
      "urgent",
      "rapidement"
    ],
    "relatedQuestions": [
      "faq-inscription-confirmation",
      "faq-deroulement-duree",
      "faq-contact-horaires"
    ],
    "action": "agenda"
  },
  {
    "id": "faq-inscription-confirmation",
    "category": "inscription",
    "question": "Comment savoir si mon inscription est confirmée ?",
    "answer": "Votre inscription en ligne aboutit à un récapitulatif de votre demande. Pour confirmer une session, ou pour toute question sur une inscription en cours, contactez-nous.",
    "keywords": [
      "confirmation",
      "confirmer",
      "confirmée",
      "validation",
      "récapitulatif",
      "suivi"
    ],
    "synonyms": [
      "mon inscription est-elle prise en compte",
      "accusé de réception",
      "e-mail de confirmation",
      "statut",
      "délai de confirmation",
      "délai de réponse"
    ],
    "relatedQuestions": [
      "faq-inscription-dates",
      "faq-tarifs-paiement",
      "faq-contact-contact"
    ],
    "action": "contact",
    "provisional": true
  },
  {
    "id": "faq-inscription-annulation",
    "category": "inscription",
    "question": "Puis-je annuler ou reporter mon inscription ?",
    "answer": "Les conditions d'annulation et de report ne sont pas détaillées en ligne pour le moment. Pour modifier, reporter ou annuler une inscription, contactez-nous.",
    "keywords": [
      "annulation",
      "annuler",
      "reporter",
      "report",
      "modifier",
      "remboursement"
    ],
    "synonyms": [
      "se désister",
      "désistement",
      "changer de date",
      "déplacer",
      "empêchement",
      "remboursé",
      "modification d'inscription",
      "conditions d'annulation"
    ],
    "relatedQuestions": [
      "faq-contact-contact",
      "faq-inscription-confirmation",
      "faq-inscription-dates"
    ],
    "action": "contact",
    "provisional": true
  },
  {
    "id": "faq-tarifs-prix",
    "category": "tarifs",
    "question": "Quels sont les tarifs des formations ?",
    "answer": "Les tarifs varient selon la formation et le contexte (participant individuel ou entreprise). Le tarif figure sur la page de la formation et dans l'inscription en ligne lorsqu'il est confirmé ; certaines formations sont proposées sur devis.\n\nPour un tarif adapté à votre besoin, contactez-nous.",
    "keywords": [
      "tarif",
      "tarifs",
      "prix",
      "coût",
      "combien",
      "devis"
    ],
    "synonyms": [
      "combien ça coûte",
      "budget",
      "montant",
      "euros",
      "cher",
      "prix de la formation",
      "grille tarifaire",
      "coût par participant",
      "gratuit"
    ],
    "relatedQuestions": [
      "faq-tarifs-tva",
      "faq-tarifs-paiement",
      "faq-entreprises-devis"
    ],
    "action": "contact"
  },
  {
    "id": "faq-tarifs-tva",
    "category": "tarifs",
    "question": "Les prix affichés incluent-ils la TVA ?",
    "answer": "Cela dépend de la formation. Le tarif de la formation Nacelles élévatrices est indiqué hors TVA (HT). Pour les autres tarifs publiés, le statut TVA (HT ou TTC) n'est pas précisé en ligne : contactez-nous pour connaître le montant TTC applicable.\n\nLe taux de TVA n'est pas encore affiché dans le parcours d'inscription en ligne.",
    "keywords": [
      "tva",
      "ht",
      "ttc",
      "hors taxe"
    ],
    "synonyms": [
      "taxe",
      "prix ttc",
      "montant ttc",
      "taux de tva",
      "toutes taxes comprises",
      "hors tva"
    ],
    "relatedQuestions": [
      "faq-tarifs-prix",
      "faq-tarifs-paiement",
      "faq-tarifs-financement"
    ],
    "action": "contact"
  },
  {
    "id": "faq-tarifs-paiement",
    "category": "tarifs",
    "question": "Comment se passe le paiement ?",
    "answer": "Le paiement en ligne n'est pas encore disponible : aucun montant n'est débité lors de votre inscription en ligne.\n\nPour connaître les modalités de règlement et de facturation, contactez-nous.",
    "keywords": [
      "paiement",
      "payer",
      "règlement",
      "facture",
      "facturation"
    ],
    "synonyms": [
      "comment payer",
      "payement",
      "modalités de paiement",
      "virement",
      "carte bancaire",
      "acompte",
      "paiement en ligne",
      "régler",
      "facturer"
    ],
    "relatedQuestions": [
      "faq-tarifs-tva",
      "faq-tarifs-financement",
      "faq-inscription-confirmation"
    ],
    "action": "contact",
    "provisional": true
  },
  {
    "id": "faq-tarifs-financement",
    "category": "tarifs",
    "question": "Existe-t-il des aides ou des financements pour suivre une formation ?",
    "answer": "La page Formations indique qu'un financement est possible. Les dispositifs et conditions concernés ne sont pas détaillés en ligne : pour savoir ce qui peut s'appliquer à votre projet, contactez-nous.",
    "keywords": [
      "financement",
      "financer",
      "subvention",
      "prise en charge",
      "aides financières"
    ],
    "synonyms": [
      "aide financière",
      "subsides",
      "subside",
      "fonds de formation",
      "cpf",
      "opco",
      "compte formation",
      "aide à la formation",
      "payer la formation",
      "frais de formation"
    ],
    "relatedQuestions": [
      "faq-tarifs-prix",
      "faq-tarifs-paiement",
      "faq-contact-contact"
    ],
    "action": "contact",
    "provisional": true
  },
  {
    "id": "faq-deroulement-comment",
    "category": "deroulement",
    "question": "Comment se déroule une formation ?",
    "answer": "Nos formations durent de 1 à 3 jours selon le programme, sont animées par des formateurs expérimentés et alternent théorie et pratique.\n\nPour les dates précises et l'organisation, le mieux est de nous contacter.",
    "keywords": [
      "déroulement",
      "organisation",
      "programme",
      "format",
      "fonctionnement",
      "formateurs"
    ],
    "synonyms": [
      "comment ça se passe",
      "comment se passe une formation",
      "journée type",
      "déroulé",
      "modalités pratiques",
      "modalités",
      "organisée"
    ],
    "relatedQuestions": [
      "faq-deroulement-duree",
      "faq-deroulement-theorie-pratique",
      "faq-deroulement-lieu"
    ],
    "action": "contact"
  },
  {
    "id": "faq-deroulement-duree",
    "category": "deroulement",
    "question": "Combien de temps dure une formation ?",
    "answer": "La durée dépend de la formation :\n- 1 jour : VCA Base, Nacelles élévatrices ;\n- 3 jours : BEPS – Premier secours ;\n- VCA Ligne hiérarchique, Diisocyanates & substances dangereuses et Fibre optique : durée communiquée sur demande, selon la formule choisie.",
    "keywords": [
      "durée",
      "jours",
      "heures",
      "combien de temps"
    ],
    "synonyms": [
      "combien de jours",
      "la formation dure",
      "durée de la formation",
      "long",
      "journée",
      "1 jour",
      "2 jours",
      "3 jours",
      "longueur"
    ],
    "relatedQuestions": [
      "faq-deroulement-comment",
      "faq-choisir-vca-difference",
      "faq-inscription-dates"
    ],
    "action": "formations"
  },
  {
    "id": "faq-deroulement-theorie-pratique",
    "category": "deroulement",
    "question": "Les formations sont-elles théoriques ou pratiques ?",
    "answer": "Elles associent généralement théorie et pratique. La formation Nacelles élévatrices combine par exemple une partie théorique et une mise en pratique.",
    "keywords": [
      "théorie",
      "pratique",
      "exercices",
      "mise en pratique",
      "terrain",
      "équipement"
    ],
    "synonyms": [
      "cours théorique",
      "travaux pratiques",
      "matériel",
      "équipement fourni",
      "sur machine",
      "manipulation",
      "théorique ou pratique"
    ],
    "relatedQuestions": [
      "faq-deroulement-comment",
      "faq-deroulement-duree",
      "faq-attestations-recevoir"
    ]
  },
  {
    "id": "faq-deroulement-lieu",
    "category": "deroulement",
    "question": "Où ont lieu les formations ?",
    "answer": "Wisy Safety est un centre de formation situé à Anderlecht (1070), à Bruxelles : Avenue d'Itterbeek 378.\n\nPour une formation organisée dans vos locaux ou une intervention sur site, contactez-nous.",
    "keywords": [
      "lieu",
      "adresse",
      "anderlecht",
      "bruxelles",
      "localisation",
      "où"
    ],
    "synonyms": [
      "où se trouve",
      "où se situe",
      "où êtes-vous",
      "vous êtes où",
      "vous êtes situés où",
      "c'est où",
      "où se déroule",
      "où a lieu",
      "accès",
      "comment venir",
      "plan",
      "itinéraire",
      "transports",
      "parking",
      "centre de formation",
      "situé"
    ],
    "relatedQuestions": [
      "faq-entreprises-sur-site",
      "faq-contact-horaires",
      "faq-contact-contact"
    ],
    "action": "contact"
  },
  {
    "id": "faq-deroulement-accessibilite",
    "category": "deroulement",
    "question": "Les formations sont-elles accessibles aux personnes à mobilité réduite ?",
    "answer": "Nous ne publions pas encore d'informations sur l'accessibilité de nos locaux. Si vous avez des besoins particuliers, contactez-nous avant votre inscription afin d'obtenir une réponse précise.",
    "keywords": [
      "accessibilité",
      "accessible",
      "mobilité réduite",
      "pmr",
      "handicap"
    ],
    "synonyms": [
      "personne handicapée",
      "fauteuil roulant",
      "besoins particuliers",
      "aménagements",
      "situation de handicap",
      "ascenseur",
      "accès pmr"
    ],
    "relatedQuestions": [
      "faq-deroulement-lieu",
      "faq-contact-contact",
      "faq-inscription-comment"
    ],
    "action": "contact",
    "provisional": true
  },
  {
    "id": "faq-attestations-recevoir",
    "category": "attestations",
    "question": "Que vais-je recevoir après ma formation ?",
    "answer": "Cela dépend de la formation suivie :\n- la VCA Base inclut l'examen VCA : la certification VCA est délivrée après réussite de l'examen ;\n- le BEPS prépare au brevet européen de premiers secours.\n\nPour savoir précisément ce qui vous est remis à l'issue d'une formation donnée, contactez-nous.",
    "keywords": [
      "attestation",
      "certificat",
      "certification",
      "diplôme",
      "brevet",
      "reconnaissance"
    ],
    "synonyms": [
      "que reçois-je",
      "ce que je reçois",
      "document remis",
      "preuve de formation",
      "certificat de formation",
      "attestation de présence",
      "reconnu",
      "après la formation",
      "à l'issue de la formation",
      "en fin de formation",
      "document à la fin",
      "fin de formation"
    ],
    "relatedQuestions": [
      "faq-attestations-vca-examen",
      "faq-attestations-nacelle",
      "faq-deroulement-duree"
    ],
    "action": "contact"
  },
  {
    "id": "faq-attestations-vca-examen",
    "category": "attestations",
    "question": "La formation VCA débouche-t-elle sur un examen ?",
    "answer": "Oui : la formation VCA Base inclut l'examen. D'après les documents officiels de BeSaCC-VCA, l'examen VCA Base compte 40 questions, dure 60 minutes et se réussit à partir de 64,5 % de bonnes réponses ; la certification VCA est délivrée après réussite de l'examen.\n\nPour les modalités pratiques (langue, conditions), contactez-nous.",
    "keywords": [
      "examen",
      "vca",
      "test",
      "évaluation",
      "certification"
    ],
    "synonyms": [
      "passer l'examen",
      "examen vca",
      "qcm",
      "réussite",
      "échec",
      "repasser l'examen",
      "note"
    ],
    "relatedQuestions": [
      "faq-attestations-recevoir",
      "faq-choisir-vca-difference",
      "faq-contact-contact"
    ],
    "action": "vca"
  },
  {
    "id": "faq-attestations-nacelle",
    "category": "attestations",
    "question": "La formation Nacelles élévatrices est-elle certifiante ?",
    "answer": "La formation Nacelles élévatrices a pour objectif de vous apprendre à utiliser les nacelles élévatrices en toute sécurité et à identifier les risques associés. Pour toute question sur la reconnaissance de cette formation, contactez notre équipe.",
    "keywords": [
      "nacelle",
      "nacelles",
      "certifiante",
      "pemp",
      "mewp",
      "travail en hauteur"
    ],
    "synonyms": [
      "nacelle élévatrice",
      "hoogwerker",
      "reconnue",
      "agréée",
      "certificat nacelle",
      "obligatoire",
      "réglementaire",
      "légal",
      "reconnaissance de la formation"
    ],
    "relatedQuestions": [
      "faq-attestations-recevoir",
      "faq-deroulement-theorie-pratique",
      "faq-contact-contact"
    ],
    "action": "nacelle"
  },
  {
    "id": "faq-entreprises-plusieurs",
    "category": "entreprises",
    "question": "Puis-je inscrire plusieurs collaborateurs ?",
    "answer": "Oui. Lors de l'inscription en ligne, vous pouvez préciser le nombre de participants pour chaque formation.\n\nPour former une équipe complète ou planifier plusieurs sessions, contactez-nous : nous adaptons l'organisation à votre entreprise.",
    "keywords": [
      "plusieurs collaborateurs",
      "équipe",
      "entreprise",
      "groupe",
      "participants"
    ],
    "synonyms": [
      "former mon équipe",
      "former mes employés",
      "plusieurs personnes",
      "salariés",
      "personnel",
      "nombre de participants",
      "inscription groupée",
      "inscription de groupe",
      "collaborateurs"
    ],
    "relatedQuestions": [
      "faq-entreprises-devis",
      "faq-entreprises-sur-site",
      "faq-inscription-participants"
    ],
    "action": "inscription"
  },
  {
    "id": "faq-entreprises-sur-site",
    "category": "entreprises",
    "question": "Organisez-vous des formations en entreprise ou sur site ?",
    "answer": "Pour l'organisation d'une formation dédiée à votre entreprise ou une intervention sur site, contactez-nous afin d'étudier votre besoin ensemble.",
    "keywords": [
      "entreprise",
      "sur site",
      "dans vos locaux",
      "intra",
      "sur mesure"
    ],
    "synonyms": [
      "formation en entreprise",
      "formation intra-entreprise",
      "chez nous",
      "dans nos locaux",
      "intervention sur site",
      "déplacement",
      "formateur qui vient",
      "dédiée",
      "formation privée"
    ],
    "relatedQuestions": [
      "faq-entreprises-devis",
      "faq-entreprises-plusieurs",
      "faq-deroulement-lieu"
    ],
    "action": "contact"
  },
  {
    "id": "faq-entreprises-devis",
    "category": "entreprises",
    "question": "Pouvez-vous établir un devis ?",
    "answer": "Oui. Décrivez-nous votre besoin — formation souhaitée, nombre de participants, échéance — et nous vous transmettons une proposition adaptée.",
    "keywords": [
      "devis",
      "proposition",
      "estimation",
      "sur mesure"
    ],
    "synonyms": [
      "demander un devis",
      "offre de prix",
      "estimation tarifaire",
      "formation sur devis",
      "proposition commerciale",
      "tarif entreprise",
      "offre entreprise"
    ],
    "relatedQuestions": [
      "faq-tarifs-prix",
      "faq-entreprises-sur-site",
      "faq-contact-contact"
    ],
    "action": "contact"
  },
  {
    "id": "faq-contact-contact",
    "category": "contact",
    "question": "Comment contacter Wisy Safety si je ne trouve pas ma réponse ?",
    "answer": "Vous pouvez nous joindre par téléphone au +32 2 318 86 59, par e-mail à info@wisysafety.be, ou via le formulaire de la page Contact.\n\nNous sommes disponibles du lundi au jeudi, de 10h00 à 16h00.",
    "keywords": [
      "contact",
      "téléphone",
      "e-mail",
      "email",
      "joindre",
      "formulaire"
    ],
    "synonyms": [
      "appeler",
      "écrire",
      "coordonnées",
      "numéro",
      "adresse mail",
      "parler à quelqu'un",
      "contacter l'équipe",
      "service client",
      "rappel",
      "conseiller"
    ],
    "relatedQuestions": [
      "faq-contact-horaires",
      "faq-contact-assistant",
      "faq-inscription-comment"
    ],
    "action": "contact"
  },
  {
    "id": "faq-contact-horaires",
    "category": "contact",
    "question": "Quels sont vos horaires d'ouverture ?",
    "answer": "Notre équipe est joignable du lundi au jeudi, de 10h00 à 16h00. Nous sommes fermés le vendredi, le samedi et le dimanche.",
    "keywords": [
      "horaires",
      "ouverture",
      "heures d'ouverture",
      "ouvert",
      "fermé"
    ],
    "synonyms": [
      "quand appeler",
      "jours d'ouverture",
      "disponibilité de l'équipe",
      "jusqu'à quelle heure",
      "week-end",
      "vendredi",
      "lundi",
      "jeudi"
    ],
    "relatedQuestions": [
      "faq-contact-contact",
      "faq-inscription-dates",
      "faq-contact-assistant"
    ],
    "action": "contact"
  },
  {
    "id": "faq-contact-assistant",
    "category": "contact",
    "question": "Puis-je poser une question directement en ligne ?",
    "answer": "Oui : l'assistant Wisy Safety, accessible en bas de chaque page, répond à vos questions courantes à partir des informations publiées sur ce site.\n\nPour un échange personnalisé, notre équipe reste joignable via la page Contact.",
    "keywords": [
      "assistant",
      "chatbot",
      "question en ligne",
      "poser une question",
      "chat"
    ],
    "synonyms": [
      "robot",
      "aide en ligne",
      "discuter",
      "conversation",
      "assistant virtuel",
      "wisy",
      "bot"
    ],
    "relatedQuestions": [
      "faq-contact-contact",
      "faq-choisir-adaptee",
      "faq-inscription-comment"
    ],
    "action": "assistant"
  },
  {
    "id": "faq-coordination-quest-ce-que",
    "category": "coordination",
    "question": "Qu'est-ce que WiSy Coordination ?",
    "answer": "WiSy Coordination est le pôle de Wisy Safety dédié à la coordination sécurité-santé sur les chantiers temporaires ou mobiles.\n\nNous accompagnons maîtres d'ouvrage, architectes et entreprises dans l'organisation de la prévention : plan de sécurité et de santé (PSS), coordination des intervenants, visites de chantier et dossier d'intervention ultérieure (DIU) à la clôture du projet.\n\nRetrouvez la démarche complète sur la page WiSy Coordination.",
    "keywords": [
      "wisy coordination",
      "coordination",
      "coordination securite sante",
      "c'est quoi wisy coordination",
      "presentation coordination"
    ],
    "synonyms": [
      "wisy coordination c'est quoi",
      "presentez wisy coordination",
      "coordination securite chantier",
      "coordination sante securite"
    ],
    "relatedQuestions": [
      "faq-coordination-pss",
      "faq-coordination-diu",
      "faq-coordination-demander"
    ],
    "action": "coordination"
  },
  {
    "id": "faq-coordination-pss",
    "category": "coordination",
    "question": "Qu'est-ce qu'un PSS (Plan de Sécurité et de Santé) ?",
    "answer": "Le Plan de Sécurité et de Santé (PSS) identifie les risques d'un chantier et les mesures de prévention à mettre en œuvre, dès la phase de conception du projet.\n\nIl est établi et actualisé par le coordinateur sécurité-santé, en concertation avec le maître d'ouvrage et les intervenants, puis suivi tout au long du chantier.\n\nSa base légale : l'arrêté royal du 25 janvier 2001 concernant les chantiers temporaires ou mobiles.",
    "keywords": [
      "pss",
      "plan de securite et de sante",
      "plan de securite",
      "definition pss"
    ],
    "synonyms": [
      "c'est quoi un pss",
      "a quoi sert le pss",
      "plan securite sante"
    ],
    "relatedQuestions": [
      "faq-coordination-diu",
      "faq-coordination-quand-obligatoire",
      "faq-coordination-quest-ce-que"
    ],
    "action": "coordination"
  },
  {
    "id": "faq-coordination-diu",
    "category": "coordination",
    "question": "Qu'est-ce qu'un DIU (Dossier d'Intervention Ultérieure) ?",
    "answer": "Le Dossier d'Intervention Ultérieure (DIU) rassemble, à la fin du chantier, les informations utiles à la sécurité des travaux futurs sur l'ouvrage : entretien, réparation, transformation ou démolition.\n\nIl est constitué par le coordinateur sécurité-santé et remis au maître d'ouvrage, qui doit le conserver et le transmettre à tout futur intervenant.\n\nComme le PSS, il est prévu par l'arrêté royal du 25 janvier 2001 concernant les chantiers temporaires ou mobiles.",
    "keywords": [
      "diu",
      "dossier d'intervention ulterieure",
      "dossier intervention ulterieure"
    ],
    "synonyms": [
      "c'est quoi un diu",
      "a quoi sert le diu",
      "definition du diu"
    ],
    "relatedQuestions": [
      "faq-coordination-pss",
      "faq-coordination-quest-ce-que"
    ],
    "action": "coordination"
  },
  {
    "id": "faq-coordination-demander",
    "category": "coordination",
    "question": "Comment demander une coordination sécurité-santé ?",
    "answer": "Décrivez votre projet (type, localisation, phase) via le formulaire de la page WiSy Coordination, ou contactez-nous par téléphone ou e-mail : +32 2 318 86 59 / info@wisysafety.be.\n\nNotre équipe revient vers vous pour définir la mission de coordination adaptée à votre chantier.",
    "keywords": [
      "demander une coordination",
      "demande de coordination",
      "contacter coordination"
    ],
    "synonyms": [
      "comment vous contacter pour une coordination",
      "demander un coordinateur",
      "solliciter une coordination"
    ],
    "relatedQuestions": [
      "faq-coordination-quest-ce-que",
      "faq-coordination-quand-obligatoire"
    ],
    "action": "coordination"
  },
  {
    "id": "faq-coordination-quand-obligatoire",
    "category": "coordination",
    "question": "Quand la coordination sécurité-santé est-elle obligatoire ?",
    "answer": "En Belgique, un coordinateur sécurité-santé doit être désigné dès qu'un chantier temporaire ou mobile réunit plusieurs entrepreneurs, simultanément ou successivement — c'est l'arrêté royal du 25 janvier 2001 qui fixe ce cadre, en application de la loi du 4 août 1996 relative au bien-être des travailleurs.\n\nLa mission comprend une phase « projet » (dès la conception, avec le PSS) et une phase « réalisation » (suivi de chantier), confiées à un coordinateur de niveau A ou B selon l'ampleur et la complexité du projet.\n\nNous vous accompagnons dans l'application des obligations de coordination applicables à votre projet : contactez-nous pour un avis sur votre cas.",
    "keywords": [
      "obligatoire",
      "quand coordination",
      "obligation coordination",
      "plusieurs entrepreneurs"
    ],
    "synonyms": [
      "ai-je besoin d'un coordinateur",
      "mon chantier a-t-il besoin d'une coordination",
      "coordination obligatoire chantier"
    ],
    "relatedQuestions": [
      "faq-coordination-niveau-a-b",
      "faq-coordination-quest-ce-que"
    ],
    "action": "coordination"
  },
  {
    "id": "faq-coordination-niveau-a-b",
    "category": "coordination",
    "question": "Quelle est la différence entre un coordinateur niveau A et niveau B ?",
    "answer": "Les coordinateurs sécurité-santé sont répartis en deux niveaux de qualification, définis par l'arrêté royal du 25 janvier 2001 : le niveau A est requis pour les projets les plus vastes ou complexes, le niveau B pour les autres chantiers soumis à coordination.\n\nLe niveau requis dépend de la taille, de la durée et de la nature du projet — pas d'un choix du maître d'ouvrage.\n\nPour savoir quel niveau s'applique à votre projet, décrivez-le-nous via la page WiSy Coordination.",
    "keywords": [
      "niveau a",
      "niveau b",
      "coordinateur niveau a",
      "coordinateur niveau b",
      "difference niveau"
    ],
    "synonyms": [
      "quel niveau de coordinateur",
      "niveau a ou b",
      "difference entre niveau a et b"
    ],
    "relatedQuestions": [
      "faq-coordination-quand-obligatoire",
      "faq-coordination-quest-ce-que"
    ],
    "action": "coordination"
  }
];
