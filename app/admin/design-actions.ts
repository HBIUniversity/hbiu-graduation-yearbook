'use server';

import { revalidatePath } from 'next/cache';
import { requireEditor } from '../../lib/editor-auth';
import { adminDb, YEARBOOK_STORAGE_PRIVATE } from '../../lib/supabase';
import { requireBookletId, sameSource, validateBookletDesign } from '../../lib/yearbook-design';

/** Saves only an imported page's draft. Original source and published snapshot remain intact. */
export async function saveBookletDesign(bookId: string, pageId: string, revision: string, input: unknown) {
  await requireEditor();
  try {
    requireBookletId(bookId); requireBookletId(pageId);
    if (typeof revision !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(revision) || !Number.isFinite(Date.parse(revision))) throw new Error('Invalid page revision. Reload the editor.');
    const design = validateBookletDesign(input, bookId), db = adminDb();
    const { data: page, error: readError } = await db.from('yearbook_pages').select('content,updated_at').eq('id', pageId).eq('yearbook_id', bookId).maybeSingle();
    if (readError) throw new Error('Unable to verify the current page. Your changes have not been saved.');
    if (!page) throw new Error('This page does not belong to the selected booklet.');
    if (page.updated_at !== revision) throw new Error('This page changed in another session. Your changes are still in the editor; do not overwrite the newer version.');
    const content = page.content && typeof page.content === 'object' && !Array.isArray(page.content) ? page.content : {};
    if (!content.design_v1) throw new Error('Original page conversion is not complete. A blank or preview image cannot replace your booklet.');
    const original = validateBookletDesign(content.design_v1, bookId);
    if (!sameSource(original, design)) throw new Error('The source booklet/page identity must not change during editing.');
    const now = new Date().toISOString();
    const { data: saved, error } = await db.from('yearbook_pages').update({ content: { ...content, design_v1: design }, updated_at: now })
      .eq('id', pageId).eq('yearbook_id', bookId).eq('updated_at', revision).select('id,updated_at').maybeSingle();
    if (error) throw new Error('Page save failed. Keep this editor open; your changes have not been discarded.');
    if (!saved) throw new Error('Another session saved this page first. Your changes remain unsaved for review.');
    revalidatePath(`/admin/yearbooks/${bookId}`);
    return { ok: true as const, revision: saved.updated_at };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : 'The page could not be saved.' }; }
}

export async function uploadBookletImage(form: FormData) {
  await requireEditor();
  try {
    const bookId = requireBookletId(form.get('book_id')), pageId = requireBookletId(form.get('page_id'));
    const file = form.get('image');
    if (!(file instanceof File) || file.size < 12 || file.size > 3 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image up to 3 MB.');
    const db = adminDb();
    const { data: page, error: pageError } = await db.from('yearbook_pages').select('id,content').eq('id', pageId).eq('yearbook_id', bookId).maybeSingle();
    if (pageError || !page?.content?.design_v1) throw new Error('An authorized, converted booklet page is required before uploading.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!png && !jpg && !webp) throw new Error('The image format was not recognized. Convert it to PNG, JPEG or WebP first.');
    const extension = png ? 'png' : jpg ? 'jpg' : 'webp', type = png ? 'image/png' : jpg ? 'image/jpeg' : 'image/webp';
    const path = `pages/${bookId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from(YEARBOOK_STORAGE_PRIVATE).upload(path, bytes, { contentType: type, upsert: false });
    if (error) throw new Error('Image upload failed. The existing photograph has not been replaced.');
    const { data: signed, error: signedError } = await db.storage.from(YEARBOOK_STORAGE_PRIVATE).createSignedUrl(path, 3600);
    if (signedError || !signed?.signedUrl) throw new Error('Image was stored privately, but its preview could not be opened. The page is unchanged.');
    return { ok: true as const, path, url: signed.signedUrl };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : 'Image upload failed.' }; }
}
