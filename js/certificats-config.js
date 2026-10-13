/* =========================================================================
   WISY SAFETY — Vérification des certificats : adresse du registre Google Sheets
   -------------------------------------------------------------------------
   👉 Collez ici l'adresse du script Google (Apps Script) de la feuille des certificats :
      Google Sheets › Extensions › Apps Script › Déployer › Gérer les déploiements › « URL de l'application Web »
      (elle commence par https://script.google.com/macros/s/ et se termine par /exec).
      Guide pas à pas : docs/README-CERTIFICATS.md.

   Ce n'est PAS un secret : cette adresse ne donne accès qu'à la vérification (nom + date de naissance exacts,
   essais limités). La feuille elle-même reste privée et n'est jamais lue directement par le site.
   Laissée vide : la page affiche « Vérification en ligne bientôt disponible » (aucune erreur visible).
   ========================================================================= */
window.WISY_CERTIFICATS = {
  API_URL: "https://script.google.com/macros/s/AKfycbzMSeIkvJOpEfCnEe2dBKA99QlBfkfcbqktawcRceUc7QWJinyx24-DWHfTF9SYg79jMg/exec"
};
