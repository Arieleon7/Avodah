'use client';
import {useEffect,useRef,useState, type FormEvent, type DragEvent} from 'react';
import {Search, Grid2X2, List, Plus, X, ChevronRight, Copy, ExternalLink, RefreshCw, FileText, Music2, Globe2, Image as ImageIcon, PlayCircle, BookOpen, UploadCloud, Video, FileAudio, FileUp, FileImage, Download, CloudOff, LibraryBig, Film, Headphones, Images, FolderOpen} from 'lucide-react';
import {guessResourcePreview,resourceEmbed,safeResourceUrl,resourceHost,type ResourcePreview} from '@/lib/resource-preview';
import {requestResourcePreview,resourceSignedUrl,inspectResourceFile,RESOURCE_FILE_LIMIT} from '@/lib/cloud';

export type ResourceItem={
 id:string;title:string;category:string;url:string;note:string;source:string;tags:string[];
 previewTitle?:string;previewDescription?:string;previewImage?:string;previewSite?:string;previewKind?:string;previewFetchedAt?:string;
 storagePath?:string;fileName?:string;fileMime?:string;fileSize?:number;fileUrl?:string;
};
export type ResourceProduction={id:string;title:string;resourceIds?:string[]};

export function previewFields(p:ResourcePreview){
 return {previewTitle:p.title||'',previewDescription:p.description||'',previewImage:p.image||'',previewSite:p.site||'',previewKind:p.kind||'link',previewFetchedAt:p.fetchedAt||new Date().toISOString()};
}
export function resourceInfo(item:ResourceItem):ResourcePreview{
 const fallback=guessResourcePreview(item.url);
 return {title:item.previewTitle||fallback.title||item.title,description:item.previewDescription||fallback.description||'',image:item.previewImage||fallback.image||'',site:item.previewSite||item.source||fallback.site,kind:(item.previewKind||fallback.kind||'link') as ResourcePreview['kind'],fetchedAt:item.previewFetchedAt};
}
const typeNames:Record<string,string>={youtube:'YouTube',spotify:'Spotify',document:'Documento',image:'Imagen',audio:'Audio',video:'Video',article:'Artículo',link:'Enlace'};
const fileSize=(size:number)=>size>=1024*1024?(size/1024/1024).toFixed(1)+' MB':Math.max(1,Math.ceil(size/1024))+' KB';
type LibrarySection='library'|'media';
type MediaKind='Imagen'|'Audio'|'Video';
function mediaKind(item:ResourceItem):MediaKind|null{
 const mime=(item.fileMime||'').toLowerCase();
 if(!item.storagePath)return null;
 if(mime.startsWith('image/'))return 'Imagen';
 if(mime.startsWith('audio/'))return 'Audio';
 if(mime.startsWith('video/'))return 'Video';
 return null;
}
function MediaArtwork({item}:{item:ResourceItem}){
 const kind=mediaKind(item);
 if(kind==='Imagen'&&item.fileUrl)return <div className="media-asset-preview image"><img src={item.fileUrl} alt={item.title} loading="lazy" referrerPolicy="no-referrer"/><span><Images size={13}/>{kind}</span></div>;
 if(kind==='Video'&&item.fileUrl)return <div className="media-asset-preview video"><video src={item.fileUrl} muted playsInline preload="metadata" aria-label={'Vista previa de '+item.title}/><span><Film size={13}/>{kind}</span><i className="media-play-mark"><PlayCircle size={34}/></i></div>;
 if(kind==='Audio')return <div className="media-asset-preview audio"><div className="media-audio-visual"><Headphones size={34}/><div>{[1,2,3,4,5,6,7,8,9].map(n=><i key={n}/>)}</div></div><span><FileAudio size={13}/>{kind}</span></div>;
 return <div className="media-asset-preview"><FileUp size={32}/></div>;
}
export function ResourceMedia({item}:{item:ResourceItem}){
 const p=resourceInfo(item);
 const Icon=p.kind==='youtube'?PlayCircle:p.kind==='spotify'?Music2:p.kind==='image'?ImageIcon:p.kind==='document'?FileText:p.kind==='audio'?FileAudio:p.kind==='video'?Video:p.kind==='article'?BookOpen:Globe2;
 return <div className={'resource-artwork resource-art-'+p.kind}>
  <div className="resource-art-fallback"><Icon size={34} strokeWidth={1.55}/><span>{p.site}</span></div>
  {(item.storagePath&&p.kind==='image'?item.fileUrl:p.image)&&<img src={item.storagePath&&p.kind==='image'?item.fileUrl:p.image} alt={p.title?'Portada de '+p.title:'Imagen del recurso'} loading="lazy" referrerPolicy="no-referrer" onError={event=>{event.currentTarget.style.display='none'}}/>}
  <span className="resource-art-badge"><Icon size={13}/>{p.kind==='link'?item.category||'Enlace':typeNames[p.kind]}</span>
 </div>;
}

export function ResourceQuickView({item,onClose,onPreview,onUpdate,productions,onLink,onUnlink}:{item:ResourceItem;onClose:()=>void;onPreview:(i:ResourceItem)=>void|Promise<void>;onUpdate:(i:ResourceItem)=>void|Promise<void>;productions?:ResourceProduction[];onLink?:(pid:string,id:string)=>void|Promise<void>;onUnlink?:()=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(item),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[target,setTarget]=useState('');
 useEffect(()=>setDraft(item),[item]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose]);
 const preview=resourceInfo(item),url=safeResourceUrl(item.url),embed=resourceEmbed(url);
 const isFile=!!item.storagePath||!!(item.fileName&&item.fileUrl);
 const [freshFileUrl,setFreshFileUrl]=useState(item.fileUrl||'');
 useEffect(()=>{let alive=true;
  if(item.storagePath){void resourceSignedUrl(item.storagePath).then(link=>{if(alive)setFreshFileUrl(link)}).catch(()=>{if(alive)setError('No se pudo abrir el archivo privado. Comprobá tu sesión.')})}
  else setFreshFileUrl(item.fileUrl||'');
  return()=>{alive=false};
 },[item.storagePath,item.fileUrl]);
 const refresh=async()=>{setBusy(true);setError('');try{await onPreview(item)}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.')}finally{setBusy(false)}};
 const save=async()=>{if(!draft.title.trim()){setError('Escribí un título.');return;}setBusy(true);setError('');try{await onUpdate({...draft,title:draft.title.trim()});setEditing(false)}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.')}finally{setBusy(false)}};
 const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError('No se pudo copiar el enlace.')}};
 return <div className="resource-preview-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
 <section className="resource-preview-dialog" role="dialog" aria-modal="true" aria-label={'Recurso: '+item.title}>
  <header className="resource-preview-header"><span>VISTA RÁPIDA DEL RECURSO</span><button aria-label="Cerrar" onClick={onClose}><X size={21}/></button></header>
  <div className="resource-preview-scroll">
   {isFile?<div className="resource-file-viewer">
    {freshFileUrl&&item.fileMime?.startsWith('image/')?<img src={freshFileUrl} alt={item.fileName||item.title} referrerPolicy="no-referrer"/>:
     freshFileUrl&&item.fileMime?.startsWith('audio/')?<div className="resource-player"><FileAudio size={38}/><audio controls preload="metadata" src={freshFileUrl}>El navegador no admite este audio.</audio></div>:
     freshFileUrl&&item.fileMime?.startsWith('video/')?<video src={freshFileUrl} controls playsInline preload="metadata">El navegador no admite este video.</video>:
     freshFileUrl&&item.fileMime==='application/pdf'?<iframe className="resource-pdf" src={freshFileUrl+'#toolbar=1'} title={'Vista previa del PDF '+item.title}/>:
     <ResourceMedia item={{...item,fileUrl:freshFileUrl}}/>}
   </div>:embed?<div className="resource-embed"><iframe src={embed} title={'Vista previa de '+item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>:<ResourceMedia item={item}/>}
   <div className="resource-preview-body">
    <div className="resource-preview-meta"><span>{typeNames[preview.kind]||item.category}</span><span>{isFile?'Archivo privado · '+fileSize(item.fileSize||0):preview.site}</span></div>
    {editing?<div className="resource-edit">
      <label>Título<input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label>Nota del equipo<textarea className="textarea" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
      <div className="form-row"><label>Tipo<input className="input" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Fuente<input className="input" value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})}/></label></div>
      <label>Etiquetas<input className="input" value={draft.tags.join(', ')} onChange={e=>setDraft({...draft,tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/></label>
      <div className="resource-buttons"><button className="btn" onClick={()=>setEditing(false)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={()=>{void save()}}>Guardar cambios</button></div>
     </div>:<><h2>{item.title}</h2>{isFile&&<p className="resource-page-description">{item.fileName}{item.fileMime==='application/pdf'?' · PDF':item.fileMime?.includes('word')?' · Word':''} · Sólo los integrantes de este equipo pueden acceder al archivo.</p>}{preview.description&&!isFile&&<p className="resource-page-description">{preview.description}</p>}{item.note&&<div className="resource-team-note"><strong>NOTA DEL EQUIPO</strong><p>{item.note}</p></div>}{item.tags.length>0&&<div className="tags">{item.tags.map(t=><span className="tag" key={t}>#{t}</span>)}</div>}</>}
    {error&&<p className="resource-error" role="alert">{error}</p>}
    <div className="resource-buttons"><button className="btn" disabled={busy} onClick={()=>setEditing(true)}>Editar ficha</button>{!isFile&&<button className="btn" disabled={busy||!url} onClick={()=>{void refresh()}}><RefreshCw size={15} className={busy?'spinning':''}/> Actualizar preview</button>}</div>
    <div className="resource-buttons bottom">{isFile?freshFileUrl&&<a className="btn primary" href={freshFileUrl} target="_blank" rel="noopener noreferrer"><Download size={16}/> Abrir / descargar archivo</a>:<>{url&&<a className="btn primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Abrir original</a>}<button className="btn" disabled={!url} onClick={()=>{void copy()}}><Copy size={15}/>{copied?'Copiado':'Copiar enlace'}</button></>}</div>
    {onLink&&productions&&<div className="resource-preview-linker"><select className="select" value={target} onChange={e=>setTarget(e.target.value)} aria-label="Vincular recurso a producción"><option value="">Vincular con una producción…</option>{productions.filter(p=>!(p.resourceIds??[]).includes(item.id)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="btn primary" disabled={!target} onClick={()=>{if(target){void onLink(target,item.id);setTarget('')}}}>Vincular</button></div>}
    {onUnlink&&<button className="resource-unlink" onClick={onUnlink}>Quitar de esta producción</button>}
   </div>
  </div>
 </section></div>;
}

export function ResourceLibrary({items,productions,onNew,onNewFile,onNewMedia,onLink,onArchive,onPreview,onUpdate}:{items:ResourceItem[];productions:ResourceProduction[];onNew:()=>void;onNewFile:()=>void;onNewMedia:()=>void;onLink:(p:string,i:string)=>void|Promise<void>;onArchive:(item:ResourceItem)=>void|Promise<void>;onPreview:(item:ResourceItem)=>void|Promise<void>;onUpdate:(item:ResourceItem)=>void|Promise<void>}){
 const [section,setSection]=useState<LibrarySection>('library');
 const [search,setSearch]=useState(''),[category,setCategory]=useState('Todos'),[mediaFilter,setMediaFilter]=useState<'Todos'|MediaKind>('Todos'),[view,setView]=useState<'grid'|'list'>('grid'),[targets,setTargets]=useState<Record<string,string>>({}),[selected,setSelected]=useState<ResourceItem|null>(null);
 const attempted=useRef(new Set<string>());
 const categories=['Todos',...Array.from(new Set(items.map(i=>i.category)))];
 const matches=(i:ResourceItem)=>[i.title,i.note,i.source,i.previewTitle,i.previewDescription,i.fileName,...i.tags].join(' ').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'));
 const visible=items.filter(i=>(category==='Todos'||i.category===category)&&matches(i));
 const media=items.filter(i=>mediaKind(i)!==null);
 const visibleMedia=media.filter(i=>(mediaFilter==='Todos'||mediaKind(i)===mediaFilter)&&matches(i));
 const imageCount=media.filter(i=>mediaKind(i)==='Imagen').length,audioCount=media.filter(i=>mediaKind(i)==='Audio').length,videoCount=media.filter(i=>mediaKind(i)==='Video').length;
 const mediaBytes=media.reduce((sum,item)=>sum+(item.fileSize||0),0);
 useEffect(()=>{items.filter(i=>safeResourceUrl(i.url)&&!i.previewFetchedAt&&!attempted.current.has(i.id)).slice(0,3).forEach(item=>{attempted.current.add(item.id);void Promise.resolve(onPreview(item)).catch(()=>{})})},[items,onPreview]);
 const linker=(item:ResourceItem)=><div className="resource-linker"><select className="select" value={targets[item.id]||''} onChange={e=>setTargets(t=>({...t,[item.id]:e.target.value}))} aria-label={'Asignar '+item.title+' a producción'}><option value="">Agregar a producción…</option>{productions.filter(p=>!(p.resourceIds??[]).includes(item.id)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="btn sm primary" disabled={!targets[item.id]} onClick={()=>{const pid=targets[item.id];if(pid){void onLink(pid,item.id);setTargets(t=>({...t,[item.id]:''}))}}}>Agregar</button></div>;
 return <><div className="topbar"><div><h1>Biblioteca</h1><p>Recursos, documentos y multimedia compartidos por toda la organización.</p></div><div className="actions">{section==='media'?<button className="btn primary" onClick={onNewMedia}><UploadCloud size={16}/> Subir multimedia</button>:<><button className="btn" onClick={onNewFile}><UploadCloud size={16}/> Subir archivo</button><button className="btn primary" onClick={onNew}><Plus size={16}/> Guardar enlace</button></>}</div></div>
  <nav className="library-sections" aria-label="Secciones de Biblioteca">
    <button type="button" className={section==='library'?'active':''} onClick={()=>setSection('library')}><LibraryBig size={18}/><span><strong>Biblioteca</strong><small>Todos los recursos</small></span><b>{items.length}</b></button>
    <button type="button" className={section==='media'?'active':''} onClick={()=>setSection('media')}><Film size={18}/><span><strong>Multimedia</strong><small>Imágenes, audio y video</small></span><b>{media.length}</b></button>
  </nav>
  {section==='library'?<>
   <div className="resources-toolbar"><div className="resource-search"><Search size={18}/><input aria-label="Buscar recursos" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, nota o etiqueta…"/></div><select className="select" value={category} aria-label="Filtrar por tipo" onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><div className="resources-view-toggle"><button aria-label="Vista en grilla" title="Grilla" className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid2X2 size={18}/></button><button aria-label="Vista en lista" title="Lista" className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={18}/></button></div></div>
   <div className="resources-results"><span>{visible.length} {visible.length===1?'recurso':'recursos'}</span><span>Compartidos con el equipo</span></div>
   <div className={view==='grid'?'resource-grid':'resource-list'}>{visible.map(item=><article className={view==='grid'?'resource-card':'resource-row'} key={item.id}>
     <button className="resource-card-main" onClick={()=>setSelected(item)}><ResourceMedia item={item}/><div className="resource-card-body"><span className="resource-source">{resourceInfo(item).site} · {typeNames[resourceInfo(item).kind]||item.category}</span><h3>{item.title}</h3><p>{item.note||item.previewDescription||'Abrí la vista rápida para conocer este recurso.'}</p>{item.tags.length>0&&<div className="tags">{item.tags.slice(0,2).map(t=><span className="tag" key={t}>#{t}</span>)}</div>}</div></button>
     <div className="resource-card-actions"><button onClick={()=>setSelected(item)}>Vista rápida <ChevronRight size={14}/></button><button className="danger-text" onClick={()=>{void onArchive(item)}}>Archivar</button></div>
     {linker(item)}
   </article>)}</div>
   {visible.length===0&&<div className="empty">No hay recursos para esta búsqueda. Probá otra categoría o guardá uno nuevo.</div>}
  </>:<>
   <section className="multimedia-intro"><div><span className="panel-kicker">ARCHIVOS COMPARTIDOS</span><h2>Multimedia de la organización</h2><p>Un espacio común para guardar imágenes, audios y videos que el equipo puede reutilizar en cualquier producción.</p></div><button className="btn primary" onClick={onNewMedia}><UploadCloud size={16}/> Subir multimedia</button></section>
   <div className="multimedia-stats" aria-label="Resumen multimedia">
     <div><span className="media-stat-icon image"><Images size={18}/></span><strong>{imageCount}</strong><small>Imágenes</small></div>
     <div><span className="media-stat-icon audio"><Headphones size={18}/></span><strong>{audioCount}</strong><small>Audios</small></div>
     <div><span className="media-stat-icon video"><Film size={18}/></span><strong>{videoCount}</strong><small>Videos</small></div>
     <div><span className="media-stat-icon storage"><FolderOpen size={18}/></span><strong>{mediaBytes?fileSize(mediaBytes):'0 KB'}</strong><small>Almacenados</small></div>
   </div>
   <div className="multimedia-toolbar"><div className="resource-search"><Search size={18}/><input aria-label="Buscar multimedia" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar multimedia…"/></div><div className="multimedia-filters">{(['Todos','Imagen','Audio','Video'] as const).map(kind=><button type="button" key={kind} className={mediaFilter===kind?'active':''} onClick={()=>setMediaFilter(kind)}>{kind}</button>)}</div></div>
   <div className="multimedia-results"><span>{visibleMedia.length} {visibleMedia.length===1?'archivo multimedia':'archivos multimedia'}</span><span>Privados para esta organización</span></div>
   <div className="multimedia-grid">{visibleMedia.map(item=><article className="media-asset-card" key={item.id}>
     <button className="media-asset-main" type="button" onClick={()=>setSelected(item)}><MediaArtwork item={item}/><div className="media-asset-copy"><div><span>{mediaKind(item)}</span><span>{fileSize(item.fileSize||0)}</span></div><h3>{item.title}</h3><p>{item.note||item.fileName||'Archivo multimedia compartido.'}</p>{item.tags.length>0&&<div className="tags">{item.tags.slice(0,2).map(tag=><span className="tag" key={tag}>#{tag}</span>)}</div>}</div></button>
     <div className="media-asset-actions"><button type="button" onClick={()=>setSelected(item)}>Abrir <ChevronRight size={14}/></button><button type="button" className="danger-text" onClick={()=>{void onArchive(item)}}>Archivar</button></div>
     {linker(item)}
   </article>)}</div>
   {visibleMedia.length===0&&<div className="multimedia-empty"><span className="media-empty-icon"><Film size={28}/></span><h3>{media.length?'No hay archivos de este tipo':'Todavía no hay multimedia compartida'}</h3><p>{media.length?'Probá con otro filtro o una búsqueda diferente.':'Subí imágenes, audios o videos y quedarán disponibles para toda la organización.'}</p><button className="btn primary" onClick={onNewMedia}><UploadCloud size={16}/> Subir multimedia</button></div>}
  </>}
  {selected&&<ResourceQuickView item={items.find(i=>i.id===selected.id)||selected} onClose={()=>setSelected(null)} onPreview={onPreview} onUpdate={onUpdate} onLink={onLink} productions={productions}/>}
 </>;
}

function ResourceLinkCreate({demo,close,onLibrary,onSwitchToFile}:{demo:boolean;close:()=>void;onLibrary:(item:ResourceItem)=>void|Promise<void>;onSwitchToFile:()=>void}){
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
    const p:ResourcePreview={...guessResourcePreview(valid),fetchedAt:new Date().toISOString()};
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
  <div className="resource-save-tabs"><button type="button" className="active"><Globe2 size={16}/> Pegar enlace</button><button type="button" onClick={onSwitchToFile}><UploadCloud size={16}/> Subir archivo</button></div>
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


export type UploadResourceInfo={title:string;category:string;note:string;source:string;tags:string[]};

function ResourceFileUpload({demo,close,onUpload,onSwitchToLink,fileMode='all'}:{demo:boolean;close:()=>void;onUpload:(file:File,i:UploadResourceInfo)=>void|Promise<void>;onSwitchToLink:()=>void;fileMode?:'all'|'media'}){
 const [file,setFile]=useState<File|null>(null),[previewUrl,setPreviewUrl]=useState(''),[title,setTitle]=useState(''),[category,setCategory]=useState('Documento'),[note,setNote]=useState(''),[tags,setTags]=useState(''),[dragging,setDragging]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(!file){setPreviewUrl('');return;}const link=URL.createObjectURL(file);setPreviewUrl(link);return()=>URL.revokeObjectURL(link)},[file]);
 const selectFile=(newFile:File|undefined)=>{
  if(!newFile)return;
  try{
   const info=inspectResourceFile(newFile);
   if(fileMode==='media'&&info.kind==='document')throw new Error('En Multimedia sólo podés subir imágenes, audios o videos.');
   setFile(newFile);setTitle(newFile.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '));setError('');
   setCategory(info.kind==='video'?'Video':info.kind==='audio'?'Audio':info.kind==='image'?'Imagen':'Documento');
  }catch(e){setError(e instanceof Error?e.message:'Archivo no válido.');setFile(null)}
 };
 const onDrop=(e:DragEvent<HTMLDivElement>)=>{e.preventDefault();setDragging(false);selectFile(e.dataTransfer.files?.[0])};
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(demo){setError('Iniciá sesión con Google para subir archivos privados y compartirlos con tu equipo.');return;}
  if(!file){setError('Seleccioná un archivo.');return;}
  if(!title.trim()){setError('Escribí un título.');return;}
  setBusy(true);setError('');setStage('Subiendo el archivo al espacio privado…');
  try{await onUpload(file,{title:title.trim(),category,note,source:fileMode==='media'?'Multimedia compartido':'Archivo compartido',tags:tags.split(',').map(t=>t.trim()).filter(Boolean)});setStage('Archivo guardado.');close();}
  catch(e){setError(e instanceof Error?e.message:'No se pudo subir el archivo.');setStage('')}finally{setBusy(false)}
 };
 const type= file?inspectResourceFile(file).kind:'document';
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target&&!busy)close()}}><form className="modal resource-create-modal" onSubmit={e=>{void submit(e)}}>
   <div className="resource-modal-heading"><div><span className="panel-kicker">{fileMode==='media'?'BIBLIOTECA · MULTIMEDIA':'BIBLIOTECA · ARCHIVO COMPARTIDO'}</span><h2>{fileMode==='media'?'Subir multimedia':'Subir un archivo'}</h2><p>{fileMode==='media'?'Compartí imágenes, audios y videos con toda la organización.':'Guardá archivos de lectura, audio, video e imágenes para tu equipo.'}</p></div><button type="button" aria-label="Cerrar" onClick={close} disabled={busy}><X size={20}/></button></div>
   {fileMode==='all'&&<div className="resource-save-tabs"><button type="button" onClick={onSwitchToLink} disabled={busy}><Globe2 size={16}/> Pegar enlace</button><button type="button" className="active"><UploadCloud size={16}/> Subir archivo</button></div>}
   <div className={dragging?'resource-file-dropzone dragging':'resource-file-dropzone'} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false)}} onDrop={onDrop}>
     <UploadCloud size={31} strokeWidth={1.5}/><strong>{file?file.name:'Arrastrá tu archivo acá'}</strong>
     <small>{file?fileSize(file.size)+' · '+category:fileMode==='media'?'Imágenes, MP3, WAV, M4A, MP4, MOV o WEBM · Máximo 50 MB':'PDF, Word, PowerPoint, Excel, imágenes, MP3, WAV, MP4 o MOV · Máximo 50 MB'}</small>
     <input ref={inputRef} type="file" accept={fileMode==='media'?'.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm,.m4v':'.pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm,.m4v'} aria-label={fileMode==='media'?'Elegir archivo multimedia':'Elegir archivo para subir'} onChange={e=>selectFile(e.target.files?.[0])} disabled={busy}/>
     <button type="button" className="btn" onClick={()=>inputRef.current?.click()} disabled={busy}>{file?'Elegir otro archivo':'Examinar archivos'}</button>
   </div>
   {file&&previewUrl&&<div className="resource-upload-preview">
     {type==='image'?<img src={previewUrl} alt={'Vista previa de '+file.name}/>:type==='audio'?<audio controls preload="metadata" src={previewUrl}/>:type==='video'?<video controls playsInline preload="metadata" src={previewUrl}/>:type==='document'&&file.type==='application/pdf'?<iframe title="Vista previa del PDF seleccionado" src={previewUrl+'#toolbar=0'}/>:<div className="resource-upload-fallback"><FileText size={34}/><span>{file.name}</span><small>La lectura se abre con el programa compatible después de subirlo.</small></div>}
   </div>}
   {demo&&<div className="resource-file-warning"><CloudOff size={18}/><span>El modo demo no guarda archivos. Iniciá sesión con Google para habilitar el almacenamiento privado compartido.</span></div>}
   <div className="resource-upload-details">
     <label className="field">Título para la Biblioteca<input className="input" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Nombre del recurso" disabled={busy}/></label>
     <label className="field">Notas del equipo<textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)} rows={6} placeholder="Podés escribir un resumen, instrucciones de uso, fragmentos importantes…" disabled={busy}/></label>
     <div className="form-row">{fileMode==='media'?<label className="field">Tipo<div className="media-upload-kind">{category==='Imagen'?<Images size={16}/>:category==='Audio'?<Headphones size={16}/>:<Film size={16}/>}<span>{category}</span></div></label>:<label className="field">Tipo<select className="select" value={category} onChange={e=>setCategory(e.target.value)} disabled={busy}>{['Documento','Audio','Video','Imagen','Investigación','Referencia','Canción'].map(x=><option key={x}>{x}</option>)}</select></label>}<label className="field">Etiquetas<input className="input" value={tags} onChange={e=>setTags(e.target.value)} placeholder={fileMode==='media'?'cortina, promoción, entrevista…':'archivo, audio, guion…'} disabled={busy}/></label></div>
   </div>
   {stage&&<div className="resource-upload-stage" role="status"><RefreshCw className="spinning" size={16}/>{stage}</div>}
   {error&&<div className="notice error-notice" role="alert">{error}</div>}
   <div className="modal-actions"><button className="btn" type="button" disabled={busy} onClick={close}>Cancelar</button><button className="btn primary" type="submit" disabled={busy||demo||!file}>{busy?'Subiendo…':'Subir y compartir'}</button></div>
 </form></div>;
}
export function ResourceCreate({demo,close,onLibrary,onUpload,initialTab='link',fileMode='all'}:{demo:boolean;close:()=>void;onLibrary:(item:ResourceItem)=>void|Promise<void>;onUpload:(file:File,i:UploadResourceInfo)=>void|Promise<void>;initialTab?:'link'|'file';fileMode?:'all'|'media'}){
 const [tab,setTab]=useState(initialTab);
 return tab==='file'
 ?<ResourceFileUpload demo={demo} close={close} onUpload={onUpload} fileMode={fileMode} onSwitchToLink={()=>setTab('link')}/>
 :<ResourceLinkCreate demo={demo} close={close} onLibrary={onLibrary} onSwitchToFile={()=>setTab('file')}/>;
}
