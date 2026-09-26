# Centre d'aide Wisy Safety (`faq.html`)

Page « Centre d'aide » : le visiteur dispose de **trois moyens** d'obtenir une
réponse — **rechercher**, **parcourir** (catégories + questions fréquentes) ou
**demander à l'assistant**. Site 100 % statique : aucun build, aucune dépendance.

```
Header → Hero (recherche) → Recherches populaires → 3 façons de trouver
       → Catégories → FAQ structurée (≈ 2/3) + Assistant (≈ 1/3)
       → Ressources → « Vous n'avez pas trouvé votre réponse ? » → CTA final → Footer
```

---

## 1. Où modifier le contenu

**Uniquement `js/faq-data.js`.** La page, la recherche, l'assistant, les données
structurées `FAQPage` et la copie serveur en dérivent — rien à recopier ailleurs.

```js
{
  id: "faq-tarifs-paiement",           // « faq-<catégorie>-<slug> », stable (sert d'ancre #id)
  category: "tarifs",
  question: "Comment se passe le paiement ?",   // finit par « ? », ≤ 80 caractères
  answer: "Paragraphe.\n\n- puce\n- puce",     // texte simple : lignes vides = paragraphes, « - » = puces
  keywords: ["paiement", "payer"],             // mots-clés forts (non affichés)
  synonyms: ["comment payer", "virement"],     // autres formulations (non affichés)
  relatedQuestions: ["faq-tarifs-tva"],        // 1 à 3 ids — proposés après la réponse
  action: "contact",                           // optionnel : formations | inscription | contact | nacelle | assistant
  featured: true,                              // optionnel : « Questions essentielles »
  provisional: true, note: "PROVISOIRE — …"    // optionnel : réponse prudente à valider (note jamais affichée)
}
```

- **Catégorie vide = jamais affichée** (et un test l'interdit).
- Après une modification : `node scripts/sync-faq-edge.js` (copie de la fonction
  Edge) puis `node --test tests/*.test.js`.
- Les **coordonnées** (téléphone, e-mail, horaires, adresse) sont dans
  `CONTACT` du même fichier ; l'assistant les reprend.

### Règle d'or : ne jamais inventer

N'y figurent que des faits **confirmés** par le site : `js/trainings-data.js`,
`js/registration-data.js` + le parcours d'inscription, la page Formations,
l'en-tête / le pied de page. Aucun prix, aucun taux de TVA, aucune certification,
aucun CACES, aucun agrément : quand l'information manque, la réponse renvoie
honnêtement vers l'équipe. Des tests le vérifient (pas de « € », pas de « % »,
pas de « CACES », réponse Nacelles inchangée, durées/langues = registre…).

Entrées **provisoires** à valider par Wisy Safety : confirmation d'inscription,
annulation/report, paiement, financement (la page Formations affiche « Financement
possible » sans détail), accessibilité des locaux.

---

## 2. Recherche (`js/faq-search.js`) — la même pour la page et le chatbot

Locale, déterministe, instantanée (≈ 30 questions) — pas d'IA.

- **Normalisation** : minuscules, accents/ligatures, apostrophes, mots vides.
- **Variantes** : pluriels/féminins ; **familles de mots et synonymes** (`LEXICON`) :
  « prix » → tarifs, TVA, paiement ; « payer » → paiement **et** financement ;
  « certificat » → certification, attestation, examen ; « inscription » → s'inscrire,
  prérequis, délais…
- **Champs pondérés** : mots-clés > question > synonymes > catégorie > réponse ;
  les mots rares (« nacelle ») pèsent plus que « formation ».
- **En tapant** (`partial`) : « insc » → inscription ; **fautes** : « inscirption ».
- **Confiance** `exact | high | medium | low | none` : l'assistant ne répond que si
  elle est suffisante (cf. §4).
- **Surlignage** sans HTML : `highlight()` renvoie des segments `{text, mark}`.

Ajouter un synonyme général → `LEXICON` ; spécifique à une question → ses `synonyms`.

---

## 3. La page

- **Hero** : `<h1>`, sous-titre, **recherche** (combobox ARIA : suggestions en direct,
  ↑/↓, Entrée, Échap ; raccourcis `/` et ⌘K/Ctrl+K), recherches populaires, 3 façons
  d'obtenir une réponse (boutons : chercher / parcourir / assistant).
- **Catégories** : grille 4 colonnes (desktop), bande défilante tactile (mobile).
- **FAQ** : accordéons groupés par catégorie (`<button aria-expanded aria-controls>`
  dans un titre ; contenu replié non focusable ; ouverture 0,56 s sans rebond),
  liens profonds `faq.html#faq-…`, `?q=…`, `?cat=…`, questions associées, retour
  « Cette réponse vous a-t-elle aidé ? » (événement `wisy:analytics`, sans contenu).
- **Colonne assistant** (sticky ≥ 1024 px et écran assez haut) : « Posez votre question »
  → ouvre l'assistant avec la question ; amorces = questions essentielles (`featured`).
- **États** : liste complète, catégorie, recherche avec résultats classés + meilleure
  réponse ouverte, **aucun résultat** (repli vers l'assistant, le contact et des sujets),
  erreur de chargement, `<noscript>`.
- **SEO** : un `<h1>`, `<h2>` par section, `<h3>` catégories, `<h4>` questions ;
  JSON-LD `FAQPage` généré **depuis les questions affichées**.

Décisions de composition (charte Wisy) : turquoise réservé aux CTA (bouton de recherche,
envoi assistant, CTA final) — jamais un grand fond ; un seul CTA turquoise dans la
section finale ; **la barre de recherche globale et le bandeau promo du pied de page
sont masqués sur cette page** (`.faqc-page` dans `faq.html`) pour ne pas afficher deux
recherches ni deux CTA concurrents.

---

## 4. Assistant ⇄ FAQ

`js/assistant/responder.js` :
1. question **telle quelle** (chip / copier-coller) → réponse canonique + questions liées + action ;
2. intentions à réponse fixe (prix, dates, contact, inscription) → texte **issu de la FAQ** ;
3. question générale → recherche partagée (confiance élevée d'abord) ;
4. sinon → « Je n'ai pas encore suffisamment d'informations… » + contact + questions réelles.

`WisyAssistant.controller.ask("…")` = ouvrir + envoyer (utilisé par la page).

---

## 5. En-tête partagé (7 pages) — `css/site-header.css`

Cause du bug mobile : l'icône « ? » était **dans** `.header-actions`, masqué en entier
(`display:none`) sous le breakpoint mobile — et le menu mobile n'avait pas le lien.
Maintenant : icône **autonome** (44 × 44, contour, info-bulle, `aria-current`), lien
libellé dans la barre utilitaire (desktop), rangée dédiée dans le menu mobile, en-tête
compact à 320 px sans collision. Navigation sur une ligne dès **1360 px** (mesuré dans
les 10 langues), hamburger en dessous. Sticky : fond plus opaque + ombre très discrète.

---

## 6. Tests

```bash
node --test tests/*.test.js
```

`faq.test.js` (intégrité, véracité, page) · `faq-search.test.js` (moteur) ·
`assistant-faq.test.js` (parité FAQ ⇄ assistant, refus honnête) · `header.test.js`
(7 pages) · `edge-sync.test.js` (copie serveur à jour).

## 7. Limites connues

- Contenu **traduit dans les 10 langues** (`js/faq-i18n/faq-<langue>.js`, chargés à la demande ; l'ossature de la page :
  `js/i18n-data-faq.js`). Le français reste la source unique (`js/faq-data.js`). Voir `docs/README-I18N.md`. Les réponses
  de l'**Assistant Wisy** (`js/assistant/`) restent, elles, en français.
- La fonction Edge (IA) n'a pas pu être exécutée ici (Deno non installé) : son module de
  connaissances est vérifié par les tests, mais un déploiement de test reste à faire.
