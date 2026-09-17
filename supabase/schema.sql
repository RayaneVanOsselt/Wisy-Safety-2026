-- =============================================================================
--  WISY SAFETY — Avis clients · Schéma Supabase (PostgreSQL)
-- -----------------------------------------------------------------------------
--  À COPIER TEL QUEL dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : peut être ré-exécuté sans casser l'existant.
--
--  Modèle de sécurité (Row Level Security) :
--    • Le public (rôle `anon`) peut UNIQUEMENT insérer un avis (status forcé
--      à « pending », consentement obligatoire). Il ne peut ni lire la table,
--      ni modifier, ni approuver, ni supprimer un avis.
--    • Le public lit les avis approuvés via la VUE `approved_reviews`, qui
--      n'expose JAMAIS l'e-mail et ne montre que status = 'approved'.
--    • L'administrateur (rôle `authenticated`, connecté via Supabase Auth) a
--      un accès complet (lecture/modération/suppression).
-- =============================================================================

-- gen_random_uuid() est natif (pg13+) ; on garantit l'extension par sécurité.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id                   uuid         primary key default gen_random_uuid(),
  first_name           text         not null,
  last_name            text,                          -- nom complet OU simple initiale
  email                text         not null,         -- privé : jamais exposé au public
  company              text,                          -- entreprise / fonction (facultatif)
  rating               smallint     not null,
  title                text,                          -- titre de l'avis (facultatif)
  comment              text         not null,
  consent_publication  boolean      not null default false,
  status               text         not null default 'pending',
  created_at           timestamptz  not null default now(),
  approved_at          timestamptz,

  -- Contraintes = validation côté serveur (on ne fait jamais confiance au front)
  constraint reviews_rating_range   check (rating between 1 and 5),
  constraint reviews_status_values  check (status in ('pending','approved','rejected')),
  constraint reviews_first_name_len check (char_length(first_name) between 1 and 80),
  constraint reviews_last_name_len  check (last_name is null or char_length(last_name) <= 80),
  constraint reviews_email_format   check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint reviews_company_len    check (company is null or char_length(company) <= 120),
  constraint reviews_title_len      check (title is null or char_length(title) <= 120),
  constraint reviews_comment_len    check (char_length(comment) between 3 and 2000)
);

comment on table  public.reviews is 'Avis clients Wisy Safety (modérés). email = donnée privée, jamais exposée publiquement.';
comment on column public.reviews.status is 'pending | approved | rejected. Seuls les approved sont publics (via la vue approved_reviews).';

-- Index utiles à la modération et à l'affichage public
create index if not exists reviews_status_idx        on public.reviews (status);
create index if not exists reviews_public_order_idx   on public.reviews (approved_at desc nulls last, created_at desc);
create index if not exists reviews_created_idx        on public.reviews (created_at desc);

-- -----------------------------------------------------------------------------
-- 2) TRIGGERS — cohérence & anti-injection de statut
-- -----------------------------------------------------------------------------

-- 2a) À l'insertion : on FORCE des valeurs sûres, quoi qu'envoie le client.
--     Empêche un visiteur de créer directement un avis 'approved'.
create or replace function public.reviews_force_defaults()
returns trigger
language plpgsql
as $$
begin
  new.status      := 'pending';
  new.approved_at := null;
  new.created_at  := now();
  new.first_name  := btrim(new.first_name);
  new.last_name   := nullif(btrim(coalesce(new.last_name, '')), '');
  new.company     := nullif(btrim(coalesce(new.company, '')), '');
  new.title       := nullif(btrim(coalesce(new.title, '')), '');
  new.comment     := btrim(new.comment);
  new.email       := lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_reviews_force_defaults on public.reviews;
create trigger trg_reviews_force_defaults
  before insert on public.reviews
  for each row execute function public.reviews_force_defaults();

-- 2b) À la mise à jour du statut (côté admin) : on horodate l'approbation.
create or replace function public.reviews_sync_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    new.approved_at := now();
  elsif new.status <> 'approved' then
    new.approved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_sync_approved_at on public.reviews;
create trigger trg_reviews_sync_approved_at
  before update on public.reviews
  for each row execute function public.reviews_sync_approved_at();

-- 2c) Anti-spam serveur : max 3 avis / heure / e-mail (SECURITY DEFINER pour
--     pouvoir lire la table malgré la RLS). Ajustez le seuil si besoin.
create or replace function public.reviews_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.reviews
  where email = lower(btrim(new.email))
    and created_at > now() - interval '1 hour';

  if recent_count >= 3 then
    raise exception 'rate_limited'
      using hint = 'Trop d''avis envoyés récemment. Réessayez plus tard.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_rate_limit on public.reviews;
create trigger trg_reviews_rate_limit
  before insert on public.reviews
  for each row execute function public.reviews_rate_limit();

-- -----------------------------------------------------------------------------
-- 3) VUE PUBLIQUE — avis approuvés, SANS e-mail
--    (security definer par défaut : contourne la RLS de la table de base,
--     mais n'expose par construction que les colonnes sûres + status approved)
-- -----------------------------------------------------------------------------
create or replace view public.approved_reviews as
  select
    id,
    first_name,
    last_name,
    company,
    rating,
    title,
    comment,
    created_at,
    approved_at
  from public.reviews
  where status = 'approved';

comment on view public.approved_reviews is 'Projection publique des avis approuvés. N''expose jamais l''e-mail.';

-- -----------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.reviews enable row level security;

-- 4a) INSERTION publique : uniquement en 'pending' et avec consentement.
drop policy if exists "public can submit a pending review" on public.reviews;
create policy "public can submit a pending review"
  on public.reviews
  for insert
  to anon, authenticated
  with check (status = 'pending' and consent_publication = true);

-- 4b) ADMIN (connecté) : lecture complète.
drop policy if exists "authenticated can read all reviews" on public.reviews;
create policy "authenticated can read all reviews"
  on public.reviews
  for select
  to authenticated
  using (true);

-- 4c) ADMIN : modération (approuver / refuser).
drop policy if exists "authenticated can moderate reviews" on public.reviews;
create policy "authenticated can moderate reviews"
  on public.reviews
  for update
  to authenticated
  using (true)
  with check (true);

-- 4d) ADMIN : suppression.
drop policy if exists "authenticated can delete reviews" on public.reviews;
create policy "authenticated can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (true);

-- NB : aucune policy SELECT pour `anon` sur la table de base ⇒ le public ne
--      peut jamais lire les e-mails. Le public lit seulement la vue ci-dessus.

-- -----------------------------------------------------------------------------
-- 5) DROITS (PostgREST / API)
-- -----------------------------------------------------------------------------
grant insert on public.reviews          to anon, authenticated;
grant select on public.reviews          to authenticated;      -- lecture admin
grant update, delete on public.reviews  to authenticated;      -- modération admin
grant select on public.approved_reviews to anon, authenticated;-- lecture publique

-- =============================================================================
-- 6) (OPTIONNEL — DÉV) Jeu de démonstration, CLAIREMENT identifié.
--    ⚠️  À SUPPRIMER avant la mise en production (voir la requête de nettoyage).
--    Décommentez le bloc pour insérer des avis « DEMO » déjà approuvés.
-- =============================================================================
-- insert into public.reviews (first_name, last_name, email, company, rating, title, comment, consent_publication, status, approved_at)
-- values
--   ('DEMO — Marie', 'D.',  'demo1@example.com', 'Responsable QHSE',       5, 'Formation VCA au top',      'DEMO REVIEW · Organisation impeccable, formateur clair et disponible. Nos équipes ont réussi la certification du premier coup.', true, 'approved', now()),
--   ('DEMO — Karim', 'B.',  'demo2@example.com', 'Chef de chantier',        5, 'Très concret',              'DEMO REVIEW · Beaucoup de mises en situation réelles, rien de théorique inutile. Exactement ce qu''il nous fallait.', true, 'approved', now()),
--   ('DEMO — Sophie', 'L.', 'demo3@example.com', 'Constructel',             4, 'Sérieux et à l''écoute',   'DEMO REVIEW · Accueil pro, planning respecté. Un petit délai administratif mais rien de bloquant.', true, 'approved', now());
--
-- Nettoyage des données de démonstration :
--   delete from public.reviews where first_name like 'DEMO —%' or comment like 'DEMO REVIEW%';
