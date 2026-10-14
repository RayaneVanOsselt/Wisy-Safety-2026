-- =============================================================================
--  WISY SAFETY — Rôle « administrateur » d'un compte Supabase
-- -----------------------------------------------------------------------------
--  Sert UNIQUEMENT à l'option « sessions dans Supabase » (supabase/sessions.sql, désactivée par défaut :
--  voir docs/README-SESSIONS.md). Les avis clients n'utilisent plus Supabase : ils sont gérés dans la
--  feuille Google Sheets « Avis - Wisy Safety » (docs/README-AVIS.md).
--
--  CE FICHIER n'est PAS exécuté automatiquement : il se lance à la main, une fois, dans
--  Supabase → SQL Editor. Il ne modifie rien dans le site.
--
--  Avant de l'exécuter : Supabase → Authentication → Sign In / Providers → désactiver
--  « Allow new users to sign up » (sinon n'importe qui pourrait se créer un compte).
--  app_metadata ne peut être modifié que côté serveur (contrairement à user_metadata) : un visiteur
--  ne peut donc pas s'attribuer ce rôle lui-même.
-- =============================================================================

-- ----- BLOC 1 — rôle administrateur (remplacez l'e-mail par celui de votre compte Supabase) --------
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
 where email = 'info@wisysafety.be';
-- Vérification : doit renvoyer 1 ligne avec {"role": "admin", …}
-- select email, raw_app_meta_data from auth.users where email = 'info@wisysafety.be';
