import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicDb } from '../../../lib/supabase';
import FlipBook from './FlipBook';

export const revalidate = 60;

export default async function YearbookPage({ params }:{ params:Promise<{slug:string}> }) {
  const { slug } = await params;
  const db = publicDb();
  const { data:book } = await db.from('yearbooks').select('id,title,subtitle,slug,year,status').eq('slug',slug).eq('status','published').maybeSingle();
  if(!book) notFound();
  const { data:pages } = await db.from('yearbook_pages').select('id,page_number,page_type,title,content,background_asset_path,layout_key').eq('yearbook_id',book.id).eq('is_published',true).order('page_number');
  return <main className="reader-page"><header className="reader-header"><Link href="/">← All Yearbooks</Link><div><strong>{book.title}</strong><span>{book.subtitle || `Class of ${book.year}`}</span></div><a href="https://www.hbiuglobal.org">HBIU Global</a></header><FlipBook pages={pages || []} title={book.title} year={book.year}/></main>;
}
