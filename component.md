# Components Documentation

## MapPicker (beta)
- Lifecycle tag: beta
- Description: A reusable React component that loads Google Maps JavaScript API and Places (New) autocomplete to select a location. Renders a map with a draggable marker, supports search-driven selection, and performs reverse geocoding to emit structured address data in Finnish prioritization. Used in Admin ListingWizard and the /maptest page.

### Interface (required)
- Inputs
  - `lat?`: number – initial latitude
  - `lng?`: number – initial longitude
  - `onChange(loc)`: function – callback invoked whenever selection changes via search, click, or drag
- Outputs (via `onChange(loc)` argument)
  - `lat`: number
  - `lng`: number
  - `formattedAddress?`: string
  - `addressComponents?`: Array<{ types: string[]; longText?: string; shortText?: string }>
  - `geocodeResults?`: any[] – JSON-safe full reverse geocoding results for diagnostics/UI
- Side effects
  - Loads Google Maps JS with `language=fi` and libraries: `places` (+ `marker` only when `mapId` present)
  - Conditionally uses AdvancedMarkerElement when a map style `mapId` is configured; otherwise legacy Marker
  - Uses Places (New) `PlaceAutocompleteElement` for search
  - Performs reverse geocoding (prefers political results) after map interactions and place selections
  - Fetches the browser Maps JS key from `/api/maps/key` (Secret Manager backend with env var fallback for local dev)

### Behavior
- Initializes map after the container has a visible size to ensure tiles render reliably
- Supports:
  - Search selection → center & set marker, fetch fields from Place, then reverse geocode for complete results
  - Map click & marker drag → update position and reverse geocode
- **Merges address components from all reverse-geocode results** to preserve complete administrative hierarchy (region/municipality/island/etc.)
- This ensures all administrative levels are available even when the primary result doesn't include them

### Address field mapping used by downstream UI
- **Greek administrative hierarchy** (actual Google Geocoding API levels):
  - `administrative_area_level_2` → Περιφέρεια (Region) – FI: **Alue** (e.g., "Attika")
  - `administrative_area_level_3` → Περιφερειακή Ενότητα (Regional Unit) – FI: **Seutu** (e.g., "Anatoliki Attiki")
  - `administrative_area_level_4` → Δήμος (Municipality) – FI: **Kunta** (e.g., "Markopoulo Mesogeas")
  - `locality` → Τοπική Κοινότητα (Local Community) – FI: **Paikka** (e.g., "Porto Rafti")
- Finnish UI display in ListingWizard (with Greek tooltips):
  - Katuosoite ("Οδός + Αριθμός") → `street_address` (fallback: `route` + `street_number`)
  - Paikka ("Τοπική Κοινότητα") → `locality`
  - Kunta ("Δήμος") → `administrative_area_level_4` (fallback to level_3)
  - Seutu ("Περιφερειακή Ενότητα") → `administrative_area_level_3`
  - Alue ("Περιφέρεια") → `administrative_area_level_2` (fallback to level_1)
  - Postinumero ("Ταχυδρομικός Κώδικας") → `postal_code`
  - Maa ("Χώρα") → `country`

### Dependencies
- Google Maps JavaScript API (libraries: places, marker)
- Places API (New)
- Geocoding API
- Secret Manager via `/api/maps/key` route (with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var fallback)

### Testing
- Vitest + jsdom configured in the project. Component logic designed to avoid stalling in test env (skips wait-for-size loop). Add unit tests for:
  - Emitting `onChange` on drag/click/selection
  - Admin level extraction from merged `addressComponents`
  - Fallback behavior when constructors are delayed

### Observability
- No verbose logging in production
- Consider adding analytics events on user interactions (search select, drag, click) per project policy.

## Blog Listing Page (stable)
- Lifecycle tag: stable
- Description: Comprehensive blog listing page at `/blog` with server-side rendering, search functionality, pagination, and breadcrumb navigation. Displays all published blog posts in a grid layout with featured images, excerpts, and dates.

### Interface (required)
- Inputs
  - `searchParams`: `{ page?: string; q?: string }` - URL query parameters for pagination and search
- Outputs
  - Renders complete blog listing page with search, pagination, and breadcrumbs
  - Server-side rendered for full SEO crawlability
- Side effects
  - Fetches all published blog posts from Firestore on server
  - Generates JSON-LD structured data (Blog schema)
  - Provides crawlable links to all blog posts

### Behavior
- Server-side rendering (SSR) ensures all content is in HTML response
- Search functionality filters posts by title and excerpt
- Pagination with 12 posts per page
- Breadcrumb navigation for internal linking
- Reuses blog card design from homepage for consistency
- "Näytä kaikki artikkelit" CTA button on homepage links here

### SEO Features
- Comprehensive metadata with keywords and Open Graph tags
- Canonical URL: `https://kotikreikasta.com/blog`
- JSON-LD Blog schema with all posts
- Breadcrumb navigation for internal linking
- All blog post links are crawlable (no client-side JS required)
- Included in sitemap.xml with priority 0.85

### Dependencies
- Firebase Firestore (server-side)
- Next.js App Router with SSR

### Testing
- Test with curl to verify HTML contains all blog post links
- Verify search functionality
- Test pagination
- Validate JSON-LD structured data

### Observability
- Server-side error logging for Firestore queries
- No PII in logs

## LatestBlogsServer (stable)
- Lifecycle tag: stable
- Description: Server-side rendered component for displaying latest blog posts on homepage. Replaces client-side `LatestBlogsClient` to provide crawlable links for SEO.

### Interface (required)
- Inputs
  - `count?`: number - number of posts to display (default: 3)
- Outputs
  - Renders grid of blog post cards with links
  - "Näytä kaikki artikkelit" button linking to `/blog`
- Side effects
  - Fetches latest published blog posts from Firestore on server

### Behavior
- Server-side rendering ensures all blog links are in HTML
- Extracts excerpts from content, removing title duplication
- Displays featured images, dates, titles, and excerpts
- Provides crawlable link equity from homepage to blog posts
- CTA button links to full blog listing page

### SEO Features
- All blog post links are crawlable (no JS required)
- Provides link equity from homepage (priority 1.0) to blog posts
- Replaces hash anchor `/#latest-blogs` with proper `/blog` link

### Dependencies
- Firebase Firestore (server-side)

### Testing
- Test with curl to verify blog links in HTML response
- Verify no client-side JS required for links

## BlogInternalLinks (stable)
- Lifecycle tag: stable
- Description: Internal linking component displayed at the end of each blog post. Provides contextual links to key service pages for SEO link equity and user navigation.

### Interface (required)
- Inputs
  - none
- Outputs
  - Renders aside section with links to ostoprosessi, alueet, tasmahaku, konsierge, and /blog
- Side effects
  - none

### Behavior
- Displays 5 key internal links with icons and descriptions
- Links to: Ostoprosessi, Alueet, Täsmähaku, Konsiergepalvelu, Kaikki artikkelit
- Styled as cards in a vertical list
- Responsive design

### SEO Features
- Provides contextual internal linking from every blog post
- Distributes link equity to key service pages
- Helps search engines understand site structure
- Improves crawl depth and page discovery

### Dependencies
- None (pure React component)

### Testing
- Visual regression test for layout
- Verify all links work correctly

## BlogSocialShare (stable)
- Lifecycle tag: stable
- Description: Social sharing component for blog posts with buttons for Facebook, X (Twitter), LinkedIn, WhatsApp, Email, and copy link functionality. Tracks all share events via Google Tag Manager.

### Interface (required)
- Inputs
  - `url`: string - full URL of the blog post
  - `title`: string - blog post title
  - `description?`: string - blog post description (optional)
- Outputs
  - Renders social sharing buttons with platform-specific colors and icons
  - Copy link button with success feedback
- Side effects
  - Opens share dialogs in popup windows
  - Copies URL to clipboard
  - Pushes analytics events to dataLayer

### Behavior
- 6 sharing options: Facebook, X, LinkedIn, WhatsApp, Email, Copy Link
- Opens share dialogs in centered popup windows (600x400)
- Email opens mailto: link in default email client
- Copy link shows "Kopioitu!" confirmation for 2 seconds
- All buttons have hover effects and proper ARIA labels

### Analytics Events
- Tracks `blog_share` event with:
  - `share_platform`: facebook|twitter|linkedin|whatsapp|email|copy_link
  - `blog_url`: full URL of the post
  - `blog_title`: title of the post

### Dependencies
- None (pure React component with clipboard API)

### Testing
- Test all share buttons open correct platforms
- Verify copy link functionality
- Test analytics event tracking
- Verify responsive layout on mobile

## BlogAnalytics (stable)
- Lifecycle tag: stable
- Description: Enhanced analytics tracking for blog posts. Tracks page views, scroll depth (25%, 50%, 75%, 100%), and time spent on page.

### Interface (required)
- Inputs
  - `id`: string - blog post Firestore document ID
  - `slug`: string - blog post URL slug
  - `title`: string - blog post title
- Outputs
  - Invisible component (returns null)
- Side effects
  - Pushes analytics events to dataLayer (Google Tag Manager)

### Behavior
- **Page View**: Tracks immediately on mount with timestamp
- **Scroll Depth**: Tracks when user scrolls to 25%, 50%, 75%, 100% of page
- **Time Spent**: Tracks total seconds on page when user leaves (beforeunload)

### Analytics Events
1. `blog_view`:
   - `blog_id`, `blog_slug`, `blog_title`, `timestamp`
2. `blog_scroll`:
   - `blog_id`, `blog_slug`, `scroll_depth` (25|50|75|100)
3. `blog_time_spent`:
   - `blog_id`, `blog_slug`, `time_spent_seconds`

### Dependencies
- Google Tag Manager (dataLayer)

### Testing
- Verify page view event fires on mount
- Test scroll depth tracking at different scroll positions
- Verify time spent tracking on page exit
- Check events in GTM preview mode

## Blog Post Page (stable)
- Lifecycle tag: stable
- Path: `hosting/app/blog/[slug]/page.tsx`
- Description: Server-side rendered blog post page with full SEO optimization. Fetches content from Firestore on server, renders complete HTML for crawlers.

### Interface (required)
- Inputs
  - `params.slug`: string - blog post URL slug or document ID
- Outputs
  - Full HTML page with article content, metadata, social sharing, analytics
- Side effects
  - Server-side Firebase Admin fetch
  - Static generation at build time via generateStaticParams

### Behavior
- **Server Component**: No "use client" - renders on server
- **Static Generation**: Pre-renders all published posts at build time
- **ISR**: Revalidates every 3600 seconds (1 hour)
- **Metadata**: Generates comprehensive SEO tags, OG images, Twitter Cards
- **Content Rendering**: Converts markdown to HTML server-side
- **Description Extraction**: Auto-generates meta description from body text

### SEO Features
- Full article content in initial HTML response (not client-side)
- Proper og:description from body text (strips markdown)
- Keywords populated in JSON-LD BlogPosting schema
- Breadcrumb navigation with actual post title
- Static generation for instant crawlability
- Image dimensions in OG tags for better social previews

### Components Used
- BlogAnalytics (client) - Engagement tracking
- BlogSocialShare (client) - Share buttons
- BlogInternalLinks (server) - SEO internal linking
- ContactForm (client) - Lead generation

### Dependencies
- Firebase Admin SDK (server-side)
- blog-utils.ts (markdown processing)
- Next.js App Router with generateStaticParams

### Testing
- Test with curl to verify content in HTML (no JS)
- Verify meta description is clean text (no markdown)
- Test social previews on Facebook, Twitter, LinkedIn
- Verify breadcrumb shows actual title
- Check JSON-LD schema has keywords

## Blog Utilities (stable)
- Lifecycle tag: stable
- Path: `hosting/lib/blog-utils.ts`
- Description: Utility functions for markdown processing and content extraction used in server-side blog rendering.

### Functions

#### mdToHtml(md: string): string
- Converts markdown to HTML
- Handles headings, lists, bold, italic, links, images
- Escapes HTML entities for security
- Used for server-side content rendering

#### stripMarkdown(md: string): string
- Removes all markdown syntax from text
- Strips headings, bold, italic, links, code, lists
- Returns plain text
- Used for meta description generation

#### extractDescription(contentMd: string, maxLength: number = 155): string
- Extracts clean description from markdown content
- Removes title (first heading)
- Strips all markdown syntax
- Takes first N characters of plain text
- Breaks at word boundary if possible
- Returns description with ellipsis if truncated
- Used for og:description and meta description

### Testing
- Test mdToHtml with various markdown formats
- Verify stripMarkdown removes all syntax
- Test extractDescription with different content lengths
- Verify word boundary breaking works correctly

## PointsOfInterestPicker (beta)
- Lifecycle tag: beta
- Description: Hakee lähellä olevat kiinnostavat kohteet (POI) Google Places API (New) -rajapinnan kautta ja näyttää ne valintaruudukossa suomalaisilla tyyppilabeleilla. Käytössä ListingWizardissa ja `/maptest`-sivulla. Integroituu `MapPicker`iin valitun sijainnin perusteella.

### Interface (required)
- Inputs
  - `center`: `{ lat: number; lng: number } | null` – hakualueen keskipiste
  - `radius?`: number – hakuympyrän säde metreinä (oletus 2000 m)
  - `onChange?`: `(selectedPois: PoiItem[]) => void` – callback valituille kohteille
- Outputs
  - Renderöity UI, joka listaa `places` (nimi, tyyppi, sijainti) ja valintaruudut kohteiden poimintaan
  - Kutsuu `onChange` kun valitut kohteet muuttuvat
- Side effects
  - Tekee `POST`-kutsun taustapalveluun `/api/places/nearby` (Secret Manager backend with env var fallback)
  - Dedupoi ja peruu päällekkäiset haut `AbortController`illa käyttäen cache-avainta (lat/lng/radius)
  - Näyttää lataus- ja virhetilat
  - **Tyhjentää cache-avaimen cleanup-funktiossa** estääkseen React Strict Mode -ongelmat

### Dependencies
- Places API (New) taustapalvelun kautta
- Secret Manager via `/api/places/nearby` route (with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var fallback)

### Behavior
- Muodostaa pyynnön: `{ center: { lat, lng }, radius }`
- Kartoitus suomenkielisiin tyyppilabeleihin (esim. `restaurant` → `Ravintola`, `pharmacy` → `Apteekki`)
- Näyttää listan; valitut kohteet välitetään `onChange`-callbackin kautta
- **Käyttää `AbortController.signal.aborted` -tarkistusta** estääkseen state-päivitykset keskeytettyjen pyyntöjen jälkeen
- Cache-avain nollataan cleanup-funktiossa, jotta uudelleenmounttaus käynnistää uuden haun

### Testing
- Vitest-yksikkötestit kattavat:
  - POI-listan renderöinti mockatulla vastauksella
  - Pyyntöjen deduplikointi cache-avaimen perusteella
  - AbortController-toiminnallisuus React Strict Modessa

### Observability
- Virhelokit API-ongelmista (`console.error`)
- Ei verbose-lokitusta tuotannossa

## NavBar (stable)
- Lifecycle tag: stable
- Description: Fixed translucent header with site navigation and monochrome logo.

### Interface (required)
- Inputs
  - none
- Outputs
  - Renders site-wide navigation and brand logo
- Side effects
  - Uses an inline SVG mask to render the raster logo (`hosting/assets/kotikreikasta_com.png`) as pure white lines on a transparent background.
  - The mask inverts the source, turning the white background transparent and the artwork opaque, then fills with `#fff`.
  - Height fixed to `56px`; width computed proportionally from the source image metadata.

### Behavior
- Ensures the logo is always a single-color (white) mark suitable for dark headers.
- Background is transparent (no visible box) regardless of header color or scroll state.
- Fallback asset `hosting/assets/logo-mono.svg` is available; current implementation uses inline SVG with the PNG as the mask source.

### Dependencies
- None (uses built-in SVG features; no additional libraries).

### Testing
- Visual snapshot of the header at default and scrolled states.
- Cross-browser smoke test for SVG masking (latest Chrome, Safari, Firefox). If a browser fails masking, consider the preprocessed `logo-mono.svg` as a fallback.

### Observability
- No runtime logging. Consider emitting a lightweight analytics event on primary nav link clicks per policy.

## ContactForm (beta)
- Lifecycle tag: beta
- Description: Reusable contact form component for lead generation on public site. Features elegant design with separate name fields, subject dropdown, and trust indicators. Writes to Firestore leads collection and optionally subscribes to newsletter.

### Interface (required)
- Inputs
  - `source`: `{ type: 'listing'|'content', ... }`
    - listing: `{ listingId: string; title: string; url: string; price: number }`
    - content: `{ slug: string; title: string; url: string }`
- Outputs
  - Firestore writes to `leads` collection with: `{ source, contact{name, phone?, email?}, subject?, message, consents{termsAccepted, marketingOptIn}, status('lead'), statusPct(0.10), tcv(2% of price if listing), currentValue(statusPct*tcv), createdAt, updatedAt }`
  - If `marketingOptIn && email`: write to `newsletterSubscriptions` `{ email, consent: true, source, createdAt }`
- Side effects
  - Cloud Function `onLeadCreated`:
    - Recompute/normalize tcv/currentValue and statusPct
    - Notify admins via Novu (event: 'lead-created')
    - Email admins via SendGrid (to LEADS_ADMIN_EMAIL alias and/or role-based admin emails)
    - Secrets via Secret Manager: NOVU_API_KEY, SENDGRID_API_KEY, LEADS_ADMIN_EMAIL; optional SENDGRID_FROM

### Behavior
- Form fields:
  - Etunimi (First name) / Sukunimi (Last name) - 2-column grid
  - Sähköposti (Email) / Puhelin (Phone) - 2-column grid
  - Miten voimme auttaa? (Subject) - dropdown with predefined options
  - Viesti (Message) - textarea
  - Checkboxes: Terms (required), Marketing opt-in (optional, labeled "vapaaehtoinen")
- Validation:
  - Requires message and at least one of phone or email
  - Requires Palveluehdot (Terms) consent
  - Optional marketing consent
- Success state shows confirmation message with checkmark icon
- Trust indicators: "Vastaus 24 tunnissa · Ei sitoumuksia · Luottamuksellinen"

### Design
- Styled with ContactForm.scss using CSS variables for theming
- Colors: cream background, gold accents, refined typography
- Responsive 2-column grid (stacks on mobile)
- Custom select dropdown with arrow indicator
- Focus states with gold border
- Uppercase labels with letter-spacing
- Light font weights for elegant feel

### Dependencies
- Firebase Firestore client
- Retry logic for transient errors (3 attempts with exponential backoff)

### Embedding
- Content pages: embedded in `hosting/app/blog/[slug]/page.tsx` with source type 'content'
- Listing pages: embed `<ContactForm source={{ type: 'listing', listingId, title, url, price }} />`

### Admin UI
- `admin/app/markkinointi/page.tsx` lists leads and allows status changes; updates currentValue accordingly

### Testing
- Unit tests for validation logic
- Integration tests for Firestore writes
- Visual regression tests for form layout

### Observability
- Minimal retry logic wraps Firestore writes
- Consider adding analytics events for form interactions per policy

## KonsiergePage (stable)
- Lifecycle tag: stable
- Description: Full-featured service page for Kotikreikasta's concierge service. Explains the service offering, pricing, and process. Includes hero section, trust indicators, service categories, pricing tiers, and integrated contact form.

### Interface (required)
- Inputs
  - none (static page component)
- Outputs
  - Renders complete konsierge service page with SEO metadata
  - Integrates ContactForm with source type 'content'
- Side effects
  - Renders JSON-LD structured data (Service schema)
  - Loads ContactForm which writes to Firestore leads collection
  - Analytics tracking via ContactForm component

### Behavior
- Sections:
  - Hero with service value proposition and CTA buttons
  - Trust bar with key benefits (Finnish service, 24h response, direct payment, Greece-wide)
  - "What is it" split section (image + explanation)
  - "How it works" 4-step process guide
  - Services grid (6 categories: repairs, property care, authorities, legal, emergencies, other)
  - Pricing comparison (free for buyers 12 months, €39/month ongoing)
  - Disclaimer section
  - Contact section with ContactForm integration
- Fully responsive with mobile-first design
- All sections use clamp() for fluid typography and spacing
- Responsive grids collapse to single column on mobile

### Design
- Uses site-wide design system (CSS variables)
- Typography: Cormorant Garamond (headings), DM Sans (body)
- Color palette: aegean-deep, gold, sand, white
- Mobile padding: minimum 1.25rem (20px) on all sections
- Responsive grids with auto-fit and minmax patterns
- Images with proper min-height for mobile display

### SEO
- Comprehensive metadata in layout.tsx
- Open Graph and Twitter Cards
- Canonical URL
- JSON-LD Service schema
- Included in sitemap with priority 0.8
- Robots: index, follow

### Dependencies
- NavBar component
- Footer component
- ContactForm component
- Next.js metadata API

### Navigation
- Added to main navigation (desktop and mobile)
- Added to footer "Palvelut" section
- Accessible via /konsierge route

### Testing
- Visual regression tests for all sections
- Mobile responsiveness testing across breakpoints
- Contact form integration testing
- SEO metadata validation

### Observability
- Analytics via ContactForm component
- Lead tracking in Firestore
- Admin notifications via Novu and SendGrid

## ListingCard (stable)
- Lifecycle tag: stable
- Description: Reusable card component for displaying listing previews in grids. Used on front page (3 latest), listings page (all), and potentially in search results.

### Interface (required)
- Inputs
  - `listing`: Listing object with all listing data
- Outputs
  - Renders clickable card linking to `/listings/[urlStub]`
- Side effects
  - None (pure presentational component)

### Behavior
- Displays listing with:
  - Featured image with overlay gradient
  - Type badge (e.g., "Omakotitalo")
  - Condition badge if present (e.g., "Erinomainen kunto")
  - Price and price per m²
  - Location (locality · administrative_area_level_1)
  - Title
  - Specs grid (bedrooms, bathrooms, size, lot size, year built)
  - Top 6 amenities with highlighting for key features
  - Top 4 nearby POIs
  - CTA button "KATSO KOHDE →"
- Entire card is clickable Link component
- Hover effects: slight scale up and shadow

### Design
- Card-based layout with image, badges, and content sections
- Uses design system colors and typography
- Responsive grid layout (auto-fill minmax pattern)
- Highlight amenities: Vuoristonäköala, Merinäköala, Puutarha, Takka, Uima-allas

### Dependencies
- Next.js Link component
- Listing type from types/listing.ts

### Testing
- Visual regression tests for card layout
- Test with various listing data (with/without optional fields)
- Verify link navigation works

## ListingMap (stable)
- Lifecycle tag: stable
- Description: Read-only map component for displaying listing location on detail pages. Uses rounded coordinates (2 decimals) for privacy. Styled with same design as admin MapPicker.

### Interface (required)
- Inputs
  - `lat`: number - latitude coordinate
  - `lng`: number - longitude coordinate
- Outputs
  - Renders static Google Map with marker at rounded coordinates
- Side effects
  - Loads Google Maps JavaScript API
  - Fetches Maps API key from `/api/maps/key`

### Behavior
- Rounds coordinates to 2 decimal places (e.g., 37.869781 → 37.87)
- Centers map at rounded coordinates
- Places marker at rounded coordinates
- Map is read-only (no dragging, scrolling, or double-click zoom)
- Zoom level: 13
- Uses same map styling as admin MapPicker (warm earth tones)

### Design
- Height: 360px
- Border radius: 4px
- Border: 0.5px solid var(--border)
- Background: var(--sand)
- Map styles: warm earth tones matching site design

### Dependencies
- Google Maps JavaScript API
- Secret Manager via `/api/maps/key` route

### Testing
- Verify coordinates are rounded to 2 decimals
- Test map loads correctly
- Verify marker placement
- Test with various coordinate values

## LatestListingsServer (stable)
- Lifecycle tag: stable
- Description: Server-side component for displaying latest listings on homepage. Fetches from Firestore on server for SEO crawlability.

### Interface (required)
- Inputs
  - `count?`: number - number of listings to display (default: 3)
- Outputs
  - Renders grid of ListingCard components
- Side effects
  - Fetches latest published listings from Firestore on server

### Behavior
- Server-side rendering ensures all listing links are in HTML
- Orders by updatedAt descending
- Filters by status === 'published'
- Maps Firestore data to Listing type
- Handles bedrooms/bathrooms at root level (not in attributes)

### SEO Features
- All listing links are crawlable (no JS required)
- Provides link equity from homepage to listing pages

### Dependencies
- Firebase Admin SDK (server-side)
- ListingCard component
- Listing type from types/listing.ts

### Testing
- Test with curl to verify listing links in HTML
- Verify correct data mapping from Firestore

## Listing Detail Page (stable)
- Lifecycle tag: stable
- Path: `hosting/app/listings/[slug]/page.tsx`
- Description: Server-side rendered listing detail page with ISR. Displays full listing information with hero image, specs, amenities, nearby POIs, map, and contact form.

### Interface (required)
- Inputs
  - `params.slug`: string - listing URL slug
- Outputs
  - Full HTML page with listing details, map, and contact form
- Side effects
  - Server-side Firebase Admin fetch
  - ISR with 1 hour revalidation

### Behavior
- **Server Component**: Renders on server with ISR
- **ISR**: Revalidates every 3600 seconds (1 hour)
- **Dynamic Params**: Generates pages on-demand for new listings
- **Metadata**: Generates SEO tags with listing details
- Sections:
  - Hero with featured image, badges, title, location, price
  - Specs grid (bedrooms, bathrooms, size, lot size, year built)
  - Amenities with highlighting
  - Nearby POIs (up to 12)
  - Location section with simplified address and map
  - Contact form for lead generation

### Location Display
- Shows only: `locality, administrative_area_level_1` (e.g., "Porto Rafti, Attika")
- Map displays with coordinates rounded to 2 decimals for privacy
- No detailed street address shown publicly

### Data Mapping
- Bedrooms and bathrooms are at root level in Firestore (not in attributes)
- Handles optional fields gracefully (lotSize, yearBuilt, condition)
- Maps amenitiesList and appliancesList from root or attributes

### Components Used
- ListingMap (client) - Location map with rounded coordinates
- ContactForm (client) - Lead generation

### Dependencies
- Firebase Admin SDK (server-side)
- Next.js App Router with ISR
- ListingMap component
- ContactForm component

### Testing
- Test with curl to verify content in HTML
- Verify map displays with rounded coordinates
- Test contact form integration
- Verify metadata generation

## Listings Page (stable)
- Lifecycle tag: stable
- Path: `hosting/app/listings/page.tsx`
- Description: Server-side rendered listings index page with ISR. Displays all published listings in grid layout.

### Interface (required)
- Inputs
  - none
- Outputs
  - Full HTML page with all published listings
- Side effects
  - Server-side Firebase Admin fetch
  - ISR with 1 hour revalidation

### Behavior
- **Server Component**: Renders on server with ISR
- **ISR**: Revalidates every 3600 seconds (1 hour)
- Fetches up to 100 published listings
- Orders by updatedAt descending
- Displays count of listings
- Grid layout using ListingCard components

### SEO Features
- All listing links are crawlable
- Metadata with description
- Included in sitemap

### Dependencies
- Firebase Admin SDK (server-side)
- ListingCard component
- Listing type from types/listing.ts

### Testing
- Test with curl to verify all listings in HTML
- Verify grid layout responsiveness
- Test with various numbers of listings
