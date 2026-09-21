begin;

-- Phase 2 moves from an organisation-wide workspace to project-scoped work.
-- The helper functions centralise the checks used by RLS policies. They are
-- intentionally not exposed through the Data API and only return access
-- decisions for the currently authenticated user.
create schema if not exists sp_private;
revoke all on schema sp_private from public, anon, authenticated;
grant usage on schema sp_private to authenticated;

create or replace function sp_private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_memberships
    where profile_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function sp_private.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_memberships
    where profile_id = (select auth.uid())
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

create or replace function sp_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_memberships
    where profile_id = (select auth.uid())
      and status = 'active'
      and role = 'owner'
  );
$$;

create or replace function sp_private.can_create_projects()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_memberships
    where profile_id = (select auth.uid())
      and status = 'active'
      and role in ('owner', 'admin', 'editor', 'project_lead')
  );
$$;

create or replace function sp_private.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select sp_private.is_active_member()
    and exists (
      select 1
      from public.sp_projects project
      where project.id = target_project_id
        and (
          project.visibility <> 'private'
          or project.owner_id = (select auth.uid())
          or sp_private.is_org_admin()
          or exists (
            select 1
            from public.sp_project_members project_member
            where project_member.project_id = project.id
              and project_member.profile_id = (select auth.uid())
          )
        )
    );
$$;

create or replace function sp_private.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select sp_private.is_active_member()
    and exists (
      select 1
      from public.sp_projects project
      where project.id = target_project_id
        and (
          project.owner_id = (select auth.uid())
          or sp_private.is_org_admin()
          or exists (
            select 1
            from public.sp_project_members project_member
            where project_member.project_id = project.id
              and project_member.profile_id = (select auth.uid())
              and project_member.role = 'lead'
          )
        )
    );
$$;

create or replace function sp_private.can_participate_in_project(
  target_project_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sp_projects project
    where project.id = target_project_id
      and (
        project.visibility <> 'private'
        or project.owner_id = target_profile_id
        or exists (
          select 1
          from public.sp_project_members project_member
          where project_member.project_id = project.id
            and project_member.profile_id = target_profile_id
        )
      )
  );
$$;

create or replace function sp_private.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sp_tasks task
    where task.id = target_task_id
      and (
        task.project_id is null
        and sp_private.is_active_member()
        or task.project_id is not null
        and sp_private.can_access_project(task.project_id)
      )
  );
$$;

create or replace function sp_private.can_modify_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_tasks task
    where task.id = target_task_id
      and sp_private.is_active_member()
      and (
        task.created_by = (select auth.uid())
        or task.assignee_id = (select auth.uid())
        or (task.project_id is not null and sp_private.can_manage_project(task.project_id))
        or sp_private.is_org_admin()
      )
  );
$$;

create or replace function sp_private.can_access_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sp_meetings meeting
    where meeting.id = target_meeting_id
      and (
        meeting.project_id is null
        and sp_private.is_active_member()
        or meeting.project_id is not null
        and sp_private.can_access_project(meeting.project_id)
      )
  );
$$;

create or replace function sp_private.can_manage_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sp_meetings meeting
    where meeting.id = target_meeting_id
      and sp_private.is_active_member()
      and (
        meeting.created_by = (select auth.uid())
        or (meeting.project_id is not null and sp_private.can_manage_project(meeting.project_id))
        or sp_private.is_org_admin()
      )
  );
$$;

revoke all on all functions in schema sp_private from public, anon;
grant execute on all functions in schema sp_private to authenticated;

-- Auth users are provisioned only from a live invitation. Role assignment is
-- read from the invitation record, never from browser-controlled user metadata.
create or replace function sp_private.provision_invited_member()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  matching_invitation public.sp_invitations%rowtype;
  requested_name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  profile_name text;
begin
  select *
  into matching_invitation
  from public.sp_invitations
  where lower(email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'An active Secret Pioneers invitation is required';
  end if;

  profile_name := case
    when char_length(requested_name) between 2 and 120 then requested_name
    else 'Nytt medlem'
  end;

  insert into public.sp_profiles (id, display_name)
  values (new.id, profile_name);

  insert into public.sp_memberships (profile_id, role, status)
  values (new.id, matching_invitation.role, 'active');

  update public.sp_invitations
  set status = 'accepted'
  where id = matching_invitation.id;

  return new;
end;
$$;

revoke all on function sp_private.provision_invited_member() from public, anon, authenticated;

drop trigger if exists sp_provision_invited_member on auth.users;
create trigger sp_provision_invited_member
  after insert on auth.users
  for each row execute function sp_private.provision_invited_member();

-- Keep private project data scoped to its owner, assigned members and
-- organisation administrators. Internal projects remain readable to members.
drop policy if exists "sp studio members read projects" on public.sp_projects;
drop policy if exists "sp members read internal projects" on public.sp_projects;
drop policy if exists "sp editors create own projects" on public.sp_projects;
drop policy if exists "sp editors update own projects" on public.sp_projects;

create policy "sp members access permitted projects"
  on public.sp_projects for select to authenticated
  using (sp_private.can_access_project(id));

create policy "sp qualified members create projects"
  on public.sp_projects for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and sp_private.can_create_projects()
  );

create policy "sp project managers update projects"
  on public.sp_projects for update to authenticated
  using (sp_private.can_manage_project(id))
  with check (
    (owner_id = (select auth.uid()) or sp_private.is_org_admin())
    and sp_private.is_active_member()
  );

drop policy if exists "sp active members read project members" on public.sp_project_members;
drop policy if exists "sp admins and leads manage project members" on public.sp_project_members;

create policy "sp permitted members read project members"
  on public.sp_project_members for select to authenticated
  using (sp_private.can_access_project(project_id));

create policy "sp project managers add project members"
  on public.sp_project_members for insert to authenticated
  with check (sp_private.can_manage_project(project_id));

create policy "sp project managers update project members"
  on public.sp_project_members for update to authenticated
  using (sp_private.can_manage_project(project_id))
  with check (sp_private.can_manage_project(project_id));

create policy "sp project managers remove project members"
  on public.sp_project_members for delete to authenticated
  using (sp_private.can_manage_project(project_id));

drop policy if exists "sp active members read tasks" on public.sp_tasks;
drop policy if exists "sp active members create tasks" on public.sp_tasks;
drop policy if exists "sp active members update tasks" on public.sp_tasks;

create policy "sp permitted members read tasks"
  on public.sp_tasks for select to authenticated
  using (sp_private.can_access_task(id));

create policy "sp project managers create tasks"
  on public.sp_tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and sp_private.is_active_member()
    and (project_id is null or sp_private.can_manage_project(project_id))
  );

create policy "sp task owners update tasks"
  on public.sp_tasks for update to authenticated
  using (sp_private.can_modify_task(id))
  with check (
    sp_private.is_active_member()
    and (project_id is null or sp_private.can_access_project(project_id))
  );

drop policy if exists "sp active members read meetings" on public.sp_meetings;
drop policy if exists "sp active members create meetings" on public.sp_meetings;
drop policy if exists "sp active members update meetings" on public.sp_meetings;

create policy "sp permitted members read meetings"
  on public.sp_meetings for select to authenticated
  using (sp_private.can_access_meeting(id));

create policy "sp project managers create meetings"
  on public.sp_meetings for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and sp_private.is_active_member()
    and (project_id is null or sp_private.can_manage_project(project_id))
  );

create policy "sp meeting managers update meetings"
  on public.sp_meetings for update to authenticated
  using (sp_private.can_manage_meeting(id))
  with check (
    sp_private.is_active_member()
    and (project_id is null or sp_private.can_manage_project(project_id))
  );

drop policy if exists "sp active members read minutes" on public.sp_meeting_minutes;
drop policy if exists "sp active members create minutes" on public.sp_meeting_minutes;
drop policy if exists "sp active members update minutes" on public.sp_meeting_minutes;

create policy "sp permitted members read minutes"
  on public.sp_meeting_minutes for select to authenticated
  using (sp_private.can_access_meeting(meeting_id));

create policy "sp meeting managers create minutes"
  on public.sp_meeting_minutes for insert to authenticated
  with check (
    recorded_by = (select auth.uid())
    and sp_private.can_manage_meeting(meeting_id)
  );

create policy "sp meeting managers update minutes"
  on public.sp_meeting_minutes for update to authenticated
  using (sp_private.can_manage_meeting(meeting_id))
  with check (sp_private.can_manage_meeting(meeting_id));

drop policy if exists "sp active members read decisions" on public.sp_decisions;
drop policy if exists "sp admins manage decisions" on public.sp_decisions;

create policy "sp permitted members read decisions"
  on public.sp_decisions for select to authenticated
  using (meeting_id is not null and sp_private.can_access_meeting(meeting_id));

create policy "sp meeting managers create decisions"
  on public.sp_decisions for insert to authenticated
  with check (meeting_id is not null and sp_private.can_manage_meeting(meeting_id));

create policy "sp meeting managers update decisions"
  on public.sp_decisions for update to authenticated
  using (meeting_id is not null and sp_private.can_manage_meeting(meeting_id))
  with check (meeting_id is not null and sp_private.can_manage_meeting(meeting_id));

-- Active members can use the directory, while only organisation admins may
-- modify organisation-wide roles and statuses.
drop policy if exists "sp members read own profile" on public.sp_profiles;
drop policy if exists "sp active members read all profiles" on public.sp_profiles;
drop policy if exists "sp members read own membership" on public.sp_memberships;
drop policy if exists "sp active members read all memberships" on public.sp_memberships;

grant update on table public.sp_memberships to authenticated;

create policy "sp active members read profiles"
  on public.sp_profiles for select to authenticated
  using (sp_private.is_active_member());

create policy "sp active members read memberships"
  on public.sp_memberships for select to authenticated
  using (sp_private.is_active_member());

create policy "sp organisation admins update memberships"
  on public.sp_memberships for update to authenticated
  using (
    (
      sp_private.is_owner()
      and (profile_id <> (select auth.uid()) or (role = 'owner' and status = 'active'))
    )
    or (
      sp_private.is_org_admin()
      and role <> 'owner'
      and profile_id <> (select auth.uid())
    )
  )
  with check (
    (
      sp_private.is_owner()
      and (profile_id <> (select auth.uid()) or (role = 'owner' and status = 'active'))
    )
    or (
      sp_private.is_org_admin()
      and role <> 'owner'
      and profile_id <> (select auth.uid())
    )
  );

-- Notifications are written by database triggers, not arbitrary clients.
drop policy if exists "sp active members create notifications" on public.sp_notifications;
revoke insert on table public.sp_notifications from authenticated;

create or replace function sp_private.validate_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_visibility text;
begin
  if new.project_id is not null and new.assignee_id is not null then
    select visibility into project_visibility
    from public.sp_projects
    where id = new.project_id;

    if project_visibility = 'private'
      and not sp_private.can_participate_in_project(new.project_id, new.assignee_id) then
      raise exception 'Private project tasks can only be assigned to project participants';
    end if;
  end if;
  return new;
end;
$$;

create or replace function sp_private.notify_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is not null
    and new.assignee_id <> new.created_by
    and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.sp_notifications (recipient_id, type, title, body, link)
    values (
      new.assignee_id,
      'task',
      'Ny oppgave: ' || new.title,
      coalesce(new.description, 'Du har fått tildelt en oppgave.'),
      '/studio/oppgaver'
    );
  end if;
  return new;
end;
$$;

revoke all on function sp_private.validate_task_assignee() from public, anon, authenticated;
revoke all on function sp_private.notify_task_assignee() from public, anon, authenticated;

drop trigger if exists sp_validate_task_assignee on public.sp_tasks;
create trigger sp_validate_task_assignee
  before insert or update of project_id, assignee_id on public.sp_tasks
  for each row execute function sp_private.validate_task_assignee();

drop trigger if exists sp_notify_task_assignee on public.sp_tasks;
create trigger sp_notify_task_assignee
  after insert or update of assignee_id on public.sp_tasks
  for each row execute function sp_private.notify_task_assignee();

-- Private project documents are kept outside the public media bucket and are
-- accessible only through the same project policy as the rest of the workspace.
create table if not exists public.sp_project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sp_projects (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  uploaded_by uuid not null references public.sp_profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists sp_project_documents_project_index
  on public.sp_project_documents (project_id, created_at desc);

alter table public.sp_project_documents enable row level security;
revoke all on table public.sp_project_documents from anon, authenticated;
grant select, insert, delete on table public.sp_project_documents to authenticated;

create policy "sp permitted members read project documents"
  on public.sp_project_documents for select to authenticated
  using (sp_private.can_access_project(project_id));

create policy "sp permitted members upload project documents"
  on public.sp_project_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and sp_private.can_access_project(project_id)
  );

create policy "sp uploaders and managers delete project documents"
  on public.sp_project_documents for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or sp_private.can_manage_project(project_id)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sp-project-documents',
  'sp-project-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sp project members read documents" on storage.objects;
drop policy if exists "sp project members upload documents" on storage.objects;
drop policy if exists "sp uploaders and managers update documents" on storage.objects;
drop policy if exists "sp uploaders and managers delete documents" on storage.objects;

create policy "sp project members read documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sp-project-documents'
    and exists (
      select 1
      from public.sp_projects project
      where project.id::text = (storage.foldername(name))[1]
        and sp_private.can_access_project(project.id)
    )
  );

create policy "sp project members upload documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sp-project-documents'
    and owner_id = (select auth.uid())
    and exists (
      select 1
      from public.sp_projects project
      where project.id::text = (storage.foldername(name))[1]
        and sp_private.can_access_project(project.id)
    )
  );

create policy "sp uploaders and managers update documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'sp-project-documents'
    and (
      owner_id = (select auth.uid())
      or exists (
        select 1
        from public.sp_projects project
        where project.id::text = (storage.foldername(name))[1]
          and sp_private.can_manage_project(project.id)
      )
    )
  )
  with check (bucket_id = 'sp-project-documents');

create policy "sp uploaders and managers delete documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sp-project-documents'
    and (
      owner_id = (select auth.uid())
      or exists (
        select 1
        from public.sp_projects project
        where project.id::text = (storage.foldername(name))[1]
          and sp_private.can_manage_project(project.id)
      )
    )
  );

commit;
