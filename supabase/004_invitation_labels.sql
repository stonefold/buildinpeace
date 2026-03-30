alter table public.project_invitations
  add column if not exists project_name text;

update public.project_invitations pi
set project_name = p.name
from public.projects p
where p.id = pi.project_id
  and (pi.project_name is null or pi.project_name = '');
