import { useEffect, useState } from 'react';
import mark from '../../src-tauri/icons/source.svg';

// Load the real app underneath. No network, video, canvas, or animation dependency.
export function LaunchIntro({reducedMotion}:{reducedMotion:boolean}) {
 const [visible,setVisible]=useState(()=>!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{if(reducedMotion){setVisible(false);return;}const timer=setTimeout(()=>setVisible(false),3200);return()=>clearTimeout(timer);},[reducedMotion]);
 if(!visible)return null;
 return <div className="launch-intro" aria-hidden="true" onAnimationEnd={e=>{if(e.animationName==='intro-depart')setVisible(false);}}><div className="intro-emblem"><img src={mark} alt=""/><span>draey</span><small>CODEX HUB</small></div></div>;
}
