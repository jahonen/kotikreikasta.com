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
