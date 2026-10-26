-- E-Campus Helpdesk: Supabase database setup
-- Run this whole file once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it drops and recreates the policies and functions, but never deletes your data).

-- ============================================================
-- 1. Profiles (one row per person who signs up)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  user_type   text check (user_type in ('student', 'staff')),
  department  text not null default '',
  photo       text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- Is the signed-in person an administrator? (security definer: it may read profiles even though policies limit others)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Creates the profile automatically when someone signs up. Everyone starts as a normal user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, user_type, department)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'user_type' in ('student', 'staff') then new.raw_user_meta_data ->> 'user_type' end,
    coalesce(new.raw_user_meta_data ->> 'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A normal user can edit their name, type, department and photo, but never their role or email.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null when the change is made from the SQL editor, so you can promote an admin there.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.email is distinct from old.email or new.id is distinct from old.id then
      raise exception 'You cannot change your role or email.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ============================================================
-- 2. Complaints
-- ============================================================
create table if not exists public.complaints (
  id               text primary key,                       -- e.g. CIR-20261024-AB12
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  submitted_by     text not null,                          -- the reporter's email (lower case)
  title            text not null,
  category         text not null,
  campus           text,
  building         text not null default '',
  area             text,
  room             text not null default '',
  description      text not null,
  image_data       text,                                   -- small picture saved as a data URL
  ai_summary       text,
  status           text not null default 'pending' check (status in ('pending', 'in_progress', 'resolved')),
  priority         text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to      text,
  resolution_note  text,
  resolved_at      timestamptz,
  resolved_by      text,
  history          jsonb not null default '[]'::jsonb,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);
create index if not exists complaints_user_idx on public.complaints (user_id);
create index if not exists complaints_created_idx on public.complaints (created_at desc);

alter table public.complaints enable row level security;

drop policy if exists "complaints: read own or admin" on public.complaints;
create policy "complaints: read own or admin" on public.complaints
  for select using (user_id = auth.uid() or public.is_admin());

-- A user can only create a NEW, untouched complaint for themselves.
drop policy if exists "complaints: create own" on public.complaints;
create policy "complaints: create own" on public.complaints
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and priority = 'medium'
    and assigned_to is null
    and resolved_at is null
    and submitted_by = (select email from public.profiles where id = auth.uid())
  );

-- Only admins change status, priority, assignment and resolution.
drop policy if exists "complaints: admin update" on public.complaints;
create policy "complaints: admin update" on public.complaints
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "complaints: admin delete" on public.complaints;
create policy "complaints: admin delete" on public.complaints
  for delete using (public.is_admin());

-- The reporter (or an admin) can save an AI summary on a complaint.
create or replace function public.set_complaint_ai_summary(p_id text, p_summary text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.complaints
     set ai_summary = left(coalesce(p_summary, ''), 500)
   where id = p_id and (user_id = auth.uid() or public.is_admin());
end;
$$;

-- The reporter can reopen their own resolved complaint with a reason.
create or replace function public.reopen_complaint(p_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_now   text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please tell us why it should be reopened (at least 5 characters).';
  end if;
  select email into v_email from public.profiles where id = auth.uid();
  update public.complaints
     set status = 'pending',
         resolved_at = null,
         resolved_by = null,
         updated_at = now(),
         history = history || jsonb_build_array(jsonb_build_object(
           'status', 'pending', 'at', v_now, 'by', v_email, 'note', 'Reopened: ' || trim(p_reason)))
   where id = p_id and user_id = auth.uid() and status = 'resolved';
  if not found then
    raise exception 'Only your own resolved complaint can be reopened.';
  end if;
end;
$$;

-- ============================================================
-- 3. Help requests and applications
-- ============================================================
create table if not exists public.requests (
  id              text primary key,                        -- HLP-... or APP-...
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  submitted_by    text not null,
  submitter_name  text,
  submitter_type  text,
  kind            text not null check (kind in ('help', 'application')),
  title           text not null,
  category        text not null,
  department      text,
  description     text not null default '',
  details         jsonb not null default '{}'::jsonb,
  status          text not null default 'submitted' check (status in
                    ('submitted', 'under_review', 'in_progress', 'answered', 'completed',
                     'more_info', 'approved', 'rejected', 'fulfilled', 'closed')),
  history         jsonb not null default '[]'::jsonb,
  assigned_to     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);
create index if not exists requests_user_idx on public.requests (user_id);
create index if not exists requests_created_idx on public.requests (created_at desc);

alter table public.requests enable row level security;

drop policy if exists "requests: read own or admin" on public.requests;
create policy "requests: read own or admin" on public.requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "requests: create own" on public.requests;
create policy "requests: create own" on public.requests
  for insert with check (
    user_id = auth.uid()
    and status = 'submitted'
    and assigned_to is null
    and submitted_by = (select email from public.profiles where id = auth.uid())
  );

drop policy if exists "requests: admin update" on public.requests;
create policy "requests: admin update" on public.requests
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "requests: admin delete" on public.requests;
create policy "requests: admin delete" on public.requests
  for delete using (public.is_admin());

-- Messages the requester can read (staff replies and the requester's own messages).
create table if not exists public.request_replies (
  id          bigint generated always as identity primary key,
  request_id  text not null references public.requests (id) on delete cascade,
  at          timestamptz not null default now(),
  by_name     text not null,
  text        text not null check (char_length(text) between 1 and 1000),
  from_user   boolean not null default false
);
create index if not exists request_replies_req_idx on public.request_replies (request_id);

alter table public.request_replies enable row level security;

drop policy if exists "replies: read own request or admin" on public.request_replies;
create policy "replies: read own request or admin" on public.request_replies
  for select using (
    public.is_admin()
    or exists (select 1 from public.requests r where r.id = request_id and r.user_id = auth.uid())
  );

drop policy if exists "replies: admin write" on public.request_replies;
create policy "replies: admin write" on public.request_replies
  for insert with check (public.is_admin() and from_user = false);

-- Private notes for staff. Requesters can never read these.
create table if not exists public.request_notes (
  id          bigint generated always as identity primary key,
  request_id  text not null references public.requests (id) on delete cascade,
  at          timestamptz not null default now(),
  by_name     text not null,
  text        text not null check (char_length(text) between 1 and 1000)
);
create index if not exists request_notes_req_idx on public.request_notes (request_id);

alter table public.request_notes enable row level security;

drop policy if exists "notes: admin only" on public.request_notes;
create policy "notes: admin only" on public.request_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- The requester answers a question from staff. If staff were waiting for information, the request goes back to review.
create or replace function public.add_user_reply(p_id text, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text;
  v_status text;
  v_now    text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if length(trim(coalesce(p_text, ''))) = 0 or length(trim(p_text)) > 1000 then
    raise exception 'Write a message of 1 to 1000 characters.';
  end if;
  select email into v_email from public.profiles where id = auth.uid();
  select status into v_status from public.requests where id = p_id and user_id = auth.uid();
  if not found then
    raise exception 'This request was not found.';
  end if;
  insert into public.request_replies (request_id, by_name, text, from_user)
  values (p_id, v_email, trim(p_text), true);
  if v_status = 'more_info' then
    update public.requests
       set status = 'under_review',
           updated_at = now(),
           history = history || jsonb_build_array(jsonb_build_object(
             'status', 'under_review', 'at', v_now, 'by', v_email, 'note', 'The requester replied.'))
     where id = p_id;
  else
    update public.requests set updated_at = now() where id = p_id;
  end if;
end;
$$;

-- ============================================================
-- 4. Allow signed-in people to call the functions
-- ============================================================
revoke all on function public.set_complaint_ai_summary(text, text) from public;
revoke all on function public.reopen_complaint(text, text) from public;
revoke all on function public.add_user_reply(text, text) from public;
grant execute on function public.set_complaint_ai_summary(text, text) to authenticated;
grant execute on function public.reopen_complaint(text, text) to authenticated;
grant execute on function public.add_user_reply(text, text) to authenticated;

-- ============================================================
-- 5. Make your first administrator (do this AFTER you have signed up once on the website)
-- ============================================================
-- Replace the email below with the one you registered with, then run only this line:
--
--   update public.profiles set role = 'admin' where email = 'your-email@example.com';
