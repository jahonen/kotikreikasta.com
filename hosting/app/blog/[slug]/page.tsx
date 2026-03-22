import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import BlogInternalLinks from "../../../components/BlogInternalLinks";
import BlogSocialShare from "../../../components/BlogSocialShare";
import BlogAnalytics from "../../../components/BlogAnalytics";
import "../blog-content.scss";
import ContactForm from "../../../components/ContactForm";
import { getFirestore } from '../../../lib/firebase-admin-server';
import { mdToHtml, extractDescription } from '../../../lib/blog-utils';
import { getOptimalCrop } from '../../../lib/image-utils';

// ISR: Revalidate every 3600 seconds (1 hour) or on-demand via revalidatePath
export const revalidate = 3600;

// Dynamic params: pages generated on-demand with ISR caching
// Build-time generation disabled because Cloud Build doesn't have Firestore access
// Pages will be generated on first request and cached with revalidate: 3600
export const dynamicParams = true;

async function getBlogPost(slug: string) {
  try {
    const db = await getFirestore();
    const snapshot = await db.collection('blog_posts')
      .where('urlStub', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      contentMd: data.contentMd || '',
      urlStub: data.urlStub || doc.id,
      seo: data.seo || {},
      featuredImage: data.featuredImage || null,
      publishedAt: data.publishedAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || null,
    };
  } catch (error) {
    console.error('[BLOG_PAGE] Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || '').trim();
  const post = await getBlogPost(slug);
  const url = `https://kotikreikasta.com/blog/${encodeURIComponent(slug)}`;
  
  if (!post) {
    const human = slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    return { 
      title: `${human} — Kotikreikasta`,
      alternates: { canonical: url }
    };
  }

  const seo = post.seo || {};
  const metaTitle = seo.metaTitle || post.title || 'Kotikreikasta';
  
  // Extract description from body text, not markdown title
  const metaDescription = seo.metaDescription || extractDescription(post.contentMd || '', 155);
  
  const keywords = seo.keywords || [];
  const ogTitle = seo.ogTitle || metaTitle;
  const ogDescription = seo.ogDescription || metaDescription;
  
  // Use optimal crop for OG and Twitter images (16:9 for landscape)
  const ogImageUrl = getOptimalCrop(post.featuredImage, 'og') || 'https://kotikreikasta.com/og-image.jpg';
  const twitterImageUrl = getOptimalCrop(post.featuredImage, 'twitter') || 'https://kotikreikasta.com/og-image.jpg';
  const imageAlt = post.featuredImage?.alt || metaTitle;
  
  return {
    title: metaTitle,
    description: metaDescription,
    keywords: keywords.join(', '),
    authors: [{ name: 'Kotikreikasta' }],
    publisher: 'Kotikreikasta',
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: 'Kotikreikasta',
      images: [
        {
          url: ogImageUrl,
          width: 2868,
          height: 1613,
          alt: imageAlt,
        },
      ],
      locale: 'fi_FI',
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: ['Kotikreikasta'],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [twitterImageUrl],
      creator: '@kotikreikasta',
      site: '@kotikreikasta',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || '').trim();
  const post = await getBlogPost(slug);
  const human = slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const url = `https://kotikreikasta.com/blog/${encodeURIComponent(slug)}`;
  
  // Generate JSON-LD structured data for SEO
  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seo?.metaDescription || '',
    image: {
      '@type': 'ImageObject',
      url: post.featuredImage?.url || 'https://kotikreikasta.com/og-image.jpg',
      width: post.featuredImage?.width || 1200,
      height: post.featuredImage?.height || 630,
      caption: post.featuredImage?.alt || post.title,
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Kotikreikasta',
      url: 'https://kotikreikasta.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kotikreikasta.com/logo.png',
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kotikreikasta',
      url: 'https://kotikreikasta.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kotikreikasta.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: (post.seo?.keywords && post.seo.keywords.length > 0) ? post.seo.keywords.join(', ') : 'Kreikka, kiinteistöt, asunnot, ostoprosessi',
    inLanguage: 'fi-FI',
    isPartOf: {
      '@type': 'Blog',
      '@id': 'https://kotikreikasta.com/blog',
      name: 'Kotikreikasta Blogi',
    },
    about: {
      '@type': 'Thing',
      name: 'Kreikan kiinteistöt',
      description: 'Asiantuntija-artikkelit Kreikan kiinteistömarkkinoista',
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NavBar />
      <main style={{ marginTop: '72px', padding: '0 1.25rem' }}>
        <div style={{ padding: '3rem 0', maxWidth: 840, margin: '0 auto' }}>
          <nav aria-label="breadcrumb" style={{ fontSize: 14, marginBottom: 12 }}>
            <ol style={{ listStyle: 'none', display: 'flex', gap: 8, padding: 0, margin: 0, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <li><Link href="/">Etusivu</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/blog">Blogi</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" style={{ color: 'inherit' }}>{post?.title || human}</li>
            </ol>
          </nav>
          
          {!post ? (
            <div>
              <h1>Artikkelia ei löytynyt</h1>
              <p>Valitettavasti etsimääsi artikkelia ei löytynyt.</p>
              <p><Link href="/blog">Palaa blogiin</Link></p>
            </div>
          ) : (
            <>
              <article>
                {post.featuredImage?.url && (
                  <div style={{ 
                    width: 'calc(100% + 2.5rem)',
                    marginLeft: '-1.25rem',
                    marginRight: '-1.25rem',
                    aspectRatio: '16 / 9', 
                    overflow: 'hidden', 
                    background: 'var(--sand)', 
                    marginBottom: 'var(--space-xl)' 
                  }}>
                    <img 
                      src={post.featuredImage.url} 
                      alt={post.featuredImage.alt || ''} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                )}
                <header style={{ marginBottom: 'var(--space-xl)' }}>
                  <p style={{ 
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: 'var(--space-md)'
                  }}>
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fi-FI') : ''}
                  </p>
                  <h1 style={{ 
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                    fontWeight: 400,
                    lineHeight: 1.2,
                    color: 'var(--text)',
                    margin: 0
                  }}>
                    {post.title}
                  </h1>
                </header>
                <section 
                  className="prose" 
                  dangerouslySetInnerHTML={{ 
                    __html: mdToHtml(post.contentMd.replace(/^#\s+.*(?:\r?\n|$)/, '')) 
                  }} 
                />
              </article>
              
              <BlogAnalytics 
                id={post.id} 
                slug={post.urlStub || post.id} 
                title={post.title} 
              />

              <BlogSocialShare 
                url={url} 
                title={post.title}
                description={extractDescription(post.contentMd, 155)}
              />
            </>
          )}

          <BlogInternalLinks />

          <section style={{ marginTop: 48 }}>
            <h2 style={{ marginBottom: 12 }}>Ota yhteyttä</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
              Jäikö kysyttävää? Jätä yhteystietosi ja viestisi – palaamme sinulle pian.
            </p>
            <ContactForm source={{ type: 'content', slug, title: human, url }} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
