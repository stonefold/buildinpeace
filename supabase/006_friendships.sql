do $$
begin
  if not exists (select 1 from pg_type where typname = 'friendship_status') then
    create type public.friendship_status as enum ('pending', 'accepted', 'refused', 'blocked');
  end if;
end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  addressee_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text,
  requester_email text,
  requester_trade text,
  status public.friendship_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, addressee_user_id),
  check (requester_user_id <> addressee_user_id)
);

create index if not exists idx_friendships_requester on public.friendships(requester_user_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_user_id);

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
before update on public.friendships
for each row
execute function public.set_updated_at();

alter table public.friendships enable row level security;

drop policy if exists "participants read friendships" on public.friendships;
create policy "participants read friendships"
on public.friendships for select
using (requester_user_id = auth.uid() or addressee_user_id = auth.uid());

drop policy if exists "requester inserts friendships" on public.friendships;
create policy "requester inserts friendships"
on public.friendships for insert
with check (requester_user_id = auth.uid());

drop policy if exists "requester updates own friendships" on public.friendships;
create policy "requester updates own friendships"
on public.friendships for update
using (requester_user_id = auth.uid())
with check (requester_user_id = auth.uid());

drop policy if exists "addressee responds to friendships" on public.friendships;
create policy "addressee responds to friendships"
on public.friendships for update
using (addressee_user_id = auth.uid())
with check (addressee_user_id = auth.uid());

drop policy if exists "participants delete friendships" on public.friendships;
create policy "participants delete friendships"
on public.friendships for delete
using (requester_user_id = auth.uid() or addressee_user_id = auth.uid());
