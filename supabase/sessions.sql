-- =============================================================================
--  WISY SAFETY — Sessions de formation · Table Supabase (OPTIONNELLE)
-- -----------------------------------------------------------------------------
--  À quoi ça sert
--  Par défaut, les sessions viennent du fichier js/sessions-data.js (vide tant que rien n'est publié).
--  Si vous préférez gérer les dates dans Supabase (tableau + formulaire, sans toucher au code du site),
--  exécutez CE fichier une fois, puis passez `SESSIONS_SOURCE: "supabase"` dans js/supabase-config.js.
--  Une session ajoutée ici apparaît alors sur la page VCA Base, l'agenda, le parcours d'inscription,
--  la recherche et l'assistant. Si la table est injoignable, le site retombe sur js/sessions-data.js.
--
--  À COPIER TEL QUEL dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : peut être ré-exécuté sans casser l'existant.
--
--  Modèle de sécurité (Row Level Security)
--    • Le public (rôle `anon`, la clé publique du site) peut UNIQUEMENT LIRE les sessions dont
--      `published = true`. Il ne peut ni voir un brouillon, ni écrire, ni modifier, ni supprimer.
--    • Seul l'administrateur (compte Supabase dont app_metadata.role = 'admin' — voir supabase/harden-admin.sql,
--      BLOC 1) peut créer / modifier / supprimer une session et voir les brouillons.
--    • Aucune clé privée n'est jamais utilisée par le site.
--
--  Règle d'or : AUCUNE date n'est inventée. Une ligne = une session réellement organisée.
--  Les contraintes ci-dessous reprennent exactement la validation de js/sessions.js : une ligne refusée
--  ici n'aurait de toute façon pas été affichée par le site.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.training_sessions (
  id            text         primary key,             -- ex. « 2026-11-05-fr » : minuscules, chiffres, tirets (3 à 64 caractères)
  training      text         not null,                -- identifiant de la formation du site : vca-base, nacelle, beps, fibre-optique…
  session_date  date         not null,                -- jour de la session
  start_time    time,                                 -- facultatif — heure de début (heure de Bruxelles)
  end_time      time,                                 -- facultatif — heure de fin
  language      text,                                 -- facultatif — code à 2 lettres : fr, nl, en…
  location      text,                                 -- facultatif — par défaut, le centre d'Anderlecht (formation à lieu confirmé)
  capacity      integer,                              -- facultatif — nombre de places au total
  seats_left    integer,                              -- facultatif — places encore disponibles (0 = complet)
  status        text         not null default 'open', -- open | full | cancelled
  price_cents   integer,                              -- facultatif — tarif propre à la session, en centimes
  signup_url    text,                                 -- facultatif — uniquement « inscription.html?… » (par défaut : formation + session)
  published     boolean      not null default false,  -- FAUX = brouillon : invisible du public
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  -- Mêmes règles que js/sessions.js → validate()
  constraint training_sessions_id_format      check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  constraint training_sessions_training_fmt   check (training ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  constraint training_sessions_language_fmt   check (language is null or language ~ '^[a-z]{2}$'),
  constraint training_sessions_location_len   check (location is null or char_length(location) <= 160),
  constraint training_sessions_capacity_range check (capacity is null or capacity between 1 and 500),
  constraint training_sessions_seats_range    check (seats_left is null or (seats_left >= 0 and seats_left <= coalesce(capacity, 500))),
  constraint training_sessions_status_values  check (status in ('open', 'full', 'cancelled')),
  constraint training_sessions_price_range    check (price_cents is null or price_cents between 0 and 10000000),
  constraint training_sessions_times_order    check ((end_time is null) or (start_time is not null and end_time > start_time)),
  constraint training_sessions_signup_fmt     check (signup_url is null or signup_url ~ '^inscription\.html\?[A-Za-z0-9_=&.%-]{1,200}$')
);

comment on table  public.training_sessions is 'Sessions de formation Wisy Safety. Lecture publique : uniquement published = true.';
comment on column public.training_sessions.published is 'Faux = brouillon (invisible du site). Vrai = affiché sur la page VCA Base, l''agenda, l''inscription, la recherche et l''assistant.';

create index if not exists training_sessions_public_idx on public.training_sessions (session_date, start_time) where published = true;

-- updated_at suit chaque modification
create or replace function public.training_sessions_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_training_sessions_touch on public.training_sessions;
create trigger trg_training_sessions_touch
  before update on public.training_sessions
  for each row execute function public.training_sessions_touch();

-- -----------------------------------------------------------------------------
-- 2) RÔLE ADMINISTRATEUR (autonome : ce fichier n'exige pas harden-admin.sql)
--    app_metadata ne peut être modifié que côté serveur (contrairement à user_metadata) : un visiteur
--    ne peut donc pas s'attribuer ce rôle lui-même. Donner le rôle : supabase/harden-admin.sql, BLOC 1.
-- -----------------------------------------------------------------------------
create or replace function public.is_sessions_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- -----------------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.training_sessions enable row level security;

-- 3a) LECTURE PUBLIQUE : uniquement les sessions publiées.
drop policy if exists "public can read published sessions" on public.training_sessions;
create policy "public can read published sessions"
  on public.training_sessions
  for select
  to anon, authenticated
  using (published = true);

-- 3b) ADMIN : voit aussi les brouillons.
drop policy if exists "admin can read all sessions" on public.training_sessions;
create policy "admin can read all sessions"
  on public.training_sessions
  for select
  to authenticated
  using (public.is_sessions_admin());

-- 3c) ADMIN : création / modification / suppression.
drop policy if exists "admin can insert sessions" on public.training_sessions;
create policy "admin can insert sessions"
  on public.training_sessions
  for insert
  to authenticated
  with check (public.is_sessions_admin());

drop policy if exists "admin can update sessions" on public.training_sessions;
create policy "admin can update sessions"
  on public.training_sessions
  for update
  to authenticated
  using (public.is_sessions_admin())
  with check (public.is_sessions_admin());

drop policy if exists "admin can delete sessions" on public.training_sessions;
create policy "admin can delete sessions"
  on public.training_sessions
  for delete
  to authenticated
  using (public.is_sessions_admin());

-- -----------------------------------------------------------------------------
-- 4) DROITS (PostgREST / API) — les policies ci-dessus filtrent ensuite ligne par ligne
-- -----------------------------------------------------------------------------
grant select on public.training_sessions to anon, authenticated;
grant insert, update, delete on public.training_sessions to authenticated;

-- =============================================================================
-- 5) EXEMPLE (à adapter puis à exécuter avec un COMPTE ADMIN, ou via l'éditeur de tables de Supabase)
--    Remplacez chaque valeur par une session RÉELLE. Ne rien exécuter tel quel.
-- =============================================================================
-- insert into public.training_sessions (id, training, session_date, start_time, end_time, language, capacity, seats_left, published)
-- values ('AAAA-MM-JJ-fr', 'vca-base', 'AAAA-MM-JJ', 'HH:MM', 'HH:MM', 'fr', 12, 12, true);
--
-- Marquer une session « complète » :   update public.training_sessions set seats_left = 0 where id = 'AAAA-MM-JJ-fr';
-- L'annuler (elle disparaît du site) :  update public.training_sessions set status = 'cancelled' where id = 'AAAA-MM-JJ-fr';
-- La retirer sans la supprimer :         update public.training_sessions set published = false where id = 'AAAA-MM-JJ-fr';
