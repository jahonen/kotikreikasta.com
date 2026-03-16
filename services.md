# Services Documentation

## Vertex AI Gemini Model Selection Service (alpha)
- Lifecycle tag: alpha
- Purpose: Provide a single entry point for Kotikreikasta.com to invoke Vertex AI Gemini with the correct model per policy.
- Regions: Use EU locations only (e.g., europe-west1/eu) per project policy.

### Secrets (Google Secret Manager)
- GEMINI_COSTOPTIMIZED_MODEL
  - Description: Holds the model identifier for cost-optimized usage (internal/simple tasks).
  - Example value format: `gemini-1.5-flash-002` (exact value stored in GSM).
- GEMINI_QUALITY_MODEL
  - Description: Holds the model identifier for high-quality usage (customer-facing content).
  - Example value format: `gemini-1.5-pro-002` (exact value stored in GSM).

### Interface (required)
- Inputs
  - `prompt`: string
  - `context`: optional object (structured business context, safety settings)
  - `tier`: "cost" | "quality" (determines which GSM secret to read)
  - `options`: temperature, max tokens, mime type, etc.
- Outputs
  - `text`: generated string (or structured result depending on feature)
  - `usage`: tokens/cost metadata if available
- Side effects
  - Reads model name from GSM at call time (cache in-memory for a short TTL)
  - Logs start/end/errors (no PII; redact inputs for GDPR)

### Policy
- Use `GEMINI_COSTOPTIMIZED_MODEL` for internal/simple tasks.
- Use `GEMINI_QUALITY_MODEL` for any customer-facing material. Do NOT silently fall back to cost model.

### Operational details
- Authentication: Application Default Credentials (ADC) with appropriate IAM roles.
  - Required roles: `roles/secretmanager.secretAccessor`, `roles/aiplatform.user` (or equivalent least-privilege)
- Region: set Vertex AI location to an EU region (e.g., europe-west1). Do not use us-*.
- Secret access: prefer secret version `latest` unless pinning is required.
- Error handling:
  - Log and surface actionable errors. For customer-facing requests, fail closed if quality model is unavailable.
  - For internal tasks, optionally allow switching to cost model only if explicitly requested.

### Notes
- Keep model names outside source code; only retrieve from GSM.
- Track any future third-party libraries in this file with locked versions per dependency policy.

## Bluesky Publishing Service (alpha)
- Lifecycle tag: alpha
- Purpose: Automate sharing of blog posts and selected listings to Bluesky from Kotikreikasta.com official account.

### Secrets (Google Secret Manager)
- BSKY_APP_PASSWORD
  - Description: App password for the Bluesky publisher account used to authenticate API calls.
  - Notes: Treat as a credential; must never be logged or exposed to clients.
- BSKY_IDENTIFIER
  - Description: DID identifier of the Bluesky publisher account (esim. `did:plc:...`).
  - Notes: Used to target the correct account when posting or querying state.

### Interface (required)
- Inputs
  - `content`: string (FI) – julkaistava teksti; sisältää tyypillisesti kanonisen URL-osoitteen artikkeliin tai kohteeseen.
  - `attachments`: optional array of image URLs or Upload IDs (kun toteutettu).
  - `tags`: optional array of strings (esim. `#Kreikka`, `#Loma-asunto`).
  - `visibility`: optional enum (oletus `public`).
- Outputs
  - `postId`: Blueskyn palauttama tunniste luodulle postaukselle.
  - `url`: Blueskyn kanoninen URL postaukseen.
  - `usage`: valinnainen metadata (latenssi, yritykset).
- Side effects
  - Lukee `BSKY_APP_PASSWORD` ja `BSKY_IDENTIFIER` GSM:stä ajohetkellä (välimuisti lyhyellä TTL:llä).
  - Kirjaa aloitus/loppu/virheet ilman PII:tä. Älä kirjaa tunnistetietoja; vältä täyden sisällön loggausta GDPR:n vuoksi (käytä hashia/pituutta).

### Operational details
- Autentikointi: Bluesky app password -virta. Säilytä salasana vain GSM:ssä; hae versio `latest`.
- Virheenkäsittely: Palauta selkeät virheet; käsittele rate limit ja turvalliset uudelleenyritykset.
- Julkaisupolitiikka: Asiakasrajapintaan näkyvä FI‑sisältö tarkistetaan tai tuotetaan QUALITY‑mallilla; liitä kanoninen sivuston URL.
- Aluepolitiikka: Palvelu ajetaan EU‑isännöidyssä backendissä (esim. Cloud Functions/Run europe-west*).

### Notes
- Pidä kaikki Bluesky‑tunnukset yksinomaan GSM:ssä. Älä koskaan commitoi arvoja tai tulosta niitä lokiin.
- Sisällön kieli on suomi brändilinjan mukaisesti. Asiakkaalle näkyvä generointi käyttää QUALITY‑mallia.

## Third‑party UI libraries
- react-icons@4.12.0 (locked)
  - Purpose: Provide brand‑accurate social media icons (Facebook, Threads, X, Instagram). Bluesky uses a vetted inline SVG until an official icon is available in the library.
  - Scope: UI only. No runtime network calls.

## Novu Notifications (beta)
- Lifecycle tag: beta
- Purpose: Multi-kanavainen ilmoitusalusta (in-app feed, email, Slack, SMS) ylläpitonäkymää varten.

### Dependencies (version-locked)
- @novu/notification-center@2.0.0 (client, in-app feed/bell)
- @novu/node@2.6.6 (server SDK for emitting events) – note: upstream deprecates in favor of @novu/api; migration planned.

### Environment
- NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER (public App Identifier; required for client feed)
- NOVU_API_KEY (server-side; stored in GSM and accessed by Cloud Functions/Run)

### Interface (required)
- Inputs (events)
  - `listing.inquiry.created`: { listingId, inquiryId, contact: { name, email }, message }
  - `social.comment.created`: { source: 'facebook'|'instagram'|'x'|..., postId, commentId, author, text }
  - `service_request.sla.breached`: { requestId, title, assignedToUid, dueAt }
- Outputs
  - In-app feed items per subscriber (Firebase uid as `subscriberId`)
  - Optional channel deliveries (email/Slack) per workflow configuration
- Side effects
  - Reads NOVU_API_KEY from Secret Manager in backend
  - Logs start/end/errors (no PII beyond necessary routing fields)

### Operational details
- Subscriber mapping: `subscriberId = Firebase Auth uid`
- UI integration: Admin topbar shows a bell with unseen badge; falls back gracefully when NOVU_APP_ID/subscriber is missing.
- Backends: Cloud Functions scheduled job to detect SLA breaches; HTTP-triggered/webhook handlers to emit social comment events as needed.

### Notes
- Temporary test endpoint `/api/novu/test` is now deprecated and returns HTTP 410. The test button has been removed from Admin UI. Use production emitters/events instead.

### Notes
- Public App ID is not a secret; API key must be stored only in GSM. Document any provider credentials (Slack webhook, SMTP) in `integration.md`.

## Maps JS Browser Key Service (beta)
- Lifecycle tag: beta
- Purpose: Provide the Google Maps JavaScript API browser key to the client securely via a backend endpoint.
- Region: EU (run in Hosting/Next.js runtime; Secret Manager in EU project scope per policy).

### Implementation
- Local development: Next.js route `hosting/app/api/maps/key/route.ts`
  - Reads key from environment: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (or `GOOGLE_MAPS_API_KEY`).
  - Returns JSON `{ key: string }`.
  - Config: `export const dynamic = 'force-dynamic'` and `runtime = 'nodejs'`.
- Production: Firebase Hosting rewrite `/api/maps/key` → Cloud Function/Run service
  - Reads browser key from Google Secret Manager at runtime.
  - Prefer EU region and least-privilege access.

### Interface (required)
- Inputs
  - HTTP GET (no params)
- Outputs
  - 200 JSON: `{ key: string }`
  - 500 JSON: error shape on failures (no secret leakage)
- Side effects
  - Local: reads from environment only.
  - Production: reads Secret Manager secret at call time (short in-memory cache recommended if needed later).
  - Logs start/end/errors without exposing secrets.

### Consumers
- `MapPicker` component loads Google Maps JS by calling `/api/maps/key` and then injecting the Maps script with `language=fi` and required libraries (`places`, plus `marker` if `mapId` exists).

### Environment
- Local: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (preferred) or `GOOGLE_MAPS_API_KEY`
- Production: secret in GSM (name managed per infra convention)

### Notes
- Do not hardcode keys in source. Keep production key only in Secret Manager.
- Local route is for dev convenience; production should use the rewrite to the backend service.

## Firebase Session Cookie Service (beta)
- Lifecycle tag: beta
- Purpose: Server-authenticated sessions via Firebase Admin session cookies (`__session`).

### Implementation
- Next.js route: `hosting/app/api/auth/session/route.ts`
  - Module-scoped, single-package `firebase-admin` import; per-request guard ensures Admin app is initialized.
  - Uses ADC (gcloud Application Default Credentials) locally; in production relies on Hosting/Cloud Run identity.
  - Cookie domain omitted to allow Hosting/SSR routing; `SameSite=lax` for POST; secure=false in local dev.

### Interface (required)
- Inputs
  - `POST`: JSON `{ idToken: string }` (Firebase ID token)
  - `GET`: none (reads `__session`)
  - `DELETE`: none (clears `__session`)
- Outputs
  - `POST 200`: `{ ok: true, adminProject?: string }`
  - `POST 4xx/5xx`: `{ error: string, detail?: string, diagnostics? }`
  - `GET 200`: `{ ok: boolean, hadCookie: boolean, uid?, email?, error?, detail? }`
  - `DELETE 200`: `{ ok: true }`
- Side effects
  - Sets/Clears `__session` HttpOnly cookie (secure in prod). Logs start/end/errors (no PII).
  - Admin init guard logs `ADMIN_INIT_ERROR` with non-sensitive details when initialization fails.

## Places Nearby Proxy Service (beta)
- Lifecycle tag: beta
- Purpose: Proxy Google Places API (New) `places:searchNearby` requests server-side to avoid exposing a server key and to keep Hosting deploys free from Functions builds.
- Region: `europe-west1` (Cloud Run)

### Implementation
- Cloud Run service: `places-nearby` (source in `services/places-nearby`)
- Runtime: Node.js 18, Express
- Endpoints
  - `POST /api/places/nearby` (also `/places/nearby`, `/nearby`) – primary entrypoint used by Hosting rewrite
  - `GET /healthz` – health check
  - `GET /` – service root
- Hosting rewrite (firebase.json)
  - Maps `/api/places/nearby` → Cloud Run service `places-nearby` in `europe-west1`
- Request payload (JSON)
  - `center`: `{ lat: number, lng: number }`
  - `radius?`: number (meters), clamped to 1–50000, default ~2000
  - `includedTypes?`: string[] (Places types)
- Behavior
  - Calls `https://places.googleapis.com/v1/places:searchNearby`
  - `languageCode = fi`
  - Field mask: `places.id,places.displayName,places.primaryType,places.types,places.location`
  - `maxResultCount = 20` (per Places API (New) limit)
  - Returns upstream JSON on success

### Secrets (Google Secret Manager)
- `PLACES_API_SERVER_KEY`
  - Description: Server key for Places API (New)
  - Policy: Application restrictions None; API restrictions: restrict to Places API (New)
- Configuration
  - Env var on Cloud Run: `GOOGLE_PLACES_API_KEY_SECRET=PLACES_API_SERVER_KEY`
  - Service account (invocation/runtime): `854585552743-compute@developer.gserviceaccount.com`
  - Required role: `roles/secretmanager.secretAccessor`

### Interface (required)
- Inputs
  - HTTP `POST` body `{ center: { lat, lng }, radius?: number, includedTypes?: string[] }`
- Outputs
  - 200 JSON: `{ places: Array<{ id, displayName, primaryType, types, location }> }` (shape per Google)
  - 4xx/5xx JSON: `{ error: string, details? }` (maps upstream errors; 4xx/5xx may surface as 502 with details from upstream)
- Side effects
  - Reads server key from GSM on first use (in-memory cached)
  - Makes outbound call to Google Places API (New)
  - Logs start/end/errors (no secrets)

### Operational notes
- Ensure the server key in GSM is not a browser/referrer-restricted key; otherwise Google returns `PERMISSION_DENIED` with `API_KEY_HTTP_REFERRER_BLOCKED`.
- Unauthenticated access was temporarily enabled for validation; after verification, restrict invokers to the Firebase Hosting managed service account only.

## AI‑Assisted Blog Writing (beta)
- Lifecycle tag: beta
- Purpose: Generate Finnish blog drafts and SEO metadata using Vertex AI (Gemini) from a short description and an internal writing guide.

### Implementation
- Draft API: `hosting/app/api/blogs/draft/route.ts`
  - Auth: Firebase session cookie (`__session`) or ID token via `x-firebase-auth`/Bearer.
  - Reads `BLOG_LLM_GUIDE` (GSM) and `GEMINI_COSTOPTIMIZED_MODEL` (GSM, default `gemini-1.5-flash-002`).
  - Calls Vertex AI (EU region) to generate Markdown; extracts H1 as title.
  - Persists draft in Firestore `blog_posts` with `{ title, contentMd, urlStub, status: 'draft' }`.

- Publish API: `hosting/app/api/blogs/publish/route.ts`
  - Auth: same as above; restricts to `@kotikreikasta.com` editors.
  - Reads `BLOG_LLM_GUIDE` and `GEMINI_QUALITY_MODEL` (GSM, default `gemini-1.5-pro-002`).
  - Generates SEO JSON: `{ metaTitle, metaDescription, keywords[], ogTitle, ogDescription, imageAlt }`.
  - Updates the blog document, sets `status: 'queued'`, writes `seo`, sets `publishedAt`, and enqueues to `publication_queue`.

- Admin UI: `hosting/components/admin/BlogEditor.tsx`
  - Step 1: Editor enters description and creates draft (AI). Receives editable `title` and `contentMd`.
  - Step 2: Uploads feature image to Firebase Storage under `blog-images/{blogId}/...`.
  - Step 3: Saves draft or publishes; publish triggers SEO generation and queue write.

### Interface (required)
- Draft
  - Input: `POST /api/blogs/draft` `{ description: string }`
  - Output: `200 { ok: true, id, title, contentMd, urlStub }`
- Publish
  - Input: `POST /api/blogs/publish` `{ id, title, contentMd, imageUrl? }`
  - Output: `200 { ok: true, id, seo }`

### Side effects
- Reads GSM secrets at call time (short in‑memory cache could be added later).
- Uses ADC (local) or Cloud Run identity (prod) for Vertex AI.
- Writes to collections: `blog_posts`, `publication_queue`.
- Stores images in Firebase Storage under `blog-images/{blogId}/` and references `{ featuredImage: { url, alt } }` in the document.

### Environment
- Secrets in GSM:
  - `BLOG_LLM_GUIDE` – editorial style and structure guidance
  - `GEMINI_COSTOPTIMIZED_MODEL` – e.g. `gemini-1.5-flash-002`
  - `GEMINI_QUALITY_MODEL` – e.g. `gemini-1.5-pro-002`
- Server dependency (version-locked): `google-auth-library@^9.14.2`

### Notes
- Firestore collection name: using `blog_posts` (aligns with current rules). If migrating to `blogs`, update rules, code, and data migration plan.
- Keep all secrets in GSM for production; do not commit values.
- Ensure editors are assigned `admin` role (see `roles/{uid}`) to allow client‑side draft saves via rules; server routes bypass rules.

## Publication Queue Processor (alpha)
- Lifecycle tag: alpha
- Purpose: Consume `publication_queue` tasks and perform core publication side effects (e.g., mark blog posts as published). Channel-specific distribution (email, Bluesky, etc.) is handled by separate consumers; see sample specs.

### Implementation
- Location: `functions/src/index.ts` → `processPublicationQueue`
- Trigger: Firestore `onCreate` for `publication_queue/{id}`
- Behavior (MVP):
  - Logs start and payload summary (type, action, blogId).
  - If `{ type: 'blog_post', action: 'publish' }`:
    - Loads `blog_posts/{blogId}`; if already `status: 'published'` → mark done and skip.
    - Otherwise sets `status: 'published'`, updates `updatedAt`, ensures `publishedAt` exists.
    - Marks queue doc `{ status: 'done' }`.
  - Unknown type/action → marks `{ status: 'ignored' }`.
  - Errors → marks `{ status: 'error', error }`.

### Interface (required)
- Inputs
  - Firestore doc: `publication_queue/{id}` with fields:
    - `type`: `'blog_post' | ...`
    - `action`: `'publish' | ...`
    - `blogId`: string (when type is `blog_post`)
    - `seo?`: object (metadata generated at enqueue time)
    - `createdBy`: uid
    - `createdAt`: timestamp
- Outputs
  - Updates `blog_posts/{blogId}` to `status: 'published'`, sets `publishedAt` if missing, updates `updatedAt`.
  - Updates the queue document with `{ status: 'done' }` (or `ignored`/`error`).
- Side effects
  - None yet. Future: trigger Next.js path/tag revalidation via a signed internal route.

### Reliability roadmap
- Add idempotency guard/lease (e.g., `processingAt`, `attempts`).
- Retries with exponential backoff; move to DLQ after N attempts.
- Optional archival collection for processed items.

### Channel consumers (Milestone 4)
- Channel-specific publishers are separate services (Cloud Functions/Run) that subscribe to an outbox or read `publication_queue` and post to channels.
- Sample specs available:
  - `samplecode/consumer_email.md` (includes requirement for a first‑party tracking pixel and click tracking)
  - `samplecode/consumer_bsky.md`
  - `samplecode/consumer_x.md`

### Observability
- Logs start/end/errors; redact PII and secrets.
- Queue docs store `status`, optional `note`/`error`, and `updatedAt` for admin visibility.

## Blog SEO & ISR Service (beta)
- Lifecycle tag: beta
- Purpose: Provide SEO-optimized blog post rendering with Incremental Static Regeneration (ISR) for fast loading, fresh content, and search engine discoverability.

### Implementation
- Blog page: `hosting/app/blog/[slug]/page.tsx`
  - Uses ISR with `revalidate: 3600` (1 hour cache)
  - Fetches blog post data from Firestore server-side for metadata generation
  - Generates comprehensive SEO metadata (Open Graph, Twitter Cards, JSON-LD)
  - Renders blog content via `BlogPostClient` component
  
- Sitemap: `hosting/app/sitemap.ts`
  - Dynamically generates sitemap from Firestore `blog_posts` collection
  - Includes all published posts with proper `lastModified` dates
  - Priority weighting: homepage (1.0), listings (0.8), blog (0.7)
  
- Revalidation API: `hosting/app/api/revalidate/route.ts`
  - On-demand path revalidation triggered by publish events
  - Requires secret token for authorization
  - Revalidates blog page, sitemap, and homepage

- Firebase Admin Server: `hosting/lib/firebase-admin-server.ts`
  - Shared Firebase Admin SDK initialization for server-side operations
  - Uses Application Default Credentials (ADC)
  - Provides `getFirestore()` and `getAuth()` helpers

### Interface (required)
- Blog Page
  - Input: URL slug (e.g., `/blog/siesta-kreikassa-...`)
  - Output: Server-rendered HTML with full SEO metadata
  - Metadata includes: title, description, keywords, Open Graph, Twitter Cards, JSON-LD structured data
  
- Sitemap
  - Input: HTTP GET `/sitemap.xml`
  - Output: XML sitemap with all published blog posts and static pages
  
- Revalidation
  - Input: `POST /api/revalidate` `{ path: string, secret: string }`
  - Output: `200 { revalidated: true, paths: string[] }`

### Side effects
- Publish API (`/api/blogs/publish`) triggers revalidation webhook
- Revalidation clears ISR cache for specified paths
- Blog posts appear within seconds of publishing
- Sitemap updates automatically on next request after cache expiry

### SEO Features
- **Open Graph**: Full OG tags for social sharing (Facebook, LinkedIn)
- **Twitter Cards**: Summary large image cards with proper metadata
- **JSON-LD**: BlogPosting structured data for rich snippets
- **Canonical URLs**: Proper canonical tags for duplicate content prevention
- **Robot Directives**: Optimized for indexing with proper googleBot settings
- **Image Optimization**: Featured images with alt text in metadata
- **Publish Dates**: Article publish/modified times for freshness signals

### Environment
- Secrets in GSM:
  - `REVALIDATE_SECRET` – authorization token for revalidation API
- Environment variables:
  - `PUBLIC_SITE_URL` – base URL for revalidation webhooks (default: `https://kotikreikasta.com`)
  - `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` / `GCP_PROJECT` – for Firebase Admin initialization

### Performance
- ISR cache: 1 hour (3600 seconds)
- Static page delivery from CDN edge
- On-demand revalidation for immediate updates
- Firestore queries optimized with proper indexes

### Dependencies
- Firebase Admin SDK (server-side)
- Next.js ISR and revalidation APIs
- Firestore for blog post data

### Notes
- Blog posts use ISR instead of full static generation for flexibility
- Sitemap regenerates on each request (consider caching if traffic increases)
- Revalidation secret must be stored in Secret Manager and Cloud Run environment
- All server-side operations use Firebase Admin SDK with ADC

## Konsierge Service Page (stable)
- Lifecycle tag: stable
- Purpose: Public-facing service page for Kotikreikasta's concierge offering. Explains the service, pricing, and process to potential customers. Generates leads via integrated ContactForm.

### Implementation
- Page route: `hosting/app/konsierge/page.tsx`
  - Server component with static metadata export
  - Renders complete service page with hero, features, pricing, and contact form
  - Integrates NavBar, Footer, and ContactForm components
  
- Layout: `hosting/app/konsierge/layout.tsx`
  - Exports comprehensive SEO metadata
  - Open Graph and Twitter Cards for social sharing
  - JSON-LD Service schema for structured data
  - Canonical URL and robots directives

### Interface (required)
- Inputs
  - None (static page, no dynamic params)
- Outputs
  - Server-rendered HTML with full SEO metadata
  - Integrated ContactForm for lead generation
  - JSON-LD structured data (Service schema)
- Side effects
  - ContactForm writes to Firestore `leads` collection
  - Triggers admin notifications via Novu and SendGrid
  - Analytics tracking via ContactForm component

### Content Sections
1. **Hero**: Service value proposition with CTA buttons
2. **Trust Bar**: Key benefits (Finnish service, 24h response, direct payment, Greece-wide coverage)
3. **What is it**: Split section explaining the service concept
4. **How it works**: 4-step process guide (Tell us, We investigate, You get options, Work gets done)
5. **Services**: 6 category grid (Repairs, Property care, Authorities, Legal, Emergencies, Other)
6. **Pricing**: 2-tier comparison (Free for buyers 12 months, €39/month ongoing)
7. **Disclaimer**: Legal notice about intermediary role
8. **Contact**: ContactForm integration with source type 'content'

### Design & Responsiveness
- Mobile-first responsive design
- All sections use `clamp()` for fluid typography and spacing
- Responsive grids with `auto-fit` and `minmax()` patterns
- Grid columns collapse to single column on mobile
- Minimum 1.25rem (20px) horizontal padding on mobile
- Images with proper min-height for mobile display
- Typography: Cormorant Garamond (headings), DM Sans (body)
- Color palette: aegean-deep, gold, sand, white (site design system)

### SEO Features
- **Metadata**: Comprehensive title, description, keywords
- **Open Graph**: Full OG tags for social sharing
- **Twitter Cards**: Summary large image cards
- **JSON-LD**: Service schema with provider, area served, languages
- **Canonical URL**: https://kotikreikasta.com/konsierge
- **Robots**: index, follow with googleBot settings
- **Sitemap**: Included with priority 0.8, monthly change frequency

### Navigation
- Added to main navigation (desktop and mobile NavBar)
- Added to Footer "Palvelut" section
- Accessible via `/konsierge` route

### Lead Generation
- ContactForm with source: `{ type: 'content', slug: 'konsierge', title: 'Konsierge-palvelu', url: 'https://kotikreikasta.com/konsierge' }`
- Leads written to Firestore with proper source attribution
- Admin notifications via Novu (in-app) and SendGrid (email)
- Lead tracking in admin UI at `/markkinointi`

### Dependencies
- NavBar component (site navigation)
- Footer component (site footer)
- ContactForm component (lead generation)
- Next.js metadata API
- Site-wide CSS variables and design system

### Environment
- No specific environment variables required
- Uses shared Firebase Firestore configuration
- Relies on ContactForm's Secret Manager secrets (NOVU_API_KEY, SENDGRID_API_KEY, LEADS_ADMIN_EMAIL)

### Testing
- Visual regression tests for all sections
- Mobile responsiveness testing across breakpoints
- Contact form integration testing
- SEO metadata validation
- Cross-browser compatibility (Chrome, Safari, Firefox)

### Observability
- Analytics via ContactForm component
- Lead tracking in Firestore `leads` collection
- Admin notifications for new leads
- No page-specific logging (static content)

### Notes
- Page is fully static with no dynamic data fetching
- All content is in Finnish (brand language)
- Pricing and service details should be kept in sync with actual offering
- Images use Unsplash URLs; consider migrating to Firebase Storage for production
- ContactForm handles all lead generation and notification logic

