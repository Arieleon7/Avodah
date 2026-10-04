'use client';
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {Copy,GripVertical,Pencil,Trash2} from 'lucide-react';

export type ScriptBlockItem={
 id:string;productionId:string;order:number;type:string;title:string;duration:number;responsible:string;notes:string;status:string;
};
export function ScriptBoard({blocks,onReorder,onEdit,onDuplicate,onDelete}:{blocks:ScriptBlockItem[];onReorder:(orderedIds:string[])=>Promise<void>|void;onEdit:(block:ScriptBlockItem)=>void;onDuplicate:(block:ScriptBlockItem)=>Promise<void>|void;onDelete:(block:ScriptBlockItem)=>Promise<void>|void}){
 const sorted=[...blocks].sort((a,b)=>a.order-b.order);
 const [items,setItems]=useState(sorted);
 const [dragId,setDragId]=useState<string|null>(null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [announcement,setAnnouncement]=useState('');
 const itemsRef=useRef(items);
 const originRef=useRef<string[]>([]);
 const pointerRef=useRef<number|null>(null);
 useEffect(()=>{itemsRef.current=items},[items]);
 useEffect(()=>{if(!dragId){const next=[...blocks].sort((a,b)=>a.order-b.order);setItems(next);itemsRef.current=next}},[blocks,dragId]);
 const persist=async(nextItems:ScriptBlockItem[],label?:string)=>{
   const ids=nextItems.map(item=>item.id);
   setSaving(true);setError('');
   try{await onReorder(ids);if(label)setAnnouncement(label)}
   catch(err){setError(err instanceof Error?err.message:'No se pudo guardar el nuevo orden.');const fallback=[...blocks].sort((a,b)=>a.order-b.order);setItems(fallback);itemsRef.current=fallback}
   finally{setSaving(false)}
 };
 const moveItem=(activeId:string,targetId:string,after:boolean)=>{
   const current=[...itemsRef.current];
   const from=current.findIndex(x=>x.id===activeId),target=current.findIndex(x=>x.id===targetId);
   if(from<0||target<0||from===target)return current;
   const [moving]=current.splice(from,1);
   let insert=target;
   if(from<target)insert-=1;
   if(after)insert+=1;
   insert=Math.max(0,Math.min(current.length,insert));
   current.splice(insert,0,moving);
   const normalized=current.map((item,index)=>({...item,order:index+1}));
   itemsRef.current=normalized;setItems(normalized);
   return normalized;
 };
 useEffect(()=>{
  if(!dragId)return;
  const move=(event:PointerEvent)=>{
   if(pointerRef.current!==null&&event.pointerId!==pointerRef.current)return;
   event.preventDefault();
   const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-script-block-id]');
   if(!target)return;
   const targetId=target.dataset.scriptBlockId;
   if(!targetId||targetId===dragId)return;
   const rect=target.getBoundingClientRect();
   moveItem(dragId,targetId,event.clientY>rect.top+rect.height/2);
  };
  const end=(event:PointerEvent)=>{
   if(pointerRef.current!==null&&event.pointerId!==pointerRef.current)return;
   pointerRef.current=null;
   const finalItems=[...itemsRef.current];
   const changed=originRef.current.join('|')!==finalItems.map(i=>i.id).join('|');
   setDragId(null);
   document.body.classList.remove('script-dragging-body');
   if(changed)void persist(finalItems,'Orden del guión actualizado.');
  };
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',end);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end)};
 },[dragId]);
 const startDrag=(event:ReactPointerEvent<HTMLButtonElement>,id:string)=>{
  if(saving)return;
  event.preventDefault();
  pointerRef.current=event.pointerId;
  originRef.current=itemsRef.current.map(i=>i.id);
  setDragId(id);setError('');setAnnouncement('Arrastrando bloque. Movelo a la posición deseada y soltá.');
  document.body.classList.add('script-dragging-body');
 };
 const keyboardMove=(event:ReactKeyboardEvent<HTMLButtonElement>,id:string)=>{
  if(!['ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();
  const current=[...itemsRef.current];
  const from=current.findIndex(item=>item.id===id);
  const to=event.key==='ArrowUp'?from-1:from+1;
  if(from<0||to<0||to>=current.length)return;
  const target=current[to];
  const next=moveItem(id,target.id,event.key==='ArrowDown');
  void persist(next,'Bloque movido a la posición '+String(next.findIndex(item=>item.id===id)+1)+'.');
 };
 return <div className="script-board" aria-label="Guión ordenable">
   <div className="script-board-help"><GripVertical size={15}/><span>Arrastrá desde el asa para reordenar los bloques.</span>{saving&&<strong>Guardando orden…</strong>}</div>
   {error&&<div className="script-board-error" role="alert">{error}</div>}
   <div className="script-list">{items.map((block,index)=><article key={block.id} data-script-block-id={block.id} className={'script-block'+(dragId===block.id?' is-dragging':'')}>
     <button type="button" className="script-drag-handle" aria-label={'Mover '+block.title+'. Arrastrá o usá las flechas arriba y abajo.'} title="Arrastrar para reordenar" onPointerDown={event=>startDrag(event,block.id)} onKeyDown={event=>keyboardMove(event,block.id)} disabled={saving}><GripVertical size={21}/></button>
     <div className="script-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</div>
     <div className="script-main"><div className="script-meta"><span className="script-type">{block.type}</span><span>{block.duration} min</span>{block.responsible&&<span>{block.responsible}</span>}</div><h4>{block.title}</h4><p>{block.notes||'Sin notas para este bloque.'}</p></div>
     <div className="script-actions">
       <button type="button" className="icon-btn" onClick={()=>onEdit(block)} aria-label={'Editar '+block.title} title="Editar"><Pencil size={15}/></button>
       <button type="button" className="icon-btn" onClick={()=>{void onDuplicate(block)}} aria-label={'Duplicar '+block.title} title="Duplicar"><Copy size={15}/></button>
       <button type="button" className="icon-btn danger-text" onClick={()=>{void onDelete(block)}} aria-label={'Eliminar '+block.title} title="Eliminar"><Trash2 size={15}/></button>
     </div>
   </article>)}</div>
   <div className="visually-hidden" aria-live="polite">{announcement}</div>
 </div>;
}
