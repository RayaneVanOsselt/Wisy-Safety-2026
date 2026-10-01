# Audit d'intégration — 3 formations de l'ancien site (Phase 0)

Audit réalisé le **1er octobre 2026**, sur la branche `claude/wisy-safety-formations-6e04c2` (arbre propre au départ,
dernier commit `70c7b33`), **avant toute modification**.

> **Écart majeur avec le brief** : le brief renvoie à un fichier `CLAUDE.md` (« Master Prompt Wisy Safety ») à la racine du
> dépôt. **Ce fichier n'existe pas** (ni dans l'arbre, ni dans l'historique git : `git log --all -- CLAUDE.md` est vide).
> Les règles appliquées sont donc : le brief de la mission, les conventions du dépôt (`README.md`, `docs/README-*.md`,
> `assets/README.md`) et ses tests automatiques, qui encodent déjà la règle « ne rien inventer ». La palette citée par le
> brief (Granit `#5E6D6A`, texte `#1B2D28` sur turquoise) est bien celle des tokens du site (voir §3).

## 1. Stack

| Élément | Constat |
|---|---|
| Type | Site **100 % statique** : HTML à plat à la racine, CSS et JS sans framework, **aucune étape de build** pour publier |
| Hébergement | GitHub Pages (`rayanevanosselt.github.io/Wisy-Safety-2026/`) — aucun code serveur, pas de redirection 301 |
| Gestionnaire de paquets | Aucun (`package.json` absent) — aucune dépendance npm |
| CSS | Feuilles par page (`css/formation-vca.css`, `css/article.css`…) + **socle copié en ligne dans chaque page** (`<style>` : tokens, boutons, en-tête, pied de page) |
| JS | Modules « dual-mode » (navigateur + Node) : `js/trainings-data.js`, `js/site-content.js`, `js/faq-data.js`… ; comportements par page |
| Scripts | `scripts/build-seo.js` (sitemap + balises SEO), `scripts/sync-edge.js` (copie serveur de l'assistant), `scripts/check-i18n.js`, `scripts/optimize-images.py` (Pillow), `scripts/encode-video.swift` |
| Tests | `node --test tests/*.test.js` (27 fichiers, ~420 tests, aucune dépendance) |
| Poste de travail | **Node n'est pas installé** sur la machine : les scripts et tests sont exécutés ici avec le moteur `jsc` de macOS et un petit émulateur de l'API Node (hors dépôt). Python 3.12 disponible, sans Pillow (environnement virtuel temporaire). |

## 2. Architecture

- **Pages** (racine) : `index`, `formations`, `formation-vca-base`, `formation-nacelles-elevatrices`,
  `formation-beps-premiers-secours`, `peb-wallonie-bruxelles`, `vca-entreprise`, `coordination`, 2 articles VCA
  (`article-vca-*`), `inscription`, `contact`, `avis`, `faq`, `agenda`, 3 pages juridiques, `404`.
- **Gabarit formation de référence** : `formation-vca-base.html` (refonte du 26/09/2026) — hero, bandeau « L'essentiel »,
  sections numérotées, examen et sources officielles avec date de vérification, articles, FAQ, contact, barre d'action
  mobile. Coque partagée : `js/site-chrome.js` ; sommaire d'article : `js/article.js`.
- **Registre des faits** (source unique) : `js/trainings-data.js` (formations à page dédiée : VCA Base, Nacelles, BEPS +
  service VCA Entreprise) → consommé par `js/site-content.js` (pages, catégories, catalogue) → recherche, assistant,
  sitemap/SEO, copie serveur de l'assistant, parcours d'inscription. Champs `unconfirmed` / `unconfirmedClaims` =
  affirmations interdites, protégées par les tests.
- **Les 3 formations de la mission n'ont pas de page** : elles existent seulement comme cartes du catalogue
  (`formations.html#vca-hierarchique`, `#diisocyanates`, `#fibre-optique`), entrées inline de `js/site-content.js`
  (durées « 2 jours », « 1 jour », « 3 jours » reprises du catalogue) et lignes du parcours d'inscription
  (`js/registration-data.js` : **295 €**, **95 €**, **650 €** par participant).
- Le menu « Formations » (en-tête + menu mobile, **copié dans chacune des 18 pages**) pointe vers les ancres du catalogue.

## 3. Design system

Tokens dans le `<style>` en ligne de chaque page (`:root`) : `--epinette #1F6F64`, `--sarcelle #2F7D8C`,
`--turquoise #48D6C2`, `--brume #3FA69B`, `--creme #F4FAF9`, `--granit #5E6D6A`, `--noir-jais #1B2D28`, polices Poppins
(titres) / Inter (texte) auto-hébergées, rayons, ombres, `--motion-*`. Bouton principal `.btn--cta` : turquoise, texte
`--noir-jais`. **Aucun écart** avec la palette indiquée par le brief. Point de vigilance : le socle est dupliqué dans
chaque page (modifier un token = modifier 18 fichiers) — non corrigé ici (hors périmètre, risque de régression).

## 4. Traductions

Moteur maison `js/i18n.js` : **10 langues actives** (fr, en, nl, af, ar — RTL, bg, de, ro, it, sl), attributs
`data-i18n` / `data-i18n-html` / `data-i18n-attr`, dictionnaires `js/i18n-data-*.js`, **une seule URL par page** (langue
appliquée dans le navigateur, robots servis en français, pas de `hreflang` — décision documentée dans
`docs/README-I18N.md`). Repli automatique sur le français pour une clé absente. Contrôles : `scripts/check-i18n.js`
(10 langues, mêmes clés, mêmes chiffres, mêmes balises, textes restés en dur) et `tests/i18n-static.test.js` (le
français du dictionnaire = le HTML). Clés manquantes : aucune à ce jour (contrôle à 0 erreur selon les guides).

## 5. Recherche

`js/search.js` (mode « Spotlight », validé par le propriétaire) : index **construit à l'exécution depuis le registre**
(`Site.formations()`, `services()`, `pages()`, FAQ, sessions) — aucune liste à tenir à la main. Recherche insensible aux
accents et à la casse (`fold()`), toutes les conditions requises (ET), bonus titre / mots-clés / phrase exacte.
**Manques** : pas de tolérance aux fautes de frappe ; les 3 formations renvoient vers des ancres du catalogue ; aucun
article diisocyanates / VCA hiérarchique / fibre ; synonymes métier partiels (pas de « VOL », « chef d'équipe »,
« polyuréthane », « PU », « OTDR », « épissure », « FTTx »).

## 6. Chatbot IA (« Assistant Wisy »)

| Point | Constat |
|---|---|
| Fichiers | `js/assistant/` (launcher chargé en `defer`, cœur chargé **au premier clic**), `supabase/functions/chat/` (Edge Function optionnelle) |
| Fonctionnement | Cœur **local et déterministe** (`responder.js`, `retrieval.js`) qui répond depuis le registre et la FAQ ; reformulation IA **optionnelle** via la fonction serveur, avec repli automatique sur le cœur local |
| Fournisseur | Anthropic (Claude), uniquement côté serveur (`supabase/functions/chat/index.ts`) |
| **Clé API côté client** | **Aucune.** Recherche de motifs (`sk-ant-…`, jetons JWT, `service_role`) dans tout le code et l'historique git : rien. Les seules clés présentes (`js/supabase-config.js`) sont la clé *publishable* Supabase et la clé publique EmailJS, conçues pour le navigateur. La clé Anthropic est lue par `Deno.env.get("ANTHROPIC_API_KEY")` dans la fonction serveur ; CORS limité à une origine, limitation de débit par IP et taille de message bornée sont déjà en place. `tests/site-links.test.js` échoue si un secret apparaît. |
| Base de connaissances | `js/assistant/knowledge.js` (dérivée du registre + FAQ) ; copie serveur générée `site.generated.ts` (`scripts/sync-edge.js`) |
| Limite connue | Les réponses restent en français (interface traduite) — documenté dans `docs/README-ASSISTANT.md` |

**Aucune action de sécurité urgente n'est donc requise** (pas de clé à révoquer).

## 7. Dossier d'images

Le brief parle d'un dossier `Asset/` : il n'existe pas. Le dépôt a une convention saine et testée
(`assets/README.md`, `tests/assets-structure.test.js`) : originaux dans `assets/originaux/<thème>/`, dérivés légers dans
`assets/images/<thème>/`, noms en kebab-case. **Cette convention est conservée** plutôt que de créer `images/` (qui
casserait les 144 chemins existants et les tests).

Fichiers à classer — ajoutés à plat dans `assets/images/` par le commit `ca4dfdd` (« Ajouts images pour formations ») :

| Fichier | Poids | Dimensions | Format | Empreinte SHA-256 (16) | Référencé ? | Contenu |
|---|---|---|---|---|---|---|
| `diiso1.webp` | 132 Ko | 2304×1792 | WebP | `f92f497e538f43fb` | non | salle de formation, panneaux de danger (IA) |
| `diiso2.jpg` | 961 Ko | 2304×1792 | JPEG | `cc1b9641507f7f6f` | non | laboratoire, flacons étiquetés (IA) |
| `diiso3.webp` | 177 Ko | 2304×1792 | WebP | `47fe36526adb94cf` | non | fûts « TOXIC », combinaisons (IA) |
| `fibreoptique 1.webp` | 185 Ko | 2304×1792 | WebP | `e78e8095bf3bc330` | non | technicien casqué, fond lumineux (IA) — **espace dans le nom** |
| `fibreoptique2.webp` | 351 Ko | 2304×1792 | WebP | `d7cadb14b9232393` | non | ville et flux lumineux (IA) |
| `fibreoptique 3.webp` | 169 Ko | 2304×1792 | WebP | `2c092311e6e10c18` | non | technicienne, gerbe d'étincelles (IA) — **espace dans le nom** |
| `vcaligne1.webp` | 161 Ko | 2304×1792 | WebP | `61571a19face8c43` | non | briefing d'équipe en entrepôt (IA) |
| `vcaligne2.webp` | 126 Ko | 2304×1792 | WebP | `b39027343fa2257a` | non | deux encadrants sur chantier (IA) |
| `vcaligne3.webp` | 87 Ko | 2304×1792 | WebP | `bf2fa2d95019872f` | non | présentation « VCA Safety Leadership » (IA) |

Aucun doublon par empreinte. Tous sont des **visuels générés par IA** (même style que les fichiers `Firefly_…` de
l'ancien site) ; `diiso2.jpg` dépasse le plafond de 200 Ko des images chargées (`tests/perf-budget.test.js`). Les
autres dossiers d'`assets/` sont déjà rangés et testés (inventaire complet : `git ls-files assets`, 144 fichiers).

## 8. Liens

- Liens internes : `tests/site-links.test.js` contrôle les 18 pages (cibles, ancres, images). Aucun lien interne cassé
  connu ; **3 `href="#"` par page** : l'entrée « Certificat » du menu (en-tête + mobile, page inexistante) et le lien de
  politique de confidentialité historique (voir mémoire projet) — préexistants, hors périmètre.
- Pages orphelines : aucune ; les 3 formations n'ont simplement pas de page.
- Liens vers `wisysafety.be` : uniquement les `<link rel="canonical">` (domaine de production supposé, `ORIGIN` dans
  `js/site-content.js`) — aucun lien de navigation vers l'ancien site.
- Liens externes existants : sources officielles des pages VCA (BeSaCC-VCA, SPF Emploi, Constructiv, Actiris, Forem,
  VDAB, registre des diplômes) ; **aucun contrôle automatique de leur disponibilité** n'existait. Constat pendant l'audit :
  BeSaCC-VCA publie aujourd'hui le règlement des examens sous `/wp-content/uploads/2023/06/…` alors que le site cite
  `/2023/09/…` (à contrôler par le nouveau script).

## 9. Affirmations factuelles du nouveau site sans source

| Où | Affirmation | Risque |
|---|---|---|
| **Barre utilitaire de l'en-tête, 18 pages** | « Organisme de formation **agréé** · Anderlecht, Belgique » | **Élevé** — aucun agrément documenté ; contredit la règle « ne jamais affirmer un agrément » |
| `formations.html` (cartes des 3 formations) | « 2 jours », « 1 jour », « 3 jours » ; « Conforme aux normes européennes en vigueur » ; « Équipement fourni », « Expert technique », « Pratique intensive » | Moyen — non confirmés, contredits par l'ancien site |
| `js/registration-data.js` | 295 € / 95 € / 650 € par participant (bordereau de l'ancien site) | Moyen — **contredits par les pages de l'ancien site** (280–370 € ; 200 €) |
| `formation-vca-base.html` | « examen inclus » (confirmé par le propriétaire le 26/09) | **À re-vérifier** : Wisy Safety **ne figure pas** dans la liste officielle des centres d'examen reconnus par BeSaCC-VCA (consultée le 01/10/2026) — l'examen doit donc être organisé avec un centre reconnu |
| `peb-wallonie-bruxelles.html`, `agenda.html` | « 500+ », « 10+ », « 100 % » | Hors périmètre — signalé |
| Accueil, contact | chiffres 10+/500+/250+/100 % (imposés par `tests/agenda.test.js`) | Hors périmètre — signalé (mémoire projet) |

## 10. Dette et risques (priorité)

1. **P1 — « agréé » dans l'en-tête de toutes les pages** : à retirer ou à prouver (décision du propriétaire, hors mission).
2. **P1 — Examen VCA** : Wisy Safety n'est pas un centre d'examen reconnu BeSaCC-VCA (liste publique) : les pages VCA ne
   doivent pas laisser croire que Wisy délivre le diplôme. Traité sur la nouvelle page VCA Ligne hiérarchique ; à
   revoir sur la page VCA Base (signalé, non modifié).
3. **P1 — Prix contradictoires** des 3 formations (inscription vs ancien site) : aucun prix affiché sur les nouvelles pages.
4. **P2 — Format de l'examen VOL-VCA en évolution** : l'organisme néerlandais SSVV est passé à 60 questions / 60 minutes
   au 1er janvier 2026 ; les règlements belges consultés indiquent encore 7 000 points (70 questions). Formulation
   prudente et date de vérification affichées.
5. **P2 — Budgets JS** : `trainings-data.js` (26,7/28 Ko) et `site-content.js` (25,2/26 Ko) sont presque pleins.
6. **P2 — Socle CSS/en-tête dupliqué** dans 18 pages : toute modification du menu touche 18 fichiers (+ 3 nouvelles pages).
7. **P3 — Pas de contrôle des liens externes** : ajouté par cette mission (script + action mensuelle).
8. **P3 — Assistant** : réponses en français uniquement (limite connue).
