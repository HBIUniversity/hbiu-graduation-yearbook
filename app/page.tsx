import Link from 'next/link';
import { publicDb } from '../lib/supabase';

export const revalidate = 60;

export default async function HomePage() {
  const db = publicDb();
  const { data: yearbooks } = await db.from('yearbooks').select('id,title,subtitle,slug,year,cover_image_path,published_at').eq('status','published').order('year',{ ascending:false }).limit(12);
  const books = yearbooks || [];
  return <main>
    <section className="hero hero-celebration">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-photo-shade" aria-hidden="true" />
      <div className="hero-gold-sweep" aria-hidden="true" />
      <div className="hero-celebration-inner">
        <div className="hero-copy-panel">
          <div className="eyebrow">Heart Bible International University • Commencement Archive</div>
          <div className="hero-seal-line"><span className="hero-mini-seal">HBIU</span><span>Celebrate • Honor • Inspire</span></div>
          <h1>Graduation<br/><em>Yearbooks</em></h1>
          <p className="hero-copy">A living digital celebration of HBIU graduates, leaders, ceremonies and global achievement. Open each yearbook like a magazine and preserve every commencement for generations to come.</p>
          <div className="hero-actions"><a href="#yearbooks" className="gold-button">Explore Graduation Yearbooks</a><a href="https://www.hbiuglobal.org" className="ghost-button">Return to HBIU Global</a></div>
          <div className="hero-highlights"><span><b>35</b> Colleges</span><span><b>Global</b> Ceremonies</span><span><b>Digital</b> Flip-books</span></div>
        </div>
        <div className="hero-magazine-card">
          <div className="magazine-top">HBIU COMMENCEMENT</div>
          <div className="magazine-photo" />
          <div className="magazine-copy"><span>CLASS OF 2026</span><strong>Celebrating Achievement Around the World</strong><small>Graduates • Leadership • Awards • Tributes • Memories</small></div>
        </div>
      </div>
    </section>

    <section id="yearbooks" className="section light yearbook-showcase">
      <div className="section-head"><div><div className="eyebrow dark">HBIU Commencement Archive</div><h2>Open a graduation yearbook</h2></div><p>Every ceremony becomes part of the HBIU story. Browse published editions, turn the pages online, and revisit graduates, messages, awards and commencement memories.</p></div>
      {books.length ? <div className="book-grid">{books.map((book)=><Link key={book.id} href={`/yearbooks/${book.slug}`} className="book-card"><div className="book-cover"><div className="crest-ring">HBIU</div><div className="cover-year">{book.year}</div><div className="cover-title">{book.title}</div></div><div className="book-meta"><strong>{book.title}</strong><span>{book.subtitle || `Class of ${book.year}`}</span><b>Open Yearbook →</b></div></Link>)}</div> : <div className="empty-state"><div className="crest-ring large">HBIU</div><h3>Our first digital yearbook is being prepared.</h3><p>The 2026 HBIU Graduation Yearbook master template is already loaded in the editor and will appear here when publication is approved.</p></div>}
    </section>

    <section className="graduation-story-band">
      <div className="graduation-story-copy"><div className="eyebrow">The HBIU Graduation Experience</div><h2>Every page should feel like a celebration.</h2><p>Our digital yearbooks are designed to carry the same ceremonial beauty as HBIU’s printed commencement books — rich navy, royal blue and gold, formal messages, graduate portraits, awards, tributes and global memories.</p></div>
      <div className="graduation-story-image" aria-label="Graduates celebrating commencement" />
    </section>

    <section className="section navy"><div className="feature-grid"><div><div className="eyebrow">A Living Graduation Archive</div><h2>More than a PDF.</h2><p>Each yearbook can preserve the order of service, Chancellor and Vice-Chancellor messages, graduate lists, awards, leadership, testimonials, student flyers, photos, and institutional history in one elegant publication.</p></div><div className="feature-box"><span>01</span><strong>Flip-book reading</strong><p>Turn pages in a magazine-style reader on desktop, tablet, or phone.</p></div><div className="feature-box"><span>02</span><strong>Graduate galleries</strong><p>Celebrate students with portraits, flyers, honors, programs, and ceremony highlights.</p></div><div className="feature-box"><span>03</span><strong>Year-by-year archive</strong><p>Keep every ceremony preserved while creating new editions from a master template.</p></div></div></section>

    <footer className="footer"><div><strong>HBIU Graduation Yearbooks</strong><span>Heart Bible International University</span></div><a href="https://www.hbiuglobal.org">HBIUGlobal.org</a></footer>
  </main>;
}
