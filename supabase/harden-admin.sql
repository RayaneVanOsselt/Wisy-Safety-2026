-- =============================================================================
--  WISY SAFETY — Durcissement : la modération des avis est réservée à l'ADMINISTRATEUR
-- -----------------------------------------------------------------------------
--  POURQUOI
--  schema.sql accorde lecture / modération / suppression de TOUS les avis (e-mails compris) au rôle
--  `authenticated`. Or la clé publique du site permet à n'importe qui de créer un compte tant que
--  « Allow new users to sign up » est activé (réglage par défaut de Supabase) : ce compte serait
--  alors « authenticated » et pourrait lire les e-mails des participants, publier ou supprimer des avis.
--
--  CE FICHIER n'est PAS exécuté automatiquement : il se lance à la main, une fois, dans
--  Supabase → SQL Editor. Il ne modifie rien dans le site.
--
--  ORDRE À RESPECTER (sinon vous vous verrouillez hors de la modération)
--   1. Supabase → Authentication → Sign In / Providers → désactiver « Allow new users to sign up ».
--   2. Exécuter le BLOC 1 ci-dessous (donne le rôle « admin » à votre compte de modération).
--   3. Vous déconnecter puis vous reconnecter sur /admin/avis.html (le jeton doit être renouvelé).
--   4. Exécuter le BLOC 2 (les politiques n'acceptent plus que ce rôle).
--
--  RETOUR ARRIÈRE : ré-exécuter la section « Politiques » de supabase/schema.sql.
--  Le dépôt de nouveaux avis par le public (politique « public can submit a pending review »)
--  et la lecture publique de la vue `approved_reviews` ne sont PAS modifiés.
-- =============================================================================

-- ----- BLOC 1 — rôle administrateur (remplacez l'e-mail par celui du compte de modération) --------
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
 where email = 'info@wisysafety.be';
-- Vérification : doit renvoyer 1 ligne avec {"role": "admin", …}
-- select email, raw_app_meta_data from auth.users where email = 'info@wisysafety.be';


-- ----- BLOC 2 — politiques réservées à l'administrateur --------------------------------------------
-- app_metadata ne peut être modifié que côté serveur (contrairement à user_metadata) : un visiteur
-- ne peut donc pas s'attribuer ce rôle lui-même.
create or replace function public.is_review_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

drop policy if exists "authenticated can read all reviews" on public.reviews;
drop policy if exists "admin can read all reviews" on public.reviews;
create policy "admin can read all reviews"
  on public.reviews for select
  to authenticated
  using (public.is_review_admin());

drop policy if exists "authenticated can moderate reviews" on public.reviews;
drop policy if exists "admin can moderate reviews" on public.reviews;
create policy "admin can moderate reviews"
  on public.reviews for update
  to authenticated
  using (public.is_review_admin())
  with check (public.is_review_admin());

drop policy if exists "authenticated can delete reviews" on public.reviews;
drop policy if exists "admin can delete reviews" on public.reviews;
create policy "admin can delete reviews"
  on public.reviews for delete
  to authenticated
  using (public.is_review_admin());

-- Contrôle : un compte « authenticated » SANS rôle admin ne doit plus rien voir dans public.reviews.
