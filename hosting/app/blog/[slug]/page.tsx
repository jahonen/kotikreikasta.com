import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import BlogPostClient from "../BlogPostClient";
import BlogInternalLinks from "../../../components/BlogInternalLinks";
import BlogSocialShare from "../../../components/BlogSocialShare";
import "../blog-content.scss";
import ContactForm from "../../../components/ContactForm";
import { getFirestore } from "../../../lib/firebase-admin-server";

// ISR: Revalidate every 3600 seconds (1 hour) or on-demand via revalidatePath
export const revalidate = 3600;

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
  const metaDescription = seo.metaDescription || '';
  const keywords = seo.keywords || [];
  const ogTitle = seo.ogTitle || metaTitle;
  const ogDescription = seo.ogDescription || metaDescription;
  const imageUrl = post.featuredImage?.url || 'https://kotikreikasta.com/og-image.jpg';
  const imageAlt = post.featuredImage?.alt || metaTitle;
  const imageWidth = post.featuredImage?.width || 1200;
  const imageHeight = post.featuredImage?.height || 630;
  
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
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
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
      images: [imageUrl],
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
    keywords: post.seo?.keywords?.join(', ') || '',
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
              <li aria-current="page" style={{ color: 'inherit' }}>{slug.replace(/-/g, ' ')}</li>
            </ol>
          </nav>
          <BlogPostClient slug={slug} />

          <BlogSocialShare 
            url={url} 
            title={post?.title || human}
            description={post?.seo?.metaDescription || ''}
          />

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
