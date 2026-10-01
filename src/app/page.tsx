'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {ResourceLibrary,ResourceQuickView,ResourceMedia,ResourceCreate,previewFields,type UploadResourceInfo} from './components/resource-library';
import {BlockEditorDialog,CalendarEditorDialog,WorkspaceEditorDialog,FlexibleTextArea,type BlockDraft,type CalendarDraft,type WorkspaceDraft} from './components/editor-dialogs';
import {safeResourceUrl,guessResourcePreview,type ResourcePreview} from '@/lib/resource-preview';
import { LayoutDashboard, Radio, Lightbulb, BookOpen, CalendarDays, CheckSquare, MessageCircle, Users, Settings as SettingsIcon, Video, Search, Plus, ArrowUpRight, Mic2, Clock3, Menu, X, ChevronRight, ListChecks, type LucideIcon } from 'lucide-react';
import {
  archiveIdea as cloudArchiveIdea, createWorkspace, createWorkspaceInvite, deleteBlock, deleteCalendarEvent, deleteLibraryItem, deleteProduction, deleteTask, getCurrentUser, insertBlock, insertCalendarEvent, insertIdea, insertIdeaComment, insertLibraryItem, uploadLibraryFile, updateLibraryPreview, updateLibraryItem as cloudUpdateLibraryItem, requestResourcePreview, insertMessage, insertProduction, insertTask, joinWorkspace, linkResourceToProduction, listWorkspaces, loadWorkspaceSnapshot, reactIdea as cloudReactIdea, signIn, signInWithGoogle, signOut, signUp, subscribeWorkspace, unlinkResourceFromProduction, updateBlock, updateBlockPosition, updateMemberRole, updateProduction, toggleMessageReaction, togglePinMessage, updateProductionNotes, updateTaskStatus, updateWorkspace, uploadMessageAttachment,
} from '@/lib/cloud';

type Section = 'inicio'|'producciones'|'ideas'|'biblioteca'|'calendario'|'tareas'|'chat'|'equipo'|'configuracion'|'reunion';
type Status = 'Idea'|'En preparación'|'Listo'|'En vivo'|'Emitido'|'Archivado';
type TaskStatus = 'Pendiente'|'En curso'|'Hecho';
type Production = {id:string;title:string;type:string;status:Status;date:string;time:string;duration:number;completion:number;topic:string;question:string;objective:string;description:string;references:string[];hosts:string[];guests:string[];notes:string;members:string[];resourceIds?:string[]};
type Block = {id:string;productionId:string;order:number;type:string;title:string;duration:number;responsible:string;responsibleId?:string|null;notes:string;status:string};
type IdeaComment = {id:string;author:string;authorId?:string;text:string;time:string};
type Idea = {id:string;title:string;description:string;tags:string[];author:string;reactions:number;comments:number;commentItems?:IdeaComment[];archived?:boolean};
type LibraryItem = {id:string;title:string;category:string;url:string;note:string;source:string;tags:string[];previewTitle?:string;previewDescription?:string;previewImage?:string;previewSite?:string;previewKind?:string;previewFetchedAt?:string;storagePath?:string;fileName?:string;fileMime?:string;fileSize?:number;fileUrl?:string};
type Task = {id:string;title:string;status:TaskStatus;assignee:string;due:string;dueDate?:string;dueAt?:string|null;priority:string;productionId?:string};
type Attachment = {id:string;name:string;mimeType:string;size:number;url:string};
type Reaction = {userId:string;emoji:string};
type Message = {id:string;channel:string;author:string;authorId?:string;text:string;time:string;replyTo?:string|null;pinned?:boolean;reactions?:Reaction[];attachments?:Attachment[]};
type Channel = {id:string;name:string;dbId?:string;productionId?:string;kind?:string};
type Member = {id:string;name:string;initials:string;role:string;status:string;color:string};
type Workspace = {id:string;name:string;type:string;description:string;initials:string};
type CalendarEvent = {id:string;title:string;kind:string;startsAt:string;endsAt?:string|null;notes:string;productionId?:string};
type ModalKind = 'production'|'idea'|'library'|'task'|null;

const seedMembers: Member[] = [
  {id:'m1',name:'Ariel Cataldo',initials:'AC',role:'Administrador',status:'Disponible',color:'#3e332b'},
  {id:'m2',name:'Sofía Benítez',initials:'SB',role:'Productora',status:'En producción',color:'#6f7258'},
  {id:'m3',name:'Mateo Ruiz',initials:'MR',role:'Conductor',status:'Disponible',color:'#55758f'},
  {id:'m4',name:'Valentina Paz',initials:'VP',role:'Editora',status:'Disponible',color:'#9b6b5c'},
  {id:'m5',name:'Tomás Vega',initials:'TV',role:'Operador',status:'Ausente',color:'#7c6b82'},
];
let members: Member[] = seedMembers;

const seedProductions: Production[] = [
  {id:'p1',title:'Especial de entrevistas — Creatividad local',type:'Radio',status:'En preparación',date:'2026-10-03',time:'18:30',duration:90,completion:68,topic:'Cómo nacen proyectos creativos fuera de las grandes ciudades',question:'¿Qué hace falta para convertir una idea local en algo que conecte con otros?',objective:'Conversar con creadores y dejar herramientas concretas para empezar.',description:'Especial con entrevistas, música y conversación en mesa.',references:['Informe de economía creativa','Entrevista previa con invitada'],hosts:['Mateo Ruiz','Sofía Benítez'],guests:['Lucía Ferrer'],notes:'Priorizar historias personales y evitar una entrevista demasiado técnica.',members:['m1','m2','m3','m5']},
  {id:'p2',title:'Mesa abierta — Redes y vida cotidiana',type:'Streaming',status:'Idea',date:'2026-10-08',time:'20:00',duration:75,completion:22,topic:'Hábitos digitales y relaciones',question:'¿Estamos eligiendo cómo usamos las redes o simplemente reaccionando?',objective:'Abrir una conversación plural con experiencias cotidianas.',description:'Programa de conversación con participación del público.',references:['Datos de uso móvil 2026'],hosts:['Sofía Benítez','Mateo Ruiz'],guests:[],notes:'Sumar encuesta en vivo.',members:['m2','m3','m4']},
  {id:'p3',title:'Podcast #12 — Volver a empezar',type:'Podcast',status:'Listo',date:'2026-10-01',time:'10:00',duration:48,completion:100,topic:'Reinicios personales y profesionales',question:'¿Cómo se vuelve a empezar sin negar lo vivido?',objective:'Construir un episodio íntimo y práctico.',description:'Episodio narrativo con dos testimonios.',references:['Notas de preproducción'],hosts:['Ariel Cataldo'],guests:['Martín Acosta'],notes:'Grabación confirmada.',members:['m1','m4']},
];

const seedBlocks: Block[] = [
  {id:'b1',productionId:'p1',order:1,type:'Apertura',title:'Bienvenida y presentación del especial',duration:5,responsible:'Mateo Ruiz',notes:'Presentar la pregunta central y adelantar invitados.',status:'Listo'},
  {id:'b2',productionId:'p1',order:2,type:'Tema',title:'¿Qué entendemos por creatividad local?',duration:12,responsible:'Sofía Benítez',notes:'Contexto breve + ejemplos concretos.',status:'Listo'},
  {id:'b3',productionId:'p1',order:3,type:'Entrevista',title:'Entrevista a Lucía Ferrer',duration:24,responsible:'Mateo Ruiz',notes:'Origen del proyecto, primera dificultad, punto de quiebre.',status:'Pendiente'},
  {id:'b4',productionId:'p1',order:4,type:'Canción',title:'Corte musical',duration:4,responsible:'Tomás Vega',notes:'Tema por confirmar.',status:'Pendiente'},
  {id:'b5',productionId:'p1',order:5,type:'Debate',title:'Qué necesita una idea para crecer',duration:20,responsible:'Sofía Benítez',notes:'Mesa abierta y mensajes de audiencia.',status:'Pendiente'},
  {id:'b6',productionId:'p1',order:6,type:'Cierre',title:'Conclusiones y próximos contenidos',duration:7,responsible:'Mateo Ruiz',notes:'Una idea accionable por conductor.',status:'Pendiente'},
  {id:'b7',productionId:'p2',order:1,type:'Apertura',title:'Disparador inicial',duration:6,responsible:'Sofía Benítez',notes:'Encuesta rápida.',status:'Pendiente'},
  {id:'b8',productionId:'p3',order:1,type:'Apertura',title:'Introducción narrativa',duration:4,responsible:'Ariel Cataldo',notes:'Versión final.',status:'Listo'},
];

const seedIdeas: Idea[] = [
  {id:'i1',title:'El costo invisible de estar siempre disponible',description:'Programa sobre mensajes, trabajo, notificaciones y la sensación de tener que responder todo el tiempo.',tags:['bienestar','tecnología','debate'],author:'Sofía Benítez',reactions:8,comments:4},
  {id:'i2',title:'Historias de oficios que están cambiando',description:'Invitar a personas de oficios tradicionales y preguntar cómo la tecnología transformó su día a día.',tags:['historias','entrevistas'],author:'Mateo Ruiz',reactions:12,comments:3},
  {id:'i3',title:'¿Qué canción te devuelve a un momento exacto?',description:'Episodio participativo centrado en memoria, música y relatos de la audiencia.',tags:['música','audiencia'],author:'Ariel Cataldo',reactions:17,comments:7},
];

const seedLibrary: LibraryItem[] = [
  {id:'l1',title:'Informe sobre hábitos digitales 2026',category:'Investigación',url:'https://example.com/habitos-digitales',note:'Datos para el programa sobre redes.',source:'Observatorio Digital',tags:['redes','datos']},
  {id:'l2',title:'Playlist — aperturas con energía',category:'Canción',url:'https://open.spotify.com/',note:'Opciones musicales para aperturas.',source:'Spotify',tags:['música','apertura']},
  {id:'l3',title:'Entrevista: crear desde ciudades pequeñas',category:'Video',url:'https://www.youtube.com/',note:'Buen disparador para Creatividad local.',source:'YouTube',tags:['creatividad','entrevista']},
];

const seedTasks: Task[] = [
  {id:'t1',title:'Confirmar canción de corte',status:'Pendiente',assignee:'Tomás Vega',due:'Hoy',priority:'Alta',productionId:'p1'},
  {id:'t2',title:'Preparar 6 preguntas para Lucía',status:'En curso',assignee:'Mateo Ruiz',due:'Mañana',priority:'Alta',productionId:'p1'},
  {id:'t3',title:'Diseñar placa de encuesta',status:'Pendiente',assignee:'Valentina Paz',due:'2 oct',priority:'Media',productionId:'p2'},
  {id:'t4',title:'Editar teaser Podcast #12',status:'Hecho',assignee:'Valentina Paz',due:'29 sep',priority:'Media',productionId:'p3'},
];

const seedChannels: Channel[] = [{id:'general',name:'General'},{id:'p1',name:'Creatividad local'},{id:'p2',name:'Redes y vida cotidiana'}];
const seedMessages: Message[] = [
  {id:'msg1',channel:'general',author:'Sofía Benítez',text:'Dejé dos ideas nuevas para revisar en la reunión.',time:'09:18'},
  {id:'msg2',channel:'general',author:'Mateo Ruiz',text:'Buenísimo. También agregué el link de la entrevista sobre creatividad local.',time:'09:26'},
  {id:'msg3',channel:'p1',author:'Tomás Vega',text:'Estoy buscando una canción de corte que no cambie demasiado el clima del bloque.',time:'10:02'},
];

function id(prefix:string){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`}
function load<T>(key:string, fallback:T):T { if(typeof window==='undefined') return fallback; try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback} }
function Avatar({name}:{name:string}){const m=members.find(x=>x.name===name);const initials=m?.initials??name.split(' ').map(x=>x[0]).join('').slice(0,2);return <span className="avatar" style={{background:m?.color}}>{initials}</span>}

export default function Home(){
  const [mode,setMode]=useState<'loading'|'auth'|'onboarding'|'demo'|'cloud'>('loading');
  const [user,setUser]=useState<User|null>(null);
  const [currentUserName,setCurrentUserName]=useState('Vos');
  const [workspaceList,setWorkspaceList]=useState<Workspace[]>([]);
  const [cloudError,setCloudError]=useState('');
  const [section,setSection]=useState<Section>('inicio');
  const [globalSearch,setGlobalSearch]=useState('');
  const [mobileMore,setMobileMore]=useState(false);
  const [productions,setProductions]=useState<Production[]>(seedProductions);
  const [blocks,setBlocks]=useState<Block[]>(seedBlocks);
  const [ideas,setIdeas]=useState<Idea[]>(seedIdeas);
  const [library,setLibrary]=useState<LibraryItem[]>(seedLibrary);
  const [tasks,setTasks]=useState<Task[]>(seedTasks);
  const [messages,setMessages]=useState<Message[]>(seedMessages);
  const [channels,setChannels]=useState<Channel[]>(seedChannels);
  const [calendarEvents,setCalendarEvents]=useState<CalendarEvent[]>([]);
  const [selectedProduction,setSelectedProduction]=useState<string|null>(null);
  const [productionTab,setProductionTab]=useState('resumen');
  const [channel,setChannel]=useState('general');
  const [modal,setModal]=useState<ModalKind>(null);
  const [programMode,setProgramMode]=useState(false);
  const [programIndex,setProgramIndex]=useState(0);
  const [timer,setTimer]=useState(0);
  const [timerRunning,setTimerRunning]=useState(false);
  const [workspace,setWorkspace]=useState<Workspace>({id:'w1',name:'Estudio Norte',type:'Multiformato',description:'Radio, streaming y podcast',initials:'EN'});
  const [hydrated,setHydrated]=useState(false);
  const [calendarCreateOpen,setCalendarCreateOpen]=useState(false);
  const [workspaceCreateOpen,setWorkspaceCreateOpen]=useState(false);
  const [resourceModalTab,setResourceModalTab]=useState<'link'|'file'>('link');

  const loadCloud=useCallback(async(wid:string)=>{
    const snap=await loadWorkspaceSnapshot(wid);
    members=(snap.members as Member[]).length?snap.members as Member[]:seedMembers;
    setWorkspace(snap.workspace as Workspace);
    setProductions(snap.productions as Production[]);
    setBlocks(snap.blocks as Block[]);
    setIdeas(snap.ideas as Idea[]);
    setLibrary(snap.library as LibraryItem[]);
    setTasks(snap.tasks as Task[]);
    setChannels((snap.channels as Channel[]).length?snap.channels as Channel[]:[{id:'general',name:'General'}]);
    setMessages(snap.messages as Message[]);
    setCalendarEvents((snap.calendarEvents??[]) as CalendarEvent[]);
    const general=(snap.channels as Channel[]).find(c=>c.id==='general')?.id ?? (snap.channels as Channel[])[0]?.id ?? 'general';
    setChannel(current=>(snap.channels as Channel[]).some(c=>c.id===current)?current:general);
    setSelectedProduction(current=>(snap.productions as Production[]).some(p=>p.id===current)?current:null);
    setHydrated(false);
    setMode('cloud');
    localStorage.setItem('avodah-active-workspace',wid);
  },[]);

  const refreshWorkspaces=useCallback(async()=>{
    const list=await listWorkspaces() as Workspace[];
    setWorkspaceList(list);
    return list;
  },[]);

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      try{
        const u=await getCurrentUser();
        if(!alive)return;
        if(!u){setMode('auth');return;}
        setUser(u);
        setCurrentUserName(String(u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split('@')[0]||'Integrante'));
        const invite=new URLSearchParams(window.location.search).get('invite');
        if(invite){
          try{
            const wid=await joinWorkspace(invite);
            const clean=new URL(window.location.href);clean.searchParams.delete('invite');window.history.replaceState({},'',clean.toString());
            const list=await refreshWorkspaces();
            if(!alive)return;
            setWorkspaceList(list);
            await loadCloud(wid);
            return;
          }catch(err){setCloudError(err instanceof Error?err.message:'La invitación no es válida o venció.');}
        }
        const list=await refreshWorkspaces();
        if(!alive)return;
        if(!list.length){setMode('onboarding');return;}
        const saved=localStorage.getItem('avodah-active-workspace');
        const wid=list.some(w=>w.id===saved)?saved!:list[0].id;
        await loadCloud(wid);
      }catch(err){
        if(alive){setCloudError(err instanceof Error?err.message:'No se pudo conectar con AVODAH Cloud.');setMode('auth');}
      }
    })();
    return()=>{alive=false};
  },[loadCloud,refreshWorkspaces]);

  const startDemo=()=>{
    members=seedMembers;
    setProductions(load('avodah-productions',seedProductions));
    setBlocks(load('avodah-blocks',seedBlocks));
    setIdeas(load('avodah-ideas',seedIdeas));
    setLibrary(load('avodah-library',seedLibrary));
    setTasks(load('avodah-tasks',seedTasks));
    setMessages(load('avodah-messages',seedMessages));
    setChannels(seedChannels);
    setCalendarEvents([]);
    setWorkspace(load('avodah-workspace',{id:'w1',name:'Estudio Norte',type:'Multiformato',description:'Radio, streaming y podcast',initials:'EN'}));
    setCurrentUserName('Ariel Cataldo');
    setHydrated(true);setMode('demo');
  };

  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-productions',JSON.stringify(productions))},[productions,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-blocks',JSON.stringify(blocks))},[blocks,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-ideas',JSON.stringify(ideas))},[ideas,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-library',JSON.stringify(library))},[library,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-tasks',JSON.stringify(tasks))},[tasks,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-messages',JSON.stringify(messages))},[messages,hydrated,mode]);
  useEffect(()=>{if(mode==='demo'&&hydrated)localStorage.setItem('avodah-workspace',JSON.stringify(workspace))},[workspace,hydrated,mode]);
  useEffect(()=>{if(!timerRunning)return;const t=setInterval(()=>setTimer(x=>x+1),1000);return()=>clearInterval(t)},[timerRunning]);
  useEffect(()=>{if(mode!=='cloud'||!workspace.id)return;return subscribeWorkspace(workspace.id,()=>{void loadCloud(workspace.id)})},[mode,workspace.id,loadCloud]);

  const cloudAction=async(action:()=>Promise<void>)=>{try{setCloudError('');await action();if(mode==='cloud'&&workspace.id)await loadCloud(workspace.id)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo guardar el cambio.')}};
  const handleProduction=async(p:Production)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await insertProduction(workspace.id,user.id,p)});else setProductions(x=>[p,...x])};
  const handleIdea=async(i:Idea)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await insertIdea(workspace.id,user.id,i)});else setIdeas(x=>[i,...x])};
  const handleLibrary=async(i:LibraryItem)=>{
    let item=i;
    if(safeResourceUrl(i.url)&&!i.previewFetchedAt){
      let preview:ResourcePreview={...guessResourcePreview(i.url),fetchedAt:new Date().toISOString()};
      try {preview=await requestResourcePreview(i.url,mode==='demo')} catch {/* Keep provider fallback. */}
      item={...i,...previewFields(preview)};
    }
    if(mode==='cloud'&&user){
      try{setCloudError('');await insertLibraryItem(workspace.id,user.id,item);await loadCloud(workspace.id)}
      catch(err){setCloudError(err instanceof Error?err.message:'No se pudo guardar el recurso.');throw err}
    }else setLibrary(x=>[item,...x]);
  };
  const handleUploadFile=async(file:File,info:UploadResourceInfo)=>{
    if(mode!=='cloud'||!user)throw new Error('Iniciá sesión con Google para subir archivos.');
    try{setCloudError('');await uploadLibraryFile(workspace.id,user.id,file,info);await loadCloud(workspace.id)}
    catch(err){setCloudError(err instanceof Error?err.message:'No se pudo subir el archivo.');throw err}
  };
  const handlePreviewResource=async(i:LibraryItem)=>{
    let preview:ResourcePreview={...guessResourcePreview(i.url),fetchedAt:new Date().toISOString()};
    try {preview=await requestResourcePreview(i.url,mode==='demo')} catch {/* Keep provider fallback for inaccessible sites. */}
    if(mode==='cloud'){
      try{setCloudError('');await updateLibraryPreview(i.id,preview);await loadCloud(workspace.id)}
      catch(err){setCloudError(err instanceof Error?err.message:'No se pudo actualizar la vista previa.');throw err}
    }else setLibrary(x=>x.map(item=>item.id===i.id?{...item,...previewFields(preview)}:item));
  };
  const handleUpdateLibrary=async(i:LibraryItem)=>{
    if(mode==='cloud'){
      try{setCloudError('');await cloudUpdateLibraryItem(i.id,{title:i.title,note:i.note,category:i.category,source:i.source,tags:i.tags});await loadCloud(workspace.id)}
      catch(err){setCloudError(err instanceof Error?err.message:'No se pudo editar el recurso.');throw err}
    }else setLibrary(x=>x.map(item=>item.id===i.id?{...item,...i}:item));
  };
  const handleTask=async(t:Task)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await insertTask(workspace.id,user.id,t,members)});else setTasks(x=>[t,...x])};
  const handleReactIdea=async(i:Idea)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await cloudReactIdea(i.id,user.id)});else setIdeas(x=>x.map(q=>q.id===i.id?{...q,reactions:q.reactions+1}:q))};
  const handleCommentIdea=async(i:Idea,text:string)=>{if(!text.trim())return;if(mode==='cloud'&&user)await cloudAction(async()=>{await insertIdeaComment(i.id,user.id,text.trim())});else setIdeas(all=>all.map(x=>x.id===i.id?{...x,comments:x.comments+1,commentItems:[...(x.commentItems??[]),{id:id('ic'),author:currentUserName,text:text.trim(),time:'Ahora'}]}:x))};
  const handleArchiveIdea=async(i:Idea)=>{if(mode==='cloud')await cloudAction(async()=>{await cloudArchiveIdea(i.id)});else setIdeas(x=>x.map(q=>q.id===i.id?{...q,archived:true}:q))};
  const handleConvertIdea=async(i:Idea)=>{const p:Production={id:id('p'),title:i.title,type:'Personalizado',status:'Idea',date:'2026-10-10',time:'19:00',duration:60,completion:10,topic:i.title,question:i.description,objective:'Definir objetivo',description:i.description,references:[],hosts:[currentUserName],guests:[],notes:'Creada desde una idea.',members:user?[user.id]:['m1']};if(mode==='cloud'&&user)await cloudAction(async()=>{await insertProduction(workspace.id,user.id,p);await cloudArchiveIdea(i.id)});else{setProductions(x=>[p,...x]);setIdeas(x=>x.map(q=>q.id===i.id?{...q,archived:true}:q))}};
  const handleTaskStatus=async(t:Task,status:TaskStatus)=>{if(mode==='cloud')await cloudAction(async()=>{await updateTaskStatus(t.id,status)});else setTasks(all=>all.map(x=>x.id===t.id?{...x,status}:x))};
  const handleSend=async(channelId:string,text:string,file?:File)=>{if(mode==='cloud'&&user){const dbId=channels.find(c=>c.id===channelId)?.dbId??channelId;await cloudAction(async()=>{const messageId=await insertMessage(dbId,user.id,text||file?.name||'Archivo adjunto');if(file)await uploadMessageAttachment(workspace.id,messageId,file)})}else setMessages(x=>[...x,{id:id('msg'),channel:channelId,author:currentUserName,text:text||file?.name||'Archivo adjunto',time:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),attachments:file?[{id:id('att'),name:file.name,mimeType:file.type,size:file.size,url:URL.createObjectURL(file)}]:[]}])};
  const handleAddBlock=async(b:Block)=>{if(mode==='cloud'){try{setCloudError('');await insertBlock(b.productionId,b,members);await loadCloud(workspace.id)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo guardar el bloque.');throw err}}else setBlocks(x=>[...x,b])};
  const handleMoveBlock=async(pid:string,bid:string,dir:-1|1)=>{const scoped=blocks.filter(b=>b.productionId===pid).sort((a,b)=>a.order-b.order);const i=scoped.findIndex(b=>b.id===bid);const j=i+dir;if(j<0||j>=scoped.length)return;const a=scoped[i],b=scoped[j];if(mode==='cloud'){await cloudAction(async()=>{await updateBlockPosition(a.id,-1000-a.order);await updateBlockPosition(b.id,a.order);await updateBlockPosition(a.id,b.order)})}else setBlocks(all=>all.map(x=>x.id===a.id?{...x,order:b.order}:x.id===b.id?{...x,order:a.order}:x))};
  const handleDuplicateBlock=async(b:Block)=>{const copy={...b,id:id('b'),order:Math.max(...blocks.filter(x=>x.productionId===b.productionId).map(q=>q.order),0)+1,title:`${b.title} (copia)`};await handleAddBlock(copy)};
  const handleEditProduction=async(p:Production)=>{if(mode==='cloud')await cloudAction(async()=>{await updateProduction(p.id,p)});else setProductions(all=>all.map(x=>x.id===p.id?p:x))};
  const handleDeleteProduction=async(p:Production)=>{if(!window.confirm(`¿Eliminar \"${p.title}\"? Se eliminarán también su escaleta, tareas y chat asociados.`))return;if(mode==='cloud')await cloudAction(async()=>{await deleteProduction(p.id)});else{setProductions(all=>all.filter(x=>x.id!==p.id));setBlocks(all=>all.filter(x=>x.productionId!==p.id));setTasks(all=>all.filter(x=>x.productionId!==p.id));setMessages(all=>all.filter(x=>x.channel!==p.id))}setSelectedProduction(null)};
  const handleSaveNotes=async(pid:string,notes:string)=>{if(mode==='cloud')await cloudAction(async()=>{await updateProductionNotes(pid,notes)});else setProductions(all=>all.map(x=>x.id===pid?{...x,notes}:x))};
  const handleEditBlock=async(b:Block)=>{if(mode==='cloud'){try{setCloudError('');await updateBlock(b.id,b,members);await loadCloud(workspace.id)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo editar el bloque.');throw err}}else setBlocks(all=>all.map(x=>x.id===b.id?b:x))};
  const handleDeleteBlock=async(b:Block)=>{if(!window.confirm(`¿Eliminar el bloque \"${b.title}\"?`))return;if(mode==='cloud')await cloudAction(async()=>{await deleteBlock(b.id)});else setBlocks(all=>all.filter(x=>x.id!==b.id))};
  const handleLinkResource=async(pid:string,itemId:string)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await linkResourceToProduction(pid,itemId,user.id)});else setProductions(all=>all.map(x=>x.id===pid?{...x,resourceIds:Array.from(new Set([...(x.resourceIds??[]),itemId]))}:x))};
  const handleUnlinkResource=async(pid:string,itemId:string)=>{if(mode==='cloud')await cloudAction(async()=>{await unlinkResourceFromProduction(pid,itemId)});else setProductions(all=>all.map(x=>x.id===pid?{...x,resourceIds:(x.resourceIds??[]).filter(id=>id!==itemId)}:x))};
  const handleArchiveLibrary=async(item:LibraryItem)=>{if(!window.confirm(`¿Archivar \"${item.title}\"?`))return;if(mode==='cloud')await cloudAction(async()=>{await deleteLibraryItem(item.id)});else setLibrary(all=>all.filter(x=>x.id!==item.id))};
  const handleDeleteTask=async(t:Task)=>{if(!window.confirm(`¿Eliminar la tarea \"${t.title}\"?`))return;if(mode==='cloud')await cloudAction(async()=>{await deleteTask(t.id)});else setTasks(all=>all.filter(x=>x.id!==t.id))};
  const handleMemberRole=async(memberId:string,role:string)=>{if(mode==='cloud')await cloudAction(async()=>{await updateMemberRole(workspace.id,memberId,role)});else{members=members.map(m=>m.id===memberId?{...m,role}:m);setWorkspace(w=>({...w}))}};
  const handleMessageReaction=async(message:Message,emoji:string)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await toggleMessageReaction(message.id,user.id,emoji)});else setMessages(all=>all.map(m=>m.id===message.id?{...m,reactions:[...(m.reactions??[]),{userId:'demo',emoji}]}:m))};
  const handlePinMessage=async(message:Message)=>{if(mode==='cloud'&&user)await cloudAction(async()=>{await togglePinMessage(message.id,!message.pinned,user.id)});else setMessages(all=>all.map(m=>m.id===message.id?{...m,pinned:!m.pinned}:m))};
  const handleCreateEvent=()=>setCalendarCreateOpen(true);
  const handleSaveCalendar=async(draft:CalendarDraft)=>{
    const startsAt=new Date(`${draft.date}T${draft.time}:00-03:00`).toISOString();
    if(mode==='cloud'&&user){try{setCloudError('');await insertCalendarEvent(workspace.id,user.id,{title:draft.title,kind:draft.kind,startsAt,notes:draft.notes});await loadCloud(workspace.id)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo crear el evento.');throw err}}
    else setCalendarEvents(all=>[...all,{id:id('ev'),title:draft.title,kind:draft.kind,startsAt,notes:draft.notes}]);
  };
    const handleDeleteEvent=async(event:CalendarEvent)=>{if(!window.confirm(`¿Eliminar el evento \"${event.title}\"?`))return;if(mode==='cloud')await cloudAction(async()=>{await deleteCalendarEvent(event.id)});else setCalendarEvents(all=>all.filter(x=>x.id!==event.id))};
  const handleSaveWorkspace=async(w:Workspace)=>{setWorkspace(w);if(mode==='cloud')await cloudAction(async()=>{await updateWorkspace(w.id,w)});else alert('Configuración guardada en este dispositivo.')};
  const handleInvite=async()=>{if(mode!=='cloud'||!user)return;try{const invite=await createWorkspaceInvite(workspace.id,user.id);const link=`${window.location.origin}${window.location.pathname}?invite=${invite.code}`;try{await navigator.clipboard.writeText(link)}catch{}alert(`Invitación creada y copiada:\n\n${link}\n\nVence en 7 días.`)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo crear la invitación.')}};
  const handleCreateWorkspace=()=>{if(mode==='cloud'&&user)setWorkspaceCreateOpen(true)};
  const handleCreateWorkspaceFromEditor=async(draft:WorkspaceDraft)=>{
    if(mode!=='cloud'||!user)throw new Error('Iniciá sesión para crear otro espacio.');
    try{setCloudError('');const wid=await createWorkspace(user.id,draft.name,draft.type,draft.description);await refreshWorkspaces();await loadCloud(wid)}
    catch(err){setCloudError(err instanceof Error?err.message:'No se pudo crear el espacio.');throw err}
  };

  if(mode==='loading')return <LoadingScreen/>;
  if(mode==='auth')return <AuthScreen error={cloudError} onDemo={startDemo} onAuthenticated={async(u)=>{setUser(u);setCurrentUserName(String(u.user_metadata?.full_name||u.email?.split('@')[0]||'Integrante'));const invite=new URLSearchParams(window.location.search).get('invite');if(invite){try{const wid=await joinWorkspace(invite);const clean=new URL(window.location.href);clean.searchParams.delete('invite');window.history.replaceState({},'',clean.toString());await refreshWorkspaces();await loadCloud(wid);return}catch(err){setCloudError(err instanceof Error?err.message:'La invitación no es válida o venció.')}}const list=await refreshWorkspaces();if(!list.length){setMode('onboarding');return}await loadCloud(list[0].id)}}/>;
  if(mode==='onboarding'&&user)return <OnboardingScreen user={user} error={cloudError} onCreate={async(name,type,description)=>{try{const wid=await createWorkspace(user.id,name,type,description);await refreshWorkspaces();await loadCloud(wid)}catch(err){setCloudError(err instanceof Error?err.message:'No se pudo crear el espacio.')}}} onJoin={async(code)=>{try{const wid=await joinWorkspace(code);await refreshWorkspaces();await loadCloud(wid)}catch(err){setCloudError(err instanceof Error?err.message:'Código inválido o vencido.')}}} onSignOut={async()=>{await signOut();setUser(null);setMode('auth')}}/>;

  const currentProduction=productions.find(p=>p.id===selectedProduction)??null;
  const currentBlocks=blocks.filter(b=>b.productionId===selectedProduction).sort((a,b)=>a.order-b.order);
  const go=(s:Section)=>{setSection(s);setSelectedProduction(null)};
  const openProduction=(pid:string)=>{setSelectedProduction(pid);setSection('producciones');setProductionTab('escaleta')};
  const startProgram=(pid:string)=>{setSelectedProduction(pid);setProgramIndex(0);setTimer(0);setTimerRunning(false);setProgramMode(true)};
  const isCloud=mode==='cloud';
  const navItems: Array<[Section, LucideIcon, string]> = [['inicio',LayoutDashboard,'Inicio'],['producciones',Radio,'Producciones'],['ideas',Lightbulb,'Ideas'],['biblioteca',BookOpen,'Biblioteca'],['calendario',CalendarDays,'Calendario'],['tareas',CheckSquare,'Tareas'],['chat',MessageCircle,'Chat'],['equipo',Users,'Equipo'],['configuracion',SettingsIcon,'Configuración']];
  const quickSearch=[...productions.map(p=>({id:p.id,title:p.title,type:'Producción',section:'producciones' as Section})),...ideas.filter(i=>!i.archived).map(i=>({id:i.id,title:i.title,type:'Idea',section:'ideas' as Section})),...tasks.map(t=>({id:t.id,title:t.title,type:'Tarea',section:'tareas' as Section}))].filter(item=>globalSearch.trim()&&item.title.toLocaleLowerCase('es').includes(globalSearch.trim().toLocaleLowerCase('es'))).slice(0,6);
  const currentMember=members.find(m=>m.id===user?.id)??members.find(m=>m.name===currentUserName);

  return <div className="app">
    <aside className="sidebar">
      <div className="sidebar-identity"><div className="brand brand-lockup"><BrandMark/><span>AVODAH</span></div><div className="tagline">ESTUDIO DE PRODUCCIÓN</div></div>
      <div className="workspace"><span className="workspace-mark">{workspace.initials}</span><div className="grow"><strong>{workspace.name}</strong><small>{workspace.type}</small>{isCloud&&workspaceList.length>1&&<select className="workspace-switch" value={workspace.id} onChange={e=>{void loadCloud(e.target.value)}}>{workspaceList.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>}</div></div>
      <div className="sidebar-nav-label">MENÚ PRINCIPAL</div>
      <nav className="nav" aria-label="Navegación principal">{navItems.map(([key,Icon,label])=><button key={key} className={section===key?'active':''} onClick={()=>go(key)}><Icon className="nav-icon" size={18} strokeWidth={1.85}/><span>{label}</span>{section===key&&<span className="nav-active-dot"/>}</button>)}</nav>
      <div className="side-bottom"><button className="meet-btn" onClick={()=>go('reunion')}><Video size={17} strokeWidth={1.8}/> Entrar a reunión</button><div className="profile"><Avatar name={currentUserName}/><div className="grow"><strong>{currentUserName}</strong><small>{isCloud?(currentMember?.role||'Integrante'):'Demo local'}</small></div>{isCloud&&<button className="signout" title="Cerrar sesión" onClick={()=>{void signOut().then(()=>{setUser(null);setMode('auth')})}}>↪</button>}</div></div>
    </aside>

    <main className="main">
      <div className="mobile-head"><div className="brand brand-lockup"><BrandMark/><span>AVODAH</span></div><div className="mobile-workspace-label">{workspace.name}</div><button className="mobile-meet" aria-label="Abrir reunión" onClick={()=>go('reunion')}><Video size={19}/></button></div>
      <div className="global-toolbar">
        <div className="toolbar-location"><span className="toolbar-workspace">{workspace.name}</span><ChevronRight size={14}/><span>{section==='inicio'?'Resumen':navItems.find(x=>x[0]===section)?.[2]??'Reunión'}</span></div>
        <div className="toolbar-right">
          <div className="global-search-wrap"><Search size={17}/><input aria-label="Buscar en AVODAH" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar producciones, ideas, tareas..." />{globalSearch&&<button aria-label="Limpiar búsqueda" onClick={()=>setGlobalSearch('')}><X size={15}/></button>}
            {globalSearch.trim()&&<div className="global-search-results">{quickSearch.length?quickSearch.map(item=><button key={item.type+item.id} onClick={()=>{setGlobalSearch('');if(item.section==='producciones')openProduction(item.id);else go(item.section)}}><span><strong>{item.title}</strong><small>{item.type}</small></span><ChevronRight size={16}/></button>):<p>No encontramos resultados.</p>}</div>}
          </div>
          <button className="toolbar-task-button" title="Ver tareas pendientes" aria-label="Ver tareas pendientes" onClick={()=>go('tareas')}><CheckSquare size={19}/>{tasks.some(t=>t.status!=='Hecho')&&<span/>}</button>
          <button className="toolbar-avatar" aria-label="Ver equipo" title="Ver equipo" onClick={()=>go('equipo')}><Avatar name={currentUserName}/></button>
        </div>
      </div>
      {cloudError&&<div className="notice error-notice">{cloudError}</div>}
      {currentProduction ? <ProductionDetail p={currentProduction} blocks={currentBlocks} tab={productionTab} setTab={setProductionTab} library={library} tasks={tasks} messages={messages} startProgram={()=>startProgram(currentProduction.id)} back={()=>setSelectedProduction(null)} onAddBlock={handleAddBlock} onMoveBlock={handleMoveBlock} onDuplicateBlock={handleDuplicateBlock} onEditProduction={handleEditProduction} onDeleteProduction={handleDeleteProduction} onSaveNotes={handleSaveNotes} onEditBlock={handleEditBlock} onDeleteBlock={handleDeleteBlock} onLinkResource={handleLinkResource} onUnlinkResource={handleUnlinkResource} onPreviewResource={handlePreviewResource} onUpdateResource={handleUpdateLibrary}/> :
       section==='inicio'?<Dashboard productions={productions} ideas={ideas} library={library} tasks={tasks} messages={messages} currentUserName={currentUserName} workspaceName={workspace.name} openProduction={openProduction} setModal={setModal} go={go}/>:
       section==='producciones'?<Productions productions={productions} openProduction={openProduction} setModal={setModal}/>:
       section==='ideas'?<Ideas ideas={ideas} setModal={setModal} onReact={handleReactIdea} onComment={handleCommentIdea} onArchive={handleArchiveIdea} onConvert={handleConvertIdea}/>:
       section==='biblioteca'?<ResourceLibrary items={library} productions={productions} onNew={()=>{setResourceModalTab('link');setModal('library')}} onNewFile={()=>{setResourceModalTab('file');setModal('library')}} onLink={handleLinkResource} onArchive={handleArchiveLibrary} onPreview={handlePreviewResource} onUpdate={handleUpdateLibrary}/>:
       section==='calendario'?<Calendar productions={productions} tasks={tasks} events={calendarEvents} onCreate={handleCreateEvent} onDelete={handleDeleteEvent}/>:
       section==='tareas'?<Tasks tasks={tasks} setModal={setModal} onStatus={handleTaskStatus} onDelete={handleDeleteTask}/>:
       section==='chat'?<Chat channels={channels} channel={channel} setChannel={setChannel} messages={messages} onSend={handleSend} onReact={handleMessageReaction} onPin={handlePinMessage} currentUserId={user?.id} cloud={isCloud}/>:
       section==='equipo'?<Team cloud={isCloud} canManage={currentMember?.role==='Administrador'} currentUserId={user?.id} onInvite={handleInvite} onRole={handleMemberRole}/>:
       section==='configuracion'?<Settings workspace={workspace} setWorkspace={setWorkspace} onSave={handleSaveWorkspace} onCreateWorkspace={handleCreateWorkspace} cloud={isCloud}/>:
       <Meeting workspace={workspace}/>
      }
    </main>

    <nav className="mobile-nav" aria-label="Navegación móvil">{([['inicio',LayoutDashboard,'Inicio'],['producciones',Radio,'Programas'],['ideas',Lightbulb,'Ideas'],['tareas',CheckSquare,'Tareas']] as Array<[Section,LucideIcon,string]>).map(([key,Icon,label])=><button key={key} className={section===key?'active':''} onClick={()=>{setMobileMore(false);go(key)}}><Icon size={20} strokeWidth={1.9}/><span>{label}</span></button>)}<button className={mobileMore?'active':''} onClick={()=>setMobileMore(x=>!x)} aria-expanded={mobileMore} aria-label="Más secciones">{mobileMore?<X size={20}/>:<Menu size={20}/>}<span>Más</span></button></nav>
    {mobileMore&&<div className="mobile-more"><div className="mobile-more-head"><strong>Ir a sección</strong><button onClick={()=>setMobileMore(false)} aria-label="Cerrar"><X size={18}/></button></div>{navItems.filter(([key])=>!['inicio','producciones','ideas','tareas'].includes(key)).map(([key,Icon,label])=><button key={key} onClick={()=>{setMobileMore(false);go(key)}}><Icon size={19}/>{label}<ChevronRight size={15}/></button>)}<button onClick={()=>{setMobileMore(false);go('reunion')}}><Video size={19}/>Reuniones<ChevronRight size={15}/></button></div>}

    {calendarCreateOpen&&<CalendarEditorDialog onClose={()=>setCalendarCreateOpen(false)} onSave={handleSaveCalendar}/>}
    {workspaceCreateOpen&&<WorkspaceEditorDialog onClose={()=>setWorkspaceCreateOpen(false)} onSave={handleCreateWorkspaceFromEditor}/>}
    {modal&&<Modal kind={modal} initialTab={resourceModalTab} onUpload={handleUploadFile} close={()=>{setModal(null);setResourceModalTab('link')}} productions={productions} currentUserName={currentUserName} demo={mode==='demo'} onProduction={handleProduction} onIdea={handleIdea} onLibrary={handleLibrary} onTask={handleTask}/>} 
    {programMode&&currentProduction&&<ProgramMode p={currentProduction} blocks={currentBlocks} index={programIndex} setIndex={setProgramIndex} timer={timer} setTimer={setTimer} running={timerRunning} setRunning={setTimerRunning} close={()=>setProgramMode(false)}/>} 
  </div>
}

function BrandMark(){return <svg className="brand-symbol" aria-hidden="true" width="29" height="29" viewBox="0 0 44 44" fill="none"><path d="M21.8 4.5 41 39H31.8L21.8 20.2 11.5 39H2.8L21.8 4.5Z" fill="currentColor"/><path d="M16.9 31.6h9.7l3.7 7.4H13.1l3.8-7.4Z" fill="#c47852"/></svg>}
function LoadingScreen(){return <div className="auth-shell"><div className="auth-card loading-card"><div className="brand big">AVODAH</div><p>Preparando tu espacio de trabajo…</p><div className="loader"/></div></div>}

function AuthScreen({error,onDemo,onAuthenticated}:{error:string;onDemo:()=>void;onAuthenticated:(u:User)=>void|Promise<void>}){
  const [kind,setKind]=useState<'login'|'signup'>('login');
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{if(kind==='login'){const {data,error:authError}=await signIn(email,password);if(authError)throw authError;if(data.user)await onAuthenticated(data.user)}else{const {data,error:authError}=await signUp(email,password,name);if(authError)throw authError;if(data.session&&data.user)await onAuthenticated(data.user);else setMessage('Cuenta creada. Revisá tu correo para confirmar el acceso y después iniciá sesión.')}}catch(err){setMessage(err instanceof Error?err.message:'No se pudo completar el acceso.')}finally{setBusy(false)}};
  const handleGoogle=async()=>{
    setBusy(true);
    setMessage('');
    try {
      const {error:authError}=await signInWithGoogle();
      if(authError)throw authError;
    } catch(err) {
      setMessage(err instanceof Error?err.message:'No pudimos iniciar sesión con Google. Revisá la configuración de Google en Supabase.');
      setBusy(false);
    }
  };
  const oauthError=typeof window!=='undefined'
    ?new URLSearchParams(window.location.search).get('error_description')
    :null;
  const invite=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('invite'):null;
  return <div className="auth-shell"><div className="auth-brand"><div className="brand big brand-lockup"><BrandMark/><span>AVODAH</span></div><span className="auth-kicker">TU ESPACIO CREATIVO</span><h1>Donde las ideas se convierten en programas.</h1><p>Un lugar para imaginar, organizar y producir lo que viene.</p><span className="auth-motto">ORGANIZÁ. CREÁ. PRODUCÍ. EN EQUIPO.</span><div className="auth-points"><span>✓ Escaletas y modo programa</span><span>✓ Chat y tareas en tiempo real</span><span>✓ Biblioteca compartida de recursos</span><span>✓ Reuniones y equipos por workspace</span></div></div><form className="auth-card" onSubmit={submit}><div className="auth-welcome"><span className="auth-form-kicker">TU ESPACIO DE TRABAJO</span><h2>{kind==='login'?'Bienvenido a AVODAH':'Creá tu cuenta'}</h2><p>{kind==='login'?'Ingresá a tu estudio y seguí creando.':'Empezá a trabajar con tu equipo.'}</p></div>{invite&&<div className="notice">Tenés una invitación pendiente. Iniciá sesión y te sumaremos al equipo automáticamente.</div>}<button type="button" className="btn google-signin" disabled={busy} onClick={()=>{void handleGoogle()}}><svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.02 46.98 31.86 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.47 14.47 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.88-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.15 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continuar con Google</span></button><div className="auth-divider"><span>o con correo electrónico</span></div>{kind==='signup'&&<div className="field"><label>Nombre</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required placeholder="Tu nombre"/></div>}<div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="equipo@ejemplo.com"/></div><div className="field"><label>Contraseña</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres"/></div>{(message||error||oauthError)&&<div className="notice error-notice">{message||error||oauthError}</div>}<button className="btn primary auth-submit" disabled={busy}>{busy?'Procesando…':kind==='login'?'Ingresar':'Crear cuenta'}</button><button type="button" className="auth-link" onClick={()=>{setKind(kind==='login'?'signup':'login');setMessage('')}}>{kind==='login'?'¿Primera vez? Crear una cuenta':'Ya tengo cuenta'}</button><div className="auth-divider"><span>o</span></div><button type="button" className="btn demo-btn" onClick={onDemo}>Probar demo sin registrarme</button><small className="muted">La demo guarda los cambios sólo en este dispositivo.</small></form></div>
}

function OnboardingScreen({user,error,onCreate,onJoin,onSignOut}:{user:User;error:string;onCreate:(name:string,type:string,description:string)=>void|Promise<void>;onJoin:(code:string)=>void|Promise<void>;onSignOut:()=>void|Promise<void>}){
  const [tab,setTab]=useState<'create'|'join'>(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('invite')?'join':'create');
  const [name,setName]=useState('');const [type,setType]=useState('Multiformato');const [description,setDescription]=useState('');const [code,setCode]=useState(()=>typeof window!=='undefined'?new URLSearchParams(window.location.search).get('invite')||'':'');const [busy,setBusy]=useState(false);
  const create=async(e:FormEvent)=>{e.preventDefault();if(!name.trim())return;setBusy(true);try{await onCreate(name.trim(),type,description.trim())}finally{setBusy(false)}};
  const join=async(e:FormEvent)=>{e.preventDefault();if(!code.trim())return;setBusy(true);try{await onJoin(code.trim())}finally{setBusy(false)}};
  return <div className="auth-shell onboarding-shell"><div className="auth-card onboarding-card"><div className="brand big">AVODAH</div><p className="muted">Hola, {String(user.user_metadata?.full_name||user.email?.split('@')[0]||'integrante')}.</p><h1>Creá tu primer espacio o sumate a un equipo</h1><div className="tabs onboarding-tabs"><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Crear espacio</button><button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Unirme con código</button></div>{error&&<div className="notice error-notice">{error}</div>}{tab==='create'?<form onSubmit={create}><div className="field"><label>Nombre del espacio</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required placeholder="Ej. Estudio Norte"/></div><div className="field"><label>Tipo principal</label><select className="select" value={type} onChange={e=>setType(e.target.value)}><option>Multiformato</option><option>Radio</option><option>Streaming</option><option>Podcast</option><option>Videopodcast</option><option>YouTube / Contenido</option></select></div><div className="field"><label>Descripción</label><textarea className="textarea" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Qué produce este equipo…"/></div><button className="btn primary auth-submit" disabled={busy}>{busy?'Creando…':'Crear espacio'}</button></form>:<form onSubmit={join}><div className="field"><label>Código de invitación</label><input className="input code-input" value={code} onChange={e=>setCode(e.target.value)} required placeholder="Pegá el código o usá el enlace recibido"/></div><button className="btn primary auth-submit" disabled={busy}>{busy?'Ingresando…':'Unirme al equipo'}</button></form>}<button className="auth-link" onClick={()=>{void onSignOut()}}>Cerrar sesión</button></div></div>
}

function Header({title,subtitle,children}:{title:string;subtitle:string;children?:React.ReactNode}){return <div className="topbar"><div><h1>{title}</h1><p>{subtitle}</p></div>{children&&<div className="actions">{children}</div>}</div>}

function Dashboard({productions,ideas,library,tasks,messages,currentUserName,workspaceName,openProduction,setModal,go}:{productions:Production[];ideas:Idea[];library:LibraryItem[];tasks:Task[];messages:Message[];currentUserName:string;workspaceName:string;openProduction:(id:string)=>void;setModal:(x:ModalKind)=>void;go:(s:Section)=>void}){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const candidates=productions.filter(p=>!['Emitido','Archivado'].includes(p.status));
  const chronological=(items:Production[])=>[...items].sort((a,b)=>`${a.date||'9999'}${a.time||''}`.localeCompare(`${b.date||'9999'}${b.time||''}`));
  const next=chronological(candidates.filter(p=>!p.date||p.date>=today))[0]??chronological(candidates)[0]??productions[0];
  const pending=tasks.filter(t=>t.status!=='Hecho').slice(0,4);
  const dateLabel=new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
  const greeting=currentUserName&&currentUserName!=='Vos'?currentUserName.split(/\s+/)[0]:'equipo';
  const actions:Array<{label:string,sub:string,Icon:LucideIcon,style:string,run:()=>void}>= [
    {label:'Nueva producción',sub:'Planificá tu programa',Icon:Radio,style:'copper',run:()=>setModal('production')},
    {label:'Nueva idea',sub:'Guardá una propuesta',Icon:Lightbulb,style:'amber',run:()=>setModal('idea')},
    {label:'Nueva tarea',sub:'Organizá el trabajo',Icon:CheckSquare,style:'sage',run:()=>setModal('task')},
    {label:'Abrir calendario',sub:'Próximas fechas',Icon:CalendarDays,style:'blue',run:()=>go('calendario')}
  ];
  return <div className="dashboard-v2">
    <div className="dashboard-welcome"><div><p className="overline">TU ESTUDIO · {workspaceName}</p><h1>¡Hola, {greeting}!</h1><p className="muted">Acá está el resumen de tu espacio de trabajo.</p></div><div className="dashboard-welcome-side"><span className="dashboard-date">{dateLabel}</span><button className="btn primary" onClick={()=>setModal('production')}><Plus size={17}/> Nueva producción</button></div></div>
    <section className="dashboard-quick" aria-label="Acciones rápidas">{actions.map(({label,sub,Icon,style,run})=><button className="dashboard-quick-card" onClick={run} key={label}><span className={'dashboard-quick-icon '+style}><Icon size={25} strokeWidth={1.75}/></span><strong>{label}</strong><small>{sub}</small><ArrowUpRight className="quick-arrow" size={17}/></button>)}</section>
    <div className="dashboard-feature-grid">
      <section className="dashboard-feature" aria-label="Próxima producción">
        {next?<><div className="feature-overlay"><span className="feature-badge"><span/> PRÓXIMA PRODUCCIÓN</span><h2>{next.title}</h2><div className="feature-meta"><span><CalendarDays size={15}/>{next.date||'Fecha pendiente'}</span><span><Clock3 size={15}/>{next.time||'Sin horario'}</span><span><Radio size={15}/>{next.type}</span></div><div className="feature-footer"><span className="feature-progress"><span><i style={{width:(next.completion||0)+'%'}}/></span><small>{next.completion||0}% preparado</small></span><button className="feature-open" onClick={()=>openProduction(next.id)} aria-label={'Abrir '+next.title}><ArrowUpRight size={21}/></button></div></div></>:<div className="feature-overlay feature-no-production"><span className="feature-badge">TU PRIMERA PRODUCCIÓN</span><h2>Todo gran programa empieza con una idea.</h2><p>Creá tu primer proyecto y comenzá a trabajar con tu equipo.</p><button className="btn primary" onClick={()=>setModal('production')}><Plus size={17}/> Empezar ahora</button></div>}
      </section>
      <section className="dashboard-panel task-panel">
        <div className="panel-heading"><div><span className="panel-kicker">POR RESOLVER</span><h2>Tareas pendientes <span className="panel-count">{tasks.filter(t=>t.status!=='Hecho').length}</span></h2></div><button onClick={()=>go('tareas')} aria-label="Ver todas las tareas"><ArrowUpRight size={19}/></button></div>
        <div className="pending-list">{pending.length?pending.map(t=><button className="pending-item" key={t.id} onClick={()=>go('tareas')}><span className={'pending-ring '+(t.status==='En curso'?'in-progress':'')}/><span className="pending-title">{t.title}</span><span className={'priority-chip '+(t.priority==='Alta'?'urgent':'')}>{t.due||t.priority}</span><ChevronRight size={15}/></button>):<div className="dashboard-empty">¡Todo al día! No hay tareas pendientes.</div>}</div>
        <button className="panel-bottom-link" onClick={()=>go('tareas')}>Abrir tablero de tareas <ArrowUpRight size={16}/></button>
      </section>
    </div>
    <div className="dashboard-lower-grid">
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="panel-kicker">EN MARCHA</span><h2>Producciones recientes</h2></div><button onClick={()=>go('producciones')} aria-label="Ver todas las producciones"><ArrowUpRight size={19}/></button></div><div className="mini-list">{productions.slice(0,3).map(p=><button className="mini-list-row" key={p.id} onClick={()=>openProduction(p.id)}><span className="mini-thumb production-thumb"><Mic2 size={20}/></span><span className="mini-content"><strong>{p.title}</strong><small>{p.date||'Sin fecha'} · {p.type}</small></span><span className={'mini-status '+(p.status==='Listo'?'ready':'')}>{p.status}</span></button>)}{!productions.length&&<p className="dashboard-empty">Todavía no hay producciones.</p>}</div></section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="panel-kicker">POR EXPLORAR</span><h2>Ideas recientes</h2></div><button onClick={()=>go('ideas')} aria-label="Explorar ideas"><ArrowUpRight size={19}/></button></div><div className="mini-list">{ideas.filter(i=>!i.archived).slice(0,3).map(i=><button className="mini-list-row" key={i.id} onClick={()=>go('ideas')}><span className="mini-thumb idea-thumb"><Lightbulb size={20}/></span><span className="mini-content"><strong>{i.title}</strong><small>{i.reactions} reacciones · {i.comments} comentarios</small></span><ChevronRight size={15}/></button>)}{!ideas.filter(i=>!i.archived).length&&<p className="dashboard-empty">Las mejores ideas empiezan acá.</p>}</div></section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="panel-kicker">EL EQUIPO</span><h2>Actividad reciente</h2></div><button onClick={()=>go('chat')} aria-label="Ir al chat"><ArrowUpRight size={19}/></button></div><div className="mini-list">{messages.slice(-3).reverse().map(m=><button className="mini-list-row activity-row" key={m.id} onClick={()=>go('chat')}><Avatar name={m.author}/><span className="mini-content"><strong>{m.author}</strong><small>{m.text}</small></span><span className="activity-time">{m.time}</span></button>)}{!messages.length&&<p className="dashboard-empty">El equipo todavía no inició ninguna conversación.</p>}</div></section>
    </div>
    {library.length>0&&<section className="dashboard-resource-link"><BookOpen size={18}/><span>Tenés <strong>{library.length} recursos</strong> guardados para tus producciones.</span><button onClick={()=>go('biblioteca')}>Abrir biblioteca <ArrowUpRight size={15}/></button></section>}
  </div>;
}
function Productions({productions,openProduction,setModal}:{productions:Production[];openProduction:(id:string)=>void;setModal:(x:ModalKind)=>void}){const [filter,setFilter]=useState('Todos');const list=filter==='Todos'?productions:productions.filter(p=>p.status===filter);return <><Header title="Producciones" subtitle="Planificá episodios, emisiones y contenidos desde una misma vista."><button className="btn primary" onClick={()=>setModal('production')}>+ Nueva producción</button></Header><div className="filters">{['Todos','Idea','En preparación','Listo','En vivo','Emitido','Archivado'].map(x=><button className={`filter ${filter===x?'active':''}`} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="grid three">{list.map(p=><div className="card production-card" key={p.id}><div className="card-foot"><span className="pill">{p.type}</span><span className={`pill ${p.status==='Listo'?'green':'orange'}`}>{p.status}</span></div><div><h3>{p.title}</h3><p className="muted" style={{fontSize:12}}>📅 {p.date} · {p.time} &nbsp; ⏱ {p.duration} min</p></div><div><div className="progress"><i style={{width:`${p.completion}%`}}/></div><div className="muted" style={{fontSize:11,marginTop:5}}>{p.completion}% listo</div></div><div className="foot"><div className="stack">{p.members.slice(0,4).map(mid=>{const m=members.find(x=>x.id===mid);return <span key={mid} className="avatar" style={{background:m?.color}}>{m?.initials??'•'}</span>})}</div><button className="btn sm" onClick={()=>openProduction(p.id)}>Abrir</button></div></div>)}</div></>}

function ProductionDetail({p,blocks,tab,setTab,library,tasks,messages,startProgram,back,onAddBlock,onMoveBlock,onDuplicateBlock,onEditProduction,onDeleteProduction,onSaveNotes,onEditBlock,onDeleteBlock,onLinkResource,onUnlinkResource,onPreviewResource,onUpdateResource}:{p:Production;blocks:Block[];tab:string;setTab:(x:string)=>void;library:LibraryItem[];tasks:Task[];messages:Message[];startProgram:()=>void;back:()=>void;onAddBlock:(b:Block)=>void|Promise<void>;onMoveBlock:(pid:string,bid:string,dir:-1|1)=>void|Promise<void>;onDuplicateBlock:(b:Block)=>void|Promise<void>;onEditProduction:(p:Production)=>void|Promise<void>;onDeleteProduction:(p:Production)=>void|Promise<void>;onSaveNotes:(pid:string,notes:string)=>void|Promise<void>;onEditBlock:(b:Block)=>void|Promise<void>;onDeleteBlock:(b:Block)=>void|Promise<void>;onLinkResource:(pid:string,itemId:string)=>void|Promise<void>;onUnlinkResource:(pid:string,itemId:string)=>void|Promise<void>;onPreviewResource:(item:LibraryItem)=>void|Promise<void>;onUpdateResource:(item:LibraryItem)=>void|Promise<void>}){
 const total=blocks.reduce((a,b)=>a+b.duration,0); const [blockDraft,setBlockDraft]=useState<BlockDraft|null>(null);const [blockCreating,setBlockCreating]=useState(false);const [editing,setEditing]=useState(false); const [draft,setDraft]=useState<Production>(p); const [notes,setNotes]=useState(p.notes); const [resourceToAdd,setResourceToAdd]=useState('');const [viewResource,setViewResource]=useState<LibraryItem|null>(null);
 useEffect(()=>{setDraft(p);setNotes(p.notes)},[p]);
 const addBlock=()=>{setBlockCreating(true);setBlockDraft({id:id('b'),productionId:p.id,order:Math.max(...blocks.map(x=>x.order),0)+1,type:'Tema',title:'',duration:10,responsible:p.hosts[0]??'',notes:'',status:'Pendiente'})};
 const move=(bid:string,dir:-1|1)=>{void onMoveBlock(p.id,bid,dir)};
 const linked=library.filter(i=>(p.resourceIds??[]).includes(i.id)); const available=library.filter(i=>!(p.resourceIds??[]).includes(i.id));
 const editBlock=(b:Block)=>{setBlockCreating(false);setBlockDraft({...b})};
  return <><button className="btn ghost sm" onClick={back}>← Volver a producciones</button><div className="detail-head"><div className="card-foot"><div><span className="pill">{p.type}</span> <span className="pill orange">{p.status}</span></div><div className="actions"><button className="btn" onClick={()=>setEditing(v=>!v)}>{editing?'Cancelar edición':'✎ Editar'}</button><button className="btn danger" onClick={()=>{void onDeleteProduction(p)}}>Eliminar</button><button className="btn" onClick={()=>window.open(`https://meet.jit.si/avodah-${p.id}`,'_blank')}>🎥 Reunión</button><button className="btn primary" onClick={startProgram}>▶ Iniciar programa</button></div></div><div className="detail-title-row"><span className="detail-title-icon"><Radio size={25} strokeWidth={1.8}/></span><h1>{p.title}</h1></div><div className="meta"><span>📅 {p.date}</span><span>🕒 {p.time}</span><span>⏱ {p.duration} min</span><span>👥 {p.members.length} personas</span></div></div><div className="tabs">{['resumen','escaleta','recursos','chat','tareas','notas'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
 {tab==='resumen'&&(editing?<div className="card editor-card"><div className="form-row"><div className="field"><label>Título</label><input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div><div className="field"><label>Estado</label><select className="select" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Status})}>{['Idea','En preparación','Listo','En vivo','Emitido','Archivado'].map(x=><option key={x}>{x}</option>)}</select></div></div><div className="form-row"><div className="field"><label>Fecha</label><input className="input" type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></div><div className="field"><label>Hora</label><input className="input" type="time" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></div><div className="field"><label>Duración</label><input className="input" type="number" min="1" value={draft.duration} onChange={e=>setDraft({...draft,duration:Number(e.target.value)})}/></div></div><div className="field"><label>Tema central</label><input className="input" value={draft.topic} onChange={e=>setDraft({...draft,topic:e.target.value})}/></div><div className="field"><label>Pregunta disparadora</label><input className="input" value={draft.question} onChange={e=>setDraft({...draft,question:e.target.value})}/></div><div className="field"><label>Objetivo</label><textarea className="textarea" value={draft.objective} onChange={e=>setDraft({...draft,objective:e.target.value})}/></div><div className="field"><label>Descripción</label><textarea className="textarea" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div><div className="form-row"><div className="field"><label>Conductores (separados por coma)</label><input className="input" value={draft.hosts.join(', ')} onChange={e=>setDraft({...draft,hosts:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></div><div className="field"><label>Invitados</label><input className="input" value={draft.guests.join(', ')} onChange={e=>setDraft({...draft,guests:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></div></div><div className="actions"><button className="btn primary" onClick={()=>{void onEditProduction(draft);setEditing(false)}}>Guardar cambios</button></div></div>:<div className="info-grid"><Info label="Tema central" text={p.topic}/><Info label="Pregunta disparadora" text={p.question}/><Info label="Objetivo" text={p.objective}/><Info label="Descripción" text={p.description}/><Info label="Conductores / participantes" text={p.hosts.join(', ')||'—'}/><Info label="Invitados" text={p.guests.join(', ')||'Sin invitados'}/><Info label="Referencias" text={p.references.join(' · ')||'—'}/><Info label="Notas" text={p.notes||'—'}/></div>)}
 {tab==='escaleta'&&<><div className="rundown-summary"><div><strong>{blocks.length} bloques</strong><div className="muted" style={{fontSize:12}}>Duración estimada: {total} min</div></div><div className="toolbar"><button className="btn primary" onClick={addBlock}>+ Agregar bloque</button></div></div><div className="rundown">{blocks.map(b=><div className="block" key={b.id}><span className="drag">⋮⋮</span><span className="type">{b.type}</span><div><h4>{b.title}</h4><p>{b.notes||'Sin notas'}</p></div><span className="duration">{b.duration} min</span><span className="responsible"><small className="muted">{b.responsible}</small></span><div className="block-actions"><button className="icon-btn" title="Subir" onClick={()=>move(b.id,-1)}>↑</button><button className="icon-btn" title="Bajar" onClick={()=>move(b.id,1)}>↓</button><button className="icon-btn" title="Editar" onClick={()=>editBlock(b)}>✎</button><button className="icon-btn" title="Duplicar" onClick={()=>{void onDuplicateBlock(b)}}>⧉</button><button className="icon-btn danger-text" title="Eliminar" onClick={()=>{void onDeleteBlock(b)}}>×</button></div></div>)}</div></>}
 {tab==='recursos'&&<><div className="resource-section-head"><div><span className="panel-kicker">RECURSOS DE LA PRODUCCIÓN</span><h2>{linked.length} recursos vinculados</h2><p>Previsualizá cada enlace sin salir del programa.</p></div><div className="resource-attach"><select className="select" value={resourceToAdd} aria-label="Elegir recurso" onChange={e=>setResourceToAdd(e.target.value)}><option value="">Elegir recurso…</option>{available.map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</select><button className="btn primary" disabled={!resourceToAdd} onClick={()=>{if(resourceToAdd){void onLinkResource(p.id,resourceToAdd);setResourceToAdd('')}}}>+ Agregar</button></div></div><div className="resource-grid linked-resource-grid">{linked.map(i=><article key={i.id} className="resource-card"><button className="resource-card-main" onClick={()=>setViewResource(i)}><ResourceMedia item={i}/><div className="resource-card-body"><span className="resource-source">{i.previewSite||i.source}</span><h3>{i.title}</h3><p>{i.note||i.previewDescription||'Abrí la vista rápida para consultar este recurso.'}</p></div></button><div className="resource-card-actions"><button onClick={()=>setViewResource(i)}>Vista rápida <ChevronRight size={14}/></button><button onClick={()=>{void onUnlinkResource(p.id,i.id)}}>Quitar</button></div></article>)}{!linked.length&&<div className="empty">Todavía no vinculaste recursos. Podés hacerlo desde Biblioteca.</div>}</div></>}
 {tab==='chat'&&<div className="card"><div className="list">{messages.filter(m=>m.channel===p.id).map(m=><div className="message" key={m.id}><Avatar name={m.author}/><div className="bubble"><strong>{m.author}</strong><time>{m.time}</time><p>{m.text}</p></div></div>)}{!messages.some(m=>m.channel===p.id)&&<div className="empty">Todavía no hay mensajes en este canal.</div>}</div></div>}
 {tab==='tareas'&&<div className="list">{tasks.filter(t=>t.productionId===p.id).map(t=><div className="list-item" key={t.id}><div className="grow"><h3>{t.title}</h3><p>{t.assignee} · vence {t.due}</p></div><span className="pill">{t.status}</span></div>)}{!tasks.some(t=>t.productionId===p.id)&&<div className="empty">No hay tareas vinculadas todavía.</div>}</div>}
 {tab==='notas'&&<div className="card"><h3 style={{fontFamily:'Georgia,serif'}}>Notas de producción</h3><FlexibleTextArea label="Guion, decisiones y notas de producción" value={notes} onChange={setNotes} rows={12} placeholder="Escribí todo lo necesario: guion, citas, decisiones editoriales, ideas, preparación del equipo…"/><div className="actions" style={{marginTop:12}}><button className="btn primary" onClick={()=>{void onSaveNotes(p.id,notes)}}>Guardar notas</button><span className="muted" style={{fontSize:12}}>Se sincronizan con el resto del equipo.</span></div></div>}
 {viewResource&&<ResourceQuickView item={linked.find(i=>i.id===viewResource.id)||viewResource} onClose={()=>setViewResource(null)} onPreview={onPreviewResource} onUpdate={onUpdateResource} onUnlink={()=>{void onUnlinkResource(p.id,viewResource.id);setViewResource(null)}}/>}
 {blockDraft&&<BlockEditorDialog key={blockDraft.id} initial={blockDraft} creating={blockCreating} onClose={()=>setBlockDraft(null)} onSave={async(data)=>{if(blockCreating)await onAddBlock(data as Block);else await onEditBlock(data as Block)}}/>}
 </>
}
function Info({label,text}:{label:string;text:string}){return <div className="info"><label>{label}</label><p>{text}</p></div>}

function Ideas({ideas,setModal,onReact,onComment,onArchive,onConvert}:{ideas:Idea[];setModal:(x:ModalKind)=>void;onReact:(i:Idea)=>void|Promise<void>;onComment:(i:Idea,text:string)=>void|Promise<void>;onArchive:(i:Idea)=>void|Promise<void>;onConvert:(i:Idea)=>void|Promise<void>}) {
  const active=ideas.filter(i=>!i.archived);
  const [open,setOpen]=useState<string|null>(null);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const submitComment=(i:Idea,e:FormEvent)=>{
    e.preventDefault();
    const text=drafts[i.id]??'';
    if(!text.trim()) return;
    void onComment(i,text);
    setDrafts(x=>({...x,[i.id]:''}));
  };
  return <>
    <Header title="Ideas" subtitle="Una bandeja compartida para capturar temas antes de que se pierdan."><button className="btn primary" onClick={()=>setModal('idea')}>+ Nueva idea</button></Header>
    <div className="grid three">
      {active.map(i=><div className="card idea-card" key={i.id}>
        <div className="tags">{i.tags.map(t=><span className="tag" key={t}>#{t}</span>)}</div>
        <h3>{i.title}</h3><p>{i.description}</p>
        <div className="card-foot"><span>{i.author}</span><button className="text-button" onClick={()=>setOpen(open===i.id?null:i.id)}>♥ {i.reactions} · 💬 {i.comments}</button></div>
        <div className="actions"><button className="btn sm" onClick={()=>{void onReact(i)}}>♥ Me interesa</button><button className="btn sm primary" onClick={()=>{void onConvert(i)}}>Convertir en producción</button><button className="btn sm" onClick={()=>{void onArchive(i)}}>Archivar</button></div>
        {open===i.id&&<div className="comments">
          <div className="comment-list">
            {(i.commentItems??[]).map(c=><div className="comment" key={c.id}><b>{c.author}</b><span>{c.text}</span><small>{c.time}</small></div>)}
            {!(i.commentItems??[]).length&&<div className="muted">Todavía no hay comentarios.</div>}
          </div>
          <form onSubmit={e=>submitComment(i,e)}><input className="input" value={drafts[i.id]??''} onChange={e=>setDrafts(x=>({...x,[i.id]:e.target.value}))} placeholder="Sumar comentario…"/><button className="btn sm primary">Comentar</button></form>
        </div>}
      </div>)}
    </div>
  </>;
}

function Tasks({tasks,setModal,onStatus,onDelete}:{tasks:Task[];setModal:(x:ModalKind)=>void;onStatus:(t:Task,status:TaskStatus)=>void|Promise<void>;onDelete:(t:Task)=>void|Promise<void>}){const statuses:TaskStatus[]=['Pendiente','En curso','Hecho'];return <><Header title="Tareas" subtitle="Quién hace qué, para cuándo y para qué producción."><button className="btn primary" onClick={()=>setModal('task')}>+ Nueva tarea</button></Header><div className="kanban">{statuses.map(status=><div className="column" key={status}><h3><span>{status}</span><span>{tasks.filter(t=>t.status===status).length}</span></h3>{tasks.filter(t=>t.status===status).map(t=><div className="task" key={t.id}><div className="card-foot"><h4>{t.title}</h4><button className="icon-btn danger-text" title="Eliminar" onClick={()=>{void onDelete(t)}}>×</button></div><p>{t.assignee} · {t.due} · {t.priority}</p><select className="select" value={t.status} onChange={e=>{void onStatus(t,e.target.value as TaskStatus)}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>)}</div>)}</div></>}

function Chat({channels,channel,setChannel,messages,onSend,onReact,onPin,currentUserId,cloud}:{channels:Channel[];channel:string;setChannel:(x:string)=>void;messages:Message[];onSend:(channel:string,text:string,file?:File)=>void|Promise<void>;onReact:(message:Message,emoji:string)=>void|Promise<void>;onPin:(message:Message)=>void|Promise<void>;currentUserId?:string;cloud:boolean}){const [text,setText]=useState('');const [file,setFile]=useState<File|null>(null);const send=(e:FormEvent)=>{e.preventDefault();if(!text.trim()&&!file)return;void onSend(channel,text.trim(),file??undefined);setText('');setFile(null)};const visible=messages.filter(m=>m.channel===channel);const pinned=visible.filter(m=>m.pinned);return <><Header title="Chat" subtitle="Conversaciones generales y por producción."/><div className="notice">{cloud?'Chat, reacciones y archivos conectados a Supabase Realtime.':'Modo demo: el chat queda guardado sólo en este navegador.'}</div>{pinned.length>0&&<div className="pinned-strip"><b>📌 Fijados</b>{pinned.map(m=><span key={m.id}>{m.author}: {m.text}</span>)}</div>}<div className="chat-layout"><div className="channels"><h3>Canales</h3>{channels.map(c=><button key={c.id} className={channel===c.id?'active':''} onClick={()=>setChannel(c.id)}># {c.name}</button>)}</div><div className="chat"><div className="messages">{visible.map(m=>{const counts=(m.reactions??[]).reduce<Record<string,number>>((a,r)=>(a[r.emoji]=(a[r.emoji]||0)+1,a),{});return <div className={`message ${m.pinned?'pinned-message':''}`} key={m.id}><Avatar name={m.author}/><div className="message-content"><div className="message-head"><strong>{m.author}</strong><time>{m.time}</time>{m.pinned&&<span>📌</span>}<button className="text-button" onClick={()=>{void onPin(m)}}>{m.pinned?'Desfijar':'Fijar'}</button></div><div className="bubble"><p>{m.text}</p>{(m.attachments??[]).map(a=><a className="attachment" href={a.url} target="_blank" key={a.id}>📎 {a.name} <small>{a.size?`${Math.ceil(a.size/1024)} KB`:''}</small></a>)}</div><div className="reaction-row">{['👍','❤️','😂','🔥'].map(emoji=><button key={emoji} className={(m.reactions??[]).some(r=>r.emoji===emoji&&r.userId===currentUserId)?'active':''} onClick={()=>{void onReact(m,emoji)}}>{emoji}{counts[emoji]?` ${counts[emoji]}`:''}</button>)}</div></div></div>})}{!visible.length&&<div className="empty">Todavía no hay mensajes en este canal.</div>}</div><form className="composer" onSubmit={send}><label className="btn sm file-button">＋<input type="file" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Escribí un mensaje…"/><button className="btn primary">Enviar</button>{file&&<span className="file-chip">📎 {file.name}<button type="button" onClick={()=>setFile(null)}>×</button></span>}</form></div></div></>}

function Calendar({productions,tasks,events,onCreate,onDelete}:{productions:Production[];tasks:Task[];events:CalendarEvent[];onCreate:()=>void|Promise<void>;onDelete:(e:CalendarEvent)=>void|Promise<void>}){const candidates=[...productions.map(p=>p.date),...events.map(e=>e.startsAt.slice(0,10))].filter(Boolean).sort();const base=candidates[0]?new Date(`${candidates[0]}T12:00:00`):new Date();const year=base.getFullYear();const month=base.getMonth();const daysInMonth=new Date(year,month+1,0).getDate();const label=new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(base);const days=Array.from({length:daysInMonth},(_,i)=>i+1);const sameDay=(iso:string,d:number)=>{const x=new Date(iso);return x.getFullYear()===year&&x.getMonth()===month&&x.getDate()===d};const taskDay=(t:Task)=>{if(t.dueAt)return sameDay(t.dueAt,new Date(t.dueAt).getDate())?new Date(t.dueAt).getDate():null;if(t.dueDate){const d=new Date(`${t.dueDate}T12:00:00`);return d.getFullYear()===year&&d.getMonth()===month?d.getDate():null}return null};return <><Header title="Calendario" subtitle={`${label[0].toUpperCase()+label.slice(1)} · producciones, reuniones y entregas.`}><button className="btn primary" onClick={()=>{void onCreate()}}>+ Nuevo evento</button></Header><div className="calendar">{days.map(d=><div className="day" key={d}><b>{d}</b>{productions.filter(p=>p.date&&sameDay(`${p.date}T12:00:00`,d)).map(p=><div className="event" key={p.id}>{p.time} · {p.title}</div>)}{events.filter(e=>sameDay(e.startsAt,d)).map(e=><button className="event blue event-button" key={e.id} title="Clic para eliminar" onClick={()=>{void onDelete(e)}}>{new Date(e.startsAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})} · {e.title}</button>)}{tasks.filter(t=>taskDay(t)===d).map(t=><div className="event green" key={t.id}>Entrega · {t.title}</div>)}</div>)}</div></>}

function Team({cloud,canManage,currentUserId,onInvite,onRole}:{cloud:boolean;canManage:boolean;currentUserId?:string;onInvite:()=>void|Promise<void>;onRole:(memberId:string,role:string)=>void|Promise<void>}){const roles=['Administrador','Productor','Conductor','Operador','Editor','Colaborador'];return <><Header title="Equipo" subtitle="Personas, roles y disponibilidad del espacio de trabajo."><button className="btn primary" onClick={()=>{void onInvite()}} disabled={!cloud||!canManage}>+ Invitar integrante</button></Header><div className="team">{members.map(m=><div className="card member" key={m.id}><span className="avatar" style={{background:m.color}}>{m.initials}</span><div className="grow"><h3>{m.name}{m.id===currentUserId&&<small className="muted"> · Vos</small>}</h3>{cloud?<select className="select role-select" value={m.role.replace('Productora','Productor').replace('Editora','Editor')} disabled={!canManage} onChange={e=>{void onRole(m.id,e.target.value)}}>{roles.map(r=><option key={r}>{r}</option>)}</select>:<p>{m.role}</p>}<span className={`pill ${m.status==='Disponible'?'green':''}`} style={{marginTop:8}}>{m.status}</span></div></div>)}</div><div className="notice" style={{marginTop:18}}>{cloud?(canManage?'Las invitaciones generan un enlace válido por 7 días. Como administrador podés ajustar roles.':'Podés ver el equipo. Sólo un administrador puede invitar integrantes o cambiar roles.'):'En modo demo no se envían invitaciones. Iniciá sesión para crear un equipo real.'}</div></>}

function Settings({workspace,setWorkspace,onSave,onCreateWorkspace,cloud}:{workspace:Workspace;setWorkspace:React.Dispatch<React.SetStateAction<Workspace>>;onSave:(w:Workspace)=>void|Promise<void>;onCreateWorkspace:()=>void|Promise<void>;cloud:boolean}){return <><Header title="Configuración" subtitle="Identidad y preferencias de este espacio de trabajo."/><div className="card" style={{maxWidth:720}}><div className="form-row"><div className="field"><label>Nombre</label><input className="input" value={workspace.name} onChange={e=>setWorkspace(w=>({...w,name:e.target.value,initials:e.target.value.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}))}/></div><div className="field"><label>Tipo</label><select className="select" value={workspace.type} onChange={e=>setWorkspace(w=>({...w,type:e.target.value}))}><option>Multiformato</option><option>Radio</option><option>Streaming</option><option>Podcast</option><option>Videopodcast</option><option>YouTube / Contenido</option></select></div></div><div className="field" style={{marginTop:12}}><label>Descripción</label><textarea className="textarea" value={workspace.description} onChange={e=>setWorkspace(w=>({...w,description:e.target.value}))}/></div><div className="actions" style={{marginTop:14}}><button className="btn primary" onClick={()=>{void onSave(workspace)}}>Guardar cambios</button><span className="muted" style={{fontSize:12}}>{cloud?'Se guarda en AVODAH Cloud':'Se guarda en este dispositivo'}</span></div>{cloud&&<div className="settings-divider"><div><strong>Otro equipo o proyecto</strong><p className="muted">Podés crear más espacios y alternar entre ellos desde el menú lateral.</p></div><button className="btn" onClick={()=>{void onCreateWorkspace()}}>+ Crear otro espacio</button></div>}</div></>}


function Meeting({workspace}:{workspace:Workspace}){const room=`avodah-${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;const url=`https://meet.jit.si/${room}`;return <><Header title="Reunión" subtitle={`Sala del equipo · ${workspace.name}`}><a className="btn" href={url} target="_blank">Abrir en nueva pestaña ↗</a></Header><div className="notice">La videollamada usa Jitsi, sin requerir una cuenta adicional para esta primera versión. Más adelante podemos integrar LiveKit para una experiencia totalmente embebida.</div><div className="meeting"><div className="meeting-bar"><strong>🎥 {room}</strong><span className="pill green">Sala lista</span></div><iframe className="jitsi" src={url} allow="camera; microphone; fullscreen; display-capture" title="Sala de reunión AVODAH"/></div></>}

function Modal({kind,close,productions,currentUserName,demo,initialTab,onUpload,onProduction,onIdea,onLibrary,onTask}:{kind:Exclude<ModalKind,null>;close:()=>void;productions:Production[];currentUserName:string;demo:boolean;initialTab:'link'|'file';onUpload:(file:File,info:UploadResourceInfo)=>Promise<void>;onProduction:(x:Production)=>void|Promise<void>;onIdea:(x:Idea)=>void|Promise<void>;onLibrary:(x:LibraryItem)=>void|Promise<void>;onTask:(x:Task)=>void|Promise<void>}){if(kind==='library')return <ResourceCreate key={initialTab} initialTab={initialTab} demo={demo} close={close} onLibrary={onLibrary} onUpload={onUpload}/>;const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const title=String(fd.get('title')||'').trim();if(!title)return;
 if(kind==='production')onProduction({id:id('p'),title,type:String(fd.get('type')||'Podcast'),status:'Idea',date:String(fd.get('date')||'2026-10-10'),time:String(fd.get('time')||'19:00'),duration:Number(fd.get('duration')||60),completion:5,topic:String(fd.get('topic')||title),question:String(fd.get('question')||''),objective:'Definir objetivo',description:String(fd.get('description')||''),references:[],hosts:[currentUserName],guests:[],notes:'',members:['m1']});
 if(kind==='idea')onIdea({id:id('i'),title,description:String(fd.get('description')||''),tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),author:currentUserName,reactions:0,comments:0});

 if(kind==='task')onTask({id:id('t'),title,status:'Pendiente',assignee:String(fd.get('assignee')||currentUserName),due:String(fd.get('due')||'Sin fecha'),dueDate:String(fd.get('due')||''),priority:String(fd.get('priority')||'Media'),productionId:String(fd.get('productionId')||'')||undefined}); close()};
 const labels={production:'Nueva producción',idea:'Nueva idea',library:'Guardar recurso',task:'Nueva tarea'};return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><form className="modal" onSubmit={submit}><h2>{labels[kind]}</h2><div className="field"><label>Título</label><input className="input" name="title" required autoFocus/></div>
 {kind==='production'&&<><div className="form-row" style={{marginTop:12}}><div className="field"><label>Formato</label><select className="select" name="type"><option>Radio</option><option>Streaming</option><option>Podcast</option><option>Videopodcast</option><option>YouTube / Contenido</option><option>Personalizado</option></select></div><div className="field"><label>Duración (min)</label><input className="input" name="duration" type="number" defaultValue="60"/></div></div><div className="form-row" style={{marginTop:12}}><div className="field"><label>Fecha</label><input className="input" name="date" type="date" defaultValue="2026-10-10"/></div><div className="field"><label>Hora</label><input className="input" name="time" type="time" defaultValue="19:00"/></div></div><div className="field" style={{marginTop:12}}><label>Tema central</label><input className="input" name="topic"/></div><div className="field" style={{marginTop:12}}><label>Pregunta disparadora</label><input className="input" name="question"/></div></>}
 {kind==='idea'&&<div className="field" style={{marginTop:12}}><label>Descripción / nota</label><textarea className="textarea" name="description"/></div>}
 {kind==='idea'&&<div className="field" style={{marginTop:12}}><label>Etiquetas separadas por coma</label><input className="input" name="tags" placeholder="entrevista, cultura, audiencia"/></div>}

 {kind==='task'&&<><div className="form-row" style={{marginTop:12}}><div className="field"><label>Responsable</label><select className="select" name="assignee">{members.map(m=><option key={m.id}>{m.name}</option>)}</select></div><div className="field"><label>Prioridad</label><select className="select" name="priority"><option>Baja</option><option>Media</option><option>Alta</option></select></div></div><div className="form-row" style={{marginTop:12}}><div className="field"><label>Vence</label><input className="input" name="due" type="date"/></div><div className="field"><label>Producción</label><select className="select" name="productionId"><option value="">Sin vincular</option>{productions.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></div></div></>}
 <div className="modal-actions"><button type="button" className="btn" onClick={close}>Cancelar</button><button className="btn primary">Guardar</button></div></form></div>}

function ProgramMode({p,blocks,index,setIndex,timer,setTimer,running,setRunning,close}:{p:Production;blocks:Block[];index:number;setIndex:(x:number)=>void;timer:number;setTimer:(x:number)=>void;running:boolean;setRunning:(x:boolean)=>void;close:()=>void}){const current=blocks[index];const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;const next=(n:number)=>{setIndex(Math.max(0,Math.min(blocks.length-1,n)));setTimer(0);setRunning(false)};return <div className="program-mode"><div className="program-top"><div><div className="brand">AVODAH</div><div style={{color:'#a99e95',marginTop:5}}>{p.title}</div></div><button className="btn" onClick={close}>Salir del modo programa</button></div>{current?<div className="program-grid"><div className="now"><div className="type">AHORA · {current.type}</div><h1>{current.title}</h1><div className="timer">{fmt(timer)}</div><div className="meta"><span>Duración prevista: {current.duration} min</span><span>Responsable: {current.responsible}</span></div><p>{current.notes||'Sin notas para este bloque.'}</p><div className="program-controls"><button onClick={()=>next(index-1)} disabled={index===0}>← Anterior</button><button className="primary" onClick={()=>setRunning(!running)}>{running?'Pausar':'▶ Iniciar cronómetro'}</button><button onClick={()=>{setTimer(0);setRunning(false)}}>Reiniciar</button><button onClick={()=>next(index+1)} disabled={index===blocks.length-1}>Siguiente →</button></div></div><div><div className="eyebrow">Próximos bloques</div><div className="next-list" style={{marginTop:10}}>{blocks.slice(index+1).map((b,i)=><div className="next-item" key={b.id}><b>{index+i+2}. {b.title}</b><span style={{color:'#a99e95',fontSize:12}}>{b.type} · {b.duration} min · {b.responsible}</span></div>)}{index===blocks.length-1&&<div className="next-item">Último bloque de la escaleta.</div>}</div></div></div>:<div className="empty" style={{marginTop:30,color:'#aaa'}}>Esta producción todavía no tiene bloques en su escaleta.</div>}</div>}
