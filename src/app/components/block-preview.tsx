'use client';
import {Clock3,Pencil,Radio,UserRound,X} from 'lucide-react';
import type {ScriptBlockItem} from './script-board';

export function BlockPreviewDialog({block,onClose,onEdit}:{block:ScriptBlockItem;onClose:()=>void;onEdit:()=>void}){
 return <div className="block-preview-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <article className="block-preview-dialog" role="dialog" aria-modal="true" aria-label={'Bloque '+block.title}>
     <header><div><span className="panel-kicker">BLOQUE DEL GUIÓN</span><span className="block-preview-type">{block.type}</span><h2>{block.title}</h2></div><button type="button" className="block-preview-close" onClick={onClose} aria-label="Cerrar"><X size={21}/></button></header>
     <div className="block-preview-meta"><span><Clock3 size={15}/>{block.duration} min</span><span><UserRound size={15}/>{block.responsible||'Sin asignar'}</span><span><Radio size={15}/>{block.status}</span></div>
     <section className="block-preview-content"><span className="panel-kicker">GUION / NOTAS DEL BLOQUE</span><div>{block.notes?<p>{block.notes}</p>:<p className="muted">Este bloque todavía no tiene notas.</p>}</div></section>
     <footer><button type="button" className="btn" onClick={onClose}>Cerrar</button><button type="button" className="btn primary" onClick={onEdit}><Pencil size={16}/> Editar bloque</button></footer>
   </article>
 </div>;
}
