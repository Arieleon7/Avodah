import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { guessResourcePreview, type ResourceKind, type ResourcePreview } from '@/lib/resource-preview';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const MAX_BYTES=360_000;
const MAX_TOTAL_MS=12_000;
const userAgent='AVODAH-LinkPreview/1.0 (+https://avodah-six.vercel.app)';

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
      headers:{'User-Agent':userAgent,'Accept':'text/html,application/json;q=.9,text/plain;q=.5,*/*;q=.1'},
      lookup:((_hostname:string,_opts:unknown,cb:(e:Error|null,address:string,family:number)=>void)=>cb(null,chosen.address,chosen.family)) as typeof import('node:dns').lookup
    },response=>{
      const status=response.statusCode||0;
      if(status>=300&&status<400&&response.headers.location){response.resume();return resolve({body:'',type:'',location:response.headers.location});}
      if(status<200||status>=300){response.resume();return reject(new Error('Site did not return preview metadata'));}
      const type=String(response.headers['content-type']||'').toLowerCase();
      if(!/(text\/html|application\/json|text\/plain|application\/ld\+json)/.test(type)){response.resume();return reject(new Error('No readable preview')); }
      if(Number(response.headers['content-length']||0)>MAX_BYTES){response.resume();return reject(new Error('Preview too large'));}
      let size=0;const parts:Buffer[]=[];
      response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>MAX_BYTES){request.destroy(new Error('Preview too large'));return;}parts.push(chunk);});
      response.on('end',()=>resolve({body:Buffer.concat(parts).toString('utf8'),type}));
      response.on('error',reject);
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
    try{
      if(fallback.kind==='youtube'||fallback.kind==='spotify'){
        const providerUrl=fallback.kind==='youtube'
          ?new URL('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(target.toString()))
          :new URL('https://open.spotify.com/oembed?url='+encodeURIComponent(target.toString()));
        const resource=await retrieve(providerUrl,deadline);
        const json=JSON.parse(resource.body) as Record<string,unknown>;
        fetched={...fallback,title:String(json.title||fallback.title).slice(0,200),description:typeof json.author_name==='string'?json.author_name.slice(0,450):'',image:publicImage(String(json.thumbnail_url||fallback.image)),site:fallback.site};
      }else if(fallback.kind==='image'){
        fetched={...fallback,title:decodeURIComponent(target.pathname.split('/').pop()||'Imagen'),image:publicImage(target.toString())};
      }else{
        const resource=await retrieve(target,deadline);
        const html=resource.body;
        const ttl=meta(html,['og:title','twitter:title'])||decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
        const desc=meta(html,['og:description','twitter:description','description']);
        const img=makeAbsolute(meta(html,['og:image:secure_url','og:image','twitter:image']),resource.url);
        const typ=meta(html,['og:type']);
        const source=meta(html,['og:site_name','application-name']);
        const kind:ResourceKind=fallback.kind==='document'?'document':typ==='article'?'article':fallback.kind;
        fetched={title:ttl||fallback.title||host,description:desc,image:publicImage(img),site:source||fallback.site,kind};
      }
      if(fetched.image){
        try{await publicIp(new URL(fetched.image).hostname);}catch{fetched.image='';}
      }
    }catch{
      // Unsupported, private or bot-protected sites retain the provider/type fallback.
      fetched={...fallback,title:fallback.title||host};
    }
    fetched.fetchedAt=new Date().toISOString();
    return NextResponse.json(fetched,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch{
    return NextResponse.json({error:'No se pudo obtener la vista previa.'},{status:400});
  }
}
