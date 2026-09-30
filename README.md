# Wisy Safety 2026

Site du centre de formation à la sécurité **Wisy Safety** (Anderlecht, Bruxelles) : catalogue des formations,
inscription en ligne, avis clients, Centre d'aide, agenda et assistant virtuel.

Le site est **100 % statique** : du HTML, du CSS et du JavaScript, sans framework, sans étape de « build »
et sans rien à installer pour le mettre en ligne.

## Organisation du dossier

| Élément | Rôle |
|---|---|
| `index.html`, `formations.html`, `formation-vca-base.html`, `formation-nacelles-elevatrices.html`, `formation-beps-premiers-secours.html`, `peb-wallonie-bruxelles.html`, `coordination.html`, `article-vca-cout-financement.html`, `article-vca-erreurs-examen.html`, `inscription.html`, `contact.html`, `avis.html`, `faq.html`, `agenda.html`, `mentions-legales.html`, `politique-de-confidentialite.html`, `conditions-generales-utilisation.html`, `404.html` | Les pages du site. **Elles restent à la racine** : leurs adresses (`/formations.html`…) en dépendent, les déplacer changerait les URL et le référencement. |
| `sitemap.xml`, `robots.txt`, `favicon.ico` | Fichiers que les moteurs de recherche et les navigateurs cherchent à la racine (les deux premiers sont **générés**, voir plus bas). |
| `css/`, `js/` | Styles et scripts. |
| `assets/` | Polices, images, icônes, vidéo et `originaux/` (photos d'origine). Rangement expliqué dans [assets/README.md](assets/README.md). |
| `admin/` | Page de modération des avis (non indexée par Google). |
| `supabase/` | Base des avis (`schema.sql`, `harden-admin.sql`), table optionnelle des sessions (`sessions.sql`) et fonction optionnelle de l'assistant IA. |
| `scripts/` | Petits outils qui génèrent le sitemap, les balises SEO, la copie de l'assistant et les images optimisées. |
| `tests/` | Tests automatiques. |
| `docs/` | Documentation détaillée, et `docs/maquettes/` (anciennes maquettes de l'en-tête et du pied de page, conservées pour mémoire). |

## Où modifier quoi

| Je veux… | Je modifie | Guide |
|---|---|---|
| Changer un texte, une section, l'intro ou la vidéo de la page d'accueil | `js/i18n-data-home.js`, `index.html`, `css/home.css`, `js/home.js` | [docs/README-ACCUEIL.md](docs/README-ACCUEIL.md) |
| Ajouter ou changer une formation ou une page | `js/site-content.js` (puis les commandes ci-dessous) | [docs/README-SEO.md](docs/README-SEO.md) |
| Changer les questions du Centre d'aide | `js/faq-data.js` | [docs/README-FAQ.md](docs/README-FAQ.md) |
| Changer le prix, la durée ou les langues de la formation Nacelles | `js/trainings-data.js` | [docs/README-NACELLES.md](docs/README-NACELLES.md) |
| Changer les faits de la formation **VCA Base** (prix, examen, programme, sources officielles) ou ses articles | `js/trainings-data.js` (`VCA_BASE`) | [docs/README-VCA.md](docs/README-VCA.md) |
| **Publier une date de session** (VCA Base, agenda, inscription, recherche, assistant) | `js/sessions-data.js` (ou la table Supabase `supabase/sessions.sql`) | [docs/README-SESSIONS.md](docs/README-SESSIONS.md) |
| Brancher le calendrier Outlook | l'attribut `data-calendar-url` dans `agenda.html` | [docs/README-AGENDA.md](docs/README-AGENDA.md) |
| Changer les faits PEB (Wallonie/Bruxelles), le tarif ou les sessions | `js/peb-data.js` | [docs/README-PEB.md](docs/README-PEB.md) |
| Changer les services, l'équipe ou les affirmations non confirmées de **WiSy Coordination** | `js/coordination-data.js` | [docs/README-COORDINATION.md](docs/README-COORDINATION.md) |
| Configurer les avis clients (Supabase, e-mail, anti-spam) | `js/supabase-config.js` | [docs/README-AVIS.md](docs/README-AVIS.md) |
| Changer les **suggestions animées de la barre de recherche** (« Rechercher « VCA de base » »…) et les pastilles « Essayez » (les 4 premières) | `js/i18n-data-search.js` (`search.fx_list`, 7 recherches séparées par « \| » dans chaque langue — chacune doit renvoyer au moins un résultat) ; comportement dans `js/search.js`, style dans `css/search.css` | — |
| Corriger une traduction, ajouter un texte ou une page traduite | `js/i18n-data-*.js` (+ le HTML) | [docs/README-I18N.md](docs/README-I18N.md) |
| Comprendre ou activer l'assistant virtuel | `js/assistant/` | [docs/README-ASSISTANT.md](docs/README-ASSISTANT.md) |
| Compléter ou modifier les **pages juridiques** (mentions légales, politique de confidentialité, CGU) — dont les mentions « [À COMPLÉTER] » | le HTML de la page + `js/i18n-data-privacy.js` / `js/i18n-data-cgu.js` / `js/i18n-data-legal.js` (10 langues) ; style et comportements communs : `css/legal.css`, `js/legal.js` | [docs/LEGAL_PRIVACY_CGU_REPORT.md](docs/LEGAL_PRIVACY_CGU_REPORT.md) |

Les coordonnées, les horaires et la position sur la carte sont dans `js/faq-data.js` (`CONTACT`) ; le pied de
page de chaque page les affiche aussi en dur. Les textes traduits sont dans `js/i18n-data-*.js`.

## Commandes utiles (Node 22 ou plus récent)

Après une modification de contenu : régénérer le sitemap, les balises SEO et la copie de l'assistant.

```bash
node scripts/build-seo.js && node scripts/sync-edge.js
```

Vérifier que tout est cohérent (tous les tests doivent passer) :

```bash
node --test tests/*.test.js
```

Contrôler les traductions (10 langues : clés, chiffres, textes restés en dur, encodage) — voir [docs/README-I18N.md](docs/README-I18N.md) :

```bash
node scripts/check-i18n.js
```

Régénérer les images optimisées à partir des originaux de `assets/` (nécessite Python et Pillow) :

```bash
python3 scripts/optimize-images.py
```

Prévisualiser le site en local, par exemple :

```bash
python3 -m http.server 8000
```

## Règle d'or

Aucun prix, aucune date, aucune certification et aucun texte légal ne doit être inventé : ils viennent de
Wisy Safety. Les tests protègent plusieurs de ces règles (voir les guides de `docs/`).
