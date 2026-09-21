begin;

-- ── Invitations ──

create table if not exists public.sp_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role text not null default 'member'
    check (role in ('admin', 'editor', 'finance', 'project_lead', 'member', 'guest')),
  token_hash text not null unique,
  invited_by uuid not null references public.sp_profiles (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now()
);

alter table public.sp_invitations enable row level security;
revoke all on table public.sp_invitations from anon, authenticated;
grant select, insert, update on table public.sp_invitations to authenticated;

create policy "sp admins manage invitations"
  on public.sp_invitations
  for all
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin')
    )
  );

-- ── Project members ──

create table if not exists public.sp_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sp_projects (id) on delete cascade,
  profile_id uuid not null references public.sp_profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('lead', 'member', 'observer')),
  created_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

alter table public.sp_project_members enable row level security;
revoke all on table public.sp_project_members from anon, authenticated;
grant select, insert, update, delete on table public.sp_project_members to authenticated;

create policy "sp active members read project members"
  on public.sp_project_members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp admins and leads manage project members"
  on public.sp_project_members
  for all
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'project_lead')
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin', 'project_lead')
    )
  );

-- ── Tasks ──

create table if not exists public.sp_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.sp_projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 200),
  description text,
  assignee_id uuid references public.sp_profiles (id) on delete set null,
  created_by uuid not null references public.sp_profiles (id) on delete cascade,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sp_tasks_assignee_index
  on public.sp_tasks (assignee_id)
  where status in ('todo', 'in_progress');

alter table public.sp_tasks enable row level security;
revoke all on table public.sp_tasks from anon, authenticated;
grant select, insert, update on table public.sp_tasks to authenticated;

create policy "sp active members read tasks"
  on public.sp_tasks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members create tasks"
  on public.sp_tasks
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members update tasks"
  on public.sp_tasks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

-- ── Meetings ──

create table if not exists public.sp_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 200),
  meeting_type text not null default 'general'
    check (meeting_type in ('board', 'general', 'project', 'workshop')),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  location text,
  agenda text,
  created_by uuid not null references public.sp_profiles (id) on delete cascade,
  project_id uuid references public.sp_projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sp_meetings enable row level security;
revoke all on table public.sp_meetings from anon, authenticated;
grant select, insert, update on table public.sp_meetings to authenticated;

create policy "sp active members read meetings"
  on public.sp_meetings
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members create meetings"
  on public.sp_meetings
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members update meetings"
  on public.sp_meetings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

-- ── Meeting minutes ──

create table if not exists public.sp_meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.sp_meetings (id) on delete cascade,
  body text,
  recorded_by uuid references public.sp_profiles (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sp_meeting_minutes enable row level security;
revoke all on table public.sp_meeting_minutes from anon, authenticated;
grant select, insert, update on table public.sp_meeting_minutes to authenticated;

create policy "sp active members read minutes"
  on public.sp_meeting_minutes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members create minutes"
  on public.sp_meeting_minutes
  for insert
  to authenticated
  with check (
    recorded_by = (select auth.uid())
    and exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members update minutes"
  on public.sp_meeting_minutes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

-- ── Decisions ──

create table if not exists public.sp_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.sp_meetings (id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 300),
  description text,
  owner_id uuid references public.sp_profiles (id) on delete set null,
  deadline date,
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sp_decisions enable row level security;
revoke all on table public.sp_decisions from anon, authenticated;
grant select, insert, update on table public.sp_decisions to authenticated;

create policy "sp active members read decisions"
  on public.sp_decisions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp admins manage decisions"
  on public.sp_decisions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
        and role in ('owner', 'admin')
    )
  );

-- ── Notifications ──

create table if not exists public.sp_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.sp_profiles (id) on delete cascade,
  type text not null check (type in ('invitation', 'task', 'meeting', 'decision', 'general')),
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sp_notifications_unread_index
  on public.sp_notifications (recipient_id, created_at desc)
  where not is_read;

alter table public.sp_notifications enable row level security;
revoke all on table public.sp_notifications from anon, authenticated;
grant select, insert, update on table public.sp_notifications to authenticated;

create policy "sp members read own notifications"
  on public.sp_notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "sp members update own notifications"
  on public.sp_notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "sp active members create notifications"
  on public.sp_notifications
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

-- ── Broader profile/membership read access for workspace ──

create policy "sp active members read all profiles"
  on public.sp_profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "sp active members read all memberships"
  on public.sp_memberships
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships m
      where m.profile_id = (select auth.uid())
        and m.status = 'active'
    )
  );

-- ── Editors read all projects (internal included) ──

create policy "sp members read internal projects"
  on public.sp_projects
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sp_memberships
      where profile_id = (select auth.uid())
        and status = 'active'
    )
  );

-- ── Realtime for workspace tables ──

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'sp_tasks'
  ) then
    alter publication supabase_realtime add table public.sp_tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'sp_notifications'
  ) then
    alter publication supabase_realtime add table public.sp_notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'sp_meetings'
  ) then
    alter publication supabase_realtime add table public.sp_meetings;
  end if;
end
$$;

commit;
