create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'review', 'done', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'organization_role') then
    create type public.organization_role as enum ('owner', 'admin', 'manager', 'member', 'guest');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('invited', 'active', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type public.project_role as enum ('project_manager', 'contractor', 'architect', 'worker', 'client', 'subcontractor');
  end if;

  if not exists (select 1 from pg_type where typname = 'conversation_type') then
    create type public.conversation_type as enum ('project_general', 'direct', 'group');
  end if;

  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type public.document_kind as enum ('Offres', 'Factures', 'Contrats', 'Assurances', 'Avancement', 'Document');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists id uuid,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists company_name text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists avatar_url text,
  add column if not exists avatar_storage_path text,
  add column if not exists availability_status text default 'En ligne',
  add column if not exists summary text,
  add column if not exists specialty text,
  add column if not exists availability_label text,
  add column if not exists service_area text;

update public.profiles
set id = user_id
where id is null and user_id is not null;

alter table public.profiles
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null unique,
  name text not null,
  client_name text,
  site_label text,
  site_city text,
  status text not null default 'draft',
  progress integer not null default 0 check (progress between 0 and 100),
  budget_amount numeric(14,2),
  currency_code text not null default 'EUR',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text,
  email text not null,
  company_name text,
  role public.project_role not null default 'contractor',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, email)
);

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role public.project_role not null,
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  section_id uuid references public.project_sections(id) on delete set null,
  title text not null,
  description text,
  intervention_type text,
  source_label text,
  due_date date,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_kind public.document_kind not null default 'Document',
  title text not null,
  category text,
  subcategory text,
  version_label text,
  status text,
  document_date date,
  file_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  version_number integer not null,
  annotations jsonb not null default '[]'::jsonb,
  rendered_image_url text,
  file_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, version_number)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  conversation_type public.conversation_type not null,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text,
  body text,
  attachment_storage_path text,
  attachment_file_name text,
  attachment_mime_type text,
  attachment_file_size bigint,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_storage_path is not null)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  tone text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_in_org(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.current_user_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin')
  );
$$;

create or replace function public.current_user_can_manage_org(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'manager')
  );
$$;

create or replace function public.current_user_in_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  );
$$;

create or replace function public.current_user_can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
      and pm.role in ('project_manager', 'architect', 'contractor')
  )
  or exists (
    select 1
    from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = target_project_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'manager')
  );
$$;

create or replace function public.current_user_in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.current_user_can_manage_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.project_id is not null
      and public.current_user_can_manage_project(c.project_id)
  )
  or exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.project_id is null
      and c.created_by = auth.uid()
      and public.current_user_in_org(c.organization_id)
  )
  or public.current_user_in_conversation(target_conversation_id);
$$;

create or replace function public.current_user_can_read_task(target_task_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and (
        (t.project_id is null and t.created_by = auth.uid())
        or (t.project_id is not null and public.current_user_in_project(t.project_id))
      )
  );
$$;

create or replace function public.current_user_can_manage_task(target_task_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and (
        (t.project_id is null and t.created_by = auth.uid())
        or (t.project_id is not null and public.current_user_can_manage_project(t.project_id))
      )
  );
$$;

create or replace function public.current_user_can_read_plan(target_plan_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.plans p
    where p.id = target_plan_id
      and public.current_user_in_project(p.project_id)
  );
$$;

create or replace function public.current_user_can_manage_plan(target_plan_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.plans p
    where p.id = target_plan_id
      and public.current_user_can_manage_project(p.project_id)
  );
$$;

create index if not exists idx_projects_org on public.projects(organization_id);
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_org on public.tasks(organization_id);
create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_conversations_project on public.conversations(project_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_activity_project on public.activity_events(project_id, created_at desc);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists trg_organization_members_updated_at on public.organization_members;
create trigger trg_organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
drop trigger if exists trg_projects_updated_at_v2 on public.projects;
create trigger trg_projects_updated_at_v2 before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists trg_project_members_updated_at on public.project_members;
create trigger trg_project_members_updated_at before update on public.project_members for each row execute function public.set_updated_at();
drop trigger if exists trg_tasks_updated_at_v2 on public.tasks;
create trigger trg_tasks_updated_at_v2 before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists trg_documents_updated_at_v2 on public.documents;
create trigger trg_documents_updated_at_v2 before update on public.documents for each row execute function public.set_updated_at();
drop trigger if exists trg_plans_updated_at_v2 on public.plans;
create trigger trg_plans_updated_at_v2 before update on public.plans for each row execute function public.set_updated_at();
drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

create or replace function public.bootstrap_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user auth.users;
  org_id uuid;
begin
  select * into auth_user from auth.users where id = auth.uid();
  if auth_user.id is null then
    return;
  end if;

  insert into public.profiles (id, user_id, display_name, email)
  values (auth_user.id, auth_user.id, coalesce(auth_user.raw_user_meta_data ->> 'full_name', auth_user.email), auth_user.email)
  on conflict (user_id) do update
  set id = excluded.id,
      email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);

  select om.organization_id into org_id
  from public.organization_members om
  where om.user_id = auth.uid()
  order by om.created_at
  limit 1;

  if org_id is null then
    insert into public.organizations (name, slug, created_by)
    values ('Buildinpeace Workspace', 'workspace-' || substr(auth.uid()::text, 1, 8), auth.uid())
    returning id into org_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (org_id, auth.uid(), 'owner', 'active');
  end if;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_sections enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.documents enable row level security;
alter table public.plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;

create policy "profiles self read write" on public.profiles for all
using (id = auth.uid() or user_id = auth.uid())
with check (id = auth.uid() or user_id = auth.uid());

create policy "organization members can read orgs" on public.organizations for select
using (public.current_user_in_org(id));
create policy "organization owners admin manage orgs" on public.organizations for update
using (public.current_user_is_org_admin(id));

create policy "organization members visible in same org" on public.organization_members for select
using (public.current_user_in_org(organization_id));
create policy "organization owners manage members" on public.organization_members for all
using (public.current_user_is_org_admin(organization_id))
with check (public.current_user_is_org_admin(organization_id));

create policy "project members read projects" on public.projects for select
using (public.current_user_in_project(id));
create policy "org managers create projects" on public.projects for insert
with check (public.current_user_can_manage_org(organization_id));
create policy "project managers update projects" on public.projects for update
using (public.current_user_can_manage_project(id))
with check (public.current_user_can_manage_project(id));

create policy "project members visible to members" on public.project_members for select
using (public.current_user_in_project(project_id));
create policy "project managers manage members" on public.project_members for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

create policy "project managers manage invitations" on public.project_invitations for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

create policy "project members read sections" on public.project_sections for select
using (public.current_user_in_project(project_id));
create policy "project managers manage sections" on public.project_sections for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

create policy "tasks visible inside tenant/project" on public.tasks for select
using (
  public.current_user_in_org(organization_id)
  and (
    project_id is null and created_by = auth.uid()
    or project_id is not null and public.current_user_in_project(project_id)
  )
);
create policy "tasks insert in org" on public.tasks for insert
with check (
  public.current_user_in_org(organization_id)
  and (
    project_id is null and created_by = auth.uid()
    or project_id is not null and public.current_user_can_manage_project(project_id)
  )
);
create policy "tasks update delete in scope" on public.tasks for update
using ((project_id is null and created_by = auth.uid()) or (project_id is not null and public.current_user_can_manage_project(project_id)))
with check ((project_id is null and created_by = auth.uid()) or (project_id is not null and public.current_user_can_manage_project(project_id)));
create policy "tasks delete in scope" on public.tasks for delete
using ((project_id is null and created_by = auth.uid()) or (project_id is not null and public.current_user_can_manage_project(project_id)));

create policy "task assignees visible with task" on public.task_assignees for select
using (public.current_user_can_read_task(task_id));
create policy "task assignees managed with task" on public.task_assignees for all
using (public.current_user_can_manage_task(task_id))
with check (public.current_user_can_manage_task(task_id));

create policy "project members read documents" on public.documents for select
using (public.current_user_in_project(project_id));
create policy "project collaborators manage documents" on public.documents for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

create policy "project members read plans" on public.plans for select
using (public.current_user_in_project(project_id));
create policy "project collaborators manage plans" on public.plans for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));
create policy "plan versions visible with plan" on public.plan_versions for select
using (public.current_user_can_read_plan(plan_id));
create policy "plan versions managed with plan" on public.plan_versions for all
using (public.current_user_can_manage_plan(plan_id))
with check (public.current_user_can_manage_plan(plan_id));

create policy "members read conversations" on public.conversations for select
using (public.current_user_in_org(organization_id) and (project_id is null or public.current_user_in_project(project_id)));
create policy "members create conversations" on public.conversations for insert
with check (public.current_user_in_org(organization_id) and (project_id is null or public.current_user_in_project(project_id)));

create policy "members read conversation members" on public.conversation_members for select
using (public.current_user_in_conversation(conversation_id));
create policy "participants manage conversation members" on public.conversation_members for all
using (user_id = auth.uid() or public.current_user_can_manage_conversation(conversation_id))
with check (user_id = auth.uid() or public.current_user_can_manage_conversation(conversation_id));

create policy "conversation members read messages" on public.messages for select
using (public.current_user_in_conversation(conversation_id));
create policy "conversation members send messages" on public.messages for insert
with check (sender_id = auth.uid() and public.current_user_in_conversation(conversation_id));

create policy "project members read activity" on public.activity_events for select
using (public.current_user_in_project(project_id));
create policy "project collaborators write activity" on public.activity_events for insert
with check (public.current_user_in_project(project_id));

create policy "users read own notifications" on public.notifications for select
using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('workspace-assets', 'workspace-assets', false)
on conflict (id) do nothing;

create policy "workspace assets read" on storage.objects for select
using (bucket_id = 'workspace-assets' and auth.role() = 'authenticated');
create policy "workspace assets write" on storage.objects for insert
with check (bucket_id = 'workspace-assets' and auth.role() = 'authenticated');
create policy "workspace assets update" on storage.objects for update
using (bucket_id = 'workspace-assets' and auth.role() = 'authenticated')
with check (bucket_id = 'workspace-assets' and auth.role() = 'authenticated');
