export type ResourceKind='youtube'|'spotify'|'image'|'document'|'article'|'link';
export type ResourcePreview={
  title:string;
  description:string;
  image:string;
  site:string;
  kind:ResourceKind;
  fetchedAt?:string;
};
const safelyParse=(value:string):URL|null=>{
  try {const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u:null;}catch{return null;}
};
export function guessResourcePreview(value:string):ResourcePreview{
  const u=safelyParse(value);
  if(!u)return {title:'',description:'',image:'',site:'Enlace',kind:'link'};
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  const videoId=host==='youtu.be'?u.pathname.split('/')[1]:host.endsWith('youtube.com')?u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([^/?#]+)/)?.[1]||u.pathname.match(/^\/embed\/([^/?#]+)/)?.[1]:null;
  if(videoId&&/^[\w-]{11}$/.test(videoId))return {title:'Video de YouTube',description:'',image:'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg',site:'YouTube',kind:'youtube'};
  if(host==='open.spotify.com'&&/^\/(?:intl-[\w-]+\/)?(?:track|album|playlist|show|episode|artist)\//.test(u.pathname))return {title:'Contenido de Spotify',description:'',image:'',site:'Spotify',kind:'spotify'};
  if(/\.(?:jpe?g|webp|png|gif)(?:$|[?#])/i.test(u.pathname))return {title:'Imagen',description:'',image:value,site:host,kind:'image'};
  if(/\.(?:pdf|docx?|pptx?|xlsx?)(?:$|[?#])/i.test(u.pathname)||/^(docs|drive)\.google\.com$/.test(host))return {title:'Documento',description:'',image:'',site:host,kind:'document'};
  return {title:'',description:'',image:'',site:host,kind:'link'};
}
export function resourceEmbed(value:string):string|null{
  const u=safelyParse(value);if(!u)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  if(host==='youtu.be'||host==='youtube.com'||host==='m.youtube.com'){
    const v=host==='youtu.be'?u.pathname.split('/')[1]:u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    return v&&/^[\w-]{11}$/.test(v)?'https://www.youtube-nocookie.com/embed/'+v:null;
  }
  if(host==='open.spotify.com'){
    const m=u.pathname.match(/^\/(?:intl-[\w-]+\/)?(track|album|playlist|show|episode|artist)\/([a-zA-Z0-9]+)/);
    return m?'https://open.spotify.com/embed/'+m[1]+'/'+m[2]:null;
  }
  return null;
}
export function resourceHost(value:string):string{
  return safelyParse(value)?.hostname.replace(/^www\./,'')||'Enlace';
}
export function safeResourceUrl(value:string):string{
  const u=safelyParse(value);
  return u?u.toString():'';
}
