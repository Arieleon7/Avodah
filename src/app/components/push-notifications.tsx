'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bell,BellOff,Check,MessageCircle,RefreshCw,Smartphone,SlidersHorizontal} from 'lucide-react';
import {deletePushSubscription,getPushSubscription,updatePushPreferences,upsertPushSubscription,type PushPreferences} from '@/lib/cloud';

type State='checking'|'unsupported'|'ios-install'|'denied'|'inactive'|'active'|'error';

function urlBase64ToUint8Array(base64String:string){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=window.atob(base64);
  const output=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)output[i]=raw.charCodeAt(i);
  return output;
}
function isStandalone(){
  const nav=navigator as Navigator & {standalone?:boolean};
  return window.matchMedia('(display-mode: standalone)').matches||nav.standalone===true;
}
function isIOS(){
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}

export function PushNotificationsCard({workspaceId,userId,cloud}:{workspaceId:string;userId?:string;cloud:boolean}){
 const [state,setState]=useState<State>('checking');
 const [prefs,setPrefs]=useState<PushPreferences>({notifyChat:true,notifyUpdates:true});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 const resolveRegistration=useCallback(async()=>{
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return null;
   await navigator.serviceWorker.register('/sw.js',{scope:'/'});
   return navigator.serviceWorker.ready;
 },[]);

 const refresh=useCallback(async()=>{
   if(!cloud||!userId){setState('unsupported');return}
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setState('unsupported');return}
   if(isIOS()&&!isStandalone()){setState('ios-install');return}
   if(Notification.permission==='denied'){setState('denied');return}
   try{
     const registration=await resolveRegistration();
     if(!registration){setState('unsupported');return}
     const subscription=await registration.pushManager.getSubscription();
     if(!subscription){setState('inactive');return}
     const existing=await getPushSubscription(workspaceId,userId,subscription.endpoint);
     if(existing)setPrefs({notifyChat:existing.notifyChat,notifyUpdates:existing.notifyUpdates});
     setState(existing?'active':'inactive');
   }catch(err){setError(err instanceof Error?err.message:'No se pudo comprobar este dispositivo.');setState('error')}
 },[cloud,userId,workspaceId,resolveRegistration]);

 useEffect(()=>{void refresh()},[refresh]);

 const enable=async()=>{
   if(!userId)return;
   setBusy(true);setError('');setMessage('');
   try{
     if(isIOS()&&!isStandalone()){setState('ios-install');return}
     const permission=await Notification.requestPermission();
     if(permission!=='granted'){setState(permission==='denied'?'denied':'inactive');return}
     const registration=await resolveRegistration();
     if(!registration)throw new Error('Este navegador no admite notificaciones push.');
     const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
     if(!key)throw new Error('Las notificaciones todavía no están configuradas en el servidor.');
     let subscription=await registration.pushManager.getSubscription();
     if(!subscription){
       subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key) as BufferSource});
     }
     await upsertPushSubscription(workspaceId,userId,subscription,prefs);
     setState('active');
     setMessage('Notificaciones activadas en este dispositivo.');
     await registration.showNotification('AVODAH',{
       body:'Este celular ya puede recibir avisos del equipo.',
       icon:'/brand/avodah-icon.svg',
       badge:'/brand/avodah-icon.svg',
       tag:'avodah-enabled',
     });
   }catch(err){setError(err instanceof Error?err.message:'No se pudieron activar las notificaciones.');setState('error')}
   finally{setBusy(false)}
 };

 const disable=async()=>{
   if(!userId)return;
   setBusy(true);setError('');setMessage('');
   try{
     const registration=await resolveRegistration();
     const subscription=await registration?.pushManager.getSubscription();
     if(subscription){
       await deletePushSubscription(workspaceId,userId,subscription.endpoint);
       await subscription.unsubscribe();
     }
     setState('inactive');setMessage('Notificaciones desactivadas en este dispositivo.');
   }catch(err){setError(err instanceof Error?err.message:'No se pudieron desactivar las notificaciones.')}
   finally{setBusy(false)}
 };

 const changePref=async(key:keyof PushPreferences,value:boolean)=>{
   const next={...prefs,[key]:value};setPrefs(next);setError('');setMessage('');
   if(state!=='active'||!userId)return;
   try{
     const registration=await resolveRegistration();
     const subscription=await registration?.pushManager.getSubscription();
     if(subscription)await updatePushPreferences(workspaceId,userId,subscription.endpoint,next);
     setMessage('Preferencias actualizadas.');
   }catch(err){setPrefs(prefs);setError(err instanceof Error?err.message:'No se pudo guardar la preferencia.')}
 };

 return <section className="card push-settings-card">
   <div className="push-settings-head"><span className="push-settings-icon"><Bell size={21}/></span><div><span className="panel-kicker">CELULAR Y TABLET</span><h2>Notificaciones</h2><p>Recibí avisos aunque AVODAH no esté abierta.</p></div><span className={'push-status '+state}>{state==='active'?<><Check size={13}/> Activas</>:state==='checking'?<><RefreshCw size={13}/> Comprobando</>:<><BellOff size={13}/> Inactivas</>}</span></div>
   {state==='ios-install'&&<div className="push-guidance"><Smartphone size={20}/><div><strong>En iPhone hay un paso previo</strong><p>Abrí AVODAH en Safari, tocá Compartir → Agregar a pantalla de inicio. Después abrí AVODAH desde el icono instalado y activá las notificaciones acá.</p></div></div>}
   {state==='denied'&&<div className="push-guidance warning"><BellOff size={20}/><div><strong>El navegador tiene las notificaciones bloqueadas</strong><p>Habilitá las notificaciones para AVODAH desde los permisos del navegador o del sistema y volvé a esta pantalla.</p></div></div>}
   {state==='unsupported'&&<div className="push-guidance warning"><BellOff size={20}/><div><strong>Notificaciones no disponibles</strong><p>{cloud?'Este navegador no ofrece Web Push compatible.':'Iniciá sesión para registrar este dispositivo.'}</p></div></div>}
   <div className="push-preferences">
     <div><span className="push-pref-icon"><MessageCircle size={18}/></span><div><strong>Mensajes de chat</strong><p>Nuevos mensajes de los canales de tu organización.</p></div><button type="button" role="switch" aria-checked={prefs.notifyChat} className={'push-switch '+(prefs.notifyChat?'on':'')} onClick={()=>{void changePref('notifyChat',!prefs.notifyChat)}} disabled={state!=='active'||busy}><i/></button></div>
     <div><span className="push-pref-icon"><SlidersHorizontal size={18}/></span><div><strong>Cambios del programa</strong><p>Producciones, tareas y modificaciones relevantes del Guión.</p></div><button type="button" role="switch" aria-checked={prefs.notifyUpdates} className={'push-switch '+(prefs.notifyUpdates?'on':'')} onClick={()=>{void changePref('notifyUpdates',!prefs.notifyUpdates)}} disabled={state!=='active'||busy}><i/></button></div>
   </div>
   {error&&<div className="push-message error" role="alert">{error}</div>}
   {message&&<div className="push-message success" role="status">{message}</div>}
   <div className="push-settings-actions">{state==='active'?<button className="btn" type="button" disabled={busy} onClick={()=>{void disable()}}>{busy?'Procesando…':'Desactivar en este dispositivo'}</button>:state!=='ios-install'&&state!=='unsupported'&&state!=='denied'?<button className="btn primary" type="button" disabled={busy||state==='checking'} onClick={()=>{void enable()}}><Bell size={16}/>{busy?'Activando…':'Activar notificaciones'}</button>:null}<small>La activación es por dispositivo. Cada integrante decide qué avisos quiere recibir.</small></div>
 </section>;
}
