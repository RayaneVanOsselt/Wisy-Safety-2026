-- =============================================================================
--  WISY SAFETY — Registre des certificats · Supabase (PostgreSQL)
-- -----------------------------------------------------------------------------
--  À COPIER TEL QUEL dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : peut être ré-exécuté sans perdre de données (mise à jour des
--  fonctions et des règles d'accès, jamais de suppression de certificats).
--
--  Guide pas à pas (mise en service, ajout de personnes, import Excel) :
--  docs/README-CERTIFICATS.md
--
--  MODÈLE DE SÉCURITÉ
--    • La table `certificates` est PRIVÉE : le public (rôle `anon`, la clé
--      publique du site) n'a AUCUN droit dessus — ni lecture, ni écriture.
--    • Le public ne peut appeler qu'UNE fonction : `verify_certificate(nom,
--      date de naissance)`. Elle exige une correspondance EXACTE des deux
--      informations et ne renvoie que : titulaire, formation, numéro, dates,
--      statut. Jamais la date de naissance, l'e-mail, le téléphone,
--      l'entreprise, les notes, ni une liste de certificats.
--    • Nombre de vérifications limité par visiteur ET au total (anti-essais
--      automatisés). Les adresses IP ne sont jamais stockées en clair :
--      seulement une empreinte salée, effacée après 48 heures.
--    • Gestion (ajout, modification, import, suppression, PDF) : réservée aux
--      comptes Supabase portant le rôle « admin » (voir l'ÉTAPE 2 du guide) —
--      jamais à un simple compte connecté.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) RÔLE ADMINISTRATEUR
--    Même règle que supabase/harden-admin.sql : `app_metadata.role = "admin"`.
--    app_metadata n'est modifiable que côté serveur : un visiteur ne peut pas
--    s'attribuer ce rôle lui-même.
-- -----------------------------------------------------------------------------
create or replace function public.is_wisy_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;


-- -----------------------------------------------------------------------------
-- 2) CLÉ DE RECHERCHE D'UN NOM
--    « Van Osselt », « VAN-OSSELT », « van osselt » → « vanosselt ».
--    Casse, accents, espaces, tirets, apostrophes et points sont ignorés.
-- -----------------------------------------------------------------------------
create or replace function public.wisy_name_key(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
           translate(
             replace(replace(replace(replace(replace(replace(replace(replace(
               lower(regexp_replace(normalize(coalesce(p, ''), NFKD), '[̀-ͯ]', '', 'g')),
               'ß', 'ss'), 'ẞ', 'ss'), 'æ', 'ae'), 'Æ', 'ae'), 'œ', 'oe'), 'Œ', 'oe'), 'þ', 'th'), 'Þ', 'th'),
             'øØłŁđĐðÐıħĦŧŦ',
             'oollddddihhtt'),
           '[[:space:]''’‘ʼ`´.,_‐‑‒–—-]+', '', 'g');
$$;


-- -----------------------------------------------------------------------------
-- 3) TABLE DES CERTIFICATS (privée)
-- -----------------------------------------------------------------------------
create table if not exists public.certificates (
  id                  uuid         primary key default gen_random_uuid(),
  certificate_number  text         not null,               -- numéro imprimé sur le certificat (unique)
  last_name           text         not null,               -- nom de famille (sert à la recherche)
  first_name          text,
  other_last_names    text,                                -- autres noms (nom d'usage, de naissance…) séparés par « ; »
  birth_date          date,                                -- JAMAIS affichée ; sans elle, le certificat est introuvable en ligne
  training            text         not null,               -- formation suivie, telle qu'écrite sur le certificat
  training_date       date,                                -- date de la formation (ou de l'examen)
  issue_date          date,                                -- date de délivrance, si différente
  expiry_date         date,                                -- dernier jour de validité (vide = « validité à confirmer »)
  revoked             boolean      not null default false, -- prime sur tout : affiché « révoqué »
  revoked_reason      text,                                -- interne
  company             text,                                -- employeur — interne
  email               text,                                -- interne
  phone               text,                                -- interne
  notes               text,                                -- interne
  document_path       text,                                -- PDF dans le stockage privé « certificats » (interne)
  name_keys           text[]       not null default '{}',  -- calculé automatiquement (voir le déclencheur)
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),

  constraint certificates_number_unique  unique (certificate_number),
  constraint certificates_number_len     check (char_length(certificate_number) between 1 and 60),
  constraint certificates_last_name_len  check (char_length(last_name) between 1 and 80),
  constraint certificates_first_name_len check (first_name is null or char_length(first_name) <= 80),
  constraint certificates_other_len      check (other_last_names is null or char_length(other_last_names) <= 160),
  constraint certificates_training_len   check (char_length(training) between 1 and 160),
  constraint certificates_birth_range    check (birth_date is null or birth_date >= date '1900-01-01'),
  constraint certificates_company_len    check (company is null or char_length(company) <= 160),
  constraint certificates_email_format   check (email is null or (char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint certificates_phone_len      check (phone is null or char_length(phone) <= 40),
  constraint certificates_reason_len     check (revoked_reason is null or char_length(revoked_reason) <= 500),
  constraint certificates_notes_len      check (notes is null or char_length(notes) <= 2000),
  constraint certificates_dates_order    check (expiry_date is null or training_date is null or expiry_date >= training_date)
);

comment on table public.certificates is 'Registre des certificats Wisy Safety. PRIVÉ : le public ne passe que par verify_certificate().';
comment on column public.certificates.birth_date is 'Jamais affichée publiquement. Sert uniquement à la vérification exacte.';
comment on column public.certificates.name_keys is 'Clés de recherche calculées par le déclencheur (ne pas saisir).';

create index if not exists certificates_lookup_idx  on public.certificates (birth_date);
create index if not exists certificates_name_idx    on public.certificates using gin (name_keys);
create index if not exists certificates_updated_idx on public.certificates (updated_at desc);


-- -----------------------------------------------------------------------------
-- 4) DÉCLENCHEUR — nettoyage des saisies + clés de recherche
-- -----------------------------------------------------------------------------
create or replace function public.certificates_prepare()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  keys text[] := '{}';
begin
  new.certificate_number := upper(regexp_replace(btrim(new.certificate_number), '\s+', ' ', 'g'));
  new.last_name          := regexp_replace(btrim(new.last_name), '\s+', ' ', 'g');
  new.first_name         := nullif(regexp_replace(btrim(coalesce(new.first_name, '')), '\s+', ' ', 'g'), '');
  new.other_last_names   := nullif(btrim(coalesce(new.other_last_names, '')), '');
  new.training           := regexp_replace(btrim(new.training), '\s+', ' ', 'g');
  new.revoked_reason     := nullif(btrim(coalesce(new.revoked_reason, '')), '');
  new.company            := nullif(btrim(coalesce(new.company, '')), '');
  new.email              := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone              := nullif(btrim(coalesce(new.phone, '')), '');
  new.notes              := nullif(btrim(coalesce(new.notes, '')), '');
  new.document_path      := nullif(btrim(coalesce(new.document_path, '')), '');

  -- Clés : le nom de famille, chaque autre nom, et « nom + prénom » dans les deux sens
  -- (une personne qui tape « Dupont Marie » dans le champ du nom est quand même retrouvée).
  foreach k in array array_cat(
      array[new.last_name,
            new.last_name || ' ' || coalesce(new.first_name, ''),
            coalesce(new.first_name, '') || ' ' || new.last_name],
      regexp_split_to_array(coalesce(new.other_last_names, ''), '\s*[;,]\s*'))
  loop
    k := public.wisy_name_key(k);
    if k <> '' and not (k = any(keys)) then keys := keys || k; end if;
  end loop;
  new.name_keys := keys;

  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_certificates_prepare on public.certificates;
create trigger trg_certificates_prepare
  before insert or update on public.certificates
  for each row execute function public.certificates_prepare();


-- -----------------------------------------------------------------------------
-- 5) JOURNAL ANTI-ABUS (empreintes salées, effacées après 48 h) + sel secret
-- -----------------------------------------------------------------------------
create table if not exists public.certificate_settings (
  id    smallint primary key default 1,
  salt  text     not null default (gen_random_uuid()::text || gen_random_uuid()::text),
  constraint certificate_settings_single check (id = 1)
);
insert into public.certificate_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.certificate_lookups (
  id           bigint       generated always as identity primary key,
  client_hash  text         not null,
  found        boolean      not null default false,
  created_at   timestamptz  not null default now()
);
create index if not exists certificate_lookups_client_idx  on public.certificate_lookups (client_hash, created_at desc);
create index if not exists certificate_lookups_created_idx on public.certificate_lookups (created_at);

comment on table public.certificate_lookups is 'Vérifications récentes (empreinte salée du visiteur, jamais l''IP). Purgé après 48 h.';


-- -----------------------------------------------------------------------------
-- 6) VÉRIFICATION PUBLIQUE — la SEULE porte d'entrée du public
--    POST /rest/v1/rpc/verify_certificate  { "p_last_name": "…", "p_birth_date": "AAAA-MM-JJ" }
--    Réponse : { status: found | not_found | invalid | rate_limited, … }
-- -----------------------------------------------------------------------------
create or replace function public.verify_certificate(p_last_name text, p_birth_date text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- Limites : ajustables ici (puis ré-exécuter ce fichier).
  c_per_window  constant int      := 10;                    -- vérifications par visiteur…
  c_window      constant interval := interval '15 minutes'; -- …sur 15 minutes
  c_per_day     constant int      := 50;                    -- vérifications par visiteur sur 24 h
  c_global_hour constant int      := 1500;                  -- vérifications, tous visiteurs confondus, par heure

  v_today   date        := (now() at time zone 'Europe/Brussels')::date;
  v_name    text        := regexp_replace(btrim(coalesce(p_last_name, '')), '\s+', ' ', 'g');
  v_rawdate text        := btrim(coalesce(p_birth_date, ''));
  v_key     text;
  v_birth   date;
  v_fields  jsonb       := '{}'::jsonb;
  v_headers json;
  v_ip      text;
  v_salt    text;
  v_client  text;
  v_n       int;
  v_edge    timestamptz;
  v_retry   int         := 0;
  v_certs   jsonb;
begin
  -- 6a) Empreinte du visiteur (jamais l'IP en clair)
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := btrim(coalesce(v_headers ->> 'cf-connecting-ip',
                         v_headers ->> 'x-real-ip',
                         split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1),
                         ''));
  if v_ip = '' then v_ip := 'inconnu'; end if;
  select salt into v_salt from public.certificate_settings where id = 1;
  v_client := encode(sha256(convert_to(v_ip || '|' || coalesce(v_salt, ''), 'UTF8')), 'hex');

  -- 6b) Limites (une tentative refusée n'est pas comptée : un visiteur légitime n'est jamais bloqué indéfiniment)
  select count(*) into v_n from public.certificate_lookups where created_at > now() - interval '1 hour';
  if v_n >= c_global_hour then
    v_retry := 900;
  end if;
  if v_retry = 0 then
    select created_at into v_edge from public.certificate_lookups
     where client_hash = v_client and created_at > now() - c_window
     order by created_at desc offset c_per_window - 1 limit 1;
    if v_edge is not null then
      v_retry := ceil(extract(epoch from (v_edge + c_window - now())))::int;
    end if;
  end if;
  if v_retry = 0 then
    select created_at into v_edge from public.certificate_lookups
     where client_hash = v_client and created_at > now() - interval '24 hours'
     order by created_at desc offset c_per_day - 1 limit 1;
    if v_edge is not null then
      v_retry := ceil(extract(epoch from (v_edge + interval '24 hours' - now())))::int;
    end if;
  end if;
  if v_retry > 0 then
    return jsonb_build_object('status', 'rate_limited', 'retryAfter', greatest(60, v_retry));
  end if;

  -- 6c) Validation (mêmes règles que la page ; le serveur ne fait jamais confiance au navigateur)
  if v_name = '' then
    v_fields := v_fields || jsonb_build_object('lastName', 'required');
  elsif char_length(v_name) > 80 then
    v_fields := v_fields || jsonb_build_object('lastName', 'too_long');
  else
    v_key := public.wisy_name_key(v_name);
    if v_key = '' or v_name ~ '[0-9<>{}\[\]\\/@#$%^*=+|~"]' then
      v_fields := v_fields || jsonb_build_object('lastName', 'invalid');
    end if;
  end if;

  if v_rawdate = '' then
    v_fields := v_fields || jsonb_build_object('birthDate', 'required');
  elsif v_rawdate !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    v_fields := v_fields || jsonb_build_object('birthDate', 'format');
  else
    begin
      v_birth := to_date(v_rawdate, 'YYYY-MM-DD');
      if to_char(v_birth, 'YYYY-MM-DD') <> v_rawdate then v_birth := null; end if;
    exception when others then
      v_birth := null;
    end;
    if v_birth is null then
      v_fields := v_fields || jsonb_build_object('birthDate', 'invalid');
    elsif v_birth > v_today then
      v_fields := v_fields || jsonb_build_object('birthDate', 'future');
    elsif v_birth < date '1900-01-01' then
      v_fields := v_fields || jsonb_build_object('birthDate', 'too_old');
    end if;
  end if;

  if v_fields <> '{}'::jsonb then
    return jsonb_build_object('status', 'invalid', 'fields', v_fields);
  end if;

  -- 6d) Recherche EXACTE (nom normalisé + date de naissance), 20 certificats au plus
  select coalesce(jsonb_agg(x.cert order by x.sort_date desc nulls last, x.num), '[]'::jsonb)
    into v_certs
    from (
      select jsonb_build_object(
               'holder',            btrim(coalesce(c.first_name, '') || ' ' || c.last_name),
               'training',          c.training,
               'certificateNumber', c.certificate_number,
               'trainingDate',      c.training_date,
               'issueDate',         c.issue_date,
               'expiryDate',        c.expiry_date,
               'status',            case
                                      when c.revoked then 'revoked'
                                      when c.expiry_date is null then 'undetermined'
                                      when c.expiry_date >= v_today then 'valid'
                                      else 'expired'
                                    end
             ) as cert,
             coalesce(c.issue_date, c.training_date) as sort_date,
             c.certificate_number as num
        from public.certificates c
       where c.birth_date = v_birth
         and v_key = any (c.name_keys)
       limit 20
    ) x;

  insert into public.certificate_lookups (client_hash, found) values (v_client, jsonb_array_length(v_certs) > 0);

  -- Purge régulière du journal (48 h)
  if random() < 0.05 then
    delete from public.certificate_lookups where created_at < now() - interval '48 hours';
  end if;

  if jsonb_array_length(v_certs) = 0 then
    return jsonb_build_object('status', 'not_found',
                              'checkedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                              'today', v_today, 'timezone', 'Europe/Brussels');
  end if;
  return jsonb_build_object('status', 'found',
                            'checkedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                            'today', v_today, 'timezone', 'Europe/Brussels',
                            'certificates', v_certs);
end;
$$;

comment on function public.verify_certificate(text, text) is 'Vérification publique d''un certificat (nom + date de naissance, correspondance exacte, limitée).';


-- -----------------------------------------------------------------------------
-- 7) ROW LEVEL SECURITY + DROITS
-- -----------------------------------------------------------------------------
alter table public.certificates          enable row level security;
alter table public.certificate_lookups   enable row level security;
alter table public.certificate_settings  enable row level security;

-- Le public : aucun accès direct aux tables (Supabase en accorde par défaut — on les retire).
revoke all on public.certificates, public.certificate_lookups, public.certificate_settings from anon;
revoke all on public.certificate_settings from authenticated;
revoke all on public.certificate_lookups from authenticated;

-- L'administrateur : gestion complète du registre.
grant select, insert, update, delete on public.certificates to authenticated;
grant select on public.certificate_lookups to authenticated;

drop policy if exists "wisy admin reads certificates"   on public.certificates;
drop policy if exists "wisy admin adds certificates"    on public.certificates;
drop policy if exists "wisy admin edits certificates"   on public.certificates;
drop policy if exists "wisy admin deletes certificates" on public.certificates;
create policy "wisy admin reads certificates"   on public.certificates for select to authenticated using (public.is_wisy_admin());
create policy "wisy admin adds certificates"    on public.certificates for insert to authenticated with check (public.is_wisy_admin());
create policy "wisy admin edits certificates"   on public.certificates for update to authenticated using (public.is_wisy_admin()) with check (public.is_wisy_admin());
create policy "wisy admin deletes certificates" on public.certificates for delete to authenticated using (public.is_wisy_admin());

drop policy if exists "wisy admin reads lookups" on public.certificate_lookups;
create policy "wisy admin reads lookups" on public.certificate_lookups for select to authenticated using (public.is_wisy_admin());
-- certificate_settings : aucune politique ⇒ personne ne lit le sel, sauf la fonction verify_certificate.

-- La seule fonction ouverte au public.
revoke all on function public.verify_certificate(text, text) from public, anon, authenticated;
grant execute on function public.verify_certificate(text, text) to anon, authenticated;
-- Fonctions internes : pas d'appel direct par le public.
revoke all on function public.wisy_name_key(text) from public, anon;
grant execute on function public.wisy_name_key(text) to authenticated;

-- Supabase recharge l'API automatiquement ; cette ligne le force si besoin.
notify pgrst, 'reload schema';


-- -----------------------------------------------------------------------------
-- 8) STOCKAGE PRIVÉ DES PDF (facultatif) — bucket « certificats », 5 Mo, PDF seulement
--    Jamais public : seul l'administrateur dépose, consulte ou supprime un PDF.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificats', 'certificats', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wisy admin reads certificate pdf"   on storage.objects;
drop policy if exists "wisy admin uploads certificate pdf" on storage.objects;
drop policy if exists "wisy admin updates certificate pdf" on storage.objects;
drop policy if exists "wisy admin deletes certificate pdf" on storage.objects;
create policy "wisy admin reads certificate pdf"   on storage.objects for select to authenticated using (bucket_id = 'certificats' and public.is_wisy_admin());
create policy "wisy admin uploads certificate pdf" on storage.objects for insert to authenticated with check (bucket_id = 'certificats' and public.is_wisy_admin());
create policy "wisy admin updates certificate pdf" on storage.objects for update to authenticated using (bucket_id = 'certificats' and public.is_wisy_admin()) with check (bucket_id = 'certificats' and public.is_wisy_admin());
create policy "wisy admin deletes certificate pdf" on storage.objects for delete to authenticated using (bucket_id = 'certificats' and public.is_wisy_admin());


-- =============================================================================
-- 9) CONTRÔLES (à lancer après l'installation — facultatif)
-- -----------------------------------------------------------------------------
--   -- Doit renvoyer {"status": "not_found", …} (ou "found" si la personne existe) :
--   select public.verify_certificate('Dupont', '1992-05-14');
--   -- Doit renvoyer {"status": "invalid", …} :
--   select public.verify_certificate('', '31/02/1990');
--   -- Doit renvoyer « vanosselt » :
--   select public.wisy_name_key('Van-Össelt');
--
-- 10) (OPTIONNEL — TEST) Certificat de démonstration, à supprimer ensuite :
--   insert into public.certificates (certificate_number, last_name, first_name, birth_date, training, training_date, expiry_date)
--   values ('DEMO-0001', 'Démo', 'Test', '1990-01-01', 'VCA Base', '2026-01-15', '2036-01-15');
--   -- Vérification sur le site : nom « Demo », date « 01/01/1990 ».
--   -- Nettoyage : delete from public.certificates where certificate_number = 'DEMO-0001';
-- =============================================================================
