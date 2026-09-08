import { useId } from 'react';

/** Small vector sculptures: transparent, resolution independent, no 3D runtime. */
export function AccountSculpture({kind}:{kind:'crown'|'orbit'|'cubes'|'ribbon'}) {
 const id=useId().replace(/:/g,'');
 const fill=(name:string)=>`url(#${id}-${name})`;
 const colors=kind==='crown'?['#f0d7b7','#a38c70','#262b2f']:kind==='orbit'?['#bddcff','#5089ce','#152941']:kind==='cubes'?['#c7f5dc','#4baf92','#163b36']:['#d0b5ff','#8255c3','#281a46'];
 const cube=(x:number,y:number,k:number)=><g transform={`translate(${x} ${y})`} key={k}><path d="M0 0 25-13 50 0 25 14Z" fill={fill('top')}/><path d="M0 0 25 14 25 43 0 29Z" fill={fill('left')}/><path d="M25 14 50 0 50 29 25 43Z" fill={fill('right')}/><path d="M0 0 25-13 50 0 50 29 25 43 0 29Z M0 0 25 14 50 0 M25 14V43" fill="none" stroke={colors[0]} strokeOpacity=".32" strokeWidth=".7"/></g>;
 return <svg className={`account-sculpture sculpture-${kind}`} viewBox="0 0 180 140" aria-hidden="true">
  <defs>
   <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors[2]}/><stop offset=".48" stopColor={colors[1]}/><stop offset="1" stopColor={colors[0]}/></linearGradient>
   <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2=".5"><stop stopColor={colors[1]} stopOpacity=".75"/><stop offset="1" stopColor={colors[2]}/></linearGradient>
   <linearGradient id={`${id}-right`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors[0]} stopOpacity=".85"/><stop offset=".3" stopColor={colors[1]}/><stop offset="1" stopColor={colors[2]}/></linearGradient>
   <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors[0]}/><stop offset=".23" stopColor={colors[2]}/><stop offset=".6" stopColor="#11191f"/><stop offset="1" stopColor={colors[1]}/></linearGradient>
   <radialGradient id={`${id}-shadow`}><stop stopColor="#000" stopOpacity=".7"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
  </defs>
  <ellipse cx="90" cy="124" rx="67" ry="12" fill={fill('shadow')}/>
  {kind==='crown'&&<g stroke={colors[0]} strokeWidth=".8" strokeLinejoin="round"><path d="M34 50 63 77 89 22 111 71 145 48 136 108 88 124 45 106Z" fill={fill('metal')}/><path d="M89 22 88 124 63 77Z" fill={fill('right')} strokeOpacity=".55"/><path d="M88 124 111 71 145 48 136 108Z" fill={fill('metal')} strokeOpacity=".5"/><path d="M34 50 45 106 88 124 63 77Z" fill={fill('left')} strokeOpacity=".6"/><path d="M45 106 88 119 136 108" fill="none" strokeOpacity=".25"/></g>}
  {kind==='orbit'&&<g transform="rotate(17 90 70)">{[91,64,37].map((y,i)=><g key={y}><ellipse cx="90" cy={y+6} rx="48" ry="17" fill={fill('left')}/><ellipse cx="90" cy={y} rx="48" ry="17" fill={fill('metal')} stroke={colors[1]} strokeWidth="1"/><path d={`M43 ${y+1} Q65 ${y+29} 128 ${y+9}`} fill="none" stroke={colors[0]} strokeWidth="1.2" strokeOpacity={.6+i*.15}/></g>)}</g>}
  {kind==='cubes'&&<g>{cube(91,71,0)}{cube(40,71,1)}{cube(65,27,2)}</g>}
  {kind==='ribbon'&&<g transform="rotate(-12 90 70)" strokeLinejoin="round"><path d="M44 39 63 24 93 52 121 25 141 40 111 70 142 99 121 117 91 88 62 116 43 101 72 72Z" fill={fill('left')} stroke={colors[1]}/><path d="M44 31 63 16 93 44 121 17 141 32 111 62 142 91 121 109 91 80 62 108 43 93 72 64Z" fill={fill('metal')} stroke={colors[1]}/><path d="M63 16 93 44 91 64 44 31Z M91 64 121 109 142 91 111 62 141 32 121 17Z" fill={fill('right')} stroke={colors[0]} strokeOpacity=".2"/><path d="M43 93 62 108 91 80" fill="none" stroke={colors[0]} strokeOpacity=".55"/></g>}
 </svg>;
}
