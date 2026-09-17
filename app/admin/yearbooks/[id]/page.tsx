import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireEditor } from '../../../../lib/editor-auth';
import { adminDb } from '../../../../lib/supabase';
import { addGraduate, addPage, deletePage, updatePage, updateYearbook } from '../../actions';

export default async function EditYearbookPage({params}:{params:Promise<{id:string}>}){
  await requireEditor();
  const {id}=await params;
  const db=adminDb();
  const [{data:book},{data:pages},{data:graduates}]=await Promise.all([
    db.from('yearbooks').select('*').eq('id',id).maybeSingle(),
    db.from('yearbook_pages').select('*').eq('yearbook_id',id).order('page_number'),
    db.from('graduates').select('*').eq('yearbook_id',id).order('display_order',{ascending:true,nullsFirst:false}).order('created_at')
  ]);
  if(!book) notFound();
  return <main className="admin-shell"><header className="admin-top"><div><Link href="/admin" className="back-link">← Yearbook Library</Link><div className="eyebrow">HBIU Graduation Yearbook Studio</div><h1>{book.title}</h1></div><div className="status-pill">{book.status}</div></header>
    <section className="admin-panel"><h2>Yearbook Settings</h2><form action={updateYearbook} className="settings-grid"><input type="hidden" name="yearbook_id" value={book.id}/><label>Title<input name="title" defaultValue={book.title} required/></label><label>Subtitle<input name="subtitle" defaultValue={book.subtitle||''}/></label><label>Year<input name="year" type="number" defaultValue={book.year} required/></label><label>Status<select name="status" defaultValue={book.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><button className="gold-button">Save Yearbook</button></form></section>

    <section className="admin-panel"><div className="section-head"><div><h2>Pages</h2><p>Add, edit or remove pages. The page sequence is preserved separately for every duplicated yearbook.</p></div><form action={addPage}><input type="hidden" name="yearbook_id" value={book.id}/><button className="gold-button">+ Add Page</button></form></div>
      <div className="page-editor-list">{(pages||[]).map((p:any)=><article key={p.id} className="page-editor-card"><div className="page-chip">{p.page_number}</div><form action={updatePage} className="page-edit-form"><input type="hidden" name="page_id" value={p.id}/><input type="hidden" name="yearbook_id" value={book.id}/><div className="form-row"><label>Page title<input name="title" defaultValue={p.title||''}/></label><label>Page type<input name="page_type" defaultValue={p.page_type}/></label><label>Layout<select name="layout_key" defaultValue={p.layout_key||'classic'}><option value="classic">Classic Cream</option><option value="navy">Navy & Gold</option><option value="gallery">Graduate Gallery</option><option value="message">Leadership Message</option><option value="program">Commencement Program</option></select></label></div><label>Editable page text<textarea name="body" rows={5} defaultValue={p.content?.body||p.content?.text||p.content?.description||''}/></label><div className="form-actions"><button className="small-button">Save Page</button></div></form><form action={deletePage}><input type="hidden" name="page_id" value={p.id}/><input type="hidden" name="yearbook_id" value={book.id}/><button className="danger-link">Remove</button></form></article>)}</div>
    </section>

    <section className="admin-panel"><div className="section-head"><div><h2>Graduate Gallery</h2><p>Add graduate records now. Photo and flyer upload controls will attach to these records.</p></div></div><form action={addGraduate} className="graduate-form"><input type="hidden" name="yearbook_id" value={book.id}/><input name="full_name" placeholder="Graduate full name" required/><input name="credential" placeholder="Credential / Degree"/><input name="program_title" placeholder="Program title"/><input name="college_name" placeholder="College"/><input name="honors" placeholder="Honors / recognition"/><button className="gold-button">Add Graduate</button></form>
      <div className="graduate-list">{(graduates||[]).map((g:any)=><div key={g.id} className="graduate-row"><div className="graduate-avatar">{g.full_name.split(/\s+/).slice(0,2).map((x:string)=>x[0]).join('')}</div><div><strong>{g.full_name}</strong><span>{[g.credential,g.program_title,g.college_name].filter(Boolean).join(' • ')||'Graduate record'}</span></div></div>)}{!graduates?.length&&<p className="muted">No graduate records added yet.</p>}</div>
    </section>
  </main>;
}
