# Audit, corrections et optimisation — wisysafety.be — 23/10/2026

Branche `claude/hopeful-kirch-8b00d6` (non commitée, non publiée : rien n'est en ligne tant que la branche n'est pas
fusionnée dans `main`). Base : dépôt + site en ligne https://wisysafety.be.

**Légende des statuts**
✅ **Corrigé et testé** (tests automatiques et/ou navigateur, preuves ci-dessous) ·
🟡 **Implémenté, non vérifié en production** (fonctionne en local ; vérification après fusion / déploiement) ·
⏳ **En attente de votre intervention** (accès, décision ou validation qui vous revient).

---

## 0. Ce qu'il faut retenir

1. **Les formulaires fonctionnent aujourd'hui** (5 envois réels acceptés par EmailJS ou par le script Google), mais
   **sans validation serveur, sans journal, sans « Répondre à » vers le visiteur côté réservation**, et EmailJS accepte
   des envois depuis n'importe quel site. → Nouveau circuit serveur (script Google déjà en production, v1.1.0) avec
   repli automatique sur EmailJS : rien ne se perd pendant la transition.
2. **Le domaine est bien branché** (HTTPS valide, www → apex en 301, github.io → domaine en 301), **mais toutes les
   URL canoniques, le sitemap et les données structurées pointaient vers `www.wisysafety.be`, une redirection.** → Corrigé.
3. **Un faux avis était publié** (« Test Claude », 5/5, « Avis vérifié »). → Masqué par le site ; à refuser dans la feuille.
4. **Le domaine n'a ni SPF, ni DKIM, ni DMARC.** → Enregistrements exacts fournis ; accès DNS / Microsoft 365 requis.
5. **L'agenda n'affiche aucune session** (0 session à venir dans la feuille) alors que les concurrents en affichent des
   dizaines : c'est le premier frein commercial, et il se règle sans code (feuille « Réservations »).

---

## 1. Technologies, hébergement, services (inventaire vérifié)

| Élément | Constat (23/10/2026) |
|---|---|
| Site | 100 % statique (HTML/CSS/JS), 24 pages publiques, 10 langues traduites en JavaScript sur la même URL |
| Hébergement | GitHub Pages (dépôt public `RayaneVanOsselt/Wisy-Safety-2026`, branche `main`, fichier `CNAME` = `wisysafety.be`) |
| DNS | Amazon Route 53 (`ns-*.awsdns-*`) |
| Messagerie | Microsoft 365 (MX `wisysafety-be.mail.protection.outlook.com`) |
| Formulaires | EmailJS (contact, coordination, PEB) ; Google Apps Script : réservations (v1.0.1), avis, certificats |
| Entreprise (BCE) | n° 1027.725.391 — **dénomination légale « WISY »**, ASBL, Avenue d'Itterbeek 378 **boîte 1**, 1070 Anderlecht, active depuis le 17/09/2025 |

---

## 2. Formulaires et e-mails (priorité absolue)

### 2.1 Inventaire et tests réels (envois marqués « TEST — ne pas traiter »)

| Formulaire | Envoi avant correction | Test réel | Résultat prestataire | Réception info@ |
|---|---|---|---|---|
| Contact / devis (`contact.html`, site en ligne) | EmailJS | 1 envoi | ✅ HTTP 200 (1,98 s) ; 1er essai : coupure réseau côté navigateur → message d'erreur, données conservées, bouton réactivé | ⏳ à confirmer |
| Coordination | EmailJS | 1 envoi (code identique, serveur local) | ✅ HTTP 200 (1,6 s) | ⏳ |
| Test PEB | EmailJS | 1 envoi (idem) | ✅ HTTP 200 (1,3 s) | ⏳ |
| Inscription | script Google « Réservations » | 1 demande | ✅ `ok`, réf. **WSR-2026-8ADDP** (10 s) | ⏳ |
| Avis | script Google « Avis » | 1 avis | ✅ `ok`, réf. **WS-2026-VWGNA** (« En attente ») | ⏳ |
| Nouveau formulaire de contact (après correction) | script → repli EmailJS | 1 envoi | ✅ script v1.0.1 : refus sans écriture, puis EmailJS HTTP 200 — réf. **WSW-2026-BJP9Z** (3,3 s au total) | ⏳ |
| Vérification de certificat, question à l'assistant | — | — | ne transmettent rien (normal) | — |

Une réponse HTTP réussie ne prouve pas la réception : **merci de confirmer que ces 6 messages sont arrivés dans
info@wisysafety.be** (et de regarder les indésirables).

### 2.2 Problèmes détectés

- Aucune validation côté serveur (EmailJS envoie ce qu'on lui donne) ; anti-spam limité à un champ piège côté navigateur.
- EmailJS accepte des envois depuis n'importe quelle origine (constaté : envois acceptés depuis `localhost`).
- E-mail « Nouvelle réservation » : « Répondre » renvoyait vers info@ elle-même, pas vers le client.
- Test PEB : nom, e-mail et téléphone envoyés **sans case de consentement**, et « Merci ! » affiché même quand rien
  n'était parti (EmailJS non chargé).
- Identifiants EmailJS copiés dans 4 fichiers ; page contact : sujets envoyés dans la langue du visiteur.
- Sans JavaScript, les formulaires se soumettaient en GET : **nom et e-mail dans l'adresse de la page**.
- `contact.html?subject=vca-entreprise` (4 liens) était ignoré ; « Former mon équipe » n'ouvrait pas « Demande de devis ».
- Inscription sans date choisie : « Réservation enregistrée » au lieu de « Demande enregistrée ».

### 2.3 Corrections

| Correction | Statut |
|---|---|
| Script Google v1.1.0 (`google-sheets/reservations.gs`) : action « contact » — revalidation complète (e-mail, nom, sujet autorisé, consentement, téléphone, longueurs), robots (champ piège, envoi < 2,5 s), anti-doublon (clé de requête), limites (5/adresse/h, 40/h, 150/6 h), onglet **Demandes** (statuts Nouvelle → Traitée), e-mail structuré à info@ avec **Répondre à = visiteur**, accusé de réception (fr/nl/en, sans recopier le texte libre : pas de relais de spam), réessais automatiques, journal, compteurs dans `?action=health`, anonymisation configurable, menu « ✉ Envoyer un e-mail de test » | ✅ testé (21 tests) · ⏳ à déployer |
| Client commun `js/forms.js` : « envoyé » **seulement** après réponse positive ; bouton bloqué pendant l'envoi ; formulaire vidé seulement après confirmation ; en échec : message clair, données conservées, **Réessayer** (même clé : pas de doublon), **e-mail pré-rempli**, **téléphone** ; champs refusés par le serveur signalés | ✅ tests + navigateur (6 scénarios) |
| Repli EmailJS automatique si le script n'est pas à jour / en panne / injoignable (aucune demande perdue pendant la transition) | ✅ vérifié en réel (WSW-2026-BJP9Z) |
| Réservations : « Répondre » de l'e-mail à l'équipe → le client | ✅ testé · ⏳ à déployer |
| Test PEB : case de consentement obligatoire (10 langues) ; « Merci » trompeur supprimé | ✅ navigateur |
| Formulaires en `method="post"` (plus jamais de données dans l'URL), limites de longueur, sujets à codes stables, présélection `?subject=` (devis, vca-entreprise…) | ✅ |
| Identifiants EmailJS à un seul endroit (`js/supabase-config.js`) | ✅ test |
| Inscription « date à convenir » : « Demande enregistrée » (10 langues) | ✅ |
| Message d'erreur professionnel (« L'envoi n'a pas abouti… » au lieu de « Oups ») — 10 langues | ✅ |

Guide complet, mise en service pas à pas et DNS : **`docs/README-FORMULAIRES.md`**.

### 2.4 E-mail : authentification du domaine

| Point | Constat | Statut |
|---|---|---|
| SPF | absent | ⏳ ajouter `v=spf1 include:spf.protection.outlook.com ~all` (TXT `wisysafety.be`, Route 53) |
| DKIM | absent | ⏳ Microsoft Defender › Authentification des e-mails › DKIM : 2 CNAME à copier, puis « Activer » |
| DMARC | absent | ⏳ TXT `_dmarc` : `v=DMARC1; p=none; rua=mailto:info@wisysafety.be; fo=1` puis `p=quarantine` |
| Expéditeur des e-mails du site | compte Google du script (authentifié par Google) | ⏳ recommandé : Microsoft 365 (`formations@wisysafety.be`, guide `README-RESERVATIONS.md` § 4) |
| EmailJS | origine non restreinte ; destinataire et Reply-To du gabarit non visibles depuis le code | ⏳ tableau de bord EmailJS : domaines autorisés = `wisysafety.be` ; gabarit : To = info@, Reply-To = `{{user_email}}` |

---

## 3. Domaine, HTTPS, redirections

| Vérification (23/10/2026) | Résultat | Statut |
|---|---|---|
| DNS apex | 4 × A GitHub Pages (185.199.108-111.153) ; pas d'AAAA (IPv6 facultatif) | ✅ |
| `www` | CNAME `rayanevanosselt.github.io` | ✅ |
| Certificat | Let's Encrypt, `wisysafety.be` + `www`, valable du 22/10/2026 au 20/01/2027 (renouvellement automatique GitHub) | ✅ |
| HTTP → HTTPS ; www → apex ; github.io → domaine | 301 partout, chemin conservé | ✅ |
| Pages et ressources | exploration complète : 25 pages, 498 ressources, **0 erreur 404** | ✅ |
| **Canonical / sitemap / robots / Open Graph / JSON-LD** | pointaient vers `https://www.wisysafety.be` (une redirection) | ✅ corrigé → `https://wisysafety.be`, régénéré par `scripts/build-seo.js` |
| Liens des e-mails des scripts Google | pointaient vers github.io | ✅ corrigé (⏳ à redéployer) |
| Anciennes adresses WordPress | 404 | ✅ 11 pages de redirection immédiate + table dans la 404 (14 adresses) ; fiches `/certificat/…` volontairement non redirigées (données personnelles) — `docs/redirects.md` |
| Dossiers internes publiés sur le domaine (docs, tests, scripts, originaux 47 Mo) | servis en 200 | 🟡 exclus de la publication (`_config.yml`) — à vérifier après déploiement |
| En-têtes de sécurité (HSTS, CSP, anti-clickjacking) | aucun ; GitHub Pages ne permet pas d'en ajouter | ⏳ option : Cloudflare devant GitHub Pages (changement DNS, gratuit) — apporterait aussi de vraies 301 |
| Vérification du domaine dans GitHub (anti-détournement) | absente | ⏳ GitHub › Settings › Pages › « Verified domains » : TXT `_github-pages-challenge-RayaneVanOsselt` |

---

## 4. SEO technique

| Point | Statut |
|---|---|
| 24 pages : 1 seul H1, title et description présents, canonical absolu unique, Open Graph complet, JSON-LD valide (tests existants) | ✅ |
| Canonical et sitemap sur le domaine réel | ✅ |
| Titres faibles « Wisy Safety — Contact / Avis clients / Centre d'aide & FAQ » → titres descriptifs (10 langues) | ✅ |
| Description de la page Contact : affirmation non vérifiée « experts certifiés » retirée | ✅ |
| Données structurées : `areaServed` (Région de Bruxelles-Capitale, Wallonie — **affichée** dans la barre du haut) + `ContactPoint` | ✅ test |
| Horaires contradictoires sur la page Contact (9h–17h) vs pied de page, données structurées et assistant (10h–16h) → alignés sur la source unique (10h–16h) | ✅ · ⏳ **à confirmer** |
| L'assistant refusait les liens vers la page VCA Entreprise (route non autorisée) | ✅ corrigé |
| Langues : les 9 traductions sont générées en JavaScript sur l'URL française → **seul le français est indexable** (le néerlandais ne l'est pas, alors que Bruxelles est bilingue) | ⏳ projet à part (URL `/nl/` pré-générées) |
| Google Search Console : non vérifiable sans accès ; **je ne peux pas affirmer qu'une page est indexée** (la recherche `site:` n'a rien renvoyé) | ⏳ voir § 8 |

## 5. SEO local — Bruxelles et Wallonie

**Ce qui est en place** : zone desservie visible sur toutes les pages et en données structurées ; titres et descriptions
avec « Bruxelles / Anderlecht » ; adresse, téléphone, horaires et coordonnées GPS cohérents (source unique `js/faq-data.js`).

**Recherches prioritaires** (sans données de volume : à confirmer avec Search Console après 4 à 8 semaines) :

| Page | Expressions visées |
|---|---|
| Accueil | centre de formation sécurité Bruxelles · formation sécurité au travail Bruxelles · formation sécurité Anderlecht |
| Formations | formations sécurité Bruxelles · formation sécurité entreprise Bruxelles Wallonie |
| VCA Base / VCA LH | formation VCA Bruxelles · VCA de base Bruxelles · examen VCA Bruxelles · VCA cadre / VOL-VCA |
| VCA Entreprise | certification VCA entreprise · accompagnement VCA* VCA** |
| Nacelles | formation nacelle Bruxelles · formation PEMP Belgique · formation nacelle élévatrice Wallonie |
| BEPS | formation premiers secours Bruxelles · BEPS Bruxelles |
| Diisocyanates | formation diisocyanates Belgique · formation polyuréthane REACH 2020/1149 |
| Fibre optique | formation fibre optique Bruxelles · formation soudure / raccordement fibre |
| PEB | formation certificateur PEB Wallonie · devenir certificateur PEB Bruxelles |
| Coordination | coordinateur sécurité-santé Bruxelles · coordination sécurité chantier |
| Contact | devis formation sécurité · formation sécurité sur mesure entreprise |

**Pages locales** : **aucune page par ville n'a été créée** (elles seraient artificielles tant que Wisy Safety n'a ni
session ni lieu hors d'Anderlecht). Si vous confirmez des formations **en entreprise (intra)** partout en Wallonie, une
seule page utile « Formations en entreprise à Bruxelles et en Wallonie » (déplacement, nombre minimal de participants,
langues, délais réels) serait justifiée.

**Google Business Profile** (éligible : lieu physique qui accueille des stagiaires) — fiche à créer ou revendiquer
(aucune fiche liée trouvée : la carte du site pointe vers l'adresse, pas vers une fiche) :
nom « Wisy Safety » · catégorie principale « Centre de formation » · adresse Avenue d'Itterbeek 378 bte 1, 1070 Anderlecht ·
+32 2 318 86 59 · https://wisysafety.be · horaires lun–jeu 10:00–16:00 (à confirmer) · zone : Bruxelles, Wallonie ·
services = les formations du catalogue. **Aucun faux avis** : demander un avis aux vrais stagiaires après chaque session.

## 6. Concurrence (pages consultées le 23/10/2026)

| Acteur | Ce qu'il met en avant | Faiblesse observée |
|---|---|---|
| ECS (e-c-s.be) — VCA Base | 250 € HTVA, 1 jour, Bruxelles + Wallonie, **29 dates affichées jusqu'en 2027** (Complet/Fermé), inscription en ligne, « +35 ans », « 27 000 participants/an », logos clients | aucun avis client, places restantes non affichées |
| MTPrevention — VCA | 200 € HTVA examen inclus, forfaits « dans vos locaux », plusieurs villes | inscription par contact uniquement, aucun avis |
| Technicity.brussels, OPFO100, Bruxelles Formation, Constructiv | VCA (souvent public cible : demandeurs d'emploi), sessions datées | offre peu orientée entreprises / pas de réservation en ligne |
| Vinçotte (relevé du 14/10) | B-VCA 263 € HT, 18 dates | — |
| Centre CFS | nacelle à Engis / Charleroi / intra | pas à Bruxelles |

**Avantages réels de Wisy Safety à exploiter** (déjà construits) : réservation en ligne **avec places restantes en
direct**, vérification des certificats en ligne, site en 10 langues, contenus sourcés (VCA, diisocyanates, PEB), assistant.
**Ce qui manque pour dépasser la concurrence** : des **dates publiées** (agenda vide), des **avis réels**, des prix
affichés quand ils sont confirmés, une offre « en entreprise » claire, et le néerlandais indexable.

## 7. Performance, sécurité, RGPD

| Point | Statut |
|---|---|
| Poids par page (HTML+CSS+JS compressés) : 159 à 251 Ko ; JS 395 à 687 Ko non compressé, surtout les traductions des 10 langues chargées partout | ⏳ recommandé : charger seulement la langue affichée (gain estimé ≈ 100 Ko compressés/page) — chantier à part |
| Compression gzip, cache 10 min (GitHub Pages) ; polices auto-hébergées, budgets d'images (tests existants) | ✅ |
| Aucune clé secrète dans le code (clés publiques EmailJS / adresses de scripts uniquement) | ✅ vérifié |
| Injections : HTML échappé dans les e-mails, formules de tableur neutralisées, sauts de ligne neutralisés dans les objets | ✅ testé |
| **Faux avis publié** « Test Claude » (WS-2026-T9Q2B) | ✅ masqué par le site (filet de sécurité) · ⏳ à refuser dans la feuille |
| Politique de confidentialité : 15 mentions « [À COMPLÉTER] » visibles (10 sujets) (durées de conservation, hébergeur, messagerie, DPO…) ; traitements « réservations » et « demandes » (Google) non décrits | ⏳ texte juridique à valider par vous. Faits vérifiés pour vous aider : hébergeur = GitHub Inc. (CDN Fastly, servi depuis Bruxelles) ; messagerie = Microsoft 365 |
| Mentions légales : « Wisy Safety ASBL » alors que la BCE indique « WISY » (ASBL) ; adresse « boîte 1 » | ⏳ à vérifier |
| Conservation des demandes : anonymisation automatique prête (`REQUEST_RETENTION_MONTHS`, désactivée par défaut) | ⏳ durée à choisir (proposition : 36 mois sans suite) |

## 8. Tests réalisés (exécutés, pas supposés)

- **Suite automatique** : 570 tests, **570 réussis** (base de départ : 543 tests dont 3 échecs préexistants, corrigés).
  Exécutée avec JavaScriptCore (Node n'est pas installé sur la machine) via un émulateur de `node --test`.
- `scripts/check-i18n.js` : aucune erreur (10 langues). `scripts/build-seo.js` : régénéré, contrôle `--check` dans les tests.
- Navigateur (serveur local servant le code de la branche) : contact (succès script simulé, repli réel, coupure réseau,
  champs refusés, limite atteinte, réessai avec la même clé), coordination, PEB (consentement bloquant), avis (faux avis
  masqué), redirections (ancienne page, adresse en conflit, fiche certificat en 404), 15 pages sans erreur JavaScript ni
  image cassée, mobile 375 px sans débordement.
- Site en ligne : exploration complète (0 erreur 404), en-têtes, certificat, redirections, DNS.

## 9. Ce que vous devez faire (dans l'ordre)

1. **Vérifier la réception** des 6 messages de test dans info@wisysafety.be (et les indésirables) ; supprimer ces e-mails.
2. Feuille « Avis » : passer **WS-2026-T9Q2B** et **WS-2026-VWGNA** sur « Refusé ». Feuille « Réservations » : annuler
   **WSR-2026-8ADDP** (menu › Annuler la réservation sélectionnée).
3. **Fusionner la branche** dans `main` (PR) → mise en ligne en 1 à 3 minutes.
4. **Déployer le script v1.1.0** (`docs/README-FORMULAIRES.md` § 2, ≈ 5 min) + « Installer / réparer » + « Envoyer un
   e-mail de test » ; idem `avis.gs`. Puis me donner le feu vert : je referai un envoi réel de chaque formulaire.
5. **DNS (Route 53)** : SPF, DMARC, DKIM (Microsoft 365), vérification GitHub, vérification Google Search Console
   (TXT `google-site-verification=…`, propriété « Domaine » `wisysafety.be`, puis soumettre `https://wisysafety.be/sitemap.xml`).
6. **EmailJS** : domaines autorisés + vérification du gabarit (To / Reply-To).
7. **Publier des sessions** dans la feuille « Réservations » (cocher « Publiée sur le site »).
8. Confirmer : horaires (10h–16h ?), orthographe de marque, dénomination légale, durées de conservation, statut PEB.
9. Créer / revendiquer la **fiche Google Business Profile**.
