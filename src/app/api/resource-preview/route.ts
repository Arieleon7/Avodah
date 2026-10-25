import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { guessResourcePreview,resourceEmbed, type ResourceKind, type ResourcePreview } from '@/lib/resource-preview';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const MAX_BYTES=360_000;
const MAX_TOTAL_MS=12_000;
const userAgent='Mozilla/5.0 (compatible; AVODAHPreview/2.0; +https://avodah-six.vercel.app)';

function isPublicIp(ip:string):boolean{
  if(isIP(ip)===4){
    const [a,b,c]=ip.split('.').map(Number);
    return !(
      a===0||a===10||a===127||a>=224||
      (a===100&&b>=64&&b<=127)||
      (a===169&&b===254)||
      (a===172&&b>=16&&b<=31)||
      (a===192&&b===168)||
      (a===192&&b===0&&c===0)||
      (a===192&&b===0&&c===2)||
      (a===192&&b===88&&c===99)||
      (a===198&&(b===18||b===19||b===51&&c===100))||
      (a===203&&b===0&&c===113)
    );
  }
  if(isIP(ip)===6){
    const first=Number.parseInt(ip.split(':')[0],16);
    return (first>=0x2000&&first<=0x3fff)&&!ip.toLowerCase().includes('ffff:');
  }
  return false;
}
function safeUrl(raw:string):URL|null{
  try{
    const u=new URL(raw);
    const host=u.hostname.toLowerCase().replace(/\.$/,'');
    if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))return null;
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.lan')||host.endsWith('.home')||host.endsWith('.arpa'))return null;
    if(isIP(host)&&!isPublicIp(host))return null;
    if(!host||host.length>253||host.includes('%'))return null;
    return u;
  }catch{return null;}
}
async function publicIp(host:string):Promise<{address:string;family:4|6}>{
  if(isIP(host)){if(!isPublicIp(host))throw new Error('Private addresses are not allowed');return {address:host,family:isIP(host) as 4|6};}
  const ips=await lookup(host,{all:true,verbatim:true});
  if(!ips.length||ips.some(ip=>!isPublicIp(ip.address)))throw new Error('Private or unresolved hostname');
  const ip=ips.find(ip=>ip.family===4)||ips[0];
  return {address:ip.address,family:ip.family as 4|6};
}
async function readText(u:URL,deadline:number):Promise<{body:string;type:string;location?:string}>{
  const chosen=await publicIp(u.hostname);
  const left=Math.max(500,deadline-Date.now());
  if(left<=500)throw new Error('Preview timeout');
  return new Promise((resolve,reject)=>{
    const request=https.request(u,{
      method:'GET',
      timeout:Math.min(left,5000),
      headers:{'User-Agent':userAgent,'Accept':'text/html,application/xhtml+xml,application/json;q=.9,text/plain;q=.5,*/*;q=.1','Accept-Language':'es-AR,es;q=0.9,en;q=0.6'},
      lookup:((_hostname:string,_opts:unknown,cb:(e:Error|null,address:string,family:number)=>void)=>cb(null,chosen.address,chosen.family)) as typeof import('node:dns').lookup
    },response=>{
      const status=response.statusCode||0;
      if(status>=300&&status<400&&response.headers.location){response.resume();return resolve({body:'',type:'',location:response.headers.location});}
      if(status<200||status>=300){response.resume();return reject(new Error('Site did not return preview metadata'));}
      const type=String(response.headers['content-type']||'').toLowerCase();
      if(!/(text\/html|application\/json|text\/plain|application\/ld\+json)/.test(type)){response.resume();return reject(new Error('No readable preview')); }
      // Large news pages often put useful Open Graph tags at the start of the HTML.
      // Stop at </head> or the byte budget instead of rejecting the full page size.
      let size=0,settled=false;const parts:Buffer[]=[];
      const finish=()=>{
        if(settled)return;
        settled=true;
        resolve({body:Buffer.concat(parts).toString('utf8'),type});
        response.destroy();
      };
      response.on('data',(chunk:Buffer)=>{
        if(settled)return;
        const remaining=MAX_BYTES-size;
        if(remaining>0){const portion=chunk.subarray(0,remaining);parts.push(portion);size+=portion.length;}
        if(size>=MAX_BYTES)finish();
      });
      response.on('end',finish);
      response.on('error',error=>{if(!settled)reject(error)});
    });
    request.on('timeout',()=>request.destroy(new Error('Preview timeout')));
    request.on('error',reject);
    request.end();
  });
}
async function retrieve(url:URL,deadline:number):Promise<{body:string;type:string;url:URL}>{
  let current=url;
  for(let redirects=0;redirects<4;redirects++){
    if(Date.now()>=deadline)throw new Error('Preview timeout');
    const result=await readText(current,deadline);
    if(!result.location)return {...result,url:current};
    const next=safeUrl(new URL(result.location,current).toString());
    if(!next)throw new Error('Unsafe redirect');
    current=next;
  }
  throw new Error('Too many redirects');
}
function decodeHtml(value:string):string{
  return value.replace(/&#(x[\da-f]+|\d+);?/gi,(_,code:string)=>{
    const number=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);
    return Number.isInteger(number)&&number>0&&number<=0x10ffff?String.fromCodePoint(number):'';
  }).replace(/&(amp|quot|apos|lt|gt|nbsp|#39);/gi,(_,entity:string)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ', '#39':"'"}[entity.toLowerCase()]||' ')).replace(/\s+/g,' ').trim().slice(0,450);
}
function meta(html:string,keys:string[]):string{
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const attrs:Record<string,string>={};
    const rx=/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match:RegExpExecArray|null;
    while((match=rx.exec(tag)))attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4];
    if(keys.some(k=>[attrs.property,attrs.name,attrs.itemprop].some(v=>v?.toLowerCase()===k.toLowerCase())))return decodeHtml(attrs.content||'');
  }
  return '';
}
function makeAbsolute(value:string,base:URL):string{
  if(!value)return '';
  try{return new URL(value,base).toString();}catch{return '';}
}
function publicImage(raw:string):string{
  const image=safeUrl(raw);
  return image?image.toString():'';
}

function plain(html:string):string{
  return decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')).slice(0,450);
}
function ldPreview(html:string):{title:string;description:string;image:string}{
  const scripts=html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[];
  for(const raw of scripts.slice(0,6)){
    try{
      const text=raw.replace(/^<script[^>]*>/i,'').replace(/<\/script>$/i,'');
      const records:unknown[]=[JSON.parse(text)];
      let depth=0;
      while(records.length&&depth<65){
        const current=records.shift();depth++;
        if(!current||typeof current!=='object')continue;
        if(Array.isArray(current)){records.push(...current.slice(0,20));continue;}
        const obj=current as Record<string,unknown>;
        const kind=String(obj['@type']||'').toLowerCase();
        if((/article|posting|videoobject|blogposting/.test(kind)||obj.headline)&&
         (obj.headline||obj.description||obj.image)){
          let image:unknown=obj.image;
          if(Array.isArray(image))image=image[0];
          if(image&&typeof image==='object')image=(image as Record<string,unknown>).url||'';
          return {
            title:typeof obj.headline==='string'?plain(obj.headline):'',
            description:typeof obj.description==='string'?plain(obj.description):'',
            image:typeof image==='string'?image:''
          };
        }
        for(const key of ['@graph','mainEntity','itemListElement','subjectOf']){
          if(obj[key])records.push(obj[key]);
        }
      }
    }catch{}
  }
  return {title:'',description:'',image:''};
}
function articleExcerpt(html:string):string{
  for(const match of html.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi)){
    const text=plain(match[1]);
    if(text.length>85&&!/cookies|privacidad|suscri|newsletter|publicidad|javascript/i.test(text.slice(0,90)))return text;
  }
  return '';
}
function slugTitle(url:URL):string{
  const slug=url.pathname.split('/').filter(Boolean).pop()||'';
  let title=slug;
  try{title=decodeURIComponent(slug)}catch{}
  title=title.replace(/\.(html?|php)$/i,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
  return title.length>12?title[0].toUpperCase()+title.slice(1,160):'';
}
function safeTikTokPlayer(id:unknown):string{
  const text=String(id||'');
  return /^\d{10,22}$/.test(text)?'https://www.tiktok.com/player/v1/'+text:'';
}
async function resolveTikTokLink(start:URL,deadline:number):Promise<URL>{
  let current=start;
  for(let i=0;i<3&&Date.now()<deadline-500;i++){
    try{
      const result=await readText(current,deadline);
      if(!result.location)break;
      const next=safeUrl(new URL(result.location,current).toString());
      if(!next||!(next.hostname==='tiktok.com'||next.hostname.endsWith('.tiktok.com')))break;
      current=next;
      if(/\/video\/\d+/.test(current.pathname))break;
    }catch{break}
  }
  return current;
}

export async function POST(request:NextRequest){
  try{
    const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if(!token)return NextResponse.json({error:'Sesión requerida para generar vistas previas.'},{status:401});
    const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.getUser(token);
    if(error||!data.user)return NextResponse.json({error:'Iniciá sesión nuevamente.'},{status:401});
    const length=Number(request.headers.get('content-length')||0);
    if(length>3000)return NextResponse.json({error:'Enlace demasiado largo.'},{status:413});
    const body=await request.json();
    const input=typeof body?.url==='string'?body.url.trim():'';
    if(!input||input.length>2048)return NextResponse.json({error:'Ingresá un enlace válido.'},{status:400});
    const target=safeUrl(input);
    if(!target)return NextResponse.json({error:'Usá un enlace HTTPS público válido.'},{status:400});
    const fallback=guessResourcePreview(target.toString());
    const deadline=Date.now()+MAX_TOTAL_MS;
    const host=target.hostname.toLowerCase().replace(/^www\./,'');
    let fetched:ResourcePreview={...fallback};
    let complete=false;
    try{
      if(fallback.kind==='instagram'){
        // Public posts and Reels can be shown through Instagram's own embedded viewer.
        // The iframe URL is derived from the original link; no Meta post metadata is persisted.
        fetched={...fallback};
        complete=!!resourceEmbed(target.toString());
      }else if(fallback.kind==='tiktok'){
        const canonical=(host.startsWith('vt.')||host.startsWith('vm.'))
          ?await resolveTikTokLink(target,deadline):target;
        try{
          const endpoint=new URL('https://www.tiktok.com/oembed?url='+encodeURIComponent(canonical.toString()));
          const result=await retrieve(endpoint,deadline);
          const info=JSON.parse(result.body) as Record<string,unknown>;
          const videoId=info.embed_product_id||
            String(info.html||'').match(/player\/v1\/(\d{10,22})/)?.[1]||
            canonical.pathname.match(/\/video\/(\d{10,22})/)?.[1];
          const embedUrl=safeTikTokPlayer(videoId);
          fetched={...fallback,title:typeof info.title==='string'?info.title.slice(0,200):fallback.title,
            description:typeof info.author_name==='string'?info.author_name.slice(0,450):'',
            image:publicImage(String(info.thumbnail_url||'')),embedUrl};
          complete=!!(embedUrl||fetched.image);
        }catch{
          const videoId=canonical.pathname.match(/\/video\/(\d{10,22})/)?.[1];
          fetched={...fallback,embedUrl:safeTikTokPlayer(videoId)};
          complete=!!fetched.embedUrl;
        }
      }else if(fallback.kind==='youtube'||fallback.kind==='spotify'){
        const providerUrl=fallback.kind==='youtube'
          ?new URL('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(target.toString()))
          :new URL('https://open.spotify.com/oembed?url='+encodeURIComponent(target.toString()));
        const resource=await retrieve(providerUrl,deadline);
        const json=JSON.parse(resource.body) as Record<string,unknown>;
        fetched={...fallback,title:String(json.title||fallback.title).slice(0,200),description:typeof json.author_name==='string'?json.author_name.slice(0,450):'',image:publicImage(String(json.thumbnail_url||fallback.image)),site:fallback.site};
        complete=typeof json.title==='string'&&json.title.trim().length>0;
      }else if(fallback.kind==='image'){
        fetched={...fallback,title:decodeURIComponent(target.pathname.split('/').pop()||'Imagen').slice(0,200),image:publicImage(target.toString())};
        complete=true;
      }else{
        const resource=await retrieve(target,deadline);
        const html=resource.body;
        const ld=ldPreview(html);
        const ttl=meta(html,['og:title','twitter:title'])||ld.title||
          decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'')||
          plain((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
        const desc=meta(html,['og:description','twitter:description','description'])||ld.description||articleExcerpt(html);
        const imageSource=meta(html,['og:image:secure_url','og:image','twitter:image','thumbnail'])||ld.image;
        const img=makeAbsolute(imageSource,resource.url);
        const typ=meta(html,['og:type']);
        const source=meta(html,['og:site_name','application-name']);
        const kind:ResourceKind=fallback.kind==='document'?'document':typ==='article'?'article':fallback.kind;
        fetched={title:ttl||slugTitle(resource.url)||fallback.title||host,description:desc,image:publicImage(img),site:source||fallback.site,kind};
        complete=!!(ttl||desc||img);
      }
      if(fetched.image){
        try{await publicIp(new URL(fetched.image).hostname);}catch{fetched.image='';}
      }
    }catch{
      // Unsupported, private or bot-protected sites retain the provider/type fallback.
      fetched={...fallback,title:fallback.title||slugTitle(target)||host};
      complete=false;
    }
    // Do not mark a generic placeholder as a successful preview. It should be retried later.
    if(complete)fetched.fetchedAt=new Date().toISOString();
    else fetched.limited=true;
    return NextResponse.json(fetched,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch{
    return NextResponse.json({error:'No se pudo obtener la vista previa.'},{status:400});
  }
}
