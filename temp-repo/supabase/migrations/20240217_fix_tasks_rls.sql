-- Enable INSERT for authenticated users on tasks table
-- This acts as a fallback if the Service Role Key fails or is missing in the API route
create policy "Enable insert for authenticated users only"
on "public"."tasks"
as permissive
for insert
to authenticated
with check (true);

-- Also ensure UPDATE is allowed for team members/managers
-- (Existing policies might cover this but let's be safe for the "Update" route if it falls back)
create policy "Enable update for users based on team_id"
on "public"."tasks"
as permissive
for update
to authenticated
using (
  auth.uid() in (
    select user_id from user_profiles
    where team_id = tasks.team_id
    or role in ('manager', 'super_admin')
  )
)
with check (
  auth.uid() in (
    select user_id from user_profiles
    where team_id = tasks.team_id
    or role in ('manager', 'super_admin')
  )
);
