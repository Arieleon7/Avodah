create or replace function public.reorder_rundown_blocks(
  target_production_id uuid,
  ordered_block_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
  supplied_count integer;
  matching_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select count(*) into current_count from public.rundown_blocks rb where rb.production_id=target_production_id;
  supplied_count:=coalesce(array_length(ordered_block_ids,1),0);
  select count(distinct x.id) into matching_count
  from unnest(coalesce(ordered_block_ids,array[]::uuid[])) as x(id)
  join public.rundown_blocks rb on rb.id=x.id and rb.production_id=target_production_id;
  if supplied_count<>current_count or matching_count<>current_count then raise exception 'invalid_block_order'; end if;

  update public.rundown_blocks rb
  set "position"=-1000000-ordered.ord::integer
  from unnest(ordered_block_ids) with ordinality as ordered(id,ord)
  where rb.id=ordered.id and rb.production_id=target_production_id;

  update public.rundown_blocks rb
  set "position"=ordered.ord::integer
  from unnest(ordered_block_ids) with ordinality as ordered(id,ord)
  where rb.id=ordered.id and rb.production_id=target_production_id;
end;
$$;

revoke all on function public.reorder_rundown_blocks(uuid,uuid[]) from public,anon;
grant execute on function public.reorder_rundown_blocks(uuid,uuid[]) to authenticated;
