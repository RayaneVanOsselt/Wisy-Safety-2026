/* =========================================================================
   WISY SAFETY — Configuration publique (EmailJS, sessions)
   -------------------------------------------------------------------------
   Site 100 % statique : ce fichier ne contient QUE des valeurs publiques,
   sûres à exposer côté client :
     • EMAILJS_PUBLIC_KEY → clé publique EmailJS (formulaires contact, coordination, PEB, inscription).
     • SUPABASE_URL / SUPABASE_ANON_KEY → utilisées SEULEMENT si SESSIONS_SOURCE = "supabase"
       (option des sessions, désactivée : voir docs/README-SESSIONS.md).

   Les AVIS CLIENTS n'utilisent plus Supabase : ils sont gérés dans la feuille Google Sheets
   « Avis - Wisy Safety » (adresse dans js/avis-config.js, guide docs/README-AVIS.md).

   ❗ NE JAMAIS mettre ici la clé « service_role » Supabase, ni aucun secret :
      ils ne doivent jamais atteindre le navigateur.
   ========================================================================= */
window.WISY_CONFIG = {
  /* ---- Supabase (option des sessions uniquement — SESSIONS_SOURCE ci-dessous) */
  SUPABASE_URL:      "https://frylezdzcuegyqqmxris.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-aXXgnr5Mn9DEbBv0EeR9g_KFQd4jei",

  /* ---- EmailJS (formulaires contact, coordination, PEB, inscription) ---- */
  EMAILJS_PUBLIC_KEY:        "k2JkXtD2RO8TkoO77",
  EMAILJS_SERVICE_ID:        "service_k348qw9",
  /* Gabarit « contact » (champs user_name / user_email / user_phone / subject / message), partagé avec contact.html,
     la coordination et PEB — réutilisé par l'inscription pour transmettre la demande tant que le paiement n'est pas actif. */
  EMAILJS_TEMPLATE_ID_CONTACT: "template_0p9dah6",

  /* ---- Sessions de formation (dates) ------------------------------------ */
  /* "data" (défaut) : les sessions viennent de js/sessions-data.js — un fichier à éditer, vide = aucune
                       session publiée (les pages affichent « Consultez les prochaines disponibilités »).
     "supabase"      : elles viennent de la table `training_sessions` (voir supabase/sessions.sql) : une
                       ligne ajoutée dans Supabase apparaît sur le site sans toucher au code. Si la table
                       est injoignable, le site retombe sur js/sessions-data.js.
     Guide pas à pas : docs/README-SESSIONS.md.                                                         */
  SESSIONS_SOURCE: "data"
};
