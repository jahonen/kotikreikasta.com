'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore';
import { getDbClient, getAuthClient, getStorageClient } from '../../lib/firebase-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingButton from '../ui/LoadingButton';
import ImageCropEditor from './ImageCropEditor';
import { uploadImageWithCrops } from '../../lib/crop-utils';

export default function BlogEditor({ initialId }: { initialId?: string }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [categories, setCategories] = useState(''); // comma-separated
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageCrops, setImageCrops] = useState<Record<string, string>>({});
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywordsCsv, setKeywordsCsv] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!initialId) return;
      try {
        const db = await getDbClient();
        if (!db) return;
        const snap = await getDoc(doc(collection(db, 'blog_posts'), initialId));
        if (!snap.exists()) return;
        if (!active) return;
        const data: any = snap.data() || {};
        setDocId(initialId);
        setTitle(String(data.title || ''));
        setContentMd(String(data.contentMd || ''));
        setCategories(Array.isArray(data.categories) ? data.categories.map((c: any) => String(c)).join(', ') : '');
        setImageUrl(data.featuredImage?.url || '');
        setImageAlt(data.featuredImage?.alt || '');
        setImageCrops(data.featuredImage?.crops || {});
        setMetaTitle(String(data.seo?.metaTitle || ''));
        setMetaDescription(String(data.seo?.metaDescription || ''));
        setKeywordsCsv(Array.isArray(data.seo?.keywords) ? data.seo.keywords.map((k: any)=> String(k)).join(', ') : '');
        setOgTitle(String(data.seo?.ogTitle || ''));
        setOgDescription(String(data.seo?.ogDescription || ''));
        setMessage('Luotiin editori olemassa olevalle luonnokselle.');
      } catch {}
    })();
    return () => { active = false; };
  }, [initialId]);

  const generateDraft = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!description.trim()) {
      setMessage('Anna artikkelin kuvaus.');
      return;
    }
    try {
      setGenerating(true);
      const auth = await getAuthClient();
      if (!auth?.currentUser) {
        throw new Error('Ei kirjauduttu sisään');
      }
      const token = await auth.currentUser.getIdToken(true);
      console.log('[DRAFT] Starting draft generation', { descriptionLength: description.length, hasToken: !!token });
      
      const res = await fetch('/api/blogs/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-firebase-auth': token } : {}),
        },
        body: JSON.stringify({ description }),
        credentials: 'include',
      });
      
      console.log('[DRAFT] Response received', { status: res.status, ok: res.ok });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('[DRAFT] Error response', { status: res.status, text });
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
        }
        throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('[DRAFT] Draft created successfully', { id: data.id });
      
      setDocId(data.id);
      setTitle(data.title || '');
      setContentMd(data.contentMd || '');
      setMessage('Luonnos luotu. Voit muokata sisältöä ja lisätä nostokuvan.');
    } catch (e: any) {
      console.error('[DRAFT] Draft generation failed', { error: e?.message, stack: e?.stack });
      setMessage(`Luonnoksen luonti epäonnistui: ${e?.message || 'verkkovirhe'}`);
    } finally {
      setGenerating(false);
    }
  };

  const onSelectImage = (file: File) => {
    if (!docId) {
      setMessage('Luo ensin luonnos.');
      return;
    }
    setSelectedImageFile(file);
    setShowCropEditor(true);
  };

  const onSaveCrops = async (crops: Record<string, any>) => {
    if (!selectedImageFile || !docId) return;
    
    setImageUploading(true);
    try {
      console.log('[BLOG_EDITOR] Uploading image with crops', {
        fileName: selectedImageFile.name,
        fileSize: selectedImageFile.size,
      });

      const result = await uploadImageWithCrops(
        selectedImageFile,
        crops,
        'blog-images',
        docId
      );

      console.log('[BLOG_EDITOR] Image uploaded with crops', {
        original: result.original,
        crops: result.crops,
      });

      setImageUrl(result.original);
      setImageCrops(result.crops);
      setMessage('Nostokuva ladattu ja rajattu. Muista tallentaa luonnos.');
    } catch (e: any) {
      console.error('[BLOG_EDITOR] Image upload failed', e);
      setMessage(`Kuvan lataus epäonnistui: ${e?.message || 'virhe'}`);
    } finally {
      setImageUploading(false);
      setShowCropEditor(false);
      setSelectedImageFile(null);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const db = await getDbClient();
      if (!db || !docId) throw new Error('db_unavailable');
      const cats = categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const refDoc = doc(collection(db, 'blog_posts'), docId);
      const kw = keywordsCsv
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      // Only update fields that are being edited, preserve urlStub and other system fields
      const patch: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (title.trim()) {
        patch.title = title.trim();
      }
      if (contentMd.trim()) {
        patch.contentMd = contentMd.trim();
      }
      if (cats.length) {
        patch.categories = cats;
      }
      if (imageUrl) {
        patch['featuredImage'] = { 
          url: imageUrl, 
          ...(imageAlt ? { alt: imageAlt } : {}),
          ...(Object.keys(imageCrops).length > 0 ? { crops: imageCrops } : {})
        };
      }
      patch['seo.metaTitle'] = metaTitle.trim() ? metaTitle.trim() : deleteField();
      patch['seo.metaDescription'] = metaDescription.trim() ? metaDescription.trim() : deleteField();
      patch['seo.keywords'] = kw.length ? kw : deleteField();
      patch['seo.ogTitle'] = ogTitle.trim() ? ogTitle.trim() : deleteField();
      patch['seo.ogDescription'] = ogDescription.trim() ? ogDescription.trim() : deleteField();

      if (imageUrl && !imageAlt.trim()) {
        patch['featuredImage.alt'] = deleteField();
      }

      await updateDoc(refDoc, patch);
      setMessage('Luonnos tallennettu.');
    } catch (e: any) {
      setMessage(`Tallennus epäonnistui: ${e?.message || 'virhe'}`);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!docId) {
      setMessage('Luo ensin luonnos.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const auth = await getAuthClient();
      if (!auth?.currentUser) {
        throw new Error('Ei kirjauduttu sisään');
      }
      const token = await auth.currentUser.getIdToken(true);
      console.log('[PUBLISH] Starting publish', { docId, titleLength: title.length, hasImage: !!imageUrl });
      
      const res = await fetch('/api/blogs/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-firebase-auth': token } : {}),
        },
        body: JSON.stringify({ id: docId, title, contentMd, imageUrl }),
        credentials: 'include',
      });
      
      console.log('[PUBLISH] Response received', { status: res.status, ok: res.ok });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('[PUBLISH] Error response', { status: res.status, text });
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
        }
        throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('[PUBLISH] Published successfully', { id: data.id });
      
      setMessage('Artikkeli julkaistu! Sosiaalisen median julkaisu tapahtuu automaattisesti.');
      
      // Redirect to blogs list after 1 second
      setTimeout(() => {
        router.push('/blogs');
      }, 1000);
    } catch (e: any) {
      console.error('[PUBLISH] Publish failed', { error: e?.message, stack: e?.stack });
      setMessage(`Julkaisu epäonnistui: ${e?.message || 'verkkovirhe'}`);
    } finally {
      setSaving(false);
    }
  };

  const saveAndExit = async () => {
    await saveDraft();
    setTimeout(() => {
      router.push('/blogs');
    }, 500);
  };

  const showCreate = !docId;

  return (
    <section id="blog" style={{ marginTop: '2rem' }}>
      {showCreate && (
        <>
          <h3 className="section-title" style={{ fontSize: '1.2rem' }}>Uusi blogikirjoitus</h3>
          <form onSubmit={generateDraft} className="form-column" style={{ display: 'grid', gap: '0.75rem', maxWidth: 820 }} aria-labelledby="new-post-heading">
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="description" style={{ fontWeight: 600 }}>Kuvaus</label>
              <textarea id="description" className="input" placeholder="Mitä artikkelissa käsitellään" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <LoadingButton type="submit" className="btn-primary" loading={generating} aria-label="Luo luonnos AI:lla">
                Luo luonnos AI:lla
              </LoadingButton>
            </div>
          </form>
        </>
      )}

      {docId && (
        <form className="form-column" style={{ display: 'grid', gap: '1rem', maxWidth: 980, marginTop: showCreate ? '1rem' : 0 }} aria-labelledby="edit-post-heading">
          <h3 id="edit-post-heading" className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>Muokkaa blogikirjoitusta</h3>

          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="title" style={{ fontWeight: 600 }}>Otsikko</label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="contentMd" style={{ fontWeight: 600 }}>Markdown-sisältö</label>
            <textarea id="contentMd" className="input" rows={14} value={contentMd} onChange={(e) => setContentMd(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="categories" style={{ fontWeight: 600 }}>Kategoriat</label>
            <div id="categories-help" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Erota pilkulla, esim. asunnot, kreikka</div>
            <input id="categories" aria-describedby="categories-help" className="input" value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>

          <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <legend style={{ padding: '0 6px', fontWeight: 700 }}>Nostokuva</legend>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="featuredImage" style={{ fontWeight: 600 }}>Valitse kuva</label>
                <input id="featuredImage" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelectImage(f); }} />
                {imageUploading && <div role="status" aria-live="polite">Ladataan kuvaa…</div>}
              </div>
              {imageUrl && (
                <div>
                  <img src={imageUrl} alt="nostokuva" style={{ maxWidth: '100%', borderRadius: 8 }} />
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <label htmlFor="imageAlt" style={{ fontWeight: 600 }}>Kuvan alt-teksti</label>
                    <input id="imageAlt" className="input" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <legend style={{ padding: '0 6px', fontWeight: 700 }}>Hakukoneoptimoinnin metatiedot</legend>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="metaTitle" style={{ fontWeight: 600 }}>Meta title</label>
                <input id="metaTitle" className="input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="metaDescription" style={{ fontWeight: 600 }}>Meta description</label>
                <textarea id="metaDescription" className="input" rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="keywords" style={{ fontWeight: 600 }}>Avainsanat</label>
                <div id="keywords-help" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Erota pilkulla, esim. "asuminen, matkailu"</div>
                <input id="keywords" aria-describedby="keywords-help" className="input" value={keywordsCsv} onChange={(e) => setKeywordsCsv(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="ogTitle" style={{ fontWeight: 600 }}>OG title</label>
                <input id="ogTitle" className="input" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="ogDescription" style={{ fontWeight: 600 }}>OG description</label>
                <textarea id="ogDescription" className="input" rows={3} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <LoadingButton type="button" className="btn-primary" onClick={saveDraft} loading={saving} aria-label="Tallenna luonnos">Tallenna luonnos</LoadingButton>
            <LoadingButton type="button" className="btn-secondary" onClick={saveAndExit} loading={saving} aria-label="Jatka myöhemmin">Jatka myöhemmin</LoadingButton>
            <LoadingButton type="button" className="btn-primary" onClick={publish} loading={saving} aria-label="Julkaise">Julkaise</LoadingButton>
          </div>
        </form>
      )}

      {message && <div role="status" aria-live="polite" style={{ marginTop: '0.75rem' }}>{message}</div>}
      
      {selectedImageFile && (
        <ImageCropEditor
          open={showCropEditor}
          onClose={() => {
            setShowCropEditor(false);
            setSelectedImageFile(null);
          }}
          onSave={onSaveCrops}
          imageFile={selectedImageFile}
          title="Rajaa blogin nostokuva"
        />
      )}
    </section>
  );
}
