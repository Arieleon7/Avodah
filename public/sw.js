self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():''}}
 const tag=data.messageId?'avodah-chat-'+data.messageId:data.eventId?'avodah-activity-'+data.eventId:data.tag||'avodah-update';
 event.waitUntil(self.registration.showNotification(data.title||'AVODAH',{
  body:data.body||'Tenés una novedad de tu equipo.',
  icon:'/brand/avodah-icon.svg',badge:'/brand/avodah-icon.svg',
  tag,renotify:false,
  data:{kind:data.kind||'update',url:data.url||'/',workspaceId:data.workspaceId||'',channelId:data.channelId||'',targetType:data.targetType||'',targetId:data.targetId||''}
 }));
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const info=event.notification.data||{};
 const url=new URL('/',self.location.origin);
 url.searchParams.set('avodahNotif',info.kind==='chat'?'chat':'update');
 if(info.workspaceId)url.searchParams.set('workspaceId',String(info.workspaceId));
 if(info.channelId)url.searchParams.set('channelId',String(info.channelId));
 if(info.targetType)url.searchParams.set('targetType',String(info.targetType));
 if(info.targetId)url.searchParams.set('targetId',String(info.targetId));
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   if(new URL(client.url).origin!==self.location.origin)continue;
   try{
    const opened=await client.navigate(url.href);
    if(opened&&'focus' in opened){await opened.focus();return;}
   }catch{}
   if('focus' in client){
    client.postMessage({type:'AVODAH_OPEN_NOTIFICATION',url:url.pathname+url.search});
    await client.focus();
    return;
   }
  }
  if(self.clients.openWindow)await self.clients.openWindow(url.href);
 })());
});
