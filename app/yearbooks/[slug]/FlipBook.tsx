'use client';

import { useMemo, useState } from 'react';

type Page = { id:string; page_number:number; page_type:string; title:string|null; content:any; background_asset_path:string|null; layout_key:string|null };

export default function FlipBook({ pages, title, year }:{ pages:Page[]; title:string; year:number }) {
  const ordered = useMemo(()=>[...pages].sort((a,b)=>a.page_number-b.page_number),[pages]);
  const [index,setIndex] = useState(0);
  const page = ordered[index];
  if(!page) return <div className="empty-state"><h3>No published pages yet.</h3></div>;
  const body = typeof page.content === 'object' ? (page.content?.body || page.content?.text || page.content?.description || '') : String(page.content || '');
  return <div className="flip-shell">
    <div className="flip-toolbar"><button onClick={()=>setIndex(Math.max(0,index-1))} disabled={index===0}>← Previous</button><div><strong>{title}</strong><span>Page {index+1} of {ordered.length}</span></div><button onClick={()=>setIndex(Math.min(ordered.length-1,index+1))} disabled={index===ordered.length-1}>Next →</button></div>
    <div className="book-stage">
      <article key={page.id} className={`flip-page layout-${page.layout_key || 'classic'}`}>
        <div className="page-frame">
          <div className="page-kicker">HBIU • {year}</div>
          <h2>{page.title || `Page ${page.page_number}`}</h2>
          {page.page_type === 'cover' ? <><div className="cover-emblem">HBIU</div><h3>Class of {year}</h3><p>Celebrate • Honor • Inspire</p></> : <p className="page-body">{body || 'Editable yearbook content will appear here.'}</p>}
          <div className="page-number">{String(page.page_number).padStart(2,'0')}</div>
        </div>
      </article>
    </div>
    <div className="thumbnail-strip">{ordered.map((p,i)=><button key={p.id} onClick={()=>setIndex(i)} className={i===index?'active':''}><span>{p.page_number}</span><small>{p.title || p.page_type}</small></button>)}</div>
  </div>;
}
