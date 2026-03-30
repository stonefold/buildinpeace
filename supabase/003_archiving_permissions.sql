alter table public.projects
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.tasks
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.documents
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.plans
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.project_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.project_invitations
  add column if not exists responded_by uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_archived_at on public.projects (archived_at);
create index if not exists idx_tasks_archived_at on public.tasks (archived_at);
create index if not exists idx_documents_archived_at on public.documents (archived_at);
create index if not exists idx_plans_archived_at on public.plans (archived_at);
create index if not exists idx_project_members_permissions_gin on public.project_members using gin (permissions);
create index if not exists idx_project_invitations_email_lower on public.project_invitations ((lower(email)));

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_user_in_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
  )
  or exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.created_by = auth.uid()
  );
$$;

create or replace function public.current_user_in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plans p
    where p.id = target_plan_id
      and public.current_user_can_manage_project(p.project_id)
  );
$$;

create or replace function public.respond_to_project_invitation(invitation_id uuid, decision text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.project_invitations;
  target_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non connecte';
  end if;

  if decision not in ('accepted', 'refused') then
    raise exception 'Decision invalide';
  end if;

  select *
  into invitation_record
  from public.project_invitations pi
  where pi.id = invitation_id
    and lower(pi.email) = public.current_user_email()
    and pi.status = 'pending'
  limit 1;

  if invitation_record.id is null then
    raise exception 'Invitation introuvable';
  end if;

  select *
  into target_project
  from public.projects p
  where p.id = invitation_record.project_id;

  if target_project.id is null then
    raise exception 'Chantier introuvable';
  end if;

  update public.project_invitations
  set status = decision,
      responded_at = now(),
      responded_by = auth.uid()
  where id = invitation_record.id;

  if decision = 'accepted' then
    insert into public.organization_members (organization_id, user_id, role, status)
    values (target_project.organization_id, auth.uid(), 'member', 'active')
    on conflict (organization_id, user_id) do update
    set status = 'active';

    update public.project_members
    set user_id = auth.uid(),
        status = 'active',
        updated_at = now()
    where project_id = invitation_record.project_id
      and lower(email) = public.current_user_email();

    insert into public.conversation_members (conversation_id, user_id)
    select c.id, auth.uid()
    from public.conversations c
    where c.project_id = invitation_record.project_id
      and c.conversation_type = 'project_general'
    on conflict (conversation_id, user_id) do nothing;
  else
    update public.project_members
    set status = 'revoked',
        updated_at = now()
    where project_id = invitation_record.project_id
      and lower(email) = public.current_user_email();
  end if;

  return invitation_record.project_id;
end;
$$;

drop policy if exists "project members read projects" on public.projects;
create policy "project members read projects" on public.projects for select
using (
  public.current_user_in_project(id)
  or public.current_user_can_manage_org(organization_id)
  or created_by = auth.uid()
  or exists (
    select 1
    from public.project_invitations pi
    where pi.project_id = id
      and lower(pi.email) = public.current_user_email()
      and pi.status in ('pending', 'accepted')
  )
);

drop policy if exists "project managers manage members" on public.project_members;
create policy "project managers manage members" on public.project_members for all
using (
  public.current_user_can_manage_project(project_id)
  or exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.created_by = auth.uid()
  )
)
with check (
  public.current_user_can_manage_project(project_id)
  or exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.created_by = auth.uid()
  )
);

drop policy if exists "project managers manage invitations" on public.project_invitations;
create policy "project managers manage invitations" on public.project_invitations for all
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

drop policy if exists "invitees read own invitations" on public.project_invitations;
create policy "invitees read own invitations" on public.project_invitations for select
using (lower(email) = public.current_user_email());
