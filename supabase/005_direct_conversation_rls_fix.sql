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
