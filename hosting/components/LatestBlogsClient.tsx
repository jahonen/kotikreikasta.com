"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getDbClient } from "../lib/firebase-client";

type Blog = {
  id: string;
  title: string;
  date: string;
  crops?: any;
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
          const title = String(data.title || "(ei otsikkoa)");
          
          // CRITICAL FIX: Remove title from excerpt to avoid duplication
          let contentMd = String(data.contentMd || "");
          // Remove markdown heading syntax and the title itself
          contentMd = contentMd.replace(/^#\s+.*$/m, "").trim();
          // Also remove if title appears at the start of content
          if (contentMd.toLowerCase().startsWith(title.toLowerCase())) {
            contentMd = contentMd.slice(title.length).trim();
          }
          
          const excerpt = contentMd
            .replace(/[#>*_`\-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160);
            
          return {
            id: d.id,
            title,
            date: ts ? new Date(ts).toLocaleDateString("fi-FI") : "",
            excerpt,
            imageUrl: data.featuredImage?.url || null,
            crops: data.featuredImage?.crops || null,
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
    <ul style={{ 
      listStyle: 'none', 
      padding: 0, 
      margin: 'var(--space-xl) 0 0', 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: 'var(--space-lg)' 
    }}>
      {blogs.map((b) => {
        const href = `/blog/${encodeURIComponent(b.urlStub || b.id)}`;
        return (
          <li key={b.id}>
            <Link 
              href={href} 
              aria-label={`Lue artikkeli: ${b.title}`} 
              style={{ display: 'block', height: '100%', textDecoration: 'none' }}
            >
              <article style={{ 
                background: 'var(--white)', 
                border: '1px solid var(--border)', 
                borderRadius: '4px', 
                overflow: 'hidden', 
                height: '100%',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer'
              }}
              onClick={() => {
                try { (window as any).dataLayer?.push({ event: 'blog_card_click', blog_id: b.id, blog_slug: b.urlStub || null, blog_title: b.title }); } catch {}
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = 'var(--gold-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              >
                {b.imageUrl && (
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '16 / 9', 
                    overflow: 'hidden', 
                    background: 'var(--sand)' 
                  }}>
                    <img 
                      src={b.crops?.['4:3']?.full || b.crops?.['16:9']?.full || b.imageUrl} 
                      alt="" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </div>
                )}
                <div style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ 
                    fontSize: '0.6875rem', 
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    {b.date}
                  </div>
                  <h3 style={{ 
                    margin: '0 0 var(--space-sm)', 
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.375rem',
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: 'var(--text)'
                  }}>
                    {b.title}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    color: 'var(--text-muted)' 
                  }}>
                    {b.excerpt}{b.excerpt.length === 160 ? '…' : ''}
                  </p>
                </div>
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
