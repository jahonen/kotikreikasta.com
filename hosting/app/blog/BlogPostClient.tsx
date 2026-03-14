"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { getDbClient } from "../../lib/firebase-client";
import BlogAnalytics from "../../components/BlogAnalytics";

type Post = {
  id: string;
  title: string;
  contentMd: string;
  urlStub?: string | null;
  featuredImage?: { url: string; alt?: string } | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  seo?: any;
};

function mdToHtml(md: string): string {
  const escape = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const src = escape(md);
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let para: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.join('<br />')}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (listType && listItems.length) {
      out.push(`<${listType}>` + listItems.map((it) => `<li>${it}</li>`).join("") + `</${listType}>`);
    }
    listType = null;
    listItems = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) { flushPara(); flushList(); const level = Math.min(h[1].length + 1, 6); out.push(`<h${level}>${h[2]}</h${level}>`); continue; }
    const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ol) { flushPara(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listItems.push(ol[1]); continue; }
    const ul = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (ul) { flushPara(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listItems.push(ul[1]); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  let html = out.join("\n");
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
  return html;
}

export default function BlogPostClient({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDbClient();
      if (!db) { if (!cancelled) setStatus("error"); return; }
      try {
        let found: Post | null = null;
        const q = query(
          collection(db, "blog_posts"),
          where("urlStub", "==", slug),
          where("status", "==", "published"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data: any = d.data() || {};
          if (data.status === "published") {
            found = {
              id: d.id,
              title: String(data.title || ""),
              contentMd: String(data.contentMd || ""),
              urlStub: data.urlStub || null,
              featuredImage: data.featuredImage || null,
              publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || null,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
              seo: data.seo || null,
            };
          }
        }
        if (!found) {
          const byId = await getDoc(doc(collection(db, "blog_posts"), slug));
          if (byId.exists()) {
            const data: any = byId.data() || {};
            if (data.status === "published") {
              found = {
                id: byId.id,
                title: String(data.title || ""),
                contentMd: String(data.contentMd || ""),
                urlStub: data.urlStub || null,
                featuredImage: data.featuredImage || null,
                publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || null,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
                seo: data.seo || null,
              };
            }
          }
        }
        if (cancelled) return;
        if (found) { setPost(found); setStatus("ready"); } else { setStatus("notfound"); }
      } catch (err) {
        try { console.error('BlogPostClient load error', err); } catch {}
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const html = useMemo(() => {
    if (!post) return "";
    const md = String(post.contentMd || "");
    const mdNoTitle = md.replace(/^#\s+.*(?:\r?\n|$)/, "");
    return mdToHtml(mdNoTitle);
  }, [post]);

  if (status === "loading") {
    return <p style={{ color: 'var(--text-muted)' }}>Ladataan…</p>;
  }
  if (status === "notfound") {
    return (
      <main className="container" style={{ padding: '3rem 0' }}>
        <h1>Artikkelia ei löytynyt</h1>
        <p>Valitettavasti etsimääsi artikkelia ei löytynyt tai sitä ei voitu ladata.</p>
        <p><Link href="/#latest-blogs">Palaa blogiin</Link></p>
      </main>
    );
  }
  if (status === "error") {
    return <p style={{ color: 'var(--text-muted)' }}>Virhe ladattaessa artikkelia.</p>;
  }
  const dateStr = post?.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fi-FI') : '';
  const url = `/blog/${encodeURIComponent(post?.urlStub || post!.id)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post?.seo?.metaTitle || post?.title,
    description: post?.seo?.metaDescription || '',
    datePublished: post?.publishedAt || post?.updatedAt || undefined,
    dateModified: post?.updatedAt || post?.publishedAt || undefined,
    image: post?.featuredImage?.url ? [post.featuredImage.url] : undefined,
    mainEntityOfPage: `https://kotikreikasta.com${url}`,
  } as any;

  return (
    <article>
      {post?.featuredImage?.url && (
        <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 12, background: '#f5f5f5', marginBottom: 16 }}>
          <img src={post.featuredImage.url} alt={post.featuredImage.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <header>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{dateStr}</p>
        <h1 style={{ margin: '6px 0 12px' }}>{post?.title}</h1>
      </header>
      <section className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogAnalytics id={post!.id} slug={post!.urlStub || post!.id} title={post!.title} />
    </article>
  );
}
