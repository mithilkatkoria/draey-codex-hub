import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { Modal } from './Modal';
export interface Command {id:string;label:string;detail:string;run:()=>void}
export function CommandPalette({commands,onClose}:{commands:Command[];onClose:()=>void}){
 const [query,setQuery]=useState('');const [index,setIndex]=useState(0);
 const filtered=useMemo(()=>commands.filter(c=>`${c.label} ${c.detail}`.toLowerCase().includes(query.toLowerCase())),[commands,query]);
 useEffect(()=>{document.getElementById(filtered[index]?`command-${filtered[index].id}`:'')?.scrollIntoView?.({block:'nearest'});},[index,filtered]);
 function execute(i:number){const c=filtered[i];if(c){onClose();c.run();}}
 return <Modal title="Jump into your flow" onClose={onClose}><div className="palette-search"><Search size={20}/><input autoFocus role="combobox" aria-label="Search commands" aria-expanded="true" aria-controls="command-list" aria-activedescendant={filtered[index]?`command-${filtered[index].id}`:undefined} placeholder="Search profiles, projects, actions…" value={query} onChange={e=>{setQuery(e.target.value);setIndex(0);}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setIndex(i=>filtered.length?(i+1)%filtered.length:0);}else if(e.key==='ArrowUp'){e.preventDefault();setIndex(i=>filtered.length?(i-1+filtered.length)%filtered.length:0);}else if(e.key==='Enter'){e.preventDefault();execute(index);}}}/><kbd>esc</kbd></div><div id="command-list" role="listbox" className="command-list">{filtered.map((c,i)=><button id={`command-${c.id}`} key={c.id} role="option" aria-selected={index===i} onMouseEnter={()=>setIndex(i)} onClick={()=>execute(i)} className={index===i?'active':''}><span><strong>{c.label}</strong><small>{c.detail}</small></span><ArrowUpRight size={16}/></button>)}{!filtered.length&&<p className="no-results">No matching actions.</p>}</div><div className="palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> select</span></div></Modal>;
}
