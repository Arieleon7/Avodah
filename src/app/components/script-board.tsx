'use client';
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {Copy,Eye,GripVertical,Pencil,Trash2} from 'lucide-react';

export type ScriptBlockItem={
 id:string;productionId:string;order:number;type:string;title:string;duration:number;responsible:string;notes:string;status:string;
};
export function ScriptBoard({blocks,onReorder,onOpen,onEdit,onDuplicate,onDelete}:{blocks:ScriptBlockItem[];onReorder:(orderedIds:string[])=>Promise<void>|void;onOpen:(block:ScriptBlockItem)=>void;onEdit:(block:ScriptBlockItem)=>void;onDuplicate:(block:ScriptBlockItem)=>Promise<void>|void;onDelete:(block:ScriptBlockItem)=>Promise<void>|void}){
 const sorted=[...blocks].sort((a,b)=>a.order-b.order);
 const [items,setItems]=useState(sorted);
 const [dragId,setDragId]=useState<string|null>(null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [announcement,setAnnouncement]=useState('');
 const itemsRef=useRef(items);
 const originRef=useRef<ScriptBlockItem[]>([]);
 const pointerRef=useRef<number|null>(null);
 const dragIdRef=useRef<string|null>(null);

 useEffect(()=>{itemsRef.current=items},[items]);
 useEffect(()=>{if(!dragId){const next=[...blocks].sort((a,b)=>a.order-b.order);setItems(next);itemsRef.current=next}},[blocks,dragId]);

 const persist=async(nextItems:ScriptBlockItem[],label?:string)=>{
   const ids=nextItems.map(item=>item.id);
   setSaving(true);setError('');
   try{await onReorder(ids);if(label)setAnnouncement(label)}
   catch(err){
     setError(err instanceof Error?err.message:'No se pudo guardar el nuevo orden.');
     const fallback=[...blocks].sort((a,b)=>a.order-b.order);
     setItems(fallback);itemsRef.current=fallback;
   }finally{setSaving(false)}
 };

 const reorderToIndex=(activeId:string,toIndex:number)=>{
   const current=[...itemsRef.current];
   const from=current.findIndex(item=>item.id===activeId);
   if(from<0)return current;
   const bounded=Math.max(0,Math.min(current.length-1,toIndex));
   if(from===bounded)return current;
   const [moving]=current.splice(from,1);
   current.splice(bounded,0,moving);
   const normalized=current.map((item,index)=>({...item,order:index+1}));
   itemsRef.current=normalized;
   setItems(normalized);
   return normalized;
 };

 const targetIndexForPointer=(clientY:number,activeId:string)=>{
   const rows=Array.from(document.querySelectorAll<HTMLElement>('[data-script-block-id]'))
     .filter(row=>row.dataset.scriptBlockId!==activeId)
     .map(row=>row.getBoundingClientRect())
     .sort((a,b)=>a.top-b.top);
   if(!rows.length)return 0;
   for(let i=0;i<rows.length;i++){
     const center=rows[i].top+rows[i].height/2;
     if(clientY<center)return i;
   }
   return rows.length;
 };

 const maybeAutoScroll=(clientY:number)=>{
   const edge=90;
   if(clientY<edge)window.scrollBy({top:-14,left:0,behavior:'auto'});
   else if(clientY>window.innerHeight-edge)window.scrollBy({top:14,left:0,behavior:'auto'});
 };

 const startDrag=(event:ReactPointerEvent<HTMLButtonElement>,id:string)=>{
   if(saving||pointerRef.current!==null)return;
   event.preventDefault();
   event.stopPropagation();
   try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}
   pointerRef.current=event.pointerId;
   dragIdRef.current=id;
   originRef.current=[...itemsRef.current];
   setDragId(id);
   setError('');
   setAnnouncement('Arrastrando bloque. Movelo a la posición deseada y soltá.');
   document.body.classList.add('script-dragging-body');
 };

 const dragMove=(event:ReactPointerEvent<HTMLButtonElement>)=>{
   const activeId=dragIdRef.current;
   if(!activeId||pointerRef.current!==event.pointerId)return;
   event.preventDefault();
   event.stopPropagation();
   maybeAutoScroll(event.clientY);
   reorderToIndex(activeId,targetIndexForPointer(event.clientY,activeId));
 };

 const finishDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{
   const activeId=dragIdRef.current;
   if(!activeId||pointerRef.current!==event.pointerId)return;
   event.preventDefault();
   event.stopPropagation();
   try{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}catch{}
   pointerRef.current=null;
   dragIdRef.current=null;
   const finalItems=[...itemsRef.current];
   const changed=originRef.current.map(item=>item.id).join('|')!==finalItems.map(item=>item.id).join('|');
   setDragId(null);
   document.body.classList.remove('script-dragging-body');
   if(changed)void persist(finalItems,'Orden del guión actualizado.');
   else setAnnouncement('Bloque sin cambios de posición.');
 };

 const cancelDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{
   if(pointerRef.current!==event.pointerId)return;
   const fallback=originRef.current.map((item,index)=>({...item,order:index+1}));
   pointerRef.current=null;
   dragIdRef.current=null;
   setDragId(null);
   setItems(fallback);itemsRef.current=fallback;
   document.body.classList.remove('script-dragging-body');
   setAnnouncement('Movimiento cancelado.');
 };

 const keyboardMove=(event:ReactKeyboardEvent<HTMLButtonElement>,id:string)=>{
   if(saving||!['ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();
   const current=[...itemsRef.current];
   const from=current.findIndex(item=>item.id===id);
   const to=event.key==='ArrowUp'?from-1:from+1;
   if(from<0||to<0||to>=current.length)return;
   const next=reorderToIndex(id,to);
   void persist(next,'Bloque movido a la posición '+String(next.findIndex(item=>item.id===id)+1)+'.');
 };

 useEffect(()=>()=>{document.body.classList.remove('script-dragging-body')},[]);

 return <div className="script-board" aria-label="Guión ordenable">
   <div className="script-board-help"><GripVertical size={15}/><span><b>Para mover:</b> mantené presionado el asa y arrastrá el bloque.</span>{saving&&<strong>Guardando orden…</strong>}</div>
   {error&&<div className="script-board-error" role="alert">{error}</div>}
   <div className="script-list">{items.map((block,index)=><article key={block.id} data-script-block-id={block.id} className={'script-block'+(dragId===block.id?' is-dragging':'')}>
     <button
       type="button"
       className="script-drag-handle"
       aria-label={'Mover '+block.title+'. Arrastrá o usá las flechas arriba y abajo.'}
       aria-pressed={dragId===block.id}
       title="Mantener presionado y arrastrar"
       onPointerDown={event=>startDrag(event,block.id)}
       onPointerMove={dragMove}
       onPointerUp={finishDrag}
       onPointerCancel={cancelDrag}
       onKeyDown={event=>keyboardMove(event,block.id)}
       disabled={saving}
     ><GripVertical size={21}/><span>ARRASTRAR</span></button>
     <div className="script-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</div>
     <button type="button" className="script-main script-open" onClick={()=>onOpen(block)} aria-label={'Abrir '+block.title}><div className="script-meta"><span className="script-type">{block.type}</span><span>{block.duration} min</span>{block.responsible&&<span>{block.responsible}</span>}</div><h4>{block.title}</h4><p>{block.notes||'Sin notas para este bloque.'}</p></button>
     <div className="script-actions">
       <button type="button" className="icon-btn script-open-action" onClick={()=>onOpen(block)} aria-label={'Abrir '+block.title} title="Abrir"><Eye size={15}/></button>
       <button type="button" className="icon-btn" onClick={()=>onEdit(block)} aria-label={'Editar '+block.title} title="Editar"><Pencil size={15}/></button>
       <button type="button" className="icon-btn" onClick={()=>{void onDuplicate(block)}} aria-label={'Duplicar '+block.title} title="Duplicar"><Copy size={15}/></button>
       <button type="button" className="icon-btn danger-text" onClick={()=>{void onDelete(block)}} aria-label={'Eliminar '+block.title} title="Eliminar"><Trash2 size={15}/></button>
     </div>
     {dragId===block.id&&<span className="script-moving-badge">MOVIENDO</span>}
   </article>)}</div>
   <div className="visually-hidden" aria-live="polite">{announcement}</div>
 </div>;
}
