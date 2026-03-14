import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import Link from "next/link";
import "../blog-content.scss";
import BlogPostClient from "../BlogPostClient";

export const dynamic = 'force-static';

export default async function BlogCatchAll({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const parts = (slug || []).map((s) => decodeURIComponent(s));
  const titlePart = parts.length ? parts[parts.length - 1] : '';
  const human = titlePart ? titlePart.replace(/-/g, ' ') : '';
  const effectiveSlug = parts.join('/') || '';

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: '3rem 0', maxWidth: 840, margin: '0 auto' }}>
        <nav aria-label="breadcrumb" style={{ fontSize: 14, marginBottom: 12 }}>
          <ol style={{ listStyle: 'none', display: 'flex', gap: 8, padding: 0, margin: 0, color: 'var(--text-muted)' }}>
            <li><Link href="/">Etusivu</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/#latest-blogs">Blogi</Link></li>
            {human && (<>
              <li aria-hidden="true">/</li>
              <li aria-current="page" style={{ color: 'inherit' }}>{human}</li>
            </>)}
          </ol>
        </nav>
        {effectiveSlug ? (
          <BlogPostClient slug={effectiveSlug} />
        ) : (
          <section>
            <h1>Blogi</h1>
            <p>Valitse artikkeli etusivun listauksesta.</p>
            <p><Link href="/#latest-blogs">Siirry uusimpiin artikkeleihin</Link></p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
