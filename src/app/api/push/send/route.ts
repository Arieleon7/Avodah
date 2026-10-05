import webpush from 'web-push';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Payload={
 subscription:{endpoint:string;keys:{p256dh:string;auth:string}};
 notification:{title?:string;body?:string;tag?:string;url?:string;kind?:string;workspaceId?:string;channelId?:string;messageId?:string;eventId?:string};
};

export async function POST(request:Request){
 const expected=process.env.AVODAH_PUSH_WEBHOOK_SECRET;
 if(!expected||request.headers.get('x-avodah-push-secret')!==expected){
  return Response.json({error:'unauthorized'},{status:401});
 }
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 const privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!publicKey||!privateKey)return Response.json({error:'push_not_configured'},{status:503});
 let payload:Payload;
 try{payload=await request.json()}catch{return Response.json({error:'invalid_json'},{status:400})}
 if(!payload?.subscription?.endpoint||!payload.subscription.keys?.p256dh||!payload.subscription.keys?.auth){
  return Response.json({error:'invalid_subscription'},{status:400});
 }
 webpush.setVapidDetails('https://avodah-six.vercel.app',publicKey,privateKey);
 try{
  const result=await webpush.sendNotification(payload.subscription,JSON.stringify(payload.notification||{}),{TTL:300});
  return Response.json({ok:true,statusCode:result.statusCode});
 }catch(error){
  const err=error as {statusCode?:number;message?:string};
  const status=err.statusCode&&err.statusCode>=400&&err.statusCode<600?err.statusCode:502;
  return Response.json({error:'push_failed',message:err.message||'Unknown push error'},{status});
 }
}
