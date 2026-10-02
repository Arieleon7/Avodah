'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUpRight,MessageCircle,Paperclip,Send,X,ChevronDown} from 'lucide-react';

export type QuickChatChannel={id:string;name:string};
export type QuickChatAttachment={id:string;name:string;url:string;size:number};
export type QuickChatMessage={id:string;channel:string;author:string;authorId?:string;text:string;time:string;attachments?:QuickChatAttachment[]};
export function QuickChatBubble({workspaceId,workspaceName,channels,messages,currentUserId,onSend,onFullChat}:{
 workspaceId:string;workspaceName:string;channels:QuickChatChannel[];messages:QuickChatMessage[];currentUserId?:string;
 onSend:(channel:string,message:string,file?:File)=>Promise<void>;onFullChat:(channelId:string)=>void
}){
 const [open,setOpen]=useState(false);
 const [channel,setChannel]=useState('');
 const [draft,setDraft]=useState('');
 const [attachment,setAttachment]=useState<File|null>(null);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [unread,setUnread]=useState(0);
 const seen=useRef<Set<string>|null>(null);
 const bottomRef=useRef<HTMLDivElement>(null);
 const initial=channels.find(c=>c.name.toLocaleLowerCase('es')==='general')?.id||channels[0]?.id||'';
 const active=channels.some(c=>c.id===channel)?channel:initial;
 const activeName=channels.find(c=>c.id===active)?.name||'General';
 const visible=messages.filter(m=>m.channel===active);
 useEffect(()=>{seen.current=null;setUnread(0);setChannel('');setOpen(false);setError('');setDraft('');setAttachment(null)},[workspaceId]);
 useEffect(()=>{
   if(seen.current===null){seen.current=new Set(messages.map(m=>m.id));return;}
   const ids=seen.current;
   if(open){
     messages.forEach(m=>ids.add(m.id));setUnread(0);return;
   }
   const added=messages.filter(m=>!ids.has(m.id)&&m.authorId!==currentUserId);
   if(added.length)setUnread(n=>Math.min(99,n+added.length));
   messages.forEach(m=>ids.add(m.id));
 },[messages,open,currentUserId]);
 useEffect(()=>{if(open)bottomRef.current?.scrollIntoView({block:'end',behavior:'instant'})},[open,active,visible.length]);
 useEffect(()=>{
   if(!open)return;
   const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false)}};
   window.addEventListener('keydown',handler);
   return()=>window.removeEventListener('keydown',handler);
 },[open]);
 const toggle=()=>{setOpen(v=>!v);setUnread(0);setError('')};
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(sending||(!draft.trim()&&!attachment)||!active)return;
   setSending(true);setError('');
   try{await onSend(active,draft.trim(),attachment||undefined);setDraft('');setAttachment(null)}
   catch(err){setError(err instanceof Error?err.message:'No se pudo enviar el mensaje. Intentá nuevamente.')}
   finally{setSending(false)}
 };
 return <div className={'quick-chat-root'+(open?' is-open':'')}>
   {open&&<section className="quick-chat-panel" role="dialog" aria-modal="false" aria-label="Chat rápido de AVODAH">
      <header className="quick-chat-header">
        <span className="quick-chat-header-icon"><MessageCircle size={21}/></span>
        <div><span className="quick-chat-kicker">CONVERSACIONES DEL EQUIPO</span><strong>Chat de {workspaceName}</strong></div>
        <button type="button" className="quick-chat-close" onClick={()=>setOpen(false)} aria-label="Cerrar chat"><X size={20}/></button>
      </header>
      <div className="quick-chat-channel"><label htmlFor="quick-chat-channel-choice">Canal</label><div><select id="quick-chat-channel-choice" value={active} onChange={e=>{setChannel(e.target.value);setError('')}} aria-label="Elegir canal de conversación">{channels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={15}/></div></div>
      <div className="quick-chat-history" role="log" aria-label={'Mensajes de '+activeName} aria-live="off">
        {visible.length?visible.map(m=><article key={m.id} className={'quick-chat-message'+(m.authorId&&m.authorId===currentUserId?' mine':'')}>
          <span className="quick-chat-avatar" aria-hidden="true">{m.author.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'AV'}</span>
          <div className="quick-chat-message-body"><div className="quick-chat-message-meta"><strong>{m.author}</strong><time>{m.time}</time></div><p>{m.text}</p>{(m.attachments||[]).map(a=><a href={a.url} target="_blank" rel="noopener noreferrer" key={a.id} className="quick-chat-attachment"><Paperclip size={14}/>{a.name}</a>)}</div>
        </article>):<div className="quick-chat-empty"><MessageCircle size={29}/><strong>Empezá la conversación</strong><p>Los mensajes de este canal aparecen acá.</p></div>}
        <div ref={bottomRef}/>
      </div>
      {attachment&&<div className="quick-chat-file">{attachment.name}<button type="button" onClick={()=>setAttachment(null)} aria-label="Quitar archivo"><X size={14}/></button></div>}
      {error&&<p className="quick-chat-error" role="alert">{error}</p>}
      <form className="quick-chat-compose" onSubmit={e=>{void submit(e)}}>
        <label className="quick-chat-attach" title="Adjuntar archivo" aria-label="Adjuntar archivo"><Paperclip size={19}/><input type="file" disabled={sending} onChange={e=>setAttachment(e.target.files?.[0]||null)}/></label>
        <input type="text" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Escribí un mensaje…" aria-label="Nuevo mensaje" disabled={!active||sending} enterKeyHint="send"/>
        <button type="submit" className="quick-chat-send" aria-label="Enviar mensaje" title="Enviar" disabled={sending||!active||(!draft.trim()&&!attachment)}><Send size={19}/></button>
      </form>
      <button type="button" className="quick-chat-full" onClick={()=>{setOpen(false);onFullChat(active)}}>Abrir chat completo <ArrowUpRight size={15}/></button>
   </section>}
   <button type="button" className="quick-chat-fab" onClick={toggle} aria-expanded={open} aria-label={open?'Cerrar chat rápido':unread?'Abrir chat rápido: '+unread+' mensajes nuevos':'Abrir chat rápido'} title={open?'Cerrar chat':'Abrir chat'}>
      {open?<X size={24}/>:<MessageCircle size={25} strokeWidth={2}/>}
      {!open&&unread>0&&<span className="quick-chat-unread">{unread>9?'9+':unread}</span>}
   </button>
 </div>;
}
