-- Owner role and membership protection, including remediation for existing communities.
insert into public.workspace_members(workspace_id,user_id,role)
select w.id,w.owner_id,'admin'::public.workspace_role from public.workspaces w
on conflict (workspace_id,user_id) do update set role='admin'::public.workspace_role;
create or replace function private.is_workspace_admin(target_workspace uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.workspaces w where w.id=target_workspace and w.owner_id=(select auth.uid()))
 or exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid()) and wm.role='admin'::public.workspace_role);
$$;
create or replace function private.guard_owner_membership() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare is_owner boolean;
begin
 if tg_op='UPDATE' then
  select exists(select 1 from public.workspaces w where w.id=old.workspace_id and w.owner_id=old.user_id) into is_owner;
  if is_owner and (new.workspace_id is distinct from old.workspace_id or new.user_id is distinct from old.user_id or new.role is distinct from 'admin'::public.workspace_role) then
   raise exception 'workspace_owner_role_is_protected';
  end if;
 end if;
 select exists(select 1 from public.workspaces w where w.id=new.workspace_id and w.owner_id=new.user_id) into is_owner;
 if is_owner and new.role is distinct from 'admin'::public.workspace_role then raise exception 'workspace_owner_must_be_admin'; end if;
 return new;
end;
$$;
drop trigger if exists protect_workspace_owner_membership on public.workspace_members;
create trigger protect_workspace_owner_membership before insert or update on public.workspace_members
for each row execute function private.guard_owner_membership();
create or replace function private.guard_workspace_owner() returns trigger
language plpgsql set search_path = ''
as $$
begin
 if new.owner_id is distinct from old.owner_id then
  raise exception 'workspace_ownership_transfer_requires_explicit_privileged_procedure';
 end if;
 return new;
end;
$$;
drop trigger if exists protect_workspace_owner_id on public.workspaces;
create trigger protect_workspace_owner_id before update on public.workspaces
for each row execute function private.guard_workspace_owner();
create or replace function public.join_workspace(invite_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare invite public.workspace_invites%rowtype;
target_user uuid;
new_role public.workspace_role;
begin
 target_user:=auth.uid();
 if target_user is null then raise exception 'authentication_required'; end if;
 select * into invite from public.workspace_invites wi
 where wi.code=invite_code and wi.revoked_at is null and wi.expires_at>now() limit 1;
 if invite.id is null then raise exception 'invalid_or_expired_invite'; end if;
 select case when w.owner_id=target_user then 'admin'::public.workspace_role else invite.role end
 into new_role from public.workspaces w where w.id=invite.workspace_id;
 if new_role is null then raise exception 'invalid_workspace'; end if;
 insert into public.workspace_members(workspace_id,user_id,role)
 values(invite.workspace_id,target_user,new_role)
 on conflict (workspace_id,user_id) do nothing;
 return invite.workspace_id;
end;
$$;
