drop policy if exists "authenticated users read profile directory" on public.profiles;
create policy "authenticated users read profile directory"
on public.profiles for select
using (auth.uid() is not null);
