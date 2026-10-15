/* =========================================================================
   WISY SAFETY — Configuration publique (EmailJS, sessions, réservations)
   -------------------------------------------------------------------------
   Site 100 % statique : ce fichier ne contient QUE des valeurs publiques,
   sûres à exposer côté client :
     • EMAILJS_PUBLIC_KEY → clé publique EmailJS (formulaires contact, coordination, PEB, inscription).
     • RESERVATIONS_API_URL → adresse PUBLIQUE (…/exec) du script de la feuille Google « Réservations - Wisy Safety »
       (google-sheets/reservations.gs) : sessions, places restantes calculées et réservations. La feuille reste
       privée ; les identifiants Microsoft vivent dans le script, jamais ici. Guide : docs/README-RESERVATIONS.md.
     • SUPABASE_URL / SUPABASE_ANON_KEY → utilisées SEULEMENT si SESSIONS_SOURCE = "supabase"
       (option des sessions, non utilisée : voir docs/README-SESSIONS.md).

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

  /* ---- Réservations (feuille Google « Réservations - Wisy Safety ») ---------- */
  /* Collez ici l'adresse « Application Web » du script de la feuille (https://script.google.com/macros/s/…/exec).
     VIDE = réservations pas encore activées : les sessions viennent de js/sessions-data.js et l'inscription
     envoie une simple demande par e-mail (EmailJS), comme avant.                                         */
  RESERVATIONS_API_URL: "",

  /* ---- Sessions de formation (dates) ------------------------------------ */
  /* "sheets"   : les sessions et leurs places viennent de la feuille de réservation (adresse ci-dessus) ;
                  si elle est vide ou injoignable, repli sur js/sessions-data.js.
     "data"     : uniquement js/sessions-data.js — un fichier à éditer, vide = aucune session publiée.
     "supabase" : table `training_sessions` (voir supabase/sessions.sql), non utilisée.
     Guides : docs/README-RESERVATIONS.md et docs/README-SESSIONS.md.                                  */
  SESSIONS_SOURCE: "sheets"
};
