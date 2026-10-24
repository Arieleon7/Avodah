'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bell,BellOff,Check,MessageCircle,RefreshCw,Smartphone,SlidersHorizontal} from 'lucide-react';
import {deletePushSubscription,getPushSubscription,updatePushPreferences,upsertPushSubscription,syncEnabledPushSubscriptions,testPushDelivery,type PushPreferences} from '@/lib/cloud';

type State='checking'|'unsupported'|'ios-install'|'denied'|'inactive'|'active'|'error';
type Props={workspaceId:string;workspaceIds?:string[];userId?:string;cloud:boolean;compact?:boolean};

function decodeVapidKey(value:string):Uint8Array<ArrayBuffer>{
 const normalized=(value+'='.repeat((4-value.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(normalized);
 const output=new Uint8Array(new ArrayBuffer(raw.length));
 for(let i=0;i<raw.length;i++)output[i]=raw.charCodeAt(i);
 return output;
}
function isStandalone(){
 const nav=navigator as Navigator&{standalone?:boolean};
 return window.matchMedia('(display-mode: standalone)').matches||nav.standalone===true;
}
function isIOS(){return /iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function browserSupported(){return typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
async function worker(){
 const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
 await registration.update().catch(()=>{});
 return navigator.serviceWorker.ready;
}

export function PushNotificationsCard({workspaceId,workspaceIds,userId,cloud,compact=false}:Props){
 const [state,setState]=useState<State>('checking');
 const [prefs,setPrefs]=useState<PushPreferences>({notifyChat:true,notifyUpdates:true});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const ids=workspaceIds?.length?workspaceIds:[workspaceId];

 const refresh=useCallback(async()=>{
  if(!cloud||!userId){setState('unsupported');return;}
  if(!browserSupported()){setState('unsupported');return;}
  if(isIOS()&&!isStandalone()){setState('ios-install');return;}
  if(Notification.permission==='denied'){setState('denied');return;}
  if(Notification.permission!=='granted'){setState('inactive');return;}
  try{
   const registration=await worker();
   const subscription=await registration.pushManager.getSubscription();
   if(!subscription){setState('inactive');return;}
   const existing=await getPushSubscription(workspaceId,userId,subscription.endpoint);
   if(!existing){setState('inactive');return;}
   setPrefs({notifyChat:existing.notifyChat,notifyUpdates:existing.notifyUpdates});
   setState('active');
  }catch(err){setError(err instanceof Error?err.message:'No se pudo comprobar el dispositivo.');setState('error');}
 },[cloud,userId,workspaceId]);
 useEffect(()=>{void refresh()},[refresh]);

 const subscribe=async()=>{
  if(!userId||!cloud||!browserSupported())return;
  setBusy(true);setError('');setMessage('');
  try{
   if(isIOS()&&!isStandalone()){setState('ios-install');return;}
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){setState(permission==='denied'?'denied':'inactive');return;}
   const vapid=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   if(!vapid)throw new Error('Falta configurar la clave pública para notificaciones.');
   const registration=await worker();
   let subscription=await registration.pushManager.getSubscription();
   const wanted=decodeVapidKey(vapid);
   const activeKey=subscription?.options.applicationServerKey;
   if(subscription&&activeKey){
    const current=new Uint8Array(activeKey);
    if(current.length!==wanted.length||current.some((v,i)=>v!==wanted[i])){
      await subscription.unsubscribe();
      subscription=null;
    }
   }
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:wanted});
   await upsertPushSubscription(workspaceId,userId,subscription,prefs);
   await syncEnabledPushSubscriptions(ids,userId,subscription,prefs);
   setState('active');
   setMessage('Celular registrado. Los mensajes y cambios de tu equipo podrán enviarte avisos.');
   // An actual Web Push test verifies the whole server path, unlike a local fake notification.
   try{
    await testPushDelivery(workspaceId,subscription.endpoint);
    setMessage('Notificaciones activas. Se envió un aviso de prueba a este dispositivo.');
   }catch(err){
    setError('El registro se guardó, pero la prueba de entrega falló: '+(err instanceof Error?err.message:'Error desconocido'));
   }
  }catch(err){setError(err instanceof Error?err.message:'No se pudieron activar las notificaciones.');setState('error');}
  finally{setBusy(false);}
 };
 const disable=async()=>{
  if(!userId)return;
  setBusy(true);setError('');setMessage('');
  try{
   const registration=await worker();
   const subscription=await registration.pushManager.getSubscription();
   if(subscription){
    for(const wid of new Set(ids))await deletePushSubscription(wid,userId,subscription.endpoint);
    await subscription.unsubscribe();
   }
   setState('inactive');setMessage('Se desactivaron las notificaciones en este dispositivo.');
  }catch(err){setError(err instanceof Error?err.message:'No se pudo desactivar este dispositivo.');}
  finally{setBusy(false);}
 };
 const test=async()=>{
  setBusy(true);setError('');setMessage('');
  try{
   const subscription=await (await worker()).pushManager.getSubscription();
   if(!subscription)throw new Error('Este dispositivo no tiene una suscripción activa. Volvé a activarla.');
   await testPushDelivery(workspaceId,subscription.endpoint);
   setMessage('Prueba enviada. Comprobá si llegó la notificación al celular.');
  }catch(err){setError(err instanceof Error?err.message:'No se pudo enviar la prueba.');}
  finally{setBusy(false);}
 };
 const changePref=async(key:keyof PushPreferences,value:boolean)=>{
  const next={...prefs,[key]:value};setPrefs(next);setMessage('');setError('');
  if(state!=='active'||!userId)return;
  try{
   const subscription=await (await worker()).pushManager.getSubscription();
   if(!subscription)throw new Error('El dispositivo ya no está suscrito.');
   await updatePushPreferences(workspaceId,userId,subscription.endpoint,next);
   setMessage('Preferencias actualizadas para este equipo.');
  }catch(err){setPrefs(prefs);setError(err instanceof Error?err.message:'No se pudo guardar la preferencia.');}
 };
 const guidance=state==='ios-install'?'En iPhone: abrí AVODAH en Safari, tocá Compartir → Agregar a pantalla de inicio y abrí la app desde ese icono para activar los avisos.':
 state==='denied'?'Las notificaciones están bloqueadas. Permitilas en los ajustes del navegador y del teléfono.':
 state==='unsupported'?cloud?'Este navegador no admite notificaciones Web Push.':'Iniciá sesión para activar notificaciones.':'';
 const buttons=<>
  {state==='active'?<>
   <button className="btn primary" type="button" disabled={busy} onClick={()=>{void test()}}><Bell size={16}/>{busy?'Probando…':'Enviar prueba real'}</button>
   {!compact&&<button className="btn" type="button" disabled={busy} onClick={()=>{void disable()}}>Desactivar en este dispositivo</button>}
  </>:state!=='ios-install'&&state!=='unsupported'&&state!=='denied'?
    <button className="btn primary" type="button" disabled={busy||state==='checking'} onClick={()=>{void subscribe()}}><Bell size={16}/>{busy?'Activando…':'Activar notificaciones'}</button>:null}
 </>;
 if(compact){
  if(state==='active')return null;
  return <section className="push-onboarding" aria-label="Activar notificaciones"><div className="push-onboarding-icon"><Bell size={21}/></div><div className="push-onboarding-copy"><strong>Enterate de los mensajes y cambios del equipo</strong><p>{guidance||'Activá los avisos en tu celular para recibir novedades incluso con la app cerrada.'}</p>{error&&<p className="push-inline-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</div><div className="push-onboarding-actions">{buttons}</div></section>;
 }
 return <section className="card push-settings-card">
  <div className="push-settings-head"><span className="push-settings-icon"><Bell size={21}/></span><div><span className="panel-kicker">CELULAR Y TABLET</span><h2>Notificaciones</h2><p>Recibí avisos aunque AVODAH no esté abierta.</p></div><span className={'push-status '+state}>{state==='active'?<><Check size={13}/> Activas</>:state==='checking'?<><RefreshCw size={13}/> Comprobando</>:<><BellOff size={13}/> Inactivas</>}</span></div>
  {!!guidance&&<div className={'push-guidance '+(state==='denied'||state==='unsupported'?'warning':'')}><Smartphone size={20}/><div><strong>{state==='ios-install'?'Instalá AVODAH primero':'Revisá los permisos'}</strong><p>{guidance}</p></div></div>}
  <div className="push-preferences">
   <div><span className="push-pref-icon"><MessageCircle size={18}/></span><div><strong>Mensajes de chat</strong><p>Mensajes de tus compañeros en los canales del equipo.</p></div><button type="button" role="switch" aria-label="Avisos de mensajes" aria-checked={prefs.notifyChat} className={'push-switch '+(prefs.notifyChat?'on':'')} onClick={()=>{void changePref('notifyChat',!prefs.notifyChat)}} disabled={state!=='active'||busy}><i/></button></div>
   <div><span className="push-pref-icon"><SlidersHorizontal size={18}/></span><div><strong>Cambios y actividades</strong><p>Guión, programas, tareas, ideas, recursos y actividad del equipo.</p></div><button type="button" role="switch" aria-label="Avisos de cambios y actividades" aria-checked={prefs.notifyUpdates} className={'push-switch '+(prefs.notifyUpdates?'on':'')} onClick={()=>{void changePref('notifyUpdates',!prefs.notifyUpdates)}} disabled={state!=='active'||busy}><i/></button></div>
  </div>
  {error&&<div className="push-message error" role="alert">{error}</div>}
  {message&&<div className="push-message success" role="status">{message}</div>}
  <div className="push-settings-actions">{buttons}<small>Cada dispositivo necesita permiso. Cada integrante puede elegir qué avisos recibir.</small></div>
 </section>;
}
