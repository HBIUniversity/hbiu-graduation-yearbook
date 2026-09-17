'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminDb } from '../../lib/supabase';
import { clearEditorSession, setEditorSession } from '../../lib/editor-auth';

function slugify(value:string){ return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

export async function loginEditor(formData:FormData){
  const submitted = String(formData.get('access_key')||'');
  const expected = process.env.YEARBOOK_ADMIN_KEY;
  if(!expected || submitted !== expected) redirect('/admin/login?error=1');
  await setEditorSession();
  redirect('/admin');
}

export async function logoutEditor(){ await clearEditorSession(); redirect('/admin/login'); }

export async function duplicateYearbook(formData:FormData){
  const sourceId = String(formData.get('source_id')||'');
  const title = String(formData.get('title')||'').trim();
  const year = Number(formData.get('year')||new Date().getFullYear());
  if(!sourceId || !title) return;
  const db = adminDb();
  const slug = `${slugify(title)}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await db.rpc('duplicate_yearbook',{ p_source_yearbook_id:sourceId, p_new_title:title, p_new_slug:slug, p_new_year:year });
  if(error) throw new Error(error.message);
  revalidatePath('/admin');
  redirect(`/admin/yearbooks/${data}`);
}

export async function updateYearbook(formData:FormData){
  const id=String(formData.get('yearbook_id')||'');
  const title=String(formData.get('title')||'').trim();
  const subtitle=String(formData.get('subtitle')||'').trim();
  const year=Number(formData.get('year')||0);
  const status=String(formData.get('status')||'draft');
  const db=adminDb();
  const { error }=await db.from('yearbooks').update({title,subtitle:subtitle||null,year,status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw new Error(error.message);
  if(status==='published') await db.from('yearbook_pages').update({is_published:true}).eq('yearbook_id',id);
  revalidatePath('/'); revalidatePath('/admin'); revalidatePath(`/admin/yearbooks/${id}`);
}

export async function updatePage(formData:FormData){
  const id=String(formData.get('page_id')||'');
  const yearbookId=String(formData.get('yearbook_id')||'');
  const title=String(formData.get('title')||'').trim();
  const body=String(formData.get('body')||'').trim();
  const pageType=String(formData.get('page_type')||'custom');
  const layoutKey=String(formData.get('layout_key')||'classic');
  const db=adminDb();
  const {error}=await db.from('yearbook_pages').update({title:title||null,page_type:pageType,layout_key:layoutKey,content:{body},updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw new Error(error.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}

export async function addPage(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const db=adminDb();
  const {data:maxRow}=await db.from('yearbook_pages').select('page_number').eq('yearbook_id',yearbookId).order('page_number',{ascending:false}).limit(1).maybeSingle();
  const next=(maxRow?.page_number||0)+1;
  const {error}=await db.from('yearbook_pages').insert({yearbook_id:yearbookId,page_number:next,page_type:'custom',title:`New Page ${next}`,content:{body:''},layout_key:'classic',is_published:false});
  if(error) throw new Error(error.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}

export async function deletePage(formData:FormData){
  const id=String(formData.get('page_id')||'');
  const yearbookId=String(formData.get('yearbook_id')||'');
  const db=adminDb();
  const {error}=await db.from('yearbook_pages').delete().eq('id',id);
  if(error) throw new Error(error.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}

export async function addGraduate(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const fullName=String(formData.get('full_name')||'').trim();
  if(!fullName) return;
  const db=adminDb();
  const {error}=await db.from('graduates').insert({yearbook_id:yearbookId,full_name:fullName,credential:String(formData.get('credential')||'')||null,program_title:String(formData.get('program_title')||'')||null,college_name:String(formData.get('college_name')||'')||null,honors:String(formData.get('honors')||'')||null,published:false});
  if(error) throw new Error(error.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}
