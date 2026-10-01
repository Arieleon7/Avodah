export const COVER_MAX_BYTES=8*1024*1024;
const COVER_FORMATS:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
export function validateCoverFile(file:File){
 const ext=file.name.split('.').pop()?.toLowerCase()||'';
 const mime=COVER_FORMATS[ext];
 if(!mime||file.type!==mime)throw new Error('La portada debe ser JPG, PNG o WebP.');
 if(file.size===0||file.size>COVER_MAX_BYTES)throw new Error('Elegí una portada de hasta 8 MB.');
 return {mime,ext};
}
export function parseYoutubeLive(value:string):{url:string;embed:string|null;thumbnail:string|null}|null{
 if(!value.trim())return null;
 try{
  const url=new URL(value.trim());
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host))return null;
  let id:string|null=null;
  if(host==='youtu.be')id=url.pathname.split('/')[1]||null;
  else if(url.pathname==='/watch')id=url.searchParams.get('v');
  else id=url.pathname.match(/^\/(?:live|embed)\/([\w-]{11})\/?$/)?.[1]||null;
  if(id&&/^[a-zA-Z0-9_-]{11}$/.test(id))
   return {url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id,thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'};
  if(host==='youtu.be')return null;
  if(/^\/(?:@[\w.-]+|channel\/[\w-]+|c\/[\w-]+|user\/[\w-]+)\/live\/?$/.test(url.pathname))
   return {url:'https://www.youtube.com'+url.pathname.replace(/\/$/,''),embed:null,thumbnail:null};
  return null;
 }catch{return null;}
}
export function validYoutubeLive(value:string):boolean{return !value.trim()||!!parseYoutubeLive(value)}
