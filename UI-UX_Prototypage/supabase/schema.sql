-- OUTRS — schéma Supabase (authentification + profils)
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.
-- Le script est ré-exécutable sans erreur.

create extension if not exists unaccent with schema extensions;

-- 1. Table des profils publics, liée 1-1 aux comptes auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  handle text not null unique check (handle ~ '^[a-z0-9._]{2,30}$'),
  avatar text not null default 'avatar-1' check (avatar in ('avatar-1', 'avatar-2')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Sécurité par ligne : chaque utilisateur ne voit et ne modifie que son profil
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- (pas de policy insert/delete : la création passe par le trigger, la suppression par la cascade)

-- Droits de l'API (les nouveaux projets Supabase ne les accordent plus automatiquement).
-- Les visiteurs non connectés (anon) n'ont aucun accès ; un connecté ne peut modifier
-- que le nom, le pseudo et l'avatar (jamais id ni created_at), et seulement sur sa ligne (RLS).
revoke all on public.profiles from anon;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (name, handle, avatar) on public.profiles to authenticated;

-- 3. Mise à jour automatique de updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 4. Création automatique du profil à l'inscription (pseudo unique généré)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 40);
  base_handle text;
  candidate text;
  suffix int := 1;
begin
  if char_length(display_name) < 2 then
    display_name := 'Outer';
  end if;

  base_handle := lower(regexp_replace(extensions.unaccent(display_name), '[^a-zA-Z0-9._]+', '.', 'g'));
  base_handle := trim(both '.' from regexp_replace(base_handle, '\.{2,}', '.', 'g'));
  if char_length(base_handle) < 2 then
    base_handle := 'outer';
  end if;
  base_handle := left(base_handle, 26);
  candidate := base_handle;

  while exists (select 1 from public.profiles where handle = candidate) loop
    suffix := suffix + 1;
    candidate := base_handle || suffix::text;
  end loop;

  insert into public.profiles (id, name, handle)
  values (new.id, display_name, candidate);
  return new;
end;
$$;


drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Profils des comptes déjà créés avant ce script
insert into public.profiles (id, name, handle)
select
  u.id,
  case
    when char_length(coalesce(trim(u.raw_user_meta_data ->> 'name'), split_part(u.email, '@', 1), '')) >= 2
      then left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1)), 40)
    else 'Outer'
  end,
  'outer.' || left(replace(u.id::text, '-', ''), 12)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
