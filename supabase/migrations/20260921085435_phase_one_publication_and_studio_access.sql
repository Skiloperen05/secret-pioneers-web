begin;

-- Only a role stored in the RLS-protected membership table can publish. Roles
-- are deliberately never read from user_metadata or a browser-controlled value.
grant select, insert, update on table public.sp_site_settings to authenticated;
grant select, insert, update on table public.sp_projects to authenticated;

drop policy if exists "sp editors read site settings" on public.sp_site_settings;
create policy "sp editors read site settings"
  on public.sp_site_settings
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

drop policy if exists "sp editors create site settings" on public.sp_site_settings;
create policy "sp editors create site settings"
  on public.sp_site_settings
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

drop policy if exists "sp editors update site settings" on public.sp_site_settings;
create policy "sp editors update site settings"
  on public.sp_site_settings
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

drop policy if exists "sp studio members read projects" on public.sp_projects;
create policy "sp studio members read projects"
  on public.sp_projects
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "sp editors create own projects" on public.sp_projects;
create policy "sp editors create own projects"
  on public.sp_projects
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "sp editors update own projects" on public.sp_projects;
create policy "sp editors update own projects"
  on public.sp_projects
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'editor')
    )
  );

-- The public application can react to newly published content without polling.
-- Only Secret Pioneers tables are added to the publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sp_site_settings'
  ) then
    alter publication supabase_realtime add table public.sp_site_settings;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sp_projects'
  ) then
    alter publication supabase_realtime add table public.sp_projects;
  end if;
end
$$;

-- A single published record lets the public page receive its presentation copy
-- from Supabase immediately. More than one record is allowed for future drafts.
insert into public.sp_site_settings (
  site_title,
  contact_email,
  hero_copy,
  is_published
)
select
  'Secret Pioneers',
  'hello@secretpioneers.no',
  'Secret Pioneers er et rom for ideer, utvikling og verdiskaping – med finans og økonomi som vårt utgangspunkt.',
  true
where not exists (
  select 1
  from public.sp_site_settings
  where is_published
);

commit;
