import Link from "next/link";
import { getFirestore } from "../lib/firebase-admin-server";
import { getOptimalCrop } from "../lib/image-utils";

type BlogPost = {
  id: string;
  title: string;
  urlStub: string;
  excerpt: string;
  featuredImage: { url: string; alt?: string; crops?: any } | null;
  publishedAt: Date | null;
};

async function getLatestBlogs(count: number = 3): Promise<BlogPost[]> {
  try {
    const db = await getFirestore();
    const snapshot = await db
      .collection("blog_posts")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(count)
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
      };
    });
  } catch (error) {
    console.error("[LATEST_BLOGS_SERVER] Error fetching blogs:", error);
    return [];
  }
}

export default async function LatestBlogsServer({ count = 3 }: { count?: number }) {
  const blogs = await getLatestBlogs(count);

  if (blogs.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        Ei julkaistuja artikkeleita vielä.
      </p>
    );
  }

  return (
    <>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "var(--space-xl) 0 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-lg)",
        }}
      >
        {blogs.map((blog) => {
          const href = `/blog/${encodeURIComponent(blog.urlStub)}`;
          const dateStr = blog.publishedAt
            ? new Date(blog.publishedAt).toLocaleDateString("fi-FI")
            : "";

          return (
            <li key={blog.id}>
              <Link
                href={href}
                aria-label={`Lue artikkeli: ${blog.title}`}
                style={{ display: "block", height: "100%", textDecoration: "none" }}
              >
                <article
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    height: "100%",
                    transition: "all 0.2s ease",
                    boxShadow: "var(--shadow-sm)",
                    cursor: "pointer",
                  }}
                >
                  {blog.featuredImage && (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 9",
                        overflow: "hidden",
                        background: "var(--sand)",
                      }}
                    >
                      <img
                        src={getOptimalCrop(blog.featuredImage, 'card') || blog.featuredImage.url}
                        alt={blog.featuredImage.alt || ""}
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
                    <h3
                      style={{
                        margin: "0 0 var(--space-sm)",
                        fontFamily: "var(--font-display)",
                        fontSize: "1.375rem",
                        fontWeight: 400,
                        lineHeight: 1.3,
                        color: "var(--text)",
                      }}
                    >
                      {blog.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-body)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.6,
                        color: "var(--text-muted)",
                      }}
                    >
                      {blog.excerpt}
                      {blog.excerpt.length === 160 ? "…" : ""}
                    </p>
                  </div>
                </article>
              </Link>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: "var(--space-xl)", textAlign: "center" }}>
        <Link
          href="/blog"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "var(--gold)",
            color: "white",
            textDecoration: "none",
            borderRadius: 4,
            fontWeight: 500,
            transition: "all 0.2s ease",
          }}
        >
          Näytä kaikki artikkelit
        </Link>
      </div>
    </>
  );
}
