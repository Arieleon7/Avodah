'use client';
import {useEffect,useState,type FormEvent,type ChangeEvent} from 'react';
import {ArrowUpRight,Camera,ExternalLink,ImagePlus,PlayCircle,Radio,RefreshCw,Trash2,UploadCloud,X,Youtube} from 'lucide-react';
import {parseYoutubeLive,validateCoverFile} from '@/lib/production-media';

export type ProductionCreation={
 id:string;title:string;type:string;status:'Idea';date:string;time:string;duration:number;completion:number;
 topic:string;question:string;objective:string;description:string;references:string[];hosts:string[];guests:string[];notes:string;members:string[];
 youtubeLiveUrl:string;
};
export function ProductionArtwork({cover,title,variant='card'}:{cover?:string;title:string;variant?:'card'|'feature'|'mini'}){
 const [imageFailed,setImageFailed]=useState(false);
 useEffect(()=>setImageFailed(false),[cover]);
 return <div className={'production-artwork production-artwork-'+variant}>
  {cover&&!imageFailed?<img src={cover} alt={'Portada de '+title} loading={variant==='mini'?'lazy':'eager'} referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>:<div className="production-artwork-empty" aria-label={'Sin portada para '+title}><Radio size={variant==='mini'?20:36} strokeWidth={1.25}/><span>AVODAH</span></div>}
 </div>;
}
export function YoutubeLiveAccess({url,showPreview=true,variant='detail'}:{url?:string;showPreview?:boolean;variant?:'detail'|'compact'|'program'}){
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>setExpanded(false),[url]);
 const parsed=parseYoutubeLive(url||'');
 if(!parsed)return null;
 return <section className={'youtube-live-access youtube-live-'+variant}>
   <div className="youtube-live-description"><span className="youtube-live-icon"><Youtube size={21}/></span><div><strong>Transmisión de YouTube</strong><p>Enlace asociado a esta producción</p></div></div>
   <div className="youtube-live-actions"><a className="btn primary" target="_blank" rel="noopener noreferrer" href={parsed.url}><ExternalLink size={17}/> Ver en YouTube</a>{showPreview&&parsed.embed&&<button type="button" className="btn" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><PlayCircle size={17}/>{expanded?'Ocultar':'Vista previa'}</button>}</div>
   {showPreview&&expanded&&parsed.embed&&<div className="youtube-live-frame"><iframe title="Reproductor de la transmisión de YouTube" src={parsed.embed} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; autoplay; picture-in-picture; fullscreen" allowFullScreen/></div>}
 </section>;
}
function useObjectPreview(file:File|null){
 const [preview,setPreview]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 return preview;
}
export function ProductionCoverEditor({title,coverUrl,demo,onUpload,onRemove}:{title:string;coverUrl?:string;demo:boolean;onUpload:(file:File)=>Promise<void>;onRemove:()=>Promise<void>}){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmRemove,setConfirmRemove]=useState(false);
 const local=useObjectPreview(file);
 const pick=(event:ChangeEvent<HTMLInputElement>)=>{
  const selected=event.target.files?.[0];if(!selected)return;
  try{validateCoverFile(selected);setFile(selected);setError('');setConfirmRemove(false)}
  catch(err){setFile(null);setError(err instanceof Error?err.message:'Imagen inválida.')}
  event.target.value='';
 };
 const upload=async()=>{if(!file||busy)return;setBusy(true);setError('');try{await onUpload(file);setFile(null)}catch(err){setError(err instanceof Error?err.message:'No se pudo subir la portada.')}finally{setBusy(false)}};
 const remove=async()=>{setBusy(true);setError('');try{await onRemove();setFile(null);setConfirmRemove(false)}catch(err){setError(err instanceof Error?err.message:'No se pudo quitar la portada.')}finally{setBusy(false)}};
 return <section className="production-cover-editor" aria-label="Portada del programa">
    <ProductionArtwork title={title} cover={local||coverUrl} variant="feature"/>
    <div className="production-cover-commands">
      <span><Camera size={15}/> PORTADA DEL PROGRAMA</span>
      <div className="production-cover-buttons">
        <label className={'btn production-cover-pick '+(demo||busy?'disabled':'')}><ImagePlus size={16}/> {coverUrl?'Cambiar portada':'Agregar portada'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={demo||busy} onChange={pick} aria-label="Elegir portada de la producción"/></label>
        {coverUrl&&!file&&!demo&&<button type="button" className="btn production-cover-remove" disabled={busy} onClick={()=>setConfirmRemove(v=>!v)}><Trash2 size={15}/> Quitar</button>}
      </div>
    </div>
    {file&&<div className="production-cover-confirm"><span>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</span><div><button type="button" className="btn" onClick={()=>setFile(null)} disabled={busy}>Cancelar</button><button type="button" className="btn primary" onClick={()=>{void upload()}} disabled={busy}><UploadCloud size={16}/>{busy?'Subiendo…':'Guardar portada'}</button></div></div>}
    {confirmRemove&&<div className="production-cover-confirm"><span>¿Querés quitar la portada de este programa?</span><div><button className="btn" type="button" onClick={()=>setConfirmRemove(false)} disabled={busy}>Cancelar</button><button className="btn danger" type="button" onClick={()=>{void remove()}} disabled={busy}>Quitar portada</button></div></div>}
    {demo&&<p className="production-cover-hint">Iniciá sesión para cargar portadas que pueda ver todo tu equipo.</p>}
    {error&&<p className="production-cover-error" role="alert">{error}</p>}
 </section>;
}
export function ProductionCreate({demo,currentUserName,onClose,onCreate,onUploadCover}:{demo:boolean;currentUserName:string;onClose:()=>void;onCreate:(data:ProductionCreation)=>Promise<string>;onUploadCover:(id:string,file:File)=>Promise<void>}){
 const [title,setTitle]=useState(''),[type,setType]=useState('Radio'),[date,setDate]=useState(''),[time,setTime]=useState('19:00');
 const [duration,setDuration]=useState(60),[topic,setTopic]=useState(''),[question,setQuestion]=useState(''),[description,setDescription]=useState('');
 const [youtube,setYoutube]=useState(''),[coverFile,setCoverFile]=useState<File|null>(null);
 const [created,setCreated]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const preview=useObjectPreview(coverFile);
 const parsed=youtube?parseYoutubeLive(youtube):null;
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose()};document.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',escape)}},[onClose,busy]);
 const selectFile=(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];if(!file)return;try{validateCoverFile(file);setCoverFile(file);setError('')}catch(err){setError(err instanceof Error?err.message:'Portada no válida.')}event.target.value='';
 };
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(busy)return;
  if(!title.trim()&&!created){setError('Escribí un título.');return;}
  if(youtube.trim()&&!parsed){setError('Pegá un enlace válido de YouTube (video o canal en vivo).');return;}
  if(!Number.isFinite(duration)||duration<1||duration>720){setError('La duración debe estar entre 1 y 720 minutos.');return;}
  setBusy(true);setError('');
  let productionId=created;
  try{
   if(!productionId){
    productionId=await onCreate({
     id:'p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),title:title.trim(),type,status:'Idea',
     date,time,duration,completion:5,topic:topic.trim()||title.trim(),question:question.trim(),objective:'Definir objetivo',description,
     references:[],hosts:[currentUserName],guests:[],notes:'',members:[],youtubeLiveUrl:parsed?.url||''
    });
    setCreated(productionId);
   }
   if(coverFile&&!demo){await onUploadCover(productionId,coverFile);}
   onClose();
  }catch(err){setError((productionId?'La producción se creó, pero no se pudo guardar la portada. Podés reintentar sin duplicar el programa. ':'')+(err instanceof Error?err.message:'No se pudo guardar la producción.'))}
  finally{setBusy(false)}
 };
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target&&!busy)onClose()}}>
  <form className="modal production-create-modal" onSubmit={e=>{void submit(e)}}>
   <div className="production-create-head"><div><span className="panel-kicker">NUEVA PRODUCCIÓN</span><h2>{created?'Terminar de configurar':'Creá tu próximo programa'}</h2><p>Portada, contenido y transmisión en un solo lugar.</p></div><button type="button" className="production-create-close" aria-label="Cerrar" onClick={onClose} disabled={busy}><X size={19}/></button></div>
   <div className="production-create-fields">
    <div className="production-create-cover"><label className="production-create-cover-pick"><div className="production-create-image">{preview?<img src={preview} alt="Vista previa de la portada elegida"/>:<div><ImagePlus size={32}/><strong>Agregar portada</strong><span>Horizontal 16:9 · JPG, PNG o WebP · hasta 8 MB</span></div>}</div><span className="btn"><Camera size={16}/>{coverFile?'Cambiar imagen':'Elegir imagen'}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={demo||busy||!!created} onChange={selectFile} aria-label="Seleccionar portada del programa"/></label>{demo&&<small>Para subir portadas, ingresá con tu cuenta.</small>}</div>
    <div className="field"><label htmlFor="new-production-title">Título del programa</label><input id="new-production-title" className="input" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Las 3D · El próximo programa" disabled={busy||!!created}/></div>
    <div className="form-row"><div className="field"><label>Formato<select className="select" value={type} onChange={e=>setType(e.target.value)} disabled={busy||!!created}>{['Radio','Streaming','Podcast','Videopodcast','YouTube / Contenido','Personalizado'].map(format=><option key={format}>{format}</option>)}</select></label></div><div className="field"><label>Duración (minutos)<input className="input" type="number" min={1} max={720} value={duration} onChange={e=>setDuration(Number(e.target.value))} disabled={busy||!!created}/></label></div></div>
    <div className="form-row"><div className="field"><label>Fecha<input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={busy||!!created}/></label></div><div className="field"><label>Hora<input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} disabled={busy||!!created}/></label></div></div>
    <div className="field"><label>Tema central<input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="¿De qué trata esta emisión?" disabled={busy||!!created}/></label></div>
    <div className="field"><label>Pregunta disparadora<input className="input" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="La pregunta que abre el debate" disabled={busy||!!created}/></label></div>
    <div className="field"><label>Descripción<textarea className="textarea" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Desarrollá las ideas principales del programa…" disabled={busy||!!created}/></label></div>
    <div className="production-create-youtube"><label htmlFor="production-youtube-live"><Youtube size={18}/> Enlace de transmisión en vivo</label><input id="production-youtube-live" type="url" className="input" value={youtube} onChange={e=>setYoutube(e.target.value)} placeholder="https://www.youtube.com/live/…" aria-invalid={!!youtube&&!parsed} disabled={busy||!!created}/><small>Podés agregar un video programado o la dirección /live de tu canal.</small>{!!youtube&&!parsed&&<p className="production-cover-error">Introducí un enlace de YouTube válido.</p>}{parsed&&<span className="production-youtube-accepted">Enlace de YouTube reconocido</span>}</div>
   </div>
   {error&&<p className="production-cover-error" role="alert">{error}</p>}
   <div className="modal-actions"><button type="button" className="btn" onClick={onClose} disabled={busy}>{created?'Terminar después':'Cancelar'}</button><button type="submit" className="btn primary" disabled={busy||(!title.trim()&&!created)||!!youtube&&!parsed}>{busy?'Guardando…':created?'Reintentar portada':'Crear programa'}</button></div>
  </form>
 </div>;
}
