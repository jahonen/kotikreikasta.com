# SSG Migration Plan: Blog Posts to Static Site Generation

## Executive Summary

**Objective:** Migrate blog posts from SSR (Server-Side Rendering) with runtime Firestore queries to SSG (Static Site Generation) with ISR (Incremental Static Regeneration).

**Why:** 
- Fix persistent Firestore connection issues in Cloud Run
- Improve SEO with faster page loads and better Core Web Vitals
- Eliminate runtime failures and improve reliability
- Reduce deployment complexity

**Impact:** Medium - affects blog rendering but not data management

---

## Blast Radius Analysis

### Files That Will Change

#### 1. **Server Components (HIGH IMPACT)**
- `hosting/app/blog/[slug]/page.tsx` - Already has ISR config, needs full SSG implementation
- `hosting/app/blog/page.tsx` - Blog listing page, needs SSG
- `hosting/components/LatestBlogsServer.tsx` - Server component for latest blogs
- `hosting/app/sitemap.ts` - Already uses server-side Firestore, will continue to work

#### 2. **Client Components (NO CHANGE)**
- `hosting/components/LatestBlogsClient.tsx` - Uses client-side Firebase SDK, no changes needed
- `hosting/components/admin/BlogEditor.tsx` - Admin interface, no changes needed

#### 3. **Library Files (MINOR CHANGES)**
- `hosting/lib/firebase-admin-server.ts` - Will still be used at BUILD TIME, no runtime usage
- `hosting/lib/firebase-client.ts` - No changes needed

#### 4. **Configuration (NO CHANGES)**
- `hosting/next.config.js` - Already has optimizations, no changes needed
- `firebase.json` - No changes needed

### Files That Will NOT Change

- All admin UI components
- Client-side blog components
- Firebase client SDK usage
- API routes
- Other pages (home, listings, etc.)

---

## Detailed Implementation Plan

### Phase 1: Preparation & Branch Setup

**Tasks:**
1. ✅ Create feature branch `feat/ssg-hosting`
2. ✅ Document current architecture
3. ✅ Identify all affected files
4. ✅ Create rollback plan

**Rollback Plan:**
- Keep current `main` branch as backup
- Can revert by merging `main` back if issues arise
- No database changes, so rollback is safe

---

### Phase 2: Implement SSG for Individual Blog Posts

**File:** `hosting/app/blog/[slug]/page.tsx`

**Current State:**
- Has `export const revalidate = 3600` (ISR enabled)
- Has `generateStaticParams()` function
- Uses runtime `getFirestore()` in `getBlogPost()`

**Changes Needed:**

```typescript
// BEFORE (Runtime SSR):
async function getBlogPost(slug: string) {
  const db = await getFirestore(); // Runtime Firestore query
  const snapshot = await db.collection('blog_posts')...
}

// AFTER (Build-time SSG):
async function getBlogPost(slug: string) {
  const db = await getFirestore(); // BUILD TIME ONLY
  const snapshot = await db.collection('blog_posts')...
}
```

**Key Point:** The code stays the same, but Next.js will execute it at BUILD TIME instead of runtime because:
1. `generateStaticParams()` tells Next.js to pre-render all blog posts
2. `revalidate: 3600` enables ISR for updates
3. No dynamic segments without `generateStaticParams()` = static generation

**Testing:**
- Build locally: `npm run build`
- Check `.next/server/app/blog/[slug]` for static HTML files
- Verify no runtime Firestore calls in production

---

### Phase 3: Implement SSG for Blog Listing Page

**File:** `hosting/app/blog/page.tsx`

**Current State:**
- Server component with runtime Firestore query
- Pagination and search functionality

**Changes Needed:**

```typescript
// Add at top of file
export const revalidate = 3600; // ISR: rebuild every hour

// Rest of code stays the same
async function getAllBlogPosts(): Promise<BlogPost[]> {
  const db = await getFirestore(); // BUILD TIME ONLY
  // ... existing code
}
```

**Note:** Search and pagination will still work because:
- Static HTML is generated with all posts
- Client-side filtering happens in browser
- No server queries needed

---

### Phase 4: Update LatestBlogsServer Component

**File:** `hosting/components/LatestBlogsServer.tsx`

**Current State:**
- Server component with runtime Firestore query

**Changes Needed:**

```typescript
// Add at component level (if used in pages with ISR)
// OR convert to client component if needed

// Option 1: Keep as server component (recommended)
// - Will execute at build time when used in static pages
// - No code changes needed

// Option 2: Convert to client component
// - Use LatestBlogsClient.tsx instead
// - More reliable but slower initial render
```

**Decision:** Keep as server component, will work with ISG automatically

---

### Phase 5: Verify Sitemap Generation

**File:** `hosting/app/sitemap.ts`

**Current State:**
- Uses `getFirestore()` to fetch blog posts
- Runs at BUILD TIME already (Next.js sitemaps are static)

**Changes Needed:**
- ✅ No changes needed
- Already works correctly at build time

---

### Phase 6: Testing & Validation

**Local Testing:**
```bash
# 1. Build the app
cd hosting
npm run build

# 2. Check for static files
ls -la .next/server/app/blog/

# 3. Start production server
npm start

# 4. Test blog pages
curl http://localhost:3000/blog/siesta-kreikassa-mita-suomalaisen-loma-asukkaan-tulee-tietaa
```

**Production Testing:**
```bash
# 1. Deploy to Firebase
firebase deploy --only hosting:kotikreikasta

# 2. Verify no runtime Firestore errors in logs
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"BLOG"' --limit 50

# 3. Check page load speed
curl -w "@curl-format.txt" https://kotikreikasta.com/blog/[slug]

# 4. Verify SEO
curl https://kotikreikasta.com/blog/[slug] | grep -o "<title>.*</title>"
```

---

### Phase 7: Deployment Strategy

**Steps:**
1. Merge `feat/ssg-hosting` to `main`
2. Deploy using `./deploy-hosting.sh`
3. Monitor logs for 30 minutes
4. Verify blog pages load correctly
5. Check Google Search Console for crawl errors

**Monitoring:**
- Cloud Run logs: No "BLOG_PAGE Error" messages
- Page load times: < 1 second
- SEO: All meta tags present in HTML source

**Success Criteria:**
- ✅ No runtime Firestore queries
- ✅ Blog pages load in < 1 second
- ✅ All blog posts accessible
- ✅ SEO meta tags present
- ✅ No errors in logs

---

## Benefits Summary

### Before (SSR):
- ❌ Runtime Firestore queries fail in Cloud Run
- ❌ gRPC connection issues
- ❌ Slow page loads (query + render time)
- ❌ Unreliable (connection failures)

### After (SSG):
- ✅ No runtime Firestore queries
- ✅ Static HTML served from CDN
- ✅ Fast page loads (< 1 second)
- ✅ 100% reliable (no connection issues)
- ✅ Better SEO (faster Core Web Vitals)
- ✅ Lower Cloud Run costs (fewer requests)

---

## Risks & Mitigation

### Risk 1: Blog posts not updating immediately
**Mitigation:** ISR with `revalidate: 3600` rebuilds pages every hour

### Risk 2: Build time increases
**Mitigation:** Only blog posts are pre-rendered, not entire site

### Risk 3: Build fails if Firestore is down
**Mitigation:** Build-time Firestore access is more reliable than runtime

### Risk 4: Search/pagination breaks
**Mitigation:** Client-side filtering still works with static data

---

## Timeline

- **Phase 1:** 5 minutes (branch setup, documentation)
- **Phase 2:** 10 minutes (implement SSG for blog posts)
- **Phase 3:** 5 minutes (implement SSG for listing)
- **Phase 4:** 5 minutes (update server component)
- **Phase 5:** 2 minutes (verify sitemap)
- **Phase 6:** 15 minutes (testing)
- **Phase 7:** 10 minutes (deployment)

**Total:** ~50 minutes

---

## Rollback Procedure

If issues arise:

```bash
# 1. Revert to main branch
git checkout main
git pull origin main

# 2. Redeploy
./deploy-hosting.sh

# 3. Verify rollback
curl https://kotikreikasta.com/blog/[slug]
```

**Time to rollback:** ~5 minutes

---

## Post-Migration Tasks

1. Monitor Cloud Run logs for 24 hours
2. Check Google Search Console for crawl errors
3. Verify Core Web Vitals in Google PageSpeed Insights
4. Update documentation
5. Remove unused SSR code (if any)

---

## Notes

- Firebase Admin SDK will still be used at BUILD TIME
- No changes to admin UI or blog editing workflow
- Client-side components (LatestBlogsClient) unchanged
- Firestore data structure unchanged
- No database migrations needed
