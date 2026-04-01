alter table public.activity_events
  alter column project_id drop not null;

alter table public.activity_events
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists event_key text,
  add column if not exists entity_type text,
  add column if not exists entity_id text;

update public.activity_events ae
set organization_id = p.organization_id
from public.projects p
where ae.project_id = p.id
  and ae.organization_id is null;

update public.activity_events
set event_key = coalesce(event_key, 'workspace.activity'),
    entity_type = coalesce(entity_type, 'workspace')
where event_key is null
   or entity_type is null;

alter table public.notifications
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists event_key text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz;

update public.notifications
set read_at = coalesce(read_at, created_at)
where is_read = true
  and read_at is null;

update public.notifications
set event_key = coalesce(event_key, 'workspace.notification'),
    entity_type = coalesce(entity_type, 'workspace')
where event_key is null
   or entity_type is null;

create index if not exists idx_activity_org on public.activity_events(organization_id, created_at desc);
create index if not exists idx_activity_event_key on public.activity_events(event_key, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_project on public.notifications(project_id, created_at desc);

drop policy if exists "project members read activity" on public.activity_events;
create policy "project and organization members read activity" on public.activity_events for select
using (
  actor_id = auth.uid()
  or (project_id is not null and public.current_user_in_project(project_id))
  or (project_id is null and organization_id is not null and public.current_user_in_org(organization_id))
);

drop policy if exists "project collaborators write activity" on public.activity_events;
create policy "workspace members write activity" on public.activity_events for insert
with check (
  actor_id = auth.uid()
  and (
    (project_id is not null and public.current_user_in_project(project_id))
    or (project_id is null and organization_id is not null and public.current_user_in_org(organization_id))
    or (project_id is null and organization_id is null and actor_id = auth.uid())
  )
);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select
using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "workspace actors create notifications" on public.notifications;
create policy "workspace actors create notifications" on public.notifications for insert
with check (
  actor_id = auth.uid()
  and (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.current_user_in_org(organization_id)
      and exists (
        select 1
        from public.organization_members om
        where om.organization_id = notifications.organization_id
          and om.user_id = notifications.user_id
          and om.status = 'active'
      )
      and (
        project_id is null
        or (
          public.current_user_in_project(project_id)
          and exists (
            select 1
            from public.project_members pm
            where pm.project_id = notifications.project_id
              and pm.user_id = notifications.user_id
              and pm.status = 'active'
          )
        )
      )
    )
  )
);
