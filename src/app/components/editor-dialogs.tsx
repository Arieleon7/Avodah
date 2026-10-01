'use client';
import {useEffect,useRef,useState, type FormEvent} from 'react';
import {ArrowUpRight,Check,ChevronDown,FileText,Minus,Plus,Save,X} from 'lucide-react';

type EditorSurfaceProps={title:string;description?:string;children:React.ReactNode;onClose:()=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;busy?:boolean;error?:string;saveLabel?:string};
function EditorSurface({title,description,children,onClose,onSubmit,busy,error,saveLabel='Guardar cambios'}:EditorSurfaceProps){
 const dialogRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const onEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();onClose()}};document.addEventListener('keydown',onEscape);const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onEscape);document.body.style.overflow=old}},[onClose]);
 return <div className="studio-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
 <div className="studio-dialog" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
  <div className="studio-dialog-header"><div><span className="studio-eyebrow">AVODAH · EDICIÓN</span><h2>{title}</h2>{description&&<p>{description}</p>}</div><button className="studio-close" type="button" onClick={onClose} title="Cerrar editor" aria-label="Cerrar editor"><X size={22}/></button></div>
  <form onSubmit={onSubmit} className="studio-dialog-form"><div className="studio-dialog-fields">{children}</div>
  {error&&<div className="studio-dialog-error" role="alert">{error}</div>}
  <footer className="studio-dialog-footer"><span className="studio-save-hint">Los cambios se comparten con tu equipo al guardar.</span><div className="studio-dialog-buttons"><button className="btn" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn primary" type="submit" disabled={busy}><Save size={16}/>{busy?'Guardando…':saveLabel}</button></div></footer>
  </form>
 </div></div>;
}

export function FlexibleTextArea({label,value,onChange,placeholder,rows=7,help,id}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;rows?:number;help?:string;id?:string}){
 const [maximized,setMaximized]=useState(false);
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(maximized&&e.key==='Escape'){e.stopImmediatePropagation();setMaximized(false)}};window.addEventListener('keydown',close,true);return()=>window.removeEventListener('keydown',close,true)},[maximized]);
 return <div className={maximized?'studio-writing-field expanded':'studio-writing-field'}>
   <div className="studio-writing-header"><label htmlFor={id}>{label}</label><div className="studio-writing-actions"><span>{value.length} caracteres</span><button type="button" onClick={()=>setMaximized(m=>!m)} title={maximized?'Reducir editor':'Ampliar el cuadro de texto'}><ArrowUpRight size={15}/>{maximized?'Reducir':'Ampliar editor'}</button></div></div>
   {help&&<small className="studio-writing-help">{help}</small>}
   <textarea id={id} className="textarea studio-writing-textarea" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}/>
   {maximized&&<div className="studio-writing-bottom"><span>Escribí sin límites de espacio. Los saltos de línea se conservan.</span><button type="button" className="btn primary" onClick={()=>setMaximized(false)}><Check size={17}/> Volver a la edición</button></div>}
 </div>;
}
export type BlockDraft={id:string;productionId:string;order:number;type:string;title:string;duration:number;responsible:string;notes:string;status:string;responsibleId?:string|null};
export function BlockEditorDialog({initial,onClose,onSave,creating=false}:{initial:BlockDraft;onClose:()=>void;onSave:(b:BlockDraft)=>Promise<void>|void;creating?:boolean}){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!data.title.trim()){setError('Escribí el nombre del bloque.');return;}if(!Number.isFinite(data.duration)||data.duration<1||data.duration>720){setError('La duración debe estar entre 1 y 720 minutos.');return;}setBusy(true);setError('');try{await onSave({...data,title:data.title.trim(),duration:Math.round(data.duration)});onClose()}catch(err){setError(err instanceof Error?err.message:'No se pudo guardar el bloque.')}finally{setBusy(false)}};
 const types=['Apertura','Tema','Entrevista','Canción','Debate','Cierre','Pausa','Publicidad','Cortina','Otro'];const statuses=['Pendiente','Listo','En vivo'];
 return <EditorSurface title={creating?'Nuevo bloque':'Editar bloque'} description="Prepará cada momento del programa con espacio para desarrollar tus notas." onSubmit={e=>{void save(e)}} onClose={onClose} busy={busy} error={error} saveLabel={creating?'Agregar bloque':'Guardar bloque'}>
 <div className="studio-form-field"><label htmlFor="block-name">Título del bloque</label><input id="block-name" autoFocus required className="input studio-title-input" value={data.title} onChange={e=>setData(s=>({...s,title:e.target.value}))} placeholder="Ej. Presentación y primera reflexión"/></div>
 <div className="studio-form-grid"><div className="studio-form-field"><label htmlFor="block-type">Tipo de bloque</label><select className="select" id="block-type" value={data.type} onChange={e=>setData(s=>({...s,type:e.target.value}))}>{!types.includes(data.type)&&<option>{data.type}</option>}{types.map(t=><option key={t}>{t}</option>)}</select></div><div className="studio-form-field"><label htmlFor="block-status">Estado</label><select className="select" id="block-status" value={data.status} onChange={e=>setData(s=>({...s,status:e.target.value}))}>{!statuses.includes(data.status)&&<option>{data.status}</option>}{statuses.map(t=><option key={t}>{t}</option>)}</select></div></div>
 <div className="studio-form-grid"><div className="studio-form-field"><label htmlFor="block-duration">Duración estimada</label><div className="studio-number-input"><button aria-label="Reducir duración" type="button" onClick={()=>setData(s=>({...s,duration:Math.max(1,(Number(s.duration)||1)-1)}))}><Minus size={16}/></button><input id="block-duration" type="number" min={1} max={720} step={1} value={data.duration} onChange={e=>setData(s=>({...s,duration:Number(e.target.value)}))}/><span>minutos</span><button type="button" aria-label="Aumentar duración" onClick={()=>setData(s=>({...s,duration:Math.min(720,(Number(s.duration)||0)+1)}))}><Plus size={16}/></button></div></div><div className="studio-form-field"><label htmlFor="block-responsible">Responsable</label><input id="block-responsible" className="input" value={data.responsible} onChange={e=>setData(s=>({...s,responsible:e.target.value}))} placeholder="Conductor o integrante"/></div></div>
 <FlexibleTextArea id="block-notes" label="Guion y notas del bloque" value={data.notes} onChange={v=>setData(s=>({...s,notes:v}))} rows={10} placeholder="Desarrollá el bloque con libertad: introducción, preguntas, citas, guion, indicaciones técnicas, recursos…" help="Podés escribir varios párrafos y ampliar el editor a pantalla completa."/>
 </EditorSurface>;
}
export type CalendarDraft={title:string;date:string;time:string;kind:string;notes:string};
export function CalendarEditorDialog({onClose,onSave}:{onClose:()=>void;onSave:(i:CalendarDraft)=>void|Promise<void>}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [data,setData]=useState<CalendarDraft>({title:'',date:today,time:'19:00',kind:'Reunión',notes:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!data.title.trim()||!data.date){setError('Completá el título y la fecha.');return;}setBusy(true);setError('');try{await onSave({...data,title:data.title.trim()});onClose()}catch(err){setError(err instanceof Error?err.message:'No se pudo crear el evento.')}finally{setBusy(false)}};
 return <EditorSurface title="Nuevo evento" description="Reservá el momento y dejá todas las indicaciones para el equipo." onClose={onClose} onSubmit={e=>{void save(e)}} busy={busy} error={error} saveLabel="Crear evento">
 <div className="studio-form-field"><label htmlFor="cal-name">Título del evento</label><input id="cal-name" autoFocus className="input studio-title-input" required value={data.title} onChange={e=>setData(s=>({...s,title:e.target.value}))} placeholder="Ej. Reunión de planificación"/></div>
 <div className="studio-form-grid"><div className="studio-form-field"><label htmlFor="cal-date">Fecha</label><input id="cal-date" className="input" type="date" required value={data.date} onChange={e=>setData(s=>({...s,date:e.target.value}))}/></div><div className="studio-form-field"><label htmlFor="cal-time">Hora</label><input id="cal-time" className="input" type="time" required value={data.time} onChange={e=>setData(s=>({...s,time:e.target.value}))}/></div></div>
 <div className="studio-form-field"><label htmlFor="cal-kind">Tipo de evento</label><select id="cal-kind" className="select" value={data.kind} onChange={e=>setData(s=>({...s,kind:e.target.value}))}>{['Reunión','Grabación','Emisión','Entrega','Otro'].map(t=><option key={t}>{t}</option>)}</select></div>
 <FlexibleTextArea id="cal-notes" label="Indicaciones y notas" value={data.notes} onChange={v=>setData(s=>({...s,notes:v}))} placeholder="Objetivos, invitados, temas y preparación…" rows={6}/>
 </EditorSurface>;
}
export type WorkspaceDraft={name:string;type:string;description:string};
export function WorkspaceEditorDialog({onClose,onSave}:{onClose:()=>void;onSave:(i:WorkspaceDraft)=>void|Promise<void>}){
 const [data,setData]=useState<WorkspaceDraft>({name:'',type:'Multiformato',description:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!data.name.trim()){setError('Ingresá el nombre del nuevo espacio.');return;}setBusy(true);setError('');try{await onSave({...data,name:data.name.trim()});onClose()}catch(err){setError(err instanceof Error?err.message:'No se pudo crear el espacio.')}finally{setBusy(false)}};
 return <EditorSurface title="Crear un nuevo espacio" description="Organizá otro programa, equipo o proyecto dentro de AVODAH." onClose={onClose} onSubmit={e=>{void save(e)}} busy={busy} error={error} saveLabel="Crear espacio">
 <div className="studio-form-field"><label htmlFor="new-workspace">Nombre</label><input id="new-workspace" autoFocus required className="input studio-title-input" value={data.name} onChange={e=>setData(s=>({...s,name:e.target.value}))} placeholder="Ej. Las 3D"/></div>
 <div className="studio-form-field"><label htmlFor="new-workspace-type">Formato principal</label><select id="new-workspace-type" className="select" value={data.type} onChange={e=>setData(s=>({...s,type:e.target.value}))}>{['Multiformato','Radio','Streaming','Podcast','Videopodcast','YouTube / Contenido'].map(t=><option key={t}>{t}</option>)}</select></div>
 <FlexibleTextArea id="new-workspace-notes" label="Descripción del espacio" value={data.description} onChange={v=>setData(s=>({...s,description:v}))} placeholder="Qué se produce, quiénes participan, objetivos…" rows={6}/>
 </EditorSurface>;
}
