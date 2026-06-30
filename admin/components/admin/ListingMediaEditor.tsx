'use client';

import { useState, useRef } from 'react';
import ImageCropEditor from './ImageCropEditor';
import { getAuthClient } from '../../lib/firebase-client';

interface ImageCrops {
  '16:9'?: { full: string; og: string; thumbnail: string };
  '4:3'?: { full: string; og: string; thumbnail: string };
  '1:1'?: { full: string; og: string; thumbnail: string };
  '3:4'?: { full: string; og: string; thumbnail: string };
  '9:16'?: { full: string; og: string; thumbnail: string };
}

interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
  sortOrder: number;
  crops?: ImageCrops;
}

interface VideoItem {
  type: 'youtube' | 'vimeo' | 'upload';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder: number;
}

interface ListingMedia {
  featured?: { url: string; alt?: string; crops?: ImageCrops };
  gallery?: GalleryItem[];
  videos?: VideoItem[];
  streetViewUrl?: string;
}

interface Props {
  listingId: string;
  media: ListingMedia;
  onChange: (media: ListingMedia) => void;
  saving?: boolean;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function detectVideoType(url: string): 'youtube' | 'vimeo' | 'upload' {
  if (getYouTubeId(url)) return 'youtube';
  if (getVimeoId(url)) return 'vimeo';
  return 'upload';
}

function getVideoThumbnail(item: VideoItem): string | null {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  if (item.type === 'youtube') {
    const id = getYouTubeId(item.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

export default function ListingMediaEditor({ listingId, media, onChange, saving }: Props) {
  const [activeTab, setActiveTab] = useState<'featured' | 'gallery' | 'videos'>('gallery');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'featured' | number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoCaption, setNewVideoCaption] = useState('');
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const gallery = media.gallery ?? [];
  const videos = media.videos ?? [];

  async function uploadWithCrops(
    file: File,
    crops: Record<string, any>,
    pathPrefix: string
  ): Promise<{ original: string; crops: Record<string, any> }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('crops', JSON.stringify(crops));
    fd.append('path', pathPrefix);
    fd.append('docId', `${listingId}-${Date.now()}`);
    const auth = await getAuthClient();
    const token = await auth?.currentUser?.getIdToken();
    const res = await fetch('/api/upload-image-crops', {
      method: 'POST',
      headers: token ? { 'x-firebase-auth': token } : undefined,
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
    return res.json();
  }

  async function handleFeaturedCropSave(crops: Record<string, any>) {
    if (!cropFile) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadWithCrops(cropFile, crops, `listings/${listingId}/featured`);
      onChange({
        ...media,
        featured: { url: result.original, crops: result.crops },
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setCropFile(null);
      setCropTarget(null);
    }
  }

  async function handleGalleryCropSave(crops: Record<string, any>, idx: number) {
    if (!cropFile) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadWithCrops(cropFile, crops, `listings/${listingId}/gallery`);
      const newGallery = [...gallery];
      if (idx === -1) {
        newGallery.push({ url: result.original, crops: result.crops, sortOrder: newGallery.length });
      } else {
        newGallery[idx] = { ...newGallery[idx], url: result.original, crops: result.crops };
      }
      onChange({ ...media, gallery: newGallery });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setCropFile(null);
      setCropTarget(null);
    }
  }

  function onGalleryFilesSelected(files: FileList) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setCropFile(arr[0]);
    setCropTarget(-1);
  }

  function moveGalleryItem(idx: number, dir: -1 | 1) {
    const newGallery = [...gallery];
    const target = idx + dir;
    if (target < 0 || target >= newGallery.length) return;
    [newGallery[idx], newGallery[target]] = [newGallery[target], newGallery[idx]];
    onChange({ ...media, gallery: newGallery.map((g, i) => ({ ...g, sortOrder: i })) });
  }

  function removeGalleryItem(idx: number) {
    const newGallery = gallery.filter((_, i) => i !== idx).map((g, i) => ({ ...g, sortOrder: i }));
    onChange({ ...media, gallery: newGallery });
  }

  function updateGalleryCaption(idx: number, caption: string) {
    const newGallery = [...gallery];
    newGallery[idx] = { ...newGallery[idx], caption };
    onChange({ ...media, gallery: newGallery });
  }

  function addVideo() {
    if (!newVideoUrl.trim()) return;
    const type = detectVideoType(newVideoUrl.trim());
    const newVideo: VideoItem = {
      type,
      url: newVideoUrl.trim(),
      caption: newVideoCaption.trim() || undefined,
      sortOrder: videos.length,
    };
    onChange({ ...media, videos: [...videos, newVideo] });
    setNewVideoUrl('');
    setNewVideoCaption('');
  }

  function removeVideo(idx: number) {
    onChange({ ...media, videos: videos.filter((_, i) => i !== idx).map((v, i) => ({ ...v, sortOrder: i })) });
  }

  function moveVideo(idx: number, dir: -1 | 1) {
    const newVideos = [...videos];
    const target = idx + dir;
    if (target < 0 || target >= newVideos.length) return;
    [newVideos[idx], newVideos[target]] = [newVideos[target], newVideos[idx]];
    onChange({ ...media, videos: newVideos.map((v, i) => ({ ...v, sortOrder: i })) });
  }

  const tabStyle = (tab: string) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #0B3D6B' : '2px solid transparent',
    background: 'none',
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? '#0B3D6B' : '#555',
    cursor: 'pointer',
    fontSize: 14,
  });

  return (
    <div>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button style={tabStyle('featured')} onClick={() => setActiveTab('featured')}>Nostokuva</button>
        <button style={tabStyle('gallery')} onClick={() => setActiveTab('gallery')}>
          Galleria {gallery.length > 0 ? `(${gallery.length})` : ''}
        </button>
        <button style={tabStyle('videos')} onClick={() => setActiveTab('videos')}>
          Videot {videos.length > 0 ? `(${videos.length})` : ''}
        </button>
      </div>

      {activeTab === 'featured' && (
        <div>
          {media.featured?.url && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#f3f4f6' }}>
                <img
                  src={media.featured.crops?.['16:9']?.full || media.featured.url}
                  alt="Nostokuva"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={() => featuredInputRef.current?.click()}
                  disabled={uploading}
                >
                  Vaihda kuva
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onChange({ ...media, featured: undefined })}
                  disabled={uploading}
                  style={{ color: '#b91c1c' }}
                >
                  Poista
                </button>
              </div>
            </div>
          )}
          {!media.featured?.url && (
            <div
              style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
              onClick={() => featuredInputRef.current?.click()}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Lisää nostokuva</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>Klikkaa valitaksesi kuva (JPEG, PNG, WEBP)</div>
            </div>
          )}
          <input
            ref={featuredInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setCropFile(f); setCropTarget('featured'); }
              e.target.value = '';
            }}
          />
          {uploading && <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>Ladataan kuvia…</div>}
        </div>
      )}

      {activeTab === 'gallery' && (
        <div>
          <div
            style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '16px 24px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: 20 }}
            onClick={() => galleryInputRef.current?.click()}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>+ Lisää kuvia</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Valitse yksi tai useampi kuva</div>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) onGalleryFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />

          {uploading && <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Ladataan kuvaa…</div>}

          {gallery.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Galleria on tyhjä</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {gallery.map((item, idx) => (
                <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f3f4f6' }}>
                    <img
                      src={item.crops?.['4:3']?.thumbnail || item.crops?.['4:3']?.full || item.url}
                      alt={item.alt || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        title="Rajaa uudelleen"
                        onClick={() => {
                          fetch(item.url)
                            .then(r => r.blob())
                            .then(blob => {
                              const f = new File([blob], `gallery-${idx}.jpg`, { type: 'image/jpeg' });
                              setCropFile(f);
                              setCropTarget(idx);
                            });
                        }}
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 14 }}
                      >✂️</button>
                      <button
                        title="Poista"
                        onClick={() => removeGalleryItem(idx)}
                        style={{ background: 'rgba(185,28,28,0.8)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 14 }}
                      >🗑</button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 4 }}>
                      <button
                        title="Siirrä vasemmalle"
                        onClick={() => moveGalleryItem(idx, -1)}
                        disabled={idx === 0}
                        style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}
                      >←</button>
                      <button
                        title="Siirrä oikealle"
                        onClick={() => moveGalleryItem(idx, 1)}
                        disabled={idx === gallery.length - 1}
                        style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: idx === gallery.length - 1 ? 'default' : 'pointer', opacity: idx === gallery.length - 1 ? 0.4 : 1 }}
                      >→</button>
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <input
                      type="text"
                      placeholder="Kuvateksti (valinnainen)"
                      value={item.caption || ''}
                      onChange={(e) => updateGalleryCaption(idx, e.target.value)}
                      style={{ width: '100%', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'videos' && (
        <div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20, background: '#fafafa' }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Lisää video</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="url"
                placeholder="YouTube- tai Vimeo-linkki (esim. https://youtube.com/watch?v=...)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              />
              <input
                type="text"
                placeholder="Kuvateksti (valinnainen)"
                value={newVideoCaption}
                onChange={(e) => setNewVideoCaption(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              />
              <button
                className="btn-primary"
                onClick={addVideo}
                disabled={!newVideoUrl.trim()}
                style={{ alignSelf: 'flex-start' }}
              >
                Lisää video
              </button>
            </div>
          </div>

          {videos.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Ei videoita</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {videos.map((video, idx) => {
                const thumb = getVideoThumbnail(video);
                return (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
                    <div style={{ width: 120, height: 68, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, position: 'relative' }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>▶</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{video.type}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all', marginBottom: 4 }}>{video.caption || video.url.slice(0, 50) + (video.url.length > 50 ? '…' : '')}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', wordBreak: 'break-all' }}>{video.url}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => moveVideo(idx, -1)} disabled={idx === 0} style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1, background: '#fff' }}>↑</button>
                      <button onClick={() => moveVideo(idx, 1)} disabled={idx === videos.length - 1} style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', cursor: idx === videos.length - 1 ? 'default' : 'pointer', opacity: idx === videos.length - 1 ? 0.4 : 1, background: '#fff' }}>↓</button>
                      <button onClick={() => removeVideo(idx)} style={{ border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 8px', color: '#b91c1c', background: '#fff', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {cropFile && cropTarget === 'featured' && (
        <ImageCropEditor
          open={true}
          imageFile={cropFile}
          title="Rajaa nostokuva"
          onClose={() => { setCropFile(null); setCropTarget(null); }}
          onSave={handleFeaturedCropSave}
        />
      )}

      {cropFile && typeof cropTarget === 'number' && (
        <ImageCropEditor
          open={true}
          imageFile={cropFile}
          title="Rajaa galleraikuva"
          onClose={() => { setCropFile(null); setCropTarget(null); }}
          onSave={(crops) => handleGalleryCropSave(crops, cropTarget as number)}
        />
      )}
    </div>
  );
}
