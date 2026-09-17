import Link from 'next/link';
import { publicDb } from '../lib/supabase';

export const revalidate = 60;

export default async function HomePage() {
  const db = publicDb();
  const { data: yearbooks } = await db.from('yearbooks').select('id,title,subtitle,slug,year,cover_image_path,published_at').eq('status','published').order('year',{ ascending:false }).limit(12);
  const books = yearbooks || [];
  return <main>
    <section className="hero">
      <div className="hero-overlay" />
      <div className="hero-inner">
        <div className="eyebrow">Heart Bible International University</div>
        <h1>Graduation Yearbooks</h1>
        <p className="hero-copy">Celebrate achievement, preserve legacy, and revisit HBIU commencement moments from around the world.</p>
        <div className="hero-actions"><a href="#yearbooks" className="gold-button">Explore Yearbooks</a><a href="https://www.hbiuglobal.org" className="ghost-button">Return to HBIU Global</a></div>
      </div>
    </section>

    <section id="yearbooks" className="section light">
      <div className="section-head"><div><div className="eyebrow dark">HBIU Commencement Archive</div><h2>Graduation yearbooks</h2></div><p>Open each publication as an interactive digital booklet. New ceremonies can be added while previous yearbooks remain preserved.</p></div>
      {books.length ? <div className="book-grid">{books.map((book)=><Link key={book.id} href={`/yearbooks/${book.slug}`} className="book-card"><div className="book-cover"><div className="crest-ring">HBIU</div><div className="cover-year">{book.year}</div><div className="cover-title">{book.title}</div></div><div className="book-meta"><strong>{book.title}</strong><span>{book.subtitle || `Class of ${book.year}`}</span><b>Open Yearbook →</b></div></Link>)}</div> : <div className="empty-state"><div className="crest-ring large">HBIU</div><h3>Our first digital yearbook is being prepared.</h3><p>The 2026 HBIU Graduation Yearbook master template is already loaded in the editor and will appear here when publication is approved.</p></div>}
    </section>

    <section className="section navy"><div className="feature-grid"><div><div className="eyebrow">A Living Graduation Archive</div><h2>More than a PDF.</h2><p>Each yearbook can preserve the order of service, Chancellor and Vice-Chancellor messages, graduate lists, awards, leadership, testimonials, student flyers, photos, and institutional history in one elegant publication.</p></div><div className="feature-box"><span>01</span><strong>Flip-book reading</strong><p>Turn pages in a magazine-style reader on desktop, tablet, or phone.</p></div><div className="feature-box"><span>02</span><strong>Graduate galleries</strong><p>Celebrate students with portraits, flyers, honors, programs, and ceremony highlights.</p></div><div className="feature-box"><span>03</span><strong>Year-by-year archive</strong><p>Keep every ceremony preserved while creating new editions from a master template.</p></div></div></section>

    <footer className="footer"><div><strong>HBIU Graduation Yearbooks</strong><span>Heart Bible International University</span></div><a href="https://www.hbiuglobal.org">HBIUGlobal.org</a></footer>
  </main>;
}
