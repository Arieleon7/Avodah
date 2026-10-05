self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():''}}
  const title=data.title||'AVODAH';
  const options={
    body:data.body||'Tenés una novedad en AVODAH.',
    icon:'/brand/avodah-icon.svg',
    badge:'/brand/avodah-icon.svg',
    tag:data.tag||'avodah',
    renotify:false,
    data:{url:data.url||'/',kind:data.kind||'update',workspaceId:data.workspaceId||null,channelId:data.channelId||null},
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus' in client){
        try{if('navigate' in client)await client.navigate(target)}catch{}
        return client.focus();
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
