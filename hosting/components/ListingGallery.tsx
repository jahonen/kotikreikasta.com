'use client';

import { useState, useEffect, useCallback } from 'react';

interface ImageCrops {
  '4:3'?: { full: string; og: string; thumbnail: string };
  '16:9'?: { full: string; og: string; thumbnail: string };
  '1:1'?: { full: string; og: string; thumbnail: string };
}

interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
  sortOrder?: number;
  crops?: ImageCrops;
}

interface VideoItem {
  type: 'youtube' | 'vimeo' | 'upload';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder?: number;
}

interface Props {
  gallery?: GalleryItem[];
  videos?: VideoItem[];
  title?: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function getVideoThumbnail(video: VideoItem): string | null {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.type === 'youtube') {
    const id = getYouTubeId(video.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

function getVideoEmbed(video: VideoItem): string | null {
  if (video.type === 'youtube') {
    const id = getYouTubeId(video.url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (video.type === 'vimeo') {
    const id = getVimeoId(video.url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  return video.url;
}

type MediaItem =
  | { kind: 'image'; src: string; thumb: string; alt: string; caption?: string }
  | { kind: 'video'; embedUrl: string | null; thumb: string | null; caption?: string };

const GRID_VISIBLE = 6;

export default function ListingGallery({ gallery = [], videos = [], title = '' }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sortedImages: GalleryItem[] = [...gallery].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const sortedVideos: VideoItem[] = [...videos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const items: MediaItem[] = [
    ...sortedImages.map((g): MediaItem => ({
      kind: 'image',
      src: g.crops?.['4:3']?.full || g.crops?.['16:9']?.full || g.url,
      thumb: g.crops?.['4:3']?.thumbnail || g.crops?.['4:3']?.full || g.url,
      alt: g.alt || title,
      caption: g.caption,
    })),
    ...sortedVideos.map((v): MediaItem => ({
      kind: 'video',
      embedUrl: getVideoEmbed(v),
      thumb: getVideoThumbnail(v),
      caption: v.caption,
    })),
  ];

  const visibleItems = showAll ? items : items.slice(0, GRID_VISIBLE);
  const hasMore = items.length > GRID_VISIBLE && !showAll;

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() => setLightboxIdx(i => (i !== null ? (i - 1 + items.length) % items.length : null)), [items.length]);
  const next = useCallback(() => setLightboxIdx(i => (i !== null ? (i + 1) % items.length : null)), [items.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, closeLightbox, prev, next]);

  if (items.length === 0) return null;

  const current = lightboxIdx !== null ? items[lightboxIdx] : null;

  return (
    <div className="listing-gallery">
      <h2 className="section-title">Kuvat ja videot</h2>

      <div className="gallery-grid">
        {visibleItems.map((item, idx) => (
          <button
            key={idx}
            className="gallery-thumb-btn"
            onClick={() => setLightboxIdx(idx)}
            aria-label={item.kind === 'video' ? 'Avaa video' : (item as any).alt || 'Avaa kuva'}
          >
            <div className="gallery-thumb">
              {item.kind === 'image' ? (
                <img src={item.thumb} alt={item.alt} loading="lazy" />
              ) : (
                <>
                  {item.thumb
                    ? <img src={item.thumb} alt={item.caption || 'Video'} loading="lazy" />
                    : <div className="gallery-thumb-placeholder">🎬</div>
                  }
                  <div className="gallery-play-overlay">
                    <div className="gallery-play-btn">▶</div>
                  </div>
                </>
              )}
              {idx === GRID_VISIBLE - 1 && hasMore && (
                <div className="gallery-more-overlay" onClick={(e) => { e.stopPropagation(); setShowAll(true); }}>
                  +{items.length - GRID_VISIBLE} lisää
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button className="gallery-show-all" onClick={() => setShowAll(true)}>
          Näytä kaikki {items.length} kuvaa
        </button>
      )}

      {lightboxIdx !== null && current && (
        <div className="lightbox-backdrop" onClick={closeLightbox}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Sulje">✕</button>

            {items.length > 1 && (
              <>
                <button className="lightbox-prev" onClick={prev} aria-label="Edellinen">‹</button>
                <button className="lightbox-next" onClick={next} aria-label="Seuraava">›</button>
              </>
            )}

            <div className="lightbox-media">
              {current.kind === 'image' ? (
                <img src={current.src} alt={current.alt} />
              ) : current.embedUrl ? (
                <iframe
                  src={current.embedUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={current.caption || 'Video'}
                />
              ) : (
                <div className="lightbox-no-embed">Videota ei voi toistaa</div>
              )}
            </div>

            {(current.caption || items.length > 1) && (
              <div className="lightbox-footer">
                {current.caption && <span className="lightbox-caption">{current.caption}</span>}
                <span className="lightbox-counter">{lightboxIdx + 1} / {items.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
