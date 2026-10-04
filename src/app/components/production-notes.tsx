'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {FilePlus2,FileText,Save,Trash2,X} from 'lucide-react';
import {FlexibleTextArea} from './editor-dialogs';

export type ProductionNoteItem={
 id:string;productionId:string;title:string;content:string;authorId?:string;author:string;createdAt:string;updatedAt:string;
};

function formatDate(value:string){
 try{return new Date(value).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return ''}
}

export function ProductionNotes({
 notes,productionId,onCreate,onUpdate,onDelete
}:{
 notes:ProductionNoteItem[];
 productionId:string;
 onCreate:(productionId:string,note:{title:string;content:string})=>Promise<string>;
 onUpdate:(noteId:string,note:{title:string;content:string})=>Promise<void>;
 onDelete:(noteId:string)=>Promise<void>;
}){
 const ordered=useMemo(()=>[...notes].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()),[notes]);
 const [selectedId,setSelectedId]=useState<string>(ordered[0]?.id||'');
 const [creating,setCreating]=useState(false);
 const [title,setTitle]=useState(ordered[0]?.title||'');
 const [content,setContent]=useState(ordered[0]?.content||'');
 const [baseline,setBaseline]=useState({title:ordered[0]?.title||'',content:ordered[0]?.content||''});
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [confirmDelete,setConfirmDelete]=useState(false);
 const selectedIdRef=useRef(selectedId);
 useEffect(()=>{selectedIdRef.current=selectedId},[selectedId]);

 const selected=ordered.find(n=>n.id===selectedId);
 const dirty=title!==baseline.title||content!==baseline.content;

 useEffect(()=>{
   if(creating)return;
   const active=ordered.find(n=>n.id===selectedIdRef.current);
   if(!active){
     const first=ordered[0];
     setSelectedId(first?.id||'');
     setTitle(first?.title||'');
     setContent(first?.content||'');
     setBaseline({title:first?.title||'',content:first?.content||''});
     return;
   }
   const hasDraft=title!==baseline.title||content!==baseline.content;
   if(!hasDraft){
     setTitle(active.title);setContent(active.content);setBaseline({title:active.title,content:active.content});
   }else if(active.title===title&&active.content===content){
     setBaseline({title:active.title,content:active.content});
   }
 },[ordered,creating,selectedId,title,content,baseline.title,baseline.content]);

 const choose=(note:ProductionNoteItem)=>{
   if(dirty&&!window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos y abrir otra nota?'))return;
   setCreating(false);setSelectedId(note.id);setTitle(note.title);setContent(note.content);setBaseline({title:note.title,content:note.content});setError('');setMessage('');setConfirmDelete(false);
 };
 const createNew=()=>{
   if(dirty&&!window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos y crear otra nota?'))return;
   setCreating(true);setSelectedId('');setTitle('');setContent('');setBaseline({title:'',content:''});setError('');setMessage('');setConfirmDelete(false);
 };
 const save=async()=>{
   if(saving)return;
   if(!title.trim()){setError('Escribí un título para la nota.');return;}
   setSaving(true);setError('');setMessage('');
   try{
     if(creating){
       const id=await onCreate(productionId,{title:title.trim(),content});
       setCreating(false);setSelectedId(id);setBaseline({title:title.trim(),content});setTitle(title.trim());
       setMessage('Nota creada y compartida con el equipo.');
     }else if(selected){
       await onUpdate(selected.id,{title:title.trim(),content});
       setBaseline({title:title.trim(),content});setTitle(title.trim());
       setMessage('Nota guardada y sincronizada.');
     }
   }catch(err){setError(err instanceof Error?err.message:'No se pudo guardar la nota.')}
   finally{setSaving(false)}
 };
 const remove=async()=>{
   if(!selected||saving)return;
   setSaving(true);setError('');
   try{await onDelete(selected.id);setConfirmDelete(false);setMessage('Nota eliminada.')}
   catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar la nota.')}
   finally{setSaving(false)}
 };

 return <section className="production-notes-workspace">
   <aside className="production-notes-sidebar">
     <div className="production-notes-sidebar-head"><div><span className="panel-kicker">NOTAS</span><strong>{notes.length} {notes.length===1?'nota':'notas'}</strong></div><button type="button" className="btn primary sm" onClick={createNew}><FilePlus2 size={15}/> Nueva nota</button></div>
     <div className="production-note-list">
       {ordered.map(note=><button type="button" key={note.id} className={'production-note-item'+(!creating&&selectedId===note.id?' active':'')} onClick={()=>choose(note)}>
         <span className="production-note-icon"><FileText size={16}/></span><span className="production-note-list-copy"><strong>{note.title}</strong><small>{note.author} · {formatDate(note.updatedAt)}</small><p>{note.content.trim().replace(/\s+/g,' ').slice(0,90)||'Nota vacía'}</p></span>
       </button>)}
       {!ordered.length&&!creating&&<div className="production-note-empty-list"><FileText size={22}/><p>Todavía no hay notas.</p><button type="button" className="btn sm" onClick={createNew}>Crear la primera</button></div>}
     </div>
   </aside>

   <div className="production-note-editor">
     {(creating||selected)?<>
       <div className="production-note-editor-head"><div><span className="panel-kicker">{creating?'NUEVA NOTA':'NOTA COMPARTIDA'}</span><h3>{creating?'Crear una nota':selected?.title}</h3></div>{!creating&&selected&&<button type="button" className="icon-btn danger-text" title="Eliminar nota" aria-label="Eliminar nota" onClick={()=>setConfirmDelete(true)}><Trash2 size={16}/></button>}</div>
       <label className="field production-note-title">Título<input className="input" value={title} onChange={e=>{setTitle(e.target.value);setMessage('');setError('')}} placeholder="Ej. Ideas para apertura"/></label>
       <FlexibleTextArea label="Contenido" value={content} onChange={value=>{setContent(value);setMessage('');setError('')}} rows={15} placeholder="Escribí esta nota con libertad…"/>
       <div className="production-note-meta"><span>{content.length.toLocaleString('es-AR')} caracteres</span><span>{content.trim()?content.trim().split(/\s+/).length.toLocaleString('es-AR'):0} palabras</span>{selected&&<span>Actualizada {formatDate(selected.updatedAt)}</span>}</div>
       {error&&<div className="notes-save-error" role="alert">{error}</div>}
       {message&&<div className="notes-save-success" role="status">{message}</div>}
       {confirmDelete&&<div className="production-note-delete-confirm"><span>¿Eliminar esta nota?</span><div><button type="button" className="btn sm" onClick={()=>setConfirmDelete(false)} disabled={saving}><X size={14}/> Cancelar</button><button type="button" className="btn danger sm" onClick={()=>{void remove()}} disabled={saving}><Trash2 size={14}/>{saving?'Eliminando…':'Eliminar'}</button></div></div>}
       <div className="notes-save-bar"><span className={dirty?'notes-save-state pending':'notes-save-state'}>{dirty?'Cambios sin guardar · borrador protegido':'Guardado en AVODAH'}</span><button type="button" className="btn primary" disabled={saving||(!dirty&&!creating)||!title.trim()} onClick={()=>{void save()}}><Save size={16}/>{saving?'Guardando…':creating?'Crear nota':'Guardar nota'}</button></div>
     </>:<div className="production-note-editor-empty"><FileText size={30}/><h3>Elegí una nota</h3><p>Abrí una nota existente o creá una nueva para esta producción.</p><button className="btn primary" onClick={createNew}><FilePlus2 size={16}/> Nueva nota</button></div>}
   </div>
 </section>;
}
