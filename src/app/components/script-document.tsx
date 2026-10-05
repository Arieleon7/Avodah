'use client';
import {Clock3,Eye,Music2,Pencil,UserRound} from 'lucide-react';
import type {ScriptBlockItem} from './script-board';

type ScriptDocumentProduction={
 title:string;
 topic?:string;
 date?:string;
 time?:string;
 hosts?:string[];
};

function contentParagraphs(text:string){
 const normalized=(text||'').replace(/\r\n/g,'\n').trim();
 if(!normalized)return [];
 return normalized.split(/\n{2,}/).map(part=>part.trim()).filter(Boolean);
}

function isSong(block:ScriptBlockItem){
 return /canci[oó]n|musica|música|song/i.test(block.type);
}

export function ScriptDocumentView({
 production,blocks,onOpen,onEdit
}:{
 production:ScriptDocumentProduction;
 blocks:ScriptBlockItem[];
 onOpen:(block:ScriptBlockItem)=>void;
 onEdit:(block:ScriptBlockItem)=>void;
}){
 const ordered=[...blocks].sort((a,b)=>a.order-b.order);
 const total=ordered.reduce((sum,block)=>sum+Number(block.duration||0),0);
 const participants=(production.hosts??[]).filter(Boolean);
 const blockNumberById=new Map<string,number>();
 let visibleBlockNumber=0;
 ordered.forEach(block=>{if(!isSong(block)){visibleBlockNumber+=1;blockNumberById.set(block.id,visibleBlockNumber)}});

 return <section className="script-document-shell">
   <article className="script-document" aria-label={'Guión en formato documento de '+production.title}>
     <header className="script-document-header">
       <div className="script-document-brand"><span>AVODAH</span><small>GUIÓN DE PRODUCCIÓN</small></div>
       <h1>{production.title}</h1>
       {production.topic&&<p className="script-document-topic">{production.topic}</p>}
       <div className="script-document-meta">
         {(production.date||production.time)&&<span><Clock3 size={14}/>{[production.date,production.time].filter(Boolean).join(' · ')}</span>}
         <span><Clock3 size={14}/>{total} min estimados</span>
         {participants.length>0&&<span><UserRound size={14}/>{participants.join(' · ')}</span>}
       </div>
     </header>

     {participants.length>0&&<section className="script-document-intro">
       <span className="script-document-label">PRESENTACIÓN / PARTICIPANTES</span>
       <p>{participants.join(' · ')}</p>
     </section>}

     <div className="script-document-body">
       {ordered.map(block=>{
         const paragraphs=contentParagraphs(block.notes);
         if(isSong(block))return <section className="script-document-song" key={block.id}>
           <div className="script-song-line"><Music2 size={17}/><span>CANCIÓN</span><strong>{block.title}</strong></div>
           {paragraphs.length>0&&<div className="script-song-notes">{paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div>}
           <div className="script-document-inline-actions">
             <button type="button" onClick={()=>onOpen(block)}><Eye size={14}/> Abrir</button>
             <button type="button" onClick={()=>onEdit(block)}><Pencil size={14}/> Editar</button>
           </div>
         </section>;

         return <section className="script-document-block" key={block.id}>
           <div className="script-document-block-head">
             <div>
               <span className="script-block-number">{blockNumberById.get(block.id)} BLOQUE</span>
               <span className="script-block-kind">{block.type}</span>
             </div>
             <div className="script-block-document-meta">
               <span>{block.duration} min</span>
               {block.responsible&&<span>{block.responsible}</span>}
             </div>
           </div>
           <h2>{block.title}</h2>
           <div className="script-document-copy">
             {paragraphs.length?paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>):<p className="script-document-empty">Sin contenido escrito para este bloque.</p>}
           </div>
           <div className="script-document-inline-actions">
             <button type="button" onClick={()=>onOpen(block)}><Eye size={14}/> Abrir</button>
             <button type="button" onClick={()=>onEdit(block)}><Pencil size={14}/> Editar</button>
           </div>
         </section>;
       })}
       {!ordered.length&&<div className="script-document-empty-state">Todavía no hay bloques en este Guión.</div>}
     </div>
   </article>
 </section>;
}
