import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Iniciá sesión para enviar la prueba.'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 const privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!url||!key||!publicKey||!privateKey)return Response.json({error:'Falta la configuración de notificaciones.'},{status:503});
 let body:{workspaceId?:string;endpoint?:string};
 try{body=await request.json()}catch{return Response.json({error:'Solicitud inválida.'},{status:400});}
 if(typeof body?.workspaceId!=='string'||typeof body?.endpoint!=='string'||body.endpoint.length>4096)return Response.json({error:'Faltan datos del dispositivo.'},{status:400});
 const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await supabase.auth.getUser(token);
 if(authError||!user)return Response.json({error:'Sesión inválida.'},{status:401});
 // The caller's JWT + RLS restricts access to their own subscribed devices in this workspace.
 const scoped=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:sub,error:queryError}=await scoped.from('push_subscriptions')
  .select('id,endpoint,p256dh,auth').eq('user_id',user.id).eq('workspace_id',body.workspaceId).eq('endpoint',body.endpoint).maybeSingle();
 if(queryError)return Response.json({error:'No se pudo verificar el registro del dispositivo.'},{status:500});
 if(!sub)return Response.json({error:'Este dispositivo no figura como activo. Volvé a activarlo.'},{status:404});
 webpush.setVapidDetails('https://avodah-six.vercel.app',publicKey,privateKey);
 try{
  await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
   JSON.stringify({title:'AVODAH · Prueba de notificaciones',body:'¡Todo listo! Vas a recibir mensajes y novedades de tu equipo.',tag:'avodah-test',kind:'update',workspaceId:body.workspaceId}),{TTL:90});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const err=e as {statusCode?:number};
  if(err.statusCode===404||err.statusCode===410){
   await scoped.from('push_subscriptions').delete().eq('id',sub.id);
   return Response.json({error:'La suscripción caducó. Desactivá y activá las notificaciones nuevamente.'},{status:410});
  }
  return Response.json({error:'El servidor no pudo entregar la prueba al servicio de notificaciones.'},{status:502});
 }
}
