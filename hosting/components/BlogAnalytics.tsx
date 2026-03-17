"use client";
import { useEffect, useRef } from "react";

export default function BlogAnalytics({ id, slug, title }: { id: string; slug: string; title: string }) {
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthTrackedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Track page view
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ 
        event: 'blog_view', 
        blog_id: id, 
        blog_slug: slug, 
        blog_title: title,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    // Track scroll depth
    const handleScroll = () => {
      try {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

        // Track at 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
          if (scrollPercent >= milestone && !scrollDepthTrackedRef.current.has(milestone)) {
            scrollDepthTrackedRef.current.add(milestone);
            (window as any).dataLayer?.push({
              event: 'blog_scroll',
              blog_id: id,
              blog_slug: slug,
              scroll_depth: milestone,
            });
          }
        }
      } catch {}
    };

    // Track time on page
    const handleBeforeUnload = () => {
      try {
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000); // seconds
        (window as any).dataLayer?.push({
          event: 'blog_time_spent',
          blog_id: id,
          blog_slug: slug,
          time_spent_seconds: timeSpent,
        });
      } catch {}
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id, slug, title]);

  return null;
}
