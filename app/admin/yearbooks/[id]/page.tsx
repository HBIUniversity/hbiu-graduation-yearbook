import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireEditor } from '../../../../lib/editor-auth';
import { adminDb } from '../../../../lib/supabase';
import { addGraduate, addPage, deletePage, duplicatePage, movePage, updatePage, updateYearbook } from '../../actions';
import { publishGraduateAsset, uploadGraduateAsset, uploadYearbookCover } from '../../assets-actions';

function spriteStyle(pageNumber:number){
  if(pageNumber<1||pageNumber>35) return undefined;
  const i=pageNumber-1;
  const col=i%5;
  const row=Math.floor(i/5);
  return {backgroundImage:"url('/yearbook/master-2026-atlas.jpg')",backgroundSize:'500% 700%',backgroundPosition:`${col*25}% ${row*(100/6)}%`};
}

export default async function EditYearbookPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{page?:string}>}){
  await requireEditor();
  const {id}=await params;
  const query=await searchParams;
  const db=adminDb();
  const [{data:book},{data:pages},{data:graduates}]=await Promise.all([
    db.from('yearbooks').select('*').eq('id',id).maybeSingle(),
    db.from('yearbook_pages').select('*').eq('yearbook_id',id).order('page_number'),
    db.from('graduates').select('*').eq('yearbook_id',id).order('display_order',{ascending:true,nullsFirst:false}).order('created_at')
  ]);
  if(!book) notFound();
  const allPages=pages||[];
  const requested=Math.max(1,Number(query.page||1));
  const selected=allPages.find((p:any)=>p.page_number===requested)||allPages[0];
  const selectedNo=selected?.page_number||1;
  const masterVisual=selectedNo<=35;

  return <main className="studio-v2">
    <header className="studio-v2-head">
      <div><Link href="/admin" className="back-link">← Yearbook Library</Link><div className="eyebrow">HBIU Graduation Yearbook Studio</div><h1>{book.title}</h1><p>Your original 2026 booklet is the visual master. Select a page to work on it without changing the underlying design.</p></div>
      <div className="studio-head-actions"><span className="status-pill">{book.status}</span><Link href={`/yearbooks/${book.slug}`} className="ghost-button" target="_blank">Preview Yearbook</Link></div>
    </header>

    <section className="studio-toolbar">
      <form action={updateYearbook} className="studio-meta-form"><input type="hidden" name="yearbook_id" value={book.id}/><label>Yearbook title<input name="title" defaultValue={book.title} required/></label><label>Subtitle<input name="subtitle" defaultValue={book.subtitle||''}/></label><label>Year<input name="year" type="number" defaultValue={book.year} required/></label><label>Status<select name="status" defaultValue={book.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><button className="gold-button">Save Yearbook</button></form>
    </section>

    <section className="visual-studio-grid">
      <aside className="visual-page-rail">
        <div className="rail-title"><strong>Pages</strong><span>{allPages.length} pages</span></div>
        <div className="visual-thumbs">{allPages.map((p:any)=><Link key={p.id} href={`/admin/yearbooks/${book.id}?page=${p.page_number}`} className={`visual-thumb ${p.id===selected?.id?'active':''}`}><div className="visual-thumb-art" style={spriteStyle(p.page_number)}>{p.page_number>35&&<span>NEW PAGE</span>}</div><b>{p.page_number}</b><small>{p.title||'Untitled page'}</small></Link>)}</div>
        <form action={addPage}><input type="hidden" name="yearbook_id" value={book.id}/><button className="gold-button rail-add">+ Add New Page</button></form>
      </aside>

      <div className="visual-canvas-column">
        <div className="visual-canvas-label"><span>Page {selectedNo} of {allPages.length}</span><strong>{selected?.title||'Untitled Page'}</strong></div>
        <div className="visual-canvas-wrap">
          {selected&&<div className={`visual-master-page ${masterVisual?'master-page':'custom-page'}`} style={spriteStyle(selectedNo)}>{!masterVisual&&<div className="custom-page-placeholder"><div className="crest-ring large">HBIU</div><h2>{selected.title}</h2><p>{selected.content?.body||'New editable page'}</p></div>}</div>}
        </div>
        {selected&&<div className="visual-page-actions">
          <form action={movePage}><input type="hidden" name="page_id" value={selected.id}/><input type="hidden" name="yearbook_id" value={book.id}/><button name="direction" value="up" className="small-button">← Move Earlier</button><button name="direction" value="down" className="small-button">Move Later →</button></form>
          <form action={duplicatePage}><input type="hidden" name="page_id" value={selected.id}/><input type="hidden" name="yearbook_id" value={book.id}/><button className="small-button">Duplicate Page</button></form>
          <form action={deletePage}><input type="hidden" name="page_id" value={selected.id}/><input type="hidden" name="yearbook_id" value={book.id}/><button className="danger-button">Delete Page</button></form>
        </div>}
      </div>

      <aside className="visual-inspector">
        <div className="inspector-heading"><span>Editing Page {selectedNo}</span><h2>{selected?.title}</h2></div>
        {selected&&<form action={updatePage} className="inspector-form"><input type="hidden" name="page_id" value={selected.id}/><input type="hidden" name="yearbook_id" value={book.id}/><label>Page title<input name="title" defaultValue={selected.title||''}/></label><label>Page type<input name="page_type" defaultValue={selected.page_type}/></label><input type="hidden" name="layout_key" value={selected.layout_key||'master-2026'}/><label>Editable page text / replacement copy<textarea name="body" rows={10} defaultValue={selected.content?.body||selected.content?.text||selected.content?.description||''} placeholder="Enter replacement or additional text for this page."/></label><button className="gold-button">Save Page Changes</button></form>}
        <div className="inspector-note"><strong>Original design preserved</strong><p>The visual page shown here is your original booklet page. Editing text is stored separately so the master design is not destroyed. Photo/text replacement layers can be applied over the visual master as the next editing step.</p></div>
        <form action={uploadYearbookCover} className="inspector-upload"><input type="hidden" name="yearbook_id" value={book.id}/><label>Replace yearbook cover<input name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required/></label><button className="small-button">Upload Cover</button></form>
      </aside>
    </section>

    <section className="admin-panel graduate-studio-section"><div className="section-head"><div><h2>Graduate Gallery & Flyers</h2><p>Add individual graduates, photos, honors and graduation flyers without leaving the yearbook studio.</p></div></div><form action={addGraduate} className="graduate-form"><input type="hidden" name="yearbook_id" value={book.id}/><input name="full_name" placeholder="Graduate full name" required/><input name="credential" placeholder="Credential / Degree"/><input name="program_title" placeholder="Program title"/><input name="college_name" placeholder="College"/><input name="honors" placeholder="Honors / recognition"/><button className="gold-button">Add Graduate</button></form>
      <div className="graduate-list">{(graduates||[]).map((g:any)=><div key={g.id} className="graduate-row graduate-row-expanded"><div className="graduate-avatar">{g.full_name.split(/\s+/).slice(0,2).map((x:string)=>x[0]).join('')}</div><div className="graduate-info"><strong>{g.full_name}</strong><span>{[g.credential,g.program_title,g.college_name].filter(Boolean).join(' • ')||'Graduate record'}</span></div><div className="graduate-assets"><form action={uploadGraduateAsset}><input type="hidden" name="yearbook_id" value={book.id}/><input type="hidden" name="graduate_id" value={g.id}/><input type="hidden" name="asset_type" value="photo"/><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required/><button className="small-button">Upload Photo</button></form><form action={uploadGraduateAsset}><input type="hidden" name="yearbook_id" value={book.id}/><input type="hidden" name="graduate_id" value={g.id}/><input type="hidden" name="asset_type" value="flyer"/><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" required/><button className="small-button">Upload Flyer</button></form>{(g.photo_path||g.flyer_path)&&<form action={publishGraduateAsset}><input type="hidden" name="yearbook_id" value={book.id}/><input type="hidden" name="graduate_id" value={g.id}/><button className="gold-button">Publish Assets</button></form>}</div></div>)}{!graduates?.length&&<p className="muted">No graduate records added yet.</p>}</div>
    </section>
  </main>;
}
