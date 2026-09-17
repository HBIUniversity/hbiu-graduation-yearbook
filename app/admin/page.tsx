import Link from 'next/link';
import { requireEditor } from '../../lib/editor-auth';
import { adminDb } from '../../lib/supabase';
import { duplicateYearbook, logoutEditor } from './actions';

export default async function AdminPage(){
  await requireEditor();
  const db=adminDb();
  const {data:yearbooks}=await db.from('yearbooks').select('id,title,subtitle,slug,year,status,duplicated_from,updated_at').order('updated_at',{ascending:false});
  const books=yearbooks||[];
  return <main className="admin-shell"><header className="admin-top"><div><div className="eyebrow">HBIU Graduation Yearbook Studio</div><h1>Yearbook Library</h1></div><form action={logoutEditor}><button className="ghost-button">Sign Out</button></form></header>
    <section className="admin-panel"><div className="section-head"><div><h2>Create from an existing yearbook</h2><p>Duplicate a complete yearbook, then change the date, graduates, pages, messages, photos and ceremony details without altering the original.</p></div></div>
      {books.length>0&&<form action={duplicateYearbook} className="duplicate-form"><select name="source_id" required>{books.map(b=><option key={b.id} value={b.id}>{b.title} ({b.year})</option>)}</select><input name="title" placeholder="New yearbook title" required/><input name="year" type="number" defaultValue={new Date().getFullYear()+1} required/><button className="gold-button">Duplicate Yearbook</button></form>}
    </section>
    <section className="admin-panel"><div className="section-head"><div><h2>All yearbooks</h2><p>Draft, published and archived graduation publications.</p></div></div><div className="admin-book-grid">{books.map(b=><Link href={`/admin/yearbooks/${b.id}`} key={b.id} className="admin-book-card"><div className="mini-cover"><span>{b.year}</span><strong>HBIU</strong></div><div><small>{b.status.toUpperCase()}</small><h3>{b.title}</h3><p>{b.subtitle||'Editable graduation yearbook'}</p><b>Edit Yearbook →</b></div></Link>)}</div></section>
  </main>;
}
