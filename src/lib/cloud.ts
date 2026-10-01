import { supabase } from './supabase';

const productionStatusFromDb: Record<string, string> = {
  idea: 'Idea', preparing: 'En preparación', ready: 'Listo', live: 'En vivo', published: 'Emitido', archived: 'Archivado',
};
const productionStatusToDb: Record<string, string> = Object.fromEntries(Object.entries(productionStatusFromDb).map(([a,b]) => [b,a]));
const taskStatusFromDb: Record<string, string> = { pending: 'Pendiente', in_progress: 'En curso', done: 'Hecho' };
const taskStatusToDb: Record<string, string> = Object.fromEntries(Object.entries(taskStatusFromDb).map(([a,b]) => [b,a]));
const roleLabel: Record<string,string> = {admin:'Administrador',producer:'Productor',host:'Conductor',operator:'Operador',editor:'Editor',collaborator:'Colaborador'};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'AV';
const localDateParts = (iso: string | null) => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year:'numeric',month:'2-digit',day:'2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour:'2-digit',minute:'2-digit',hour12:false }).format(d);
  return { date, time };
};
const scheduledIso = (date: string, time: string) => date ? new Date(`${date}T${time || '19:00'}:00-03:00`).toISOString() : null;
const dueIso = (date: string | null | undefined) => date ? new Date(`${date}T23:59:00-03:00`).toISOString() : null;

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signUp(email: string, password: string, fullName: string) {
  const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}${window.location.search}` : undefined;
  return supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo } });
}
export async function signOut() { return supabase.auth.signOut(); }

export async function listWorkspaces() {
  const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w: any) => ({ id:w.id, name:w.name, type:w.production_type, description:w.description, initials:initials(w.name), accent:w.accent_color }));
}

export async function createWorkspace(userId: string, name: string, type: string, description: string) {
  const slugBase = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'workspace';
  const slug = `${slugBase}-${Math.random().toString(36).slice(2,7)}`;
  const { data, error } = await supabase.from('workspaces').insert({ owner_id:userId, name, slug, description, production_type:type }).select('*').single();
  if (error) throw error;
  // A database trigger creates the General channel atomically.
  return data.id as string;
}

export async function joinWorkspace(code: string) {
  const { data, error } = await supabase.rpc('join_workspace', { invite_code: code.trim() });
  if (error) throw error;
  return data as string;
}

export async function createWorkspaceInvite(workspaceId: string, userId: string, role = 'collaborator') {
  const { data, error } = await supabase.from('workspace_invites').insert({ workspace_id:workspaceId, created_by:userId, role }).select('code,expires_at').single();
  if (error) throw error;
  return data as {code:string; expires_at:string};
}

export async function loadWorkspaceSnapshot(workspaceId: string) {
  const [workspaceRes, memberRes, productionRes, ideaRes, libraryRes, taskRes, channelRes, calendarRes] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id',workspaceId).single(),
    supabase.from('workspace_members').select('user_id,role').eq('workspace_id',workspaceId),
    supabase.from('productions').select('*').eq('workspace_id',workspaceId).order('scheduled_at',{ascending:true}),
    supabase.from('ideas').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}),
    supabase.from('library_items').select('*').eq('workspace_id',workspaceId).eq('archived',false).order('created_at',{ascending:false}),
    supabase.from('tasks').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}),
    supabase.from('chat_channels').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:true}),
    supabase.from('calendar_events').select('*').eq('workspace_id',workspaceId).order('starts_at',{ascending:true}),
  ]);
  for (const r of [workspaceRes,memberRes,productionRes,ideaRes,libraryRes,taskRes,channelRes,calendarRes]) if (r.error) throw r.error;

  const memberRows = memberRes.data ?? [];
  const profileIds = memberRows.map((m:any)=>m.user_id);
  const profileRes = profileIds.length ? await supabase.from('profiles').select('*').in('id',profileIds) : { data:[], error:null } as any;
  if (profileRes.error) throw profileRes.error;
  const profileMap = new Map<string,any>((profileRes.data ?? []).map((p:any)=>[p.id,p]));
  const nameOf = (id:string|null|undefined) => id ? (profileMap.get(id)?.full_name || 'Integrante') : '';

  const productionRows = productionRes.data ?? [];
  const productionIds = productionRows.map((p:any)=>p.id);
  const [blockRes, productionMemberRes, productionResourceRes] = productionIds.length ? await Promise.all([
    supabase.from('rundown_blocks').select('*').in('production_id',productionIds).order('position',{ascending:true}),
    supabase.from('production_members').select('*').in('production_id',productionIds),
    supabase.from('production_resources').select('production_id,library_item_id').in('production_id',productionIds),
  ]) : [{data:[],error:null},{data:[],error:null},{data:[],error:null}] as any;
  if (blockRes.error) throw blockRes.error;
  if (productionMemberRes.error) throw productionMemberRes.error;
  if (productionResourceRes.error) throw productionResourceRes.error;

  const channels = channelRes.data ?? [];
  const channelIds = channels.map((c:any)=>c.id);
  const channelAlias = new Map<string,string>(channels.map((c:any)=>[c.id, c.production_id ?? (c.kind === 'general' ? 'general' : c.id)]));
  const messageRes = channelIds.length ? await supabase.from('chat_messages').select('*').in('channel_id',channelIds).order('created_at',{ascending:true}) : {data:[],error:null} as any;
  if (messageRes.error) throw messageRes.error;

  const ideaIds = (ideaRes.data ?? []).map((i:any)=>i.id);
  const reactionRes = ideaIds.length ? await supabase.from('idea_reactions').select('idea_id,user_id,emoji').in('idea_id',ideaIds) : {data:[],error:null} as any;
  if (reactionRes.error) throw reactionRes.error;
  const reactionCount = new Map<string,number>();
  for (const r of reactionRes.data ?? []) reactionCount.set(r.idea_id,(reactionCount.get(r.idea_id)||0)+1);
  const commentRes = ideaIds.length ? await supabase.from('idea_comments').select('*').in('idea_id',ideaIds).order('created_at',{ascending:true}) : {data:[],error:null} as any;
  if(commentRes.error) throw commentRes.error;
  const commentsByIdea = new Map<string,any[]>();
  for (const c of commentRes.data ?? []) commentsByIdea.set(c.idea_id,[...(commentsByIdea.get(c.idea_id)||[]),{id:c.id,author:nameOf(c.author_id),authorId:c.author_id,text:c.body,time:new Date(c.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}]);

  const memberIdsByProd = new Map<string,string[]>();
  for (const pm of productionMemberRes.data ?? []) memberIdsByProd.set(pm.production_id,[...(memberIdsByProd.get(pm.production_id)||[]),pm.user_id]);
  const resourceIdsByProd = new Map<string,string[]>();
  for (const pr of productionResourceRes.data ?? []) resourceIdsByProd.set(pr.production_id,[...(resourceIdsByProd.get(pr.production_id)||[]),pr.library_item_id]);

  const messageIds=(messageRes.data ?? []).map((m:any)=>m.id);
  const [chatReactionRes,attachmentRes] = messageIds.length ? await Promise.all([
    supabase.from('chat_message_reactions').select('*').in('message_id',messageIds),
    supabase.from('message_attachments').select('*').in('message_id',messageIds),
  ]) : [{data:[],error:null},{data:[],error:null}] as any;
  if(chatReactionRes.error) throw chatReactionRes.error; if(attachmentRes.error) throw attachmentRes.error;
  const reactionsByMessage=new Map<string,any[]>();
  for(const r of chatReactionRes.data??[]) reactionsByMessage.set(r.message_id,[...(reactionsByMessage.get(r.message_id)||[]),{userId:r.user_id,emoji:r.emoji}]);
  const attachmentsByMessage=new Map<string,any[]>();
  for(const a of attachmentRes.data??[]){
    const {data:signed}=await supabase.storage.from('avodah-files').createSignedUrl(a.storage_path,3600);
    attachmentsByMessage.set(a.message_id,[...(attachmentsByMessage.get(a.message_id)||[]),{id:a.id,name:a.file_name,mimeType:a.mime_type,size:Number(a.file_size||0),url:signed?.signedUrl??''}]);
  }

  const workspaceRow:any = workspaceRes.data;
  return {
    workspace:{id:workspaceRow.id,name:workspaceRow.name,type:workspaceRow.production_type,description:workspaceRow.description,initials:initials(workspaceRow.name),accent:workspaceRow.accent_color},
    members:memberRows.map((m:any)=>{const p=profileMap.get(m.user_id);const name=p?.full_name||'Integrante';return {id:m.user_id,name,initials:initials(name),role:roleLabel[m.role]??m.role,status:'Disponible',color:'#5c5148',avatarUrl:p?.avatar_url??null};}),
    productions:productionRows.map((p:any)=>{const dt=localDateParts(p.scheduled_at);return {id:p.id,title:p.title,type:p.format,status:productionStatusFromDb[p.status]??'Idea',date:dt.date,time:dt.time,duration:p.duration_min,completion:p.completion,topic:p.topic,question:p.question,objective:p.objective,description:p.description,references:p.reference_notes??[],hosts:p.hosts??[],guests:p.guests??[],notes:p.notes,members:memberIdsByProd.get(p.id)??[],resourceIds:resourceIdsByProd.get(p.id)??[]};}),
    blocks:(blockRes.data ?? []).map((b:any)=>({id:b.id,productionId:b.production_id,order:b.position,type:b.type,title:b.title,duration:b.duration_min,responsible:nameOf(b.responsible_id),responsibleId:b.responsible_id,notes:b.notes,status:b.status})),
    ideas:(ideaRes.data ?? []).map((i:any)=>({id:i.id,title:i.title,description:i.description,tags:i.tags??[],author:nameOf(i.author_id),authorId:i.author_id,reactions:reactionCount.get(i.id)||0,comments:(commentsByIdea.get(i.id)||[]).length,commentItems:commentsByIdea.get(i.id)||[],archived:i.archived})),
    library:(libraryRes.data ?? []).map((i:any)=>({id:i.id,title:i.title,category:i.category,url:i.url??'#',note:i.note,source:i.source,tags:i.tags??[]})),
    tasks:(taskRes.data ?? []).map((t:any)=>({id:t.id,title:t.title,status:taskStatusFromDb[t.status]??'Pendiente',assignee:nameOf(t.assignee_id)||'Sin asignar',assigneeId:t.assignee_id,due:t.due_at?new Date(t.due_at).toLocaleDateString('es-AR',{day:'numeric',month:'short'}):'Sin fecha',dueAt:t.due_at,priority:t.priority,productionId:t.production_id??undefined})),
    channels:channels.map((c:any)=>({id:channelAlias.get(c.id)!,dbId:c.id,name:c.name,productionId:c.production_id??undefined,kind:c.kind})),
    messages:(messageRes.data ?? []).map((m:any)=>({id:m.id,channel:channelAlias.get(m.channel_id)??m.channel_id,dbChannelId:m.channel_id,author:nameOf(m.author_id),authorId:m.author_id,text:m.body,time:new Date(m.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),replyTo:m.reply_to,pinned:!!m.pinned_at,reactions:reactionsByMessage.get(m.id)||[],attachments:attachmentsByMessage.get(m.id)||[]})),
    calendarEvents:(calendarRes.data??[]).map((e:any)=>({id:e.id,title:e.title,kind:e.kind,startsAt:e.starts_at,endsAt:e.ends_at,notes:e.notes,productionId:e.production_id??undefined})),
  };
}

export async function insertProduction(workspaceId:string,userId:string,p:any) {
  const { data, error } = await supabase.from('productions').insert({
    workspace_id:workspaceId,created_by:userId,title:p.title,format:p.type,status:productionStatusToDb[p.status]??'idea',scheduled_at:scheduledIso(p.date,p.time),duration_min:p.duration,completion:p.completion,topic:p.topic,question:p.question,objective:p.objective,description:p.description,reference_notes:p.references,hosts:p.hosts,guests:p.guests,notes:p.notes,
  }).select('id').single();
  if (error) throw error;
  await supabase.from('production_members').insert({ production_id:data.id,user_id:userId,role:'owner' });
  await supabase.from('chat_channels').insert({ workspace_id:workspaceId,production_id:data.id,name:p.title,kind:'production' });
  return data.id as string;
}
export async function insertIdea(workspaceId:string,userId:string,i:any) {
  const {data,error}=await supabase.from('ideas').insert({workspace_id:workspaceId,author_id:userId,title:i.title,description:i.description,tags:i.tags}).select('id').single(); if(error) throw error; return data.id as string;
}
export async function reactIdea(ideaId:string,userId:string) { const {error}=await supabase.from('idea_reactions').upsert({idea_id:ideaId,user_id:userId,emoji:'❤️'}); if(error) throw error; }
export async function archiveIdea(ideaId:string) { const {error}=await supabase.from('ideas').update({archived:true}).eq('id',ideaId); if(error) throw error; }
export async function insertLibraryItem(workspaceId:string,userId:string,i:any) { const {data,error}=await supabase.from('library_items').insert({workspace_id:workspaceId,added_by:userId,title:i.title,category:i.category,url:i.url,note:i.note,source:i.source,tags:i.tags}).select('id').single(); if(error) throw error; return data.id as string; }
export async function insertTask(workspaceId:string,userId:string,t:any,members:any[]) {
  const assignee=members.find((m:any)=>m.name===t.assignee);
  const {data,error}=await supabase.from('tasks').insert({workspace_id:workspaceId,production_id:t.productionId||null,assignee_id:assignee?.id??null,created_by:userId,title:t.title,status:taskStatusToDb[t.status]??'pending',priority:t.priority,due_at:dueIso(t.dueDate)}).select('id').single(); if(error) throw error; return data.id as string;
}
export async function updateTaskStatus(taskId:string,status:string) { const {error}=await supabase.from('tasks').update({status:taskStatusToDb[status]??'pending'}).eq('id',taskId); if(error) throw error; }
export async function insertMessage(channelId:string,userId:string,text:string) { const {data,error}=await supabase.from('chat_messages').insert({channel_id:channelId,author_id:userId,body:text}).select('id').single(); if(error) throw error; return data.id as string; }
export async function insertBlock(productionId:string,b:any,members:any[]) { const responsible=members.find((m:any)=>m.name===b.responsible); const {data,error}=await supabase.from('rundown_blocks').insert({production_id:productionId,position:b.order,type:b.type,title:b.title,duration_min:b.duration,responsible_id:responsible?.id??null,notes:b.notes,status:b.status}).select('id').single(); if(error) throw error; return data.id as string; }
export async function updateBlockPosition(blockId:string,position:number) { const {error}=await supabase.from('rundown_blocks').update({position}).eq('id',blockId); if(error) throw error; }
export async function updateWorkspace(workspaceId:string,w:any) { const {error}=await supabase.from('workspaces').update({name:w.name,description:w.description,production_type:w.type}).eq('id',workspaceId); if(error) throw error; }


export async function updateProduction(productionId:string,p:any) {
  const { error } = await supabase.from('productions').update({
    title:p.title,format:p.type,status:productionStatusToDb[p.status]??'idea',scheduled_at:scheduledIso(p.date,p.time),duration_min:p.duration,completion:p.completion,topic:p.topic,question:p.question,objective:p.objective,description:p.description,reference_notes:p.references,hosts:p.hosts,guests:p.guests,notes:p.notes,
  }).eq('id',productionId);
  if(error) throw error;
  await supabase.from('chat_channels').update({name:p.title}).eq('production_id',productionId);
}
export async function deleteProduction(productionId:string) { const {error}=await supabase.from('productions').delete().eq('id',productionId); if(error) throw error; }
export async function updateProductionNotes(productionId:string,notes:string) { const {error}=await supabase.from('productions').update({notes}).eq('id',productionId); if(error) throw error; }
export async function updateBlock(blockId:string,b:any,members:any[]) { const responsible=members.find((m:any)=>m.name===b.responsible); const {error}=await supabase.from('rundown_blocks').update({type:b.type,title:b.title,duration_min:b.duration,responsible_id:responsible?.id??b.responsibleId??null,notes:b.notes,status:b.status}).eq('id',blockId); if(error) throw error; }
export async function deleteBlock(blockId:string) { const {error}=await supabase.from('rundown_blocks').delete().eq('id',blockId); if(error) throw error; }
export async function linkResourceToProduction(productionId:string,libraryItemId:string,userId:string) { const {error}=await supabase.from('production_resources').upsert({production_id:productionId,library_item_id:libraryItemId,added_by:userId}); if(error) throw error; }
export async function unlinkResourceFromProduction(productionId:string,libraryItemId:string) { const {error}=await supabase.from('production_resources').delete().eq('production_id',productionId).eq('library_item_id',libraryItemId); if(error) throw error; }
export async function deleteLibraryItem(itemId:string) { const {error}=await supabase.from('library_items').update({archived:true}).eq('id',itemId); if(error) throw error; }
export async function deleteTask(taskId:string) { const {error}=await supabase.from('tasks').delete().eq('id',taskId); if(error) throw error; }
export async function updateMemberRole(workspaceId:string,userId:string,roleLabelValue:string) { const toDb:Record<string,string>={Administrador:'admin',Productor:'producer',Productora:'producer',Conductor:'host',Operador:'operator',Editora:'editor',Editor:'editor',Colaborador:'collaborator'}; const {error}=await supabase.from('workspace_members').update({role:toDb[roleLabelValue]??'collaborator'}).eq('workspace_id',workspaceId).eq('user_id',userId); if(error) throw error; }

export async function insertIdeaComment(ideaId:string,userId:string,body:string) { const {error}=await supabase.from('idea_comments').insert({idea_id:ideaId,author_id:userId,body}); if(error) throw error; }
export async function toggleMessageReaction(messageId:string,userId:string,emoji:string) { const {data,error}=await supabase.from('chat_message_reactions').select('emoji').eq('message_id',messageId).eq('user_id',userId).eq('emoji',emoji).maybeSingle(); if(error) throw error; if(data){const {error:del}=await supabase.from('chat_message_reactions').delete().eq('message_id',messageId).eq('user_id',userId).eq('emoji',emoji);if(del)throw del;}else{const {error:ins}=await supabase.from('chat_message_reactions').insert({message_id:messageId,user_id:userId,emoji});if(ins)throw ins;} }
export async function togglePinMessage(messageId:string,pinned:boolean,userId:string) { const {error}=await supabase.from('chat_messages').update({pinned_at:pinned?new Date().toISOString():null,pinned_by:pinned?userId:null}).eq('id',messageId); if(error) throw error; }
export async function uploadMessageAttachment(workspaceId:string,messageId:string,file:File) { const clean=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120)||'archivo'; const path=`${workspaceId}/chat/${messageId}/${Date.now()}-${clean}`; const {error:uploadError}=await supabase.storage.from('avodah-files').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false}); if(uploadError) throw uploadError; const {error}=await supabase.from('message_attachments').insert({workspace_id:workspaceId,message_id:messageId,storage_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size}); if(error){await supabase.storage.from('avodah-files').remove([path]);throw error;} }
export async function insertCalendarEvent(workspaceId:string,userId:string,event:any) { const {error}=await supabase.from('calendar_events').insert({workspace_id:workspaceId,production_id:event.productionId||null,title:event.title,kind:event.kind||'Evento',starts_at:event.startsAt,ends_at:event.endsAt||null,notes:event.notes||'',created_by:userId}); if(error) throw error; }
export async function deleteCalendarEvent(eventId:string) { const {error}=await supabase.from('calendar_events').delete().eq('id',eventId); if(error) throw error; }

export function subscribeWorkspace(workspaceId:string,onChange:()=>void) {
  const channel = supabase.channel(`workspace-${workspaceId}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'ideas',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'productions',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'library_items',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'chat_channels',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspace_members',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'meetings',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspaces',filter:`id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'rundown_blocks'},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'idea_comments'},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'chat_message_reactions'},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'message_attachments',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'calendar_events',filter:`workspace_id=eq.${workspaceId}`},onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
