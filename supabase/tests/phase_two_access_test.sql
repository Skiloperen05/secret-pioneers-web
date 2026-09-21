begin;

select plan(7);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'sp_project_documents'
  ),
  'project documents table exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.sp_project_documents'::regclass),
  'project documents enforce RLS'
);

select ok(
  not has_table_privilege('anon', 'public.sp_project_documents', 'select,insert,update,delete'),
  'anonymous users have no project-document privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.sp_project_documents', 'select,insert,delete'),
  'authenticated users have only the document privileges required by the client'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sp_projects'
      and policyname = 'sp members access permitted projects'
  ),
  'projects use the project-scoped access policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sp project members read documents'
  ),
  'storage uses the project-document read policy'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'sp_provision_invited_member'
      and tgrelid = 'auth.users'::regclass
  ),
  'new auth users are provisioned through invitations'
);

select * from finish();
rollback;
