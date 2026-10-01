-- AVODAH — esquema inicial para Supabase
-- Multi-workspace, colaboración, RLS y Realtime.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.workspace_role as enum ('admin','producer','host','operator','editor','collaborator');
create type public.production_status as enum ('idea','preparing','ready','live','published','archived');
create type public.task_status as enum ('pending','in_progress','done');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text not null default '',
  production_type text not null default 'Multiformato',
  accent_color text not null default '#b75e3a',
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'collaborator',
  joined_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  format text not null default 'Personalizado',
  status public.production_status not null default 'idea',
  scheduled_at timestamptz,
  duration_min integer not null default 60 check (duration_min > 0),
  completion smallint not null default 0 check (completion between 0 and 100),
  topic text not null default '',
  question text not null default '',
  objective text not null default '',
  description text not null default '',
  reference_notes text[] not null default '{}',
  hosts text[] not null default '{}',
  guests text[] not null default '{}',
  notes text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_members (
  production_id uuid not null references public.productions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'participant',
  primary key (production_id,user_id)
);

create table public.rundown_blocks (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  position integer not null default 0,
  type text not null default 'Tema',
  title text not null,
  duration_min integer not null default 5 check (duration_min > 0),
  responsible_id uuid references public.profiles(id) on delete set null,
  notes text not null default '',
  status text not null default 'Pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(production_id, position)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.idea_reactions (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  primary key (idea_id,user_id,emoji)
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  title text not null,
  category text not null default 'Link',
  url text,
  note text not null default '',
  source text not null default '',
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.production_resources (
  production_id uuid not null references public.productions(id) on delete cascade,
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (production_id, library_item_id)
);

create table public.rundown_resources (
  rundown_block_id uuid not null references public.rundown_blocks(id) on delete cascade,
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rundown_block_id, library_item_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  production_id uuid references public.productions(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  title text not null,
  status public.task_status not null default 'pending',
  priority text not null default 'Media',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  production_id uuid references public.productions(id) on delete cascade,
  name text not null,
  kind text not null default 'general',
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 8000),
  reply_to uuid references public.chat_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  production_id uuid references public.productions(id) on delete cascade,
  provider text not null default 'jitsi',
  room_name text not null,
  scheduled_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Índices de acceso frecuente.
create index productions_workspace_idx on public.productions(workspace_id, scheduled_at);
create index rundown_production_idx on public.rundown_blocks(production_id, position);
create index ideas_workspace_idx on public.ideas(workspace_id, created_at desc);
create index library_workspace_idx on public.library_items(workspace_id, created_at desc);
create index tasks_workspace_idx on public.tasks(workspace_id, status, due_at);
create index channels_workspace_idx on public.chat_channels(workspace_id);
create index messages_channel_idx on public.chat_messages(channel_id, created_at);
create index meetings_workspace_idx on public.meetings(workspace_id, scheduled_at);
create index activity_workspace_idx on public.activity_events(workspace_id, created_at desc);

-- Helpers de autorización. Están en schema no expuesto y fijan search_path vacío.
create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role = 'admin'::public.workspace_role
  );
$$;

create or replace function private.shares_workspace(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = (select auth.uid())
      and them.user_id = target_user
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.is_workspace_admin(uuid) from public;
revoke all on function private.shares_workspace(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.shares_workspace(uuid) to authenticated;

-- Alta automática del perfil cuando nace un usuario de Auth.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- El creador del workspace entra automáticamente como admin.
create or replace function private.add_workspace_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members(workspace_id, user_id, role)
  values (new.id, new.owner_id, 'admin'::public.workspace_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;
  return new;
end;
$$;

revoke all on function private.add_workspace_owner_member() from public;
create trigger on_workspace_created
after insert on public.workspaces
for each row execute function private.add_workspace_owner_member();

-- Mantener updated_at consistente.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger productions_touch_updated_at before update on public.productions
for each row execute function private.touch_updated_at();
create trigger rundown_touch_updated_at before update on public.rundown_blocks
for each row execute function private.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function private.touch_updated_at();

-- RLS en toda tabla expuesta.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.productions enable row level security;
alter table public.production_members enable row level security;
alter table public.rundown_blocks enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_reactions enable row level security;
alter table public.library_items enable row level security;
alter table public.production_resources enable row level security;
alter table public.rundown_resources enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.meetings enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.shares_workspace(id));
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_read on public.workspaces for select to authenticated
using (owner_id = (select auth.uid()) or private.is_workspace_member(id));
create policy workspaces_insert on public.workspaces for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy workspaces_update on public.workspaces for update to authenticated
using (owner_id = (select auth.uid()) or private.is_workspace_admin(id))
with check (owner_id = (select auth.uid()) or private.is_workspace_admin(id));
create policy workspaces_delete on public.workspaces for delete to authenticated
using (owner_id = (select auth.uid()));

create policy members_read on public.workspace_members for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy members_insert on public.workspace_members for insert to authenticated
with check (private.is_workspace_admin(workspace_id));
create policy members_update on public.workspace_members for update to authenticated
using (private.is_workspace_admin(workspace_id)) with check (private.is_workspace_admin(workspace_id));
create policy members_delete on public.workspace_members for delete to authenticated
using (private.is_workspace_admin(workspace_id) and user_id <> (select auth.uid()));

create policy productions_access on public.productions for all to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy production_members_access on public.production_members for all to authenticated
using (exists(select 1 from public.productions p where p.id=production_members.production_id and private.is_workspace_member(p.workspace_id)))
with check (
  exists(select 1 from public.productions p where p.id=production_members.production_id and private.is_workspace_member(p.workspace_id))
  and exists(select 1 from public.productions p join public.workspace_members wm on wm.workspace_id=p.workspace_id where p.id=production_members.production_id and wm.user_id=production_members.user_id)
);

create policy rundown_access on public.rundown_blocks for all to authenticated
using (exists(select 1 from public.productions p where p.id=rundown_blocks.production_id and private.is_workspace_member(p.workspace_id)))
with check (exists(select 1 from public.productions p where p.id=rundown_blocks.production_id and private.is_workspace_member(p.workspace_id)));

create policy ideas_read on public.ideas for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy ideas_insert on public.ideas for insert to authenticated
with check (private.is_workspace_member(workspace_id) and author_id=(select auth.uid()));
create policy ideas_update on public.ideas for update to authenticated
using (author_id=(select auth.uid()) or private.is_workspace_admin(workspace_id))
with check (author_id=(select auth.uid()) or private.is_workspace_admin(workspace_id));
create policy ideas_delete on public.ideas for delete to authenticated
using (author_id=(select auth.uid()) or private.is_workspace_admin(workspace_id));

create policy reactions_read on public.idea_reactions for select to authenticated
using (exists(select 1 from public.ideas i where i.id=idea_reactions.idea_id and private.is_workspace_member(i.workspace_id)));
create policy reactions_insert on public.idea_reactions for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.ideas i where i.id=idea_reactions.idea_id and private.is_workspace_member(i.workspace_id)));
create policy reactions_delete on public.idea_reactions for delete to authenticated
using (user_id=(select auth.uid()));

create policy library_access on public.library_items for all to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy production_resources_access on public.production_resources for all to authenticated
using (exists(select 1 from public.productions p where p.id=production_resources.production_id and private.is_workspace_member(p.workspace_id)))
with check (
  exists(select 1 from public.productions p where p.id=production_resources.production_id and private.is_workspace_member(p.workspace_id))
  and exists(select 1 from public.library_items li join public.productions p on p.workspace_id=li.workspace_id where li.id=production_resources.library_item_id and p.id=production_resources.production_id)
);

create policy rundown_resources_access on public.rundown_resources for all to authenticated
using (exists(select 1 from public.rundown_blocks rb join public.productions p on p.id=rb.production_id where rb.id=rundown_resources.rundown_block_id and private.is_workspace_member(p.workspace_id)))
with check (
  exists(select 1 from public.rundown_blocks rb join public.productions p on p.id=rb.production_id where rb.id=rundown_resources.rundown_block_id and private.is_workspace_member(p.workspace_id))
  and exists(select 1 from public.rundown_blocks rb join public.productions p on p.id=rb.production_id join public.library_items li on li.workspace_id=p.workspace_id where rb.id=rundown_resources.rundown_block_id and li.id=rundown_resources.library_item_id)
);

create policy tasks_access on public.tasks for all to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy channels_access on public.chat_channels for all to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy messages_read on public.chat_messages for select to authenticated
using (exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and private.is_workspace_member(c.workspace_id)));
create policy messages_insert on public.chat_messages for insert to authenticated
with check (author_id=(select auth.uid()) and exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and private.is_workspace_member(c.workspace_id)));
create policy messages_update on public.chat_messages for update to authenticated
using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));
create policy messages_delete on public.chat_messages for delete to authenticated
using (author_id=(select auth.uid()) or exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and private.is_workspace_admin(c.workspace_id)));

create policy meetings_access on public.meetings for all to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy activity_read on public.activity_events for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy activity_insert on public.activity_events for insert to authenticated
with check (private.is_workspace_member(workspace_id) and (actor_id is null or actor_id=(select auth.uid())));

-- Data API: habilita authenticated; RLS sigue controlando filas.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Realtime: sólo entidades colaborativas inmediatas.
alter publication supabase_realtime add table public.rundown_blocks;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.ideas;

-- Índices complementarios para claves foráneas
create index workspace_members_user_idx on public.workspace_members(user_id);
create index workspaces_owner_idx on public.workspaces(owner_id);
create index productions_created_by_idx on public.productions(created_by);
create index production_members_user_idx on public.production_members(user_id);
create index rundown_responsible_idx on public.rundown_blocks(responsible_id);
create index ideas_author_idx on public.ideas(author_id);
create index idea_reactions_user_idx on public.idea_reactions(user_id);
create index library_added_by_idx on public.library_items(added_by);
create index production_resources_library_idx on public.production_resources(library_item_id);
create index production_resources_added_by_idx on public.production_resources(added_by);
create index rundown_resources_library_idx on public.rundown_resources(library_item_id);
create index tasks_production_idx on public.tasks(production_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_created_by_idx on public.tasks(created_by);
create index chat_channels_production_idx on public.chat_channels(production_id);
create index chat_messages_author_idx on public.chat_messages(author_id);
create index chat_messages_reply_idx on public.chat_messages(reply_to);
create index meetings_production_idx on public.meetings(production_id);
create index meetings_created_by_idx on public.meetings(created_by);
create index activity_actor_idx on public.activity_events(actor_id);

-- Invitaciones a espacios de trabajo
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(12),'hex'),
  role public.workspace_role not null default 'collaborator',
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index workspace_invites_workspace_idx on public.workspace_invites(workspace_id);
create index workspace_invites_creator_idx on public.workspace_invites(created_by);
alter table public.workspace_invites enable row level security;
create policy workspace_invites_read on public.workspace_invites for select to authenticated using (private.is_workspace_admin(workspace_id));
create policy workspace_invites_insert on public.workspace_invites for insert to authenticated with check (private.is_workspace_admin(workspace_id) and created_by=(select auth.uid()));
create policy workspace_invites_update on public.workspace_invites for update to authenticated using (private.is_workspace_admin(workspace_id)) with check (private.is_workspace_admin(workspace_id));
create policy workspace_invites_delete on public.workspace_invites for delete to authenticated using (private.is_workspace_admin(workspace_id));
grant select,insert,update,delete on public.workspace_invites to authenticated;

create or replace function public.join_workspace(invite_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  invite public.workspace_invites%rowtype;
  target_user uuid;
begin
  target_user := auth.uid();
  if target_user is null then raise exception 'authentication_required'; end if;
  select * into invite from public.workspace_invites wi
  where wi.code=invite_code and wi.revoked_at is null and wi.expires_at>now() limit 1;
  if invite.id is null then raise exception 'invalid_or_expired_invite'; end if;
  insert into public.workspace_members(workspace_id,user_id,role)
  values(invite.workspace_id,target_user,invite.role)
  on conflict (workspace_id,user_id) do update set role=excluded.role;
  return invite.workspace_id;
end;
$$;
revoke all on function public.join_workspace(text) from public;
revoke execute on function public.join_workspace(text) from anon;
grant execute on function public.join_workspace(text) to authenticated;

-- Realtime adicional para colaboración de equipo
alter publication supabase_realtime add table public.productions;
alter publication supabase_realtime add table public.library_items;
alter publication supabase_realtime add table public.chat_channels;
alter publication supabase_realtime add table public.workspace_members;
alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.workspaces;

-- ==========================================================
-- AVODAH collaboration extensions currently active in cloud
-- See Supabase migration history for canonical applied order:
-- workspace_private_files
-- collaboration_comments_reactions_calendar
-- allow_admin_pin_messages
-- ==========================================================
