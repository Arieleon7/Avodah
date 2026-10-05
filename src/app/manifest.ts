import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
 return {
  name:'AVODAH — Estudio de producción',
  short_name:'AVODAH',
  description:'Donde las ideas se convierten en programas.',
  id:'/',
  start_url:'/',
  scope:'/',
  display:'standalone',
  background_color:'#F8F5EE',
  theme_color:'#F8F5EE',
  orientation:'any',
  categories:['productivity','business','entertainment'],
  icons:[
   {src:'/brand/avodah-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
   {src:'/brand/avodah-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
  ]
 };
}
