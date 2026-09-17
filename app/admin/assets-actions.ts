'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, YEARBOOK_STORAGE_PRIVATE, YEARBOOK_STORAGE_PUBLIC } from '../../lib/supabase';

function safeName(name:string){ return name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-140) || 'asset'; }
function extFrom(file:File){ const parts=file.name.split('.'); return parts.length>1?`.${parts.pop()}`:''; }

export async function uploadGraduateAsset(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const graduateId=String(formData.get('graduate_id')||'');
  const assetType=String(formData.get('asset_type')||'photo');
  const file=formData.get('file');
  if(!yearbookId||!graduateId||!(file instanceof File)||file.size===0) return;
  if(file.size>50*1024*1024) throw new Error('File must be 50 MB or smaller.');
  const db=adminDb();
  const path=`graduates/${yearbookId}/${graduateId}/${assetType}-${Date.now()}-${safeName(file.name)}`;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const {error:uploadError}=await db.storage.from(YEARBOOK_STORAGE_PRIVATE).upload(path,bytes,{contentType:file.type||'application/octet-stream',upsert:false});
  if(uploadError) throw new Error(uploadError.message);
  const field=assetType==='flyer'?'flyer_path':'photo_path';
  const {error:updateError}=await db.from('graduates').update({[field]:path,updated_at:new Date().toISOString()}).eq('id',graduateId).eq('yearbook_id',yearbookId);
  if(updateError) throw new Error(updateError.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}

export async function publishGraduateAsset(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const graduateId=String(formData.get('graduate_id')||'');
  const db=adminDb();
  const {data:graduate,error}=await db.from('graduates').select('photo_path,flyer_path').eq('id',graduateId).eq('yearbook_id',yearbookId).maybeSingle();
  if(error||!graduate) throw new Error(error?.message||'Graduate not found.');
  const updates:any={published:true,updated_at:new Date().toISOString()};
  for(const [field,path] of [['photo_path',graduate.photo_path],['flyer_path',graduate.flyer_path]] as const){
    if(!path) continue;
    const {data:blob,error:downloadError}=await db.storage.from(YEARBOOK_STORAGE_PRIVATE).download(path);
    if(downloadError||!blob) throw new Error(downloadError?.message||'Could not open graduate asset.');
    const publicPath=`published/${yearbookId}/${graduateId}/${field}-${Date.now()}${extFrom(new File([blob],path))}`;
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const {error:publicError}=await db.storage.from(YEARBOOK_STORAGE_PUBLIC).upload(publicPath,bytes,{contentType:blob.type||'application/octet-stream',upsert:false});
    if(publicError) throw new Error(publicError.message);
    updates[field]=publicPath;
  }
  const {error:updateError}=await db.from('graduates').update(updates).eq('id',graduateId);
  if(updateError) throw new Error(updateError.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`); revalidatePath('/');
}

export async function uploadYearbookCover(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const file=formData.get('cover');
  if(!yearbookId||!(file instanceof File)||file.size===0) return;
  if(file.size>50*1024*1024) throw new Error('Cover must be 50 MB or smaller.');
  const db=adminDb();
  const path=`covers/${yearbookId}/cover-${Date.now()}-${safeName(file.name)}`;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const {error}=await db.storage.from(YEARBOOK_STORAGE_PRIVATE).upload(path,bytes,{contentType:file.type||'application/octet-stream',upsert:false});
  if(error) throw new Error(error.message);
  const {error:updateError}=await db.from('yearbooks').update({cover_image_path:path,updated_at:new Date().toISOString()}).eq('id',yearbookId);
  if(updateError) throw new Error(updateError.message);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}

export async function movePage(formData:FormData){
  const yearbookId=String(formData.get('yearbook_id')||'');
  const pageId=String(formData.get('page_id')||'');
  const direction=String(formData.get('direction')||'up');
  const db=adminDb();
  const {data:pages,error}=await db.from('yearbook_pages').select('id,page_number').eq('yearbook_id',yearbookId).order('page_number');
  if(error||!pages) throw new Error(error?.message||'Pages could not be loaded.');
  const index=pages.findIndex(p=>p.id===pageId);
  const swapIndex=direction==='down'?index+1:index-1;
  if(index<0||swapIndex<0||swapIndex>=pages.length) return;
  const current=pages[index], other=pages[swapIndex];
  const temporary=-Math.abs(current.page_number)-10000;
  await db.from('yearbook_pages').update({page_number:temporary}).eq('id',current.id);
  await db.from('yearbook_pages').update({page_number:current.page_number}).eq('id',other.id);
  await db.from('yearbook_pages').update({page_number:other.page_number}).eq('id',current.id);
  revalidatePath(`/admin/yearbooks/${yearbookId}`);
}
