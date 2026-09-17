import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireEditor } from '../../../../../lib/editor-auth';
import { adminDb, YEARBOOK_STORAGE_PRIVATE } from '../../../../../lib/supabase';
import { designAssetPaths, validateBookletDesign } from '../../../../../lib/yearbook-design';
import BookletPageEditor from '../../../../../components/BookletPageEditor';

/** Integration preview: not linked as the default studio until all 35 source pages pass import QA. */
export default async function ObjectEditorPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }>;
}) {
  await requireEditor();
  const { id } = await params, query = await searchParams, db = adminDb();
  const [{ data: book, error: bookError }, { data: pages, error: pageError }] = await Promise.all([
    db.from('yearbooks').select('id,title').eq('id', id).maybeSingle(),
    db.from('yearbook_pages').select('id,page_number,title,content,updated_at').eq('yearbook_id', id).order('page_number'),
  ]);
  if (bookError || pageError) throw new Error('Unable to load the existing booklet. No blank substitute was created.');
  if (!book) notFound();
  const number = Number(query.page || 1), selected = pages?.find(p => p.page_number === number) || pages?.[0];
  if (!selected) return <main className="admin-panel"><h1>{book.title}</h1><p>No source pages were found. The existing booklet must be restored before editing.</p></main>;
  let design = null;
  try { if (selected.content?.design_v1) design = validateBookletDesign(selected.content.design_v1, id); } catch { throw new Error('Imported page data failed validation. The original booklet remains unchanged.'); }
  const paths = design ? designAssetPaths(design) : [];
  const assetUrls: Record<string, string> = {};
  if (paths.length) {
    const { data, error } = await db.storage.from(YEARBOOK_STORAGE_PRIVATE).createSignedUrls(paths, 3600);
    if (error) throw new Error('Page images could not be opened. Their stored references have not changed.');
    for (const item of data || []) {
      if (item.error || !item.path || !item.signedUrl) throw new Error('An imported page image is unavailable. Do not overwrite the original.');
      assetUrls[item.path] = item.signedUrl;
    }
  }
  return <main className="studio-v2">
    <header className="studio-v2-head"><div><Link href={`/admin/yearbooks/${id}`}>← Existing Yearbook Studio</Link><h1>{book.title}</h1><p>Editor integration preview — original page conversion must be verified before production release.</p></div></header>
    <section style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 20 }}>
      <nav aria-label="Booklet pages" style={{ maxHeight: '80vh', overflowY: 'auto' }}>{(pages || []).map(page => <Link key={page.id} href={`/admin/yearbooks/${id}/editor?page=${page.page_number}`} aria-current={page.id === selected.id ? 'page' : undefined} style={{ display: 'block', padding: 12, background: page.id === selected.id ? '#e2eafa' : '#fff', marginBottom: 8 }}>Page {page.page_number}</Link>)}</nav>
      <div><h2>Page {selected.page_number}: {selected.title}</h2><BookletPageEditor key={selected.id} bookId={id} pageId={selected.id} revision={selected.updated_at} sourcePage={selected.content?.source_pdf_page || selected.page_number} design={design} assetUrls={assetUrls}/></div>
    </section>
  </main>;
}
