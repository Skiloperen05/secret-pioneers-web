begin;

-- Secret Pioneers uses a dedicated, prefixed data domain inside the shared
-- Supabase instance. It intentionally does not modify tables used by the
-- existing BH Flashcards or NHHI FC Botkasse applications.
create table if not exists public.sp_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  avatar_path text,
  bio text check (char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.sp_profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'editor', 'finance', 'project_lead', 'member', 'guest')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'former')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_site_settings (
  id uuid primary key default gen_random_uuid(),
  site_title text not null default 'Secret Pioneers',
  contact_email text,
  hero_copy text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text check (char_length(summary) <= 1000),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'private', 'public')),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  is_public boolean not null default false,
  published_at timestamptz,
  owner_id uuid references public.sp_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and is_public and published_at is not null)
    or status <> 'published'
  )
);

create table if not exists public.sp_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text not null check (char_length(trim(alt_text)) between 2 and 300),
  mime_type text not null,
  uploaded_by uuid references public.sp_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sp_projects_public_index
  on public.sp_projects (published_at desc)
  where visibility = 'public' and status = 'published' and is_public;

alter table public.sp_profiles enable row level security;
alter table public.sp_memberships enable row level security;
alter table public.sp_site_settings enable row level security;
alter table public.sp_projects enable row level security;
alter table public.sp_media_assets enable row level security;

-- Tables are unreachable to browser roles until a policy and explicit grant
-- allow the narrowly-scoped reads below. Studio write policies arrive with
-- its authenticated UI in Phase 1.
revoke all on table public.sp_profiles from anon, authenticated;
revoke all on table public.sp_memberships from anon, authenticated;
revoke all on table public.sp_site_settings from anon, authenticated;
revoke all on table public.sp_projects from anon, authenticated;
revoke all on table public.sp_media_assets from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.sp_site_settings to anon, authenticated;
grant select on table public.sp_projects to anon, authenticated;
grant select on table public.sp_profiles to authenticated;
grant select on table public.sp_memberships to authenticated;
grant select on table public.sp_media_assets to authenticated;

drop policy if exists "sp public site settings are readable" on public.sp_site_settings;
create policy "sp public site settings are readable"
  on public.sp_site_settings
  for select
  to anon, authenticated
  using (is_published);

drop policy if exists "sp published projects are readable" on public.sp_projects;
create policy "sp published projects are readable"
  on public.sp_projects
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and status = 'published'
    and is_public
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists "sp members read own profile" on public.sp_profiles;
create policy "sp members read own profile"
  on public.sp_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "sp members read own membership" on public.sp_memberships;
create policy "sp members read own membership"
  on public.sp_memberships
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "sp members read own media metadata" on public.sp_media_assets;
create policy "sp members read own media metadata"
  on public.sp_media_assets
  for select
  to authenticated
  using ((select auth.uid()) = uploaded_by);

-- The bucket is private from day one. Object-level policies are introduced
-- together with the Studio upload flow, so no file can be exposed by mistake.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sp-media',
  'sp-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

commit;
