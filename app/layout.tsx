import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./hero-refresh.css";

export const metadata: Metadata = {
  title: "HBIU Graduation Yearbooks",
  description: "Official digital commencement yearbooks and graduation archives of Heart Bible International University."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <div className="brand-mark">HBIU</div>
            <div><strong>HBIU Graduation Yearbooks</strong><span>Heart Bible International University</span></div>
          </Link>
          <nav><Link href="/">Yearbooks</Link><a href="https://www.hbiuglobal.org">HBIU Global</a><Link className="admin-link" href="/admin">Yearbook Studio</Link></nav>
        </header>
        {children}
        <footer><strong>HBIU Graduation Yearbooks</strong><span>Celebrate • Honor • Inspire</span><a href="https://www.hbiuglobal.org">Return to HBIU Global →</a></footer>
      </body>
    </html>
  );
}
