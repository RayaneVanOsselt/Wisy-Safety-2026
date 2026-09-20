/* =========================================================================
   WISY SAFETY — Configuration Avis clients
   -------------------------------------------------------------------------
   Site 100 % statique : ce fichier ne contient QUE des valeurs publiques,
   sûres à exposer côté client :
     • SUPABASE_ANON_KEY  → clé « anonyme » conçue pour le navigateur ;
       la sécurité réelle est assurée par la Row Level Security (voir
       supabase/schema.sql). Elle N'autorise QUE l'insertion d'un avis en
       attente et la lecture de la vue publique (sans e-mail).
     • EMAILJS_PUBLIC_KEY → clé publique EmailJS (déjà utilisée par contact.html).

   ❗ NE JAMAIS mettre ici la clé « service_role » Supabase, ni aucun secret :
      ils ne doivent jamais atteindre le navigateur.

   👉 Renseignez SUPABASE_URL et SUPABASE_ANON_KEY (Supabase → Project
      Settings → API). Tant que ce n'est pas fait, le formulaire affiche un
      message clair et le site reste fonctionnel (mode démo).
   ========================================================================= */
window.WISY_CONFIG = {
  /* ---- Supabase (obligatoire pour enregistrer/afficher les avis) -------- */
  SUPABASE_URL:      "https://frylezdzcuegyqqmxris.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-aXXgnr5Mn9DEbBv0EeR9g_KFQd4jei",

  /* ---- EmailJS (facultatif : notification admin d'un nouvel avis) ------- */
  /* Réutilise le compte EmailJS déjà configuré pour le formulaire contact.  */
  EMAILJS_PUBLIC_KEY:        "k2JkXtD2RO8TkoO77",
  EMAILJS_SERVICE_ID:        "service_k348qw9",
  /* Créez un modèle EmailJS dédié aux avis puis collez son ID ici.          */
  /* Laissé vide = aucune notification envoyée (Supabase reste la source).   */
  EMAILJS_TEMPLATE_ID_REVIEW: "",
  ADMIN_NOTIFY_EMAIL:         "info@wisysafety.be",

  /* ---- Cloudflare Turnstile (facultatif, anti-spam) -------------------- */
  /* Laissé vide = widget non affiché. Voir docs/README-AVIS.md.             */
  TURNSTILE_SITE_KEY: ""
};
