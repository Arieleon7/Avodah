'use client';
import {useEffect,useMemo,useState} from 'react';
import {ChevronRight,Folder,FolderPlus,Pencil,Trash2,X,Check} from 'lucide-react';
import type {ResourceFolder} from '@/lib/cloud';

type ScopeProps={
 folders:ResourceFolder[];
 productionId:string|null;
 activeFolder:string|null;
 onActiveFolder:(id:string|null)=>void;
 onCreate:(parentId:string|null,name:string)=>Promise<void>|void;
 onRename:(folderId:string,name:string)=>Promise<void>|void;
 onDelete:(folderId:string)=>Promise<void>|void;
 resourceCounts?:Record<string,number>;
};
const eqScope=(folder:ResourceFolder,productionId:string|null)=>folder.productionId===productionId;
export function folderOptions(folders:ResourceFolder[],productionId:string|null){
 const scoped=folders.filter(f=>eqScope(f,productionId));
 const sorted=[...scoped].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const seen=new Set<string>();
 const output:{id:string;label:string}[]=[];
 const walk=(parentId:string|null,depth:number)=>{
  for(const folder of sorted.filter(f=>f.parentId===parentId&&!seen.has(f.id))){
   seen.add(folder.id);
   output.push({id:folder.id,label:'　'.repeat(depth)+folder.name});
   walk(folder.id,depth+1);
  }
 };
 walk(null,0);
 // A malformed hierarchy should not hide otherwise accessible folders.
 for(const item of sorted)if(!seen.has(item.id))output.push({id:item.id,label:item.name});
 return output;
}
export function ResourceFolderExplorer({folders,productionId,activeFolder,onActiveFolder,onCreate,onRename,onDelete,resourceCounts}:ScopeProps){
 const scoped=useMemo(()=>folders.filter(f=>eqScope(f,productionId)),[folders,productionId]);
 const [editor,setEditor]=useState<'create'|'rename'|null>(null);
 const [name,setName]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const current=scoped.find(f=>f.id===activeFolder);
 useEffect(()=>{if(activeFolder&&!current)onActiveFolder(null)},[activeFolder,current,onActiveFolder]);
 const path:ResourceFolder[]=[];
 let cursor=current;
 const seen=new Set<string>();
 while(cursor&&!seen.has(cursor.id)){path.unshift(cursor);seen.add(cursor.id);cursor=scoped.find(f=>f.id===cursor?.parentId);}
 const children=scoped.filter(f=>f.parentId===(current?.id||null)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const submit=async()=>{
  if(!name.trim())return;
  setBusy(true);setError('');
  try{
   if(editor==='rename'&&current)await onRename(current.id,name.trim());
   else await onCreate(current?.id||null,name.trim());
   setName('');setEditor(null);
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la carpeta.')}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  if(!current||!confirm('¿Eliminar la carpeta «'+current.name+'»? Solo se pueden eliminar carpetas vacías.'))return;
  setBusy(true);setError('');
  try{await onDelete(current.id);onActiveFolder(current.parentId);setEditor(null)}
  catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar.')}
  finally{setBusy(false);}
 };
 return <section className="resource-folder-browser" aria-label="Carpetas de recursos">
  <div className="resource-folder-heading">
   <nav className="resource-folder-breadcrumb" aria-label="Ruta de carpetas">
    <button type="button" className={!current?'current':''} onClick={()=>onActiveFolder(null)}><Folder size={16}/> {productionId?'Recursos de producción':'Biblioteca'}</button>
    {path.map(folder=><span key={folder.id} className="resource-folder-crumb"><ChevronRight size={14}/><button type="button" className={folder.id===current?.id?'current':''} onClick={()=>onActiveFolder(folder.id)}>{folder.name}</button></span>)}
   </nav>
   <div className="resource-folder-tools">
    {current&&<><button type="button" aria-label="Renombrar carpeta" title="Renombrar carpeta" onClick={()=>{setEditor('rename');setName(current.name);setError('')}}><Pencil size={16}/></button><button type="button" aria-label="Eliminar carpeta" title="Eliminar carpeta vacía" disabled={busy} onClick={()=>{void remove()}}><Trash2 size={16}/></button></>}
    <button type="button" className="btn sm" onClick={()=>{setEditor('create');setName('');setError('')}}><FolderPlus size={16}/> {current?'Nueva subcarpeta':'Nueva carpeta'}</button>
   </div>
  </div>
  {editor&&<form className="resource-folder-editor" onSubmit={event=>{event.preventDefault();void submit()}}>
   <label htmlFor="resource-folder-name">{editor==='create'?'Nombre de la nueva carpeta':'Renombrar carpeta'}</label>
   <input id="resource-folder-name" className="input" autoFocus maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Música, guiones, entrevistas…"/>
   <button className="btn primary sm" type="submit" disabled={busy||!name.trim()}><Check size={15}/> {busy?'Guardando…':'Guardar'}</button>
   <button type="button" className="btn sm" onClick={()=>{setEditor(null);setError('')}} aria-label="Cancelar"><X size={15}/></button>
  </form>}
  {error&&<p className="resource-folder-error" role="alert">{error}</p>}
  {!!children.length&&<div className="resource-folder-grid">{children.map(folder=><button type="button" key={folder.id} className="resource-folder-tile" onClick={()=>{onActiveFolder(folder.id);setEditor(null);setError('')}}><Folder size={23}/><span><strong>{folder.name}</strong><small>{resourceCounts?.[folder.id]??0} recursos</small></span><ChevronRight size={16}/></button>)}</div>}
  {!children.length&&!editor&&<p className="resource-folder-hint">{current?'No hay más subcarpetas en esta ubicación.':'Creá carpetas para organizar los recursos de tu equipo.'}</p>}
 </section>;
}

export function ResourceMoveSelect({folders,productionId,value,onMove}:{folders:ResourceFolder[];productionId:string|null;value:string|null;onMove:(folderId:string|null)=>Promise<void>|void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const options=useMemo(()=>folderOptions(folders,productionId),[folders,productionId]);
 return <div className="resource-move-wrap">
  <label><span>Guardar en</span><select className="select" aria-label="Mover recurso a carpeta" value={value||''} disabled={busy} onChange={async e=>{
    setBusy(true);setError('');
    try{await onMove(e.target.value||null)}
    catch(err){setError(err instanceof Error?err.message:'No se pudo mover el recurso.')}
    finally{setBusy(false)}
  }}><option value="">Sin carpeta (raíz)</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select></label>
  {error&&<small className="resource-folder-error" role="alert">{error}</small>}
 </div>;
}
