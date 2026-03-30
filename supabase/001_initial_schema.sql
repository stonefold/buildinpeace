create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('draft', 'studies', 'execution', 'paused', 'done', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'participant_role') then
    create type public.participant_role as enum (
      'gestionnaire',
      'entrepreneur',
      'architecte',
      'ouvrier',
      'client',
      'sous_traitant'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'review', 'done', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'friendship_status') then
    create type public.friendship_status as enum ('pending', 'accepted', 'declined', 'blocked');
  end if;

  if not exists (select 1 from pg_type where typname = 'document_scope') then
    create type public.document_scope as enum ('administratif', 'chantier', 'personnel');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_scope') then
    create type public.message_scope as enum ('direct', 'project');
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

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  phone text,
  company_name text,
  city text,
  occupation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  biography text,
  website text,
  vat_number text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  country_code text,
  iban text,
  bic text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  client_name text not null,
  site_city text,
  site_address text,
  description text,
  status public.project_status not null default 'draft',
  progress integer not null default 0 check (progress between 0 and 100),
  budget_amount numeric(14,2),
  currency_code text not null default 'EUR',
  owner_user_id uuid references public.users(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  full_name text not null,
  role public.participant_role not null,
  company_name text,
  invite_status text not null default 'active',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, email)
);

create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  owner_user_id uuid references public.users(id) on delete cascade,
  name text not null,
  scope text not null check (scope in ('project', 'personal')),
  created_at timestamptz not null default now(),
  check (
    (scope = 'project' and project_id is not null and owner_user_id is null)
    or (scope = 'personal' and owner_user_id is not null and project_id is null)
  )
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references public.task_lists(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  section_id uuid references public.project_sections(id) on delete set null,
  title text not null,
  description text,
  room_label text,
  intervention_type text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  cost_amount numeric(12,2),
  photo_url text,
  created_by_user_id uuid references public.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (task_id, email)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.users(id) on delete cascade,
  addressee_user_id uuid not null references public.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, addressee_user_id),
  check (requester_user_id <> addressee_user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  scope public.message_scope not null,
  project_id uuid references public.projects(id) on delete cascade,
  name text,
  is_general boolean not null default false,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (scope = 'project' and project_id is not null)
    or (scope = 'direct' and project_id is null)
  )
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  sender_name text,
  body text,
  attachment_name text,
  attachment_url text,
  attachment_mime text,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_url is not null)
);

create table if not exists public.storage_assets (
  id uuid primary key default gen_random_uuid(),
  scope public.document_scope not null,
  owner_user_id uuid references public.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  bucket_name text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.user_directories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  parent_directory_id uuid references public.user_directories(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  scope public.document_scope not null,
  project_id uuid references public.projects(id) on delete cascade,
  directory_id uuid references public.user_directories(id) on delete cascade,
  asset_id uuid references public.storage_assets(id) on delete set null,
  category text,
  subcategory text,
  document_type text,
  title text not null,
  version_label text,
  status text,
  document_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  asset_id uuid references public.storage_assets(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  version_number integer not null,
  asset_id uuid references public.storage_assets(id) on delete set null,
  annotations jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, version_number)
);

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_name text,
  event_type text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.legacy_current_user_owns_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.owner_user_id = auth.uid()
  );
$$;

create or replace function public.legacy_current_user_in_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.legacy_current_user_owns_project(target_project_id)
  or exists (
    select 1
    from public.project_participants pp
    where pp.project_id = target_project_id
      and pp.user_id = auth.uid()
  );
$$;

create or replace function public.legacy_current_user_owns_task_list(target_task_list_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.task_lists tl
    where tl.id = target_task_list_id
      and tl.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.task_lists tl
    join public.projects p on p.id = tl.project_id
    where tl.id = target_task_list_id
      and p.owner_user_id = auth.uid()
  );
$$;

create or replace function public.legacy_current_user_in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

create index if not exists idx_project_participants_project_id on public.project_participants(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_task_list_id on public.tasks(task_list_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_documents_project_id on public.documents(project_id);
create index if not exists idx_plans_project_id on public.plans(project_id);
create index if not exists idx_project_activity_project_id on public.project_activity(project_id);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_project_participants_updated_at on public.project_participants;
create trigger trg_project_participants_updated_at before update on public.project_participants
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at before update on public.friendships
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at before update on public.plans
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_participants enable row level security;
alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.project_activity enable row level security;

create policy "users can view their own user row"
on public.users for select
using (auth.uid() = id);

create policy "users can update their own user row"
on public.users for update
using (auth.uid() = id);

create policy "profiles owned by current user"
on public.profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "project members can read projects"
on public.projects for select
using (
  public.legacy_current_user_in_project(id)
);

create policy "project owners can write projects"
on public.projects for all
using (public.legacy_current_user_owns_project(id))
with check (public.legacy_current_user_owns_project(id));

create policy "project members can read participants"
on public.project_participants for select
using (public.legacy_current_user_in_project(project_id));

create policy "project owners can manage participants"
on public.project_participants for all
using (public.legacy_current_user_owns_project(project_id))
with check (public.legacy_current_user_owns_project(project_id));

create policy "task readers are project members or owners"
on public.tasks for select
using (
  created_by_user_id = auth.uid()
  or public.legacy_current_user_in_project(project_id)
  or public.legacy_current_user_owns_task_list(task_list_id)
);

create policy "task writers own the task list or project"
on public.tasks for all
using (public.legacy_current_user_owns_task_list(task_list_id))
with check (public.legacy_current_user_owns_task_list(task_list_id));

create policy "friendship participants can view"
on public.friendships for select
using (requester_user_id = auth.uid() or addressee_user_id = auth.uid());

create policy "friendship requester can insert"
on public.friendships for insert
with check (requester_user_id = auth.uid());

create policy "conversation participants can read"
on public.conversations for select
using (public.legacy_current_user_in_conversation(id));

create policy "conversation participants can read messages"
on public.messages for select
using (public.legacy_current_user_in_conversation(conversation_id));

create policy "conversation participants can insert messages"
on public.messages for insert
with check (
  sender_user_id = auth.uid()
  and public.legacy_current_user_in_conversation(conversation_id)
);

create policy "project members can read documents"
on public.documents for select
using (
  created_by_user_id = auth.uid()
  or public.legacy_current_user_in_project(project_id)
);

create policy "project members can read plans"
on public.plans for select
using (public.legacy_current_user_in_project(project_id));

insert into public.projects (
  id,
  slug,
  name,
  client_name,
  site_city,
  description,
  status,
  progress,
  budget_amount,
  owner_user_id,
  start_date,
  end_date
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'villa-horizon',
    'Villa Horizon',
    'Famille Meunier',
    'Uccle',
    'Maison unifamiliale avec renovation lourde et suivi chantier complet.',
    'execution',
    68,
    428000.00,
    null,
    date '2026-03-12',
    date '2026-09-30'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'residence-alto',
    'Residence Alto',
    'Promalto',
    'Namur',
    'Operation de logements collectifs en phase etudes.',
    'studies',
    31,
    1120000.00,
    null,
    date '2026-02-05',
    date '2027-01-15'
  )
on conflict (id) do nothing;

insert into public.project_sections (project_id, name, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'Technique', 1),
  ('11111111-1111-1111-1111-111111111111', 'Menuiserie', 2),
  ('11111111-1111-1111-1111-111111111111', 'Sanitaire', 3),
  ('22222222-2222-2222-2222-222222222222', 'Appel d offres', 1)
on conflict do nothing;
