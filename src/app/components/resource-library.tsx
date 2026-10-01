'use client';
import {useEffect,useRef,useState, type FormEvent} from 'react';
import {Search, Grid2X2, List, Plus, X, ChevronRight, Copy, ExternalLink, RefreshCw, FileText, Music2, Globe2, Image as ImageIcon, PlayCircle, BookOpen} from 'lucide-react';
import {guessResourcePreview,resourceEmbed,safeResourceUrl,resourceHost,type ResourcePreview} from '@/lib/resource-preview';
import {requestResourcePreview} from '@/lib/cloud';

export type ResourceItem={
 id:string;title:string;category:string;url:string;note:string;source:string;tags:string[];
 previewTitle?:string;previewDescription?:string;previewImage?:string;previewSite?:string;previewKind?:string;previewFetchedAt?:string;
};
export type ResourceProduction={id:string;title:string;resourceIds?:string[]};

export function previewFields(p:ResourcePreview){
 return {previewTitle:p.title||'',previewDescription:p.description||'',previewImage:p.image||'',previewSite:p.site||'',previewKind:p.kind||'link',previewFetchedAt:p.fetchedAt||new Date().toISOString()};
}
export function resourceInfo(item:ResourceItem):ResourcePreview{
 const fallback=guessResourcePreview(item.url);
 return {title:item.previewTitle||fallback.title||item.title,description:item.previewDescription||fallback.description||'',image:item.previewImage||fallback.image||'',site:item.previewSite||item.source||fallback.site,kind:(item.previewKind||fallback.kind||'link') as ResourcePreview['kind'],fetchedAt:item.previewFetchedAt};
}
const typeNames:Record<string,string>={youtube:'YouTube',spotify:'Spotify',document:'Documento',image:'Imagen',article:'Artículo',link:'Enlace'};
export function ResourceMedia({item}:{item:ResourceItem}){
 const p=resourceInfo(item);
 const Icon=p.kind==='youtube'?PlayCircle:p.kind==='spotify'?Music2:p.kind==='image'?ImageIcon:p.kind==='document'?FileText:p.kind==='article'?BookOpen:Globe2;
 return <div className={'resource-artwork resource-art-'+p.kind}>
  <div className="resource-art-fallback"><Icon size={34} strokeWidth={1.55}/><span>{p.site}</span></div>
  {p.image&&<img src={p.image} alt={p.title?'Portada de '+p.title:'Imagen del recurso'} loading="lazy" referrerPolicy="no-referrer" onError={event=>{event.currentTarget.style.display='none'}}/>}
  <span className="resource-art-badge"><Icon size={13}/>{p.kind==='link'?item.category||'Enlace':typeNames[p.kind]}</span>
 </div>;
}

export function ResourceQuickView({item,onClose,onPreview,onUpdate,productions,onLink,onUnlink}:{item:ResourceItem;onClose:()=>void;onPreview:(i:ResourceItem)=>void|Promise<void>;onUpdate:(i:ResourceItem)=>void|Promise<void>;productions?:ResourceProduction[];onLink?:(pid:string,id:string)=>void|Promise<void>;onUnlink?:()=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(item),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[target,setTarget]=useState('');
 useEffect(()=>setDraft(item),[item]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose]);
 const preview=resourceInfo(item),url=safeResourceUrl(item.url),embed=resourceEmbed(url);
 const refresh=async()=>{setBusy(true);setError('');try{await onPreview(item)}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.')}finally{setBusy(false)}};
 const save=async()=>{if(!draft.title.trim()){setError('Escribí un título.');return;}setBusy(true);setError('');try{await onUpdate({...draft,title:draft.title.trim()});setEditing(false)}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.')}finally{setBusy(false)}};
 const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError('No se pudo copiar el enlace.')}};
 return <div className="resource-preview-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
 <section className="resource-preview-dialog" role="dialog" aria-modal="true" aria-label={'Recurso: '+item.title}>
  <header className="resource-preview-header"><span>VISTA RÁPIDA DEL RECURSO</span><button aria-label="Cerrar" onClick={onClose}><X size={21}/></button></header>
  <div className="resource-preview-scroll">
   {embed?<div className="resource-embed"><iframe src={embed} title={'Vista previa de '+item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>:<ResourceMedia item={item}/>}
   <div className="resource-preview-body">
    <div className="resource-preview-meta"><span>{typeNames[preview.kind]||item.category}</span><span>{preview.site}</span></div>
    {editing?<div className="resource-edit">
      <label>Título<input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label>Nota del equipo<textarea className="textarea" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
      <div className="form-row"><label>Tipo<input className="input" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Fuente<input className="input" value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})}/></label></div>
      <label>Etiquetas<input className="input" value={draft.tags.join(', ')} onChange={e=>setDraft({...draft,tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/></label>
      <div className="resource-buttons"><button className="btn" onClick={()=>setEditing(false)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={()=>{void save()}}>Guardar cambios</button></div>
     </div>:<><h2>{item.title}</h2>{preview.description&&<p className="resource-page-description">{preview.description}</p>}{item.note&&<div className="resource-team-note"><strong>NOTA DEL EQUIPO</strong><p>{item.note}</p></div>}{item.tags.length>0&&<div className="tags">{item.tags.map(t=><span className="tag" key={t}>#{t}</span>)}</div>}</>}
    {error&&<p className="resource-error" role="alert">{error}</p>}
    <div className="resource-buttons"><button className="btn" disabled={busy} onClick={()=>setEditing(true)}>Editar ficha</button><button className="btn" disabled={busy||!url} onClick={()=>{void refresh()}}><RefreshCw size={15} className={busy?'spinning':''}/> Actualizar preview</button></div>
    <div className="resource-buttons bottom">{url&&<a className="btn primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Abrir original</a>}<button className="btn" disabled={!url} onClick={()=>{void copy()}}><Copy size={15}/>{copied?'Copiado':'Copiar enlace'}</button></div>
    {onLink&&productions&&<div className="resource-preview-linker"><select className="select" value={target} onChange={e=>setTarget(e.target.value)} aria-label="Vincular recurso a producción"><option value="">Vincular con una producción…</option>{productions.filter(p=>!(p.resourceIds??[]).includes(item.id)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="btn primary" disabled={!target} onClick={()=>{if(target){void onLink(target,item.id);setTarget('')}}}>Vincular</button></div>}
    {onUnlink&&<button className="resource-unlink" onClick={onUnlink}>Quitar de esta producción</button>}
   </div>
  </div>
 </section></div>;
}

export function ResourceLibrary({items,productions,onNew,onLink,onArchive,onPreview,onUpdate}:{items:ResourceItem[];productions:ResourceProduction[];onNew:()=>void;onLink:(p:string,i:string)=>void|Promise<void>;onArchive:(item:ResourceItem)=>void|Promise<void>;onPreview:(item:ResourceItem)=>void|Promise<void>;onUpdate:(item:ResourceItem)=>void|Promise<void>}){
 const [search,setSearch]=useState(''),[category,setCategory]=useState('Todos'),[view,setView]=useState<'grid'|'list'>('grid'),[targets,setTargets]=useState<Record<string,string>>({}),[selected,setSelected]=useState<ResourceItem|null>(null);
 const attempted=useRef(new Set<string>());
 const categories=['Todos',...Array.from(new Set(items.map(i=>i.category)))];
 const visible=items.filter(i=>(category==='Todos'||i.category===category)&&[i.title,i.note,i.source,i.previewTitle,i.previewDescription,...i.tags].join(' ').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
 useEffect(()=>{items.filter(i=>safeResourceUrl(i.url)&&!i.previewFetchedAt&&!attempted.current.has(i.id)).slice(0,3).forEach(item=>{attempted.current.add(item.id);void Promise.resolve(onPreview(item)).catch(()=>{})})},[items,onPreview]);
 return <><div className="topbar"><div><h1>Biblioteca</h1><p>Noticias, canciones, videos y documentos listos para producir.</p></div><div className="actions"><button className="btn primary" onClick={onNew}><Plus size={16}/> Guardar recurso</button></div></div>
  <div className="resources-toolbar"><div className="resource-search"><Search size={18}/><input aria-label="Buscar recursos" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, nota o etiqueta…"/></div><select className="select" value={category} aria-label="Filtrar por tipo" onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><div className="resources-view-toggle"><button aria-label="Vista en grilla" title="Grilla" className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid2X2 size={18}/></button><button aria-label="Vista en lista" title="Lista" className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={18}/></button></div></div>
  <div className="resources-results"><span>{visible.length} {visible.length===1?'recurso':'recursos'}</span><span>Previsualizaciones compartidas con el equipo</span></div>
  <div className={view==='grid'?'resource-grid':'resource-list'}>{visible.map(item=><article className={view==='grid'?'resource-card':'resource-row'} key={item.id}>
    <button className="resource-card-main" onClick={()=>setSelected(item)}><ResourceMedia item={item}/><div className="resource-card-body"><span className="resource-source">{resourceInfo(item).site} · {typeNames[resourceInfo(item).kind]||item.category}</span><h3>{item.title}</h3><p>{item.note||item.previewDescription||'Abrí la vista rápida para conocer este recurso.'}</p>{item.tags.length>0&&<div className="tags">{item.tags.slice(0,2).map(t=><span className="tag" key={t}>#{t}</span>)}</div>}</div></button>
    <div className="resource-card-actions"><button onClick={()=>setSelected(item)}>Vista rápida <ChevronRight size={14}/></button><button className="danger-text" onClick={()=>{void onArchive(item)}}>Archivar</button></div>
    <div className="resource-linker"><select className="select" value={targets[item.id]||''} onChange={e=>setTargets(t=>({...t,[item.id]:e.target.value}))} aria-label={'Asignar '+item.title+' a producción'}><option value="">Agregar a producción…</option>{productions.filter(p=>!(p.resourceIds??[]).includes(item.id)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="btn sm primary" disabled={!targets[item.id]} onClick={()=>{const p=targets[item.id];if(p){void onLink(p,item.id);setTargets(t=>({...t,[item.id]:''}))}}}>Agregar</button></div>
  </article>)}</div>
  {visible.length===0&&<div className="empty">No hay recursos para esta búsqueda. Probá otra categoría o guardá uno nuevo.</div>}
  {selected&&<ResourceQuickView item={items.find(i=>i.id===selected.id)||selected} onClose={()=>setSelected(null)} onPreview={onPreview} onUpdate={onUpdate} onLink={onLink} productions={productions}/>}
 </>;
}

export function ResourceCreate({demo,close,onLibrary}:{demo:boolean;close:()=>void;onLibrary:(item:ResourceItem)=>void|Promise<void>}){
 const [url,setUrl]=useState(''),[title,setTitle]=useState(''),[manualTitle,setManualTitle]=useState(false),[note,setNote]=useState(''),[category,setCategory]=useState('Link'),[manualCategory,setManualCategory]=useState(false),[source,setSource]=useState(''),[tags,setTags]=useState(''),[preview,setPreview]=useState<ResourcePreview|null>(null),[fetching,setFetching]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0);
 useEffect(()=>{
  const valid=safeResourceUrl(url.trim());const id=++sequence.current;
  if(!valid){setPreview(null);setFetching(false);return;}
  setFetching(true);setError('');
  const t=setTimeout(async()=>{
   try{
    const p=await requestResourcePreview(valid,demo);
    if(sequence.current!==id)return;
    setPreview(p);
    if(!manualTitle&&p.title)setTitle(p.title);
    if(p.site)setSource(s=>s||p.site);
    if(!manualCategory)setCategory(({youtube:'Video',spotify:'Canción',document:'Documento',image:'Imagen',article:'Noticia',link:'Link'} as Record<string,string>)[p.kind]||'Link');
   }catch(e){
    if(sequence.current!==id)return;
    const p={...guessResourcePreview(valid),fetchedAt:new Date().toISOString()};
    setPreview(p);if(!manualTitle&&p.title)setTitle(p.title);setSource(s=>s||p.site);
    setError(e instanceof Error?e.message:'No se pudo recuperar la vista previa. Podés guardar el enlace.');
   }finally{if(sequence.current===id)setFetching(false)}
  },650);
  return()=>{clearTimeout(t);sequence.current++};
 },[url,demo,manualTitle,manualCategory]);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!title.trim()){setError('Escribí un título.');return;}if(url.trim()&&!safeResourceUrl(url)){setError('Ingresá un enlace válido.');return;}if(fetching){setError('Esperá a que termine la vista previa.');return;}
  setSaving(true);setError('');
  try{const p=preview||guessResourcePreview(url);await onLibrary({id:'l-'+Date.now()+'-'+Math.random().toString(36).slice(2,5),title:title.trim(),category,url:url.trim(),note,source:source||p.site||'Web',tags:tags.split(',').map(t=>t.trim()).filter(Boolean),...(url?previewFields(p):{})});close();}
  catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el recurso.')}finally{setSaving(false)}
 };
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><form className="modal resource-create-modal" onSubmit={e=>{void submit(e)}}>
  <div className="resource-modal-heading"><div><span className="panel-kicker">BIBLIOTECA · NUEVO RECURSO</span><h2>Guardar recurso</h2><p>Pegá un enlace para obtener su título e imagen automáticamente.</p></div><button type="button" aria-label="Cerrar" onClick={close}><X size={20}/></button></div>
  <label className="field">Enlace (opcional si es una nota)<input className="input" type="url" value={url} onChange={e=>{setUrl(e.target.value);setPreview(null);setSource('')}} placeholder="https://youtu.be/…"/></label>
  {fetching&&<div className="resource-fetching" role="status"><RefreshCw className="spinning" size={16}/> Recuperando vista previa…</div>}
  {preview&&<div className="resource-draft-preview"><ResourceMedia item={{id:'draft',title:title||preview.title||'Nuevo recurso',url,note,category,source:source||preview.site,tags:[],...previewFields(preview)}}/><div><strong>{preview.title||title||'Vista previa'}</strong><small>{preview.site||resourceHost(url)}</small>{preview.description&&<p>{preview.description}</p>}</div></div>}
  <label className="field">Título<input className="input" required value={title} onChange={e=>{setTitle(e.target.value);setManualTitle(true)}} placeholder="Nombre del recurso"/></label>
  <label className="field">Notas del equipo<textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Por qué sirve para el programa…"/></label>
  <div className="form-row"><label className="field">Tipo<select className="select" value={category} onChange={e=>{setCategory(e.target.value);setManualCategory(true)}}>{['Link','Noticia','Canción','Video','Documento','Imagen','Investigación','Referencia'].map(c=><option key={c}>{c}</option>)}</select></label><label className="field">Fuente<input className="input" value={source} onChange={e=>setSource(e.target.value)} placeholder="Sitio, artista o medio"/></label></div>
  <label className="field">Etiquetas<input className="input" value={tags} onChange={e=>setTags(e.target.value)} placeholder="Entrevista, canción, contenido…"/></label>
  {error&&<div className="notice error-notice" role="alert">{error}</div>}
  <div className="modal-actions"><button className="btn" type="button" onClick={close}>Cancelar</button><button className="btn primary" type="submit" disabled={saving||fetching}>{saving?'Guardando…':'Guardar recurso'}</button></div>
 </form></div>;
}
