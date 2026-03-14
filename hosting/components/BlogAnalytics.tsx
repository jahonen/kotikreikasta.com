"use client";
import { useEffect } from "react";

export default function BlogAnalytics({ id, slug, title }: { id: string; slug: string; title: string }) {
  useEffect(() => {
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: 'blog_view', blog_id: id, blog_slug: slug, blog_title: title });
    } catch {}
  }, [id, slug, title]);
  return null;
}
