export type ResourceKind='youtube'|'spotify'|'instagram'|'tiktok'|'image'|'document'|'audio'|'video'|'article'|'link';
export type ResourcePreview={
  title:string;
  description:string;
  image:string;
  site:string;
  kind:ResourceKind;
  fetchedAt?:string;
  limited?:boolean;
  embedUrl?:string;
};
const safelyParse=(value:string):URL|null=>{
  try {const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u:null;}catch{return null;}
};
export function guessResourcePreview(value:string):ResourcePreview{
  const u=safelyParse(value);
  if(!u)return {title:'',description:'',image:'',site:'Enlace',kind:'link'};
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  const youtube=host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtube-nocookie.com';
  const videoId=host==='youtu.be'?u.pathname.split('/')[1]:youtube?u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1]:null;
  if(videoId&&/^[\w-]{11}$/.test(videoId))return {title:'Video de YouTube',description:'',image:'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg',site:'YouTube',kind:'youtube'};
  if(host==='open.spotify.com'&&/^\/(?:intl-[\w-]+\/)?(?:track|album|playlist|show|episode|artist)\//.test(u.pathname))return {title:'Contenido de Spotify',description:'',image:'',site:'Spotify',kind:'spotify'};
  if(host==='instagram.com'||host==='instagr.am')return {title:'Publicación de Instagram',description:'',image:'',site:'Instagram',kind:'instagram'};
  if(host==='facebook.com'||host.endsWith('.facebook.com')||host==='fb.watch')return {title:'Publicación de Facebook',description:'',image:'',site:'Facebook',kind:'article'};
  if(host==='x.com'||host==='twitter.com')return {title:'Publicación de X',description:'',image:'',site:'X',kind:'article'};
  if(host==='tiktok.com'||host.endsWith('.tiktok.com'))return {title:'Video de TikTok',description:'',image:'',site:'TikTok',kind:'tiktok'};
  if(/\.(?:jpe?g|webp|png|gif)(?:$|[?#])/i.test(u.pathname))return {title:'Imagen',description:'',image:value,site:host,kind:'image'};
  if(/\.(?:pdf|docx?|pptx?|xlsx?)(?:$|[?#])/i.test(u.pathname)||/^(docs|drive)\.google\.com$/.test(host))return {title:'Documento',description:'',image:'',site:host,kind:'document'};
  return {title:'',description:'',image:'',site:host,kind:'link'};
}
export function resourceEmbed(value:string, trustedEmbedUrl?:string):string|null{
  const u=safelyParse(value);if(!u)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  // Only server-derived, provider-owned embeds are accepted.
  if(trustedEmbedUrl){
    const embedded=safelyParse(trustedEmbedUrl);
    if(embedded?.protocol==='https:'&&embedded.hostname==='www.tiktok.com'&&/^\/player\/v1\/\d{10,22}$/.test(embedded.pathname))
      return embedded.origin+embedded.pathname;
  }
  if(host==='instagram.com'||host==='instagr.am'){
    const match=u.pathname.match(/^\/(p|reel|tv)\/([\w-]{6,35})(?:\/|$)/);
    return match?'https://www.instagram.com/'+match[1]+'/'+match[2]+'/embed/':null;
  }
  if(host==='tiktok.com'||host.endsWith('.tiktok.com')){
    const id=u.pathname.match(/\/(?:video|v)\/(\d{10,22})(?:\/|$)/)?.[1];
    return id?'https://www.tiktok.com/player/v1/'+id:null;
  }
  if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtube-nocookie.com'){
    const v=host==='youtu.be'?u.pathname.split('/')[1]:u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
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
