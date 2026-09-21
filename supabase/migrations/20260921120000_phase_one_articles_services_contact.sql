begin;

-- ── Articles (Innsikt) ──

create table if not exists public.sp_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text check (char_length(excerpt) <= 500),
  body text,
  author_id uuid references public.sp_profiles (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sp_articles_published_index
  on public.sp_articles (published_at desc)
  where status = 'published' and published_at is not null;

alter table public.sp_articles enable row level security;

revoke all on table public.sp_articles from anon, authenticated;
grant select on table public.sp_articles to anon, authenticated;
grant select, insert, update on table public.sp_articles to authenticated;

create policy "sp published articles are readable"
  on public.sp_articles
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy "sp editors read all articles"
  on public.sp_articles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp editors create articles"
  on public.sp_articles
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp editors update articles"
  on public.sp_articles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

-- ── Service offerings (Tjenester) ──

create table if not exists public.sp_service_offerings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sp_service_offerings enable row level security;

revoke all on table public.sp_service_offerings from anon, authenticated;
grant select on table public.sp_service_offerings to anon, authenticated;
grant select, insert, update on table public.sp_service_offerings to authenticated;

create policy "sp published services are readable"
  on public.sp_service_offerings
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy "sp editors read all services"
  on public.sp_service_offerings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp editors create services"
  on public.sp_service_offerings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp editors update services"
  on public.sp_service_offerings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

-- ── Contact submissions ──

create table if not exists public.sp_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.sp_contact_submissions enable row level security;

revoke all on table public.sp_contact_submissions from anon, authenticated;
grant insert on table public.sp_contact_submissions to anon, authenticated;
grant select on table public.sp_contact_submissions to authenticated;

create policy "sp anyone can submit contact"
  on public.sp_contact_submissions
  for insert
  to anon, authenticated
  with check (true);

create policy "sp editors read contact submissions"
  on public.sp_contact_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin')
    )
  );

-- ── Add cover_image_path to projects ──

alter table public.sp_projects
  add column if not exists cover_image_path text;

-- ── Storage policies for sp-media bucket ──

create policy "sp editors upload media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sp-media'
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp editors update media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'sp-media'
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

create policy "sp anyone reads published media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'sp-media');

-- ── Realtime for new tables ──

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sp_articles'
  ) then
    alter publication supabase_realtime add table public.sp_articles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sp_service_offerings'
  ) then
    alter publication supabase_realtime add table public.sp_service_offerings;
  end if;
end
$$;

commit;
