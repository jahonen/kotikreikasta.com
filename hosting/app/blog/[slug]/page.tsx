import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import BlogPostClient from "../BlogPostClient";
import "../blog-content.scss";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const p = path.join(process.cwd(), "content", "blog-slugs.json");
    const raw = await fs.readFile(p, "utf8");
    const slugs: string[] = JSON.parse(raw) || [];
    return slugs.filter(Boolean).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || '').trim();
  const human = slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const title = `${human} — Kotikreikasta`;
  const url = `https://kotikreikasta.com/blog/${encodeURIComponent(slug)}`;
  return { title, alternates: { canonical: url } };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || '').trim();
  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: '6rem 0 3rem', maxWidth: 840, margin: '0 auto' }}>
        <nav aria-label="breadcrumb" style={{ fontSize: 14, marginBottom: 12 }}>
          <ol style={{ listStyle: 'none', display: 'flex', gap: 8, padding: 0, margin: 0, color: 'var(--text-muted)' }}>
            <li><Link href="/">Etusivu</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/#latest-blogs">Blogi</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" style={{ color: 'inherit' }}>{slug.replace(/-/g, ' ')}</li>
          </ol>
        </nav>
        <BlogPostClient slug={slug} />
      </main>
      <Footer />
    </>
  );
}
