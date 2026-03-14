"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getDbClient } from "../lib/firebase-client";

type Blog = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  imageUrl: string | null;
  urlStub?: string | null;
};

export default function LatestBlogsClient({ count = 3 }: { count?: number }) {
  const [blogs, setBlogs] = useState<Blog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDbClient();
      if (!db) {
        if (!cancelled) setBlogs([]);
        return;
      }
      try {
        let q = query(
          collection(db, "blog_posts"),
          where("status", "==", "published"),
          orderBy("publishedAt", "desc"),
          limit(count)
        );
        let snap = await getDocs(q);
        if (snap.empty) {
          q = query(
            collection(db, "blog_posts"),
            where("status", "==", "published"),
            orderBy("updatedAt", "desc"),
            limit(count)
          );
          snap = await getDocs(q);
        }
        const items: Blog[] = snap.docs.map((d) => {
          const data: any = d.data() || {};
          const ts: Date | null = data.publishedAt?.toDate?.() || data.updatedAt?.toDate?.() || null;
          const excerpt = String(data.contentMd || "")
            .replace(/[#>*_`\-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180);
          return {
            id: d.id,
            title: String(data.title || "(ei otsikkoa)"),
            date: ts ? new Date(ts).toLocaleDateString("fi-FI") : "",
            excerpt,
            imageUrl: data.featuredImage?.url || null,
            urlStub: data.urlStub || null,
          };
        });
        if (!cancelled) setBlogs(items);
      } catch {
        if (!cancelled) setBlogs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [count]);

  if (blogs === null) {
    return <p style={{ color: 'var(--text-muted)' }}>Ladataan…</p>;
  }
  if (blogs.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Ei julkaistuja artikkeleita vielä.</p>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
      {blogs.map((b) => {
        const href = `/blog/${encodeURIComponent(b.urlStub || b.id)}`;
        return (
          <li key={b.id}>
            <Link href={href} aria-label={`Lue artikkeli: ${b.title}`} onClick={() => {
              try { (window as any).dataLayer?.push({ event: 'blog_card_click', blog_id: b.id, blog_slug: b.urlStub || null, blog_title: b.title }); } catch {}
            }}>
              <article style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', height: '100%' }}>
                {b.imageUrl && (
                  <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: '#f5f5f5' }}>
                    <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.date}</div>
                  <h3 style={{ margin: '6px 0 8px', fontSize: 18 }}>{b.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{b.excerpt}{b.excerpt.length === 180 ? '…' : ''}</p>
                </div>
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
