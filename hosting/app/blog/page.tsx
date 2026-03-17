import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import { getFirestore } from "../../lib/firebase-admin-server";

export const metadata: Metadata = {
  title: "Blogi — Asiantuntija-artikkelit Kreikan kiinteistöistä | Kotikreikasta",
  description: "Lue asiantuntija-artikkelit Kreikan kiinteistömarkkinoista, ostoprosessista, verotuksesta ja asumisesta. Kattava opas suomalaisille Kreikan kiinteistöjen ostajille.",
  keywords: "Kreikka kiinteistöt blogi, Kreikka asuntomarkkinat, Kreikka ostoprosessi, Kreikka verotus, Kreikka asuminen",
  alternates: {
    canonical: "https://kotikreikasta.com/blog",
  },
  openGraph: {
    title: "Blogi — Asiantuntija-artikkelit Kreikan kiinteistöistä",
    description: "Lue asiantuntija-artikkelit Kreikan kiinteistömarkkinoista, ostoprosessista, verotuksesta ja asumisesta.",
    url: "https://kotikreikasta.com/blog",
    siteName: "Kotikreikasta",
    locale: "fi_FI",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

type BlogPost = {
  id: string;
  title: string;
  urlStub: string;
  excerpt: string;
  featuredImage: { url: string; alt?: string } | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
};

async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const db = await getFirestore();
    const snapshot = await db
      .collection("blog_posts")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const title = String(data.title || "");
      
      // Extract excerpt from content, removing title duplication
      let contentMd = String(data.contentMd || "");
      contentMd = contentMd.replace(/^#\s+.*$/m, "").trim();
      if (contentMd.toLowerCase().startsWith(title.toLowerCase())) {
        contentMd = contentMd.slice(title.length).trim();
      }
      
      const excerpt = contentMd
        .replace(/[#>*_`\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);

      return {
        id: doc.id,
        title,
        urlStub: data.urlStub || doc.id,
        excerpt,
        featuredImage: data.featuredImage || null,
        publishedAt: data.publishedAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      };
    });
  } catch (error) {
    console.error("[BLOG_LIST] Error fetching blog posts:", error);
    return [];
  }
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);
  const searchQuery = params.q?.toLowerCase().trim() || "";
  const postsPerPage = 12;

  const allPosts = await getAllBlogPosts();
  
  // Filter by search query if provided
  const filteredPosts = searchQuery
    ? allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery) ||
          post.excerpt.toLowerCase().includes(searchQuery)
      )
    : allPosts;

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Kotikreikasta Blogi",
    description: "Asiantuntija-artikkelit Kreikan kiinteistöistä",
    url: "https://kotikreikasta.com/blog",
    publisher: {
      "@type": "Organization",
      name: "Kotikreikasta",
      url: "https://kotikreikasta.com",
      logo: {
        "@type": "ImageObject",
        url: "https://kotikreikasta.com/logo.png",
      },
    },
    blogPost: paginatedPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `https://kotikreikasta.com/blog/${post.urlStub}`,
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt?.toISOString(),
      image: post.featuredImage?.url || "https://kotikreikasta.com/og-image.jpg",
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main style={{ marginTop: "72px", padding: "0 1.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 0" }}>
          {/* Breadcrumb Navigation */}
          <nav aria-label="breadcrumb" style={{ fontSize: 14, marginBottom: 24 }}>
            <ol
              style={{
                listStyle: "none",
                display: "flex",
                gap: 8,
                padding: 0,
                margin: 0,
                color: "var(--text-muted)",
                flexWrap: "wrap",
              }}
            >
              <li>
                <Link href="/">Etusivu</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" style={{ color: "inherit" }}>
                Blogi
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 48 }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 400,
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              Asiantuntija-<em>artikkelit</em>
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                color: "var(--text-muted)",
                maxWidth: 640,
                lineHeight: 1.6,
              }}
            >
              Lue asiantuntija-artikkelit Kreikan kiinteistömarkkinoista,
              ostoprosessista, verotuksesta ja asumisesta.
            </p>
          </header>

          {/* Search Form */}
          <form
            method="GET"
            action="/blog"
            style={{
              marginBottom: 48,
              maxWidth: 480,
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Hae artikkeleita..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontFamily: "var(--font-body)",
                }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "8px 16px",
                  background: "var(--gold)",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Hae
              </button>
            </div>
          </form>

          {/* Results Count */}
          {searchQuery && (
            <p style={{ marginBottom: 24, color: "var(--text-muted)" }}>
              Löytyi {filteredPosts.length} artikkelia hakusanalla "{searchQuery}"
            </p>
          )}

          {/* Blog Posts Grid */}
          {paginatedPosts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem 0" }}>
              {searchQuery
                ? "Ei hakutuloksia. Kokeile eri hakusanoja."
                : "Ei julkaistuja artikkeleita vielä."}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 48px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-lg)",
              }}
            >
              {paginatedPosts.map((post) => {
                const href = `/blog/${encodeURIComponent(post.urlStub)}`;
                const dateStr = post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("fi-FI")
                  : "";

                return (
                  <li key={post.id}>
                    <Link
                      href={href}
                      aria-label={`Lue artikkeli: ${post.title}`}
                      style={{ display: "block", height: "100%", textDecoration: "none" }}
                    >
                      <article
                        style={{
                          background: "var(--white)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          overflow: "hidden",
                          height: "100%",
                          transition: "all 0.2s ease",
                          boxShadow: "var(--shadow-sm)",
                          cursor: "pointer",
                        }}
                      >
                        {post.featuredImage && (
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "16 / 9",
                              overflow: "hidden",
                              background: "var(--sand)",
                            }}
                          >
                            <img
                              src={post.featuredImage.url}
                              alt={post.featuredImage.alt || ""}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transition: "transform 0.3s ease",
                              }}
                            />
                          </div>
                        )}
                        <div style={{ padding: "var(--space-lg)" }}>
                          {dateStr && (
                            <div
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                color: "var(--gold)",
                                marginBottom: "var(--space-sm)",
                              }}
                            >
                              {dateStr}
                            </div>
                          )}
                          <h2
                            style={{
                              margin: "0 0 var(--space-sm)",
                              fontFamily: "var(--font-display)",
                              fontSize: "1.375rem",
                              fontWeight: 400,
                              lineHeight: 1.3,
                              color: "var(--text)",
                            }}
                          >
                            {post.title}
                          </h2>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "var(--font-body)",
                              fontSize: "0.9375rem",
                              lineHeight: 1.6,
                              color: "var(--text-muted)",
                            }}
                          >
                            {post.excerpt}
                            {post.excerpt.length === 160 ? "…" : ""}
                          </p>
                        </div>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Sivutus"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {currentPage > 1 && (
                <Link
                  href={`/blog?page=${currentPage - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    textDecoration: "none",
                    color: "var(--text)",
                  }}
                >
                  ← Edellinen
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/blog?page=${page}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    textDecoration: "none",
                    color: page === currentPage ? "white" : "var(--text)",
                    background: page === currentPage ? "var(--gold)" : "transparent",
                    fontWeight: page === currentPage ? 600 : 400,
                  }}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </Link>
              ))}
              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    textDecoration: "none",
                    color: "var(--text)",
                  }}
                >
                  Seuraava →
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
