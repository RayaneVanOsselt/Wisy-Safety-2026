/* =========================================================================
   WISY SAFETY — Avis clients : adresse de la feuille Google Sheets
   -------------------------------------------------------------------------
   👉 Collez ici l'adresse du script Google (Apps Script) de la feuille « Avis - Wisy Safety » :
      Google Sheets › Extensions › Apps Script › Déployer › Gérer les déploiements › « URL de l'application Web »
      (elle commence par https://script.google.com/macros/s/ et se termine par /exec).
      Guide pas à pas : docs/README-AVIS.md.

   Ce n'est PAS un secret : cette adresse permet seulement d'envoyer un avis (qui reste « En attente ») et de lire
   les avis « Confirmé ». La feuille elle-même reste privée ; les e-mails n'en sortent jamais.
   Laissée vide : la page reste en place, sans avis affiché, et le formulaire indique que le dépôt n'est pas activé.
   ========================================================================= */
window.WISY_AVIS = {
  API_URL: "https://script.google.com/macros/s/AKfycbw3nRhUtFi580OKLjrhVHZXgE2G8m1SmB6Wf3g063Gq21mESsHpehH4xev1-ra3y-F6/exec",

  /* Filet de sécurité : références d'avis à ne JAMAIS afficher, même si la feuille les marque « Confirmé ».
     WS-2026-T9Q2B = avis de TEST « Test Claude » envoyé le 14/10/2026 lors de la mise en service, resté publié.
     ⚠ La vraie correction : passer son Statut sur « Refusé » dans la feuille « Avis - Wisy Safety ». */
  EXCLUDED_REFERENCES: ["WS-2026-T9Q2B"]
};
