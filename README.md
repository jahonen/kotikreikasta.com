# Kotikreikasta.com

> Finnish-language real estate platform for Greek properties with automated social media marketing

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

Kotikreikasta.com is a comprehensive real estate platform connecting Finnish buyers with Greek properties. The platform features a public-facing Next.js website, an admin panel for content management, and an automated social media publishing system powered by Vertex AI.

**Live Sites:**
- **Public:** https://kotikreikasta.com
- **Admin:** https://kotikreikasta-admin.web.app

## Architecture

### Tech Stack

**Frontend:**
- Next.js 15.1 (App Router, SSR/SSG hybrid)
- React 18.2 with TypeScript
- SCSS modules for styling
- Google Maps JavaScript API with Places (New)

**Backend:**
- Firebase Hosting (Cloud Run for SSR)
- Cloud Functions (Node.js 22, 1st Gen)
- Firestore (NoSQL database)
- Cloud Storage (images, documents)
- Secret Manager (credentials, API keys)

**AI & Automation:**
- Vertex AI (Gemini 1.5 Pro/Flash for content generation)
- Cloud Scheduler (automated publishing)
- Pub/Sub (event-driven architecture)

**Social Media Platforms:**
- Bluesky
- X (Twitter)
- Facebook
- Threads

### Project Structure

```
kotikreikasta.com/
├── hosting/              # Public Next.js website
│   ├── app/             # App Router pages
│   ├── components/      # Reusable React components
│   ├── lib/             # Utilities, Firebase config
│   └── styles/          # SCSS modules
├── admin/               # Admin Next.js panel
│   ├── app/             # Admin routes (Finnish UI)
│   ├── components/      # Admin-specific components
│   └── lib/             # Admin utilities
├── functions/           # Cloud Functions
│   ├── src/
│   │   ├── api/         # HTTP endpoints
│   │   ├── consumers/   # Social media publishers
│   │   ├── schedulers/  # Automated scheduling
│   │   ├── triggers/    # Firestore triggers
│   │   └── utils/       # Shared utilities
├── samplecode/          # Templates and examples
├── services/            # Cloud Run services
└── docs/                # Documentation (*.md files)
```

## Key Features

### 🏠 Real Estate Listings
- **Comprehensive property data:** Location, price, area, bedrooms, amenities
- **Greek administrative hierarchy:** Region → Regional Unit → Municipality → Locality
- **Interactive maps:** Google Maps with draggable markers, reverse geocoding
- **Image galleries:** Multiple images per listing with crop/resize tools
- **SEO optimized:** Dynamic meta tags, structured data, sitemap

### 📝 Content Management
- **Blog system:** Markdown-based articles with Finnish content
- **Admin panel:** Full CRUD operations (Finnish UI)
- **Draft/publish workflow:** Status tracking per content item
- **Image management:** Upload, crop, optimize
- **Category system:** Organize content by topics

### 🤖 Automated Social Media Publishing

**Architecture:** Scheduler-based with Firestore queue management

**Flow:**
1. Content published → Firestore trigger marks for social media
2. Status tracking: `queued: true, published: false` per platform
3. Scheduler runs every 83 minutes → checks posting windows
4. Within window → fetches oldest unpublished content (FIFO)
5. Publisher generates Finnish content via Vertex AI → posts → marks published

**Features:**
- ✅ One post per platform per posting window
- ✅ FIFO queue (oldest content first)
- ✅ Platform-specific schedules (different posting times)
- ✅ AI-generated Finnish content optimized for each platform
- ✅ UTM tracking for analytics
- ✅ Firestore status tracking with post IDs and URLs

**Platforms & Character Limits:**
- **Bluesky:** 300 chars (rich text facets for links)
- **X:** 280 chars (t.co link shortening)
- **Facebook:** 5000 chars (OG tag previews)
- **Threads:** 500 chars (two-step publish process)

### 📊 Analytics & Tracking
- **UTM parameters:** Source, medium, campaign, content
- **Firestore tracking:** Share records, statistics per platform
- **Google Analytics:** Traffic analysis, conversion tracking

### 🗺️ Location Services
- **MapPicker component:** Interactive map selection with search
- **Reverse geocoding:** Finnish-prioritized address formatting
- **Places API:** Autocomplete, nearby POI search
- **Administrative levels:** Greek hierarchy mapped to Finnish UI

## Getting Started

### Prerequisites

- Node.js 22+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK (for Secret Manager)
- Firebase project with Blaze plan

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/jahonen/kotikreikasta.com.git
cd kotikreikasta.com
```

2. **Install dependencies:**
```bash
# Public site
cd hosting
npm install

# Admin panel
cd ../admin
npm install

# Cloud Functions
cd ../functions
npm install
```

3. **Configure Firebase:**
```bash
firebase login
firebase use kotikreikasta
```

4. **Set up environment variables:**

Create `.env.local` files:

**hosting/.env.local:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kotikreikasta.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kotikreikasta
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kotikreikasta.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**admin/.env.local:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kotikreikasta.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kotikreikasta
```

5. **Configure secrets in Secret Manager:**

Required secrets for social media publishing:
```bash
# Platform credentials
gcloud secrets create BLUESKY_IDENTIFIER --data-file=- < identifier.txt
gcloud secrets create BLUESKY_PASSWORD --data-file=- < password.txt
gcloud secrets create X_API_KEY --data-file=- < x_key.txt
gcloud secrets create X_API_SECRET --data-file=- < x_secret.txt
gcloud secrets create X_ACCESS_TOKEN --data-file=- < x_token.txt
gcloud secrets create X_ACCESS_SECRET --data-file=- < x_token_secret.txt
gcloud secrets create FACEBOOK_PAGE_ID --data-file=- < fb_page_id.txt
gcloud secrets create META_SYSTEM_TOKEN --data-file=- < meta_token.txt
gcloud secrets create THREADS_USER_ID --data-file=- < threads_id.txt
gcloud secrets create THREADS_ACCESS_TOKEN --data-file=- < threads_token.txt

# Posting schedules (see samplecode/schedule_template_*.json)
gcloud secrets create BSKY_SCHEDULE --data-file=samplecode/schedule_template_bluesky.json
gcloud secrets create X_SCHEDULE --data-file=samplecode/schedule_template_x.json
gcloud secrets create FACEBOOK_SCHEDULE --data-file=samplecode/schedule_template_facebook.json
gcloud secrets create THREADS_SCHEDULE --data-file=samplecode/schedule_template_threads.json

# Content generation
gcloud secrets create SOCIAL_MEDIA_LLM_GUIDE --data-file=- < llm_guide.txt
gcloud secrets create GEMINI_COSTOPTIMIZED_MODEL --data-file=- <<< "gemini-1.5-flash-002"
gcloud secrets create GEMINI_QUALITY_MODEL --data-file=- <<< "gemini-1.5-pro-002"
```

### Development

**Public site:**
```bash
cd hosting
npm run dev
# Open http://localhost:3000
```

**Admin panel:**
```bash
cd admin
npm run dev
# Open http://localhost:3000
```

**Cloud Functions (emulator):**
```bash
cd functions
npm run serve
```

**Build:**
```bash
# Public site
cd hosting && npm run build

# Admin panel
cd admin && npm run build

# Functions
cd functions && npm run build
```

### Deployment

**Full deployment:**
```bash
firebase deploy
```

**Selective deployment:**
```bash
# Public site only
firebase deploy --only hosting:kotikreikasta

# Admin panel only
firebase deploy --only hosting:kotikreikasta-admin

# Functions only
firebase deploy --only functions

# Specific functions
firebase deploy --only functions:onBlogPostPublished,functions:socialMediaScheduler

# Firestore rules
firebase deploy --only firestore:rules

# Storage rules
firebase deploy --only storage
```

**Preview channel (testing):**
```bash
cd hosting
firebase hosting:channel:deploy preview-feature-name
```

## Social Media Publishing

### Setup Instructions

Detailed setup guides for each platform:
- [Bluesky Setup](SOCIAL_DEPLOYMENT.md#bluesky)
- [X (Twitter) Setup](X_SETUP_INSTRUCTIONS.md)
- [Facebook Setup](FACEBOOK_SETUP_INSTRUCTIONS.md)
- [Threads Setup](THREADS_SETUP_INSTRUCTIONS.md)

### Architecture Documentation

See [SOCIAL_MEDIA_PUBLISHER_ARCHITECTURE.md](SOCIAL_MEDIA_PUBLISHER_ARCHITECTURE.md) for:
- Complete architecture overview
- Firestore status tracking schema
- Vertex AI content generation
- Character limits and formatting
- Error handling and retry logic
- Monitoring and logging

### Cloud Functions

**Firestore Triggers:**
- `onBlogPostPublished` - Marks blog posts for social media
- `onListingPublished` - Marks listings for social media

**Scheduler:**
- `socialMediaScheduler` - Runs every 83 minutes, publishes during posting windows

**Publishers:**
- `blueskyPublisher` - Posts to Bluesky
- `xPublisher` - Posts to X
- `facebookPublisher` - Posts to Facebook
- `threadsPublisher` - Posts to Threads

**Cloud Scheduler Job:**
```bash
gcloud scheduler jobs create http bluesky-hourly-check \
  --schedule="0,23,46 * * * *" \
  --uri="https://europe-west1-kotikreikasta.cloudfunctions.net/socialMediaScheduler" \
  --http-method=GET \
  --location=europe-west1
```

## Firestore Collections

### Core Collections

**`listings`** - Property listings
```typescript
{
  title: string;
  description: string;
  price: number;
  area: number;
  bedrooms: number;
  location: string;
  coordinates: { lat: number; lng: number };
  images: string[];
  status: 'draft' | 'active' | 'sold';
  socialMediaStatus?: {
    [platform]: {
      queued: boolean;
      published: boolean;
      queuedAt?: Timestamp;
      publishedAt?: Timestamp;
      postId?: string;
      postUrl?: string;
    }
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`blog_posts`** - Blog articles
```typescript
{
  title: string;
  slug: string;
  contentMd: string;
  excerpt: string;
  categories: string[];
  status: 'draft' | 'published';
  socialMediaStatus?: { /* same as listings */ };
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`leads`** - Contact form submissions
```typescript
{
  source: { type: 'listing' | 'content'; /* ... */ };
  contact: { name: string; email?: string; phone?: string };
  message: string;
  consents: { termsAccepted: boolean; marketingOptIn: boolean };
  status: 'lead' | 'contacted' | 'qualified' | 'converted';
  statusPct: number;
  tcv: number;
  currentValue: number;
  createdAt: Timestamp;
}
```

### Subcollections

**`socialShares`** - Share tracking per content item
```typescript
{
  platform: 'bluesky' | 'x' | 'facebook' | 'threads';
  sharedAt: Timestamp;
  postId: string;
  postUrl: string;
  text: string;
  characterCount: number;
  success: boolean;
  error?: string;
}
```

## Component Documentation

### MapPicker (beta)
Interactive Google Maps component with search, drag, and reverse geocoding.

**Interface:**
```typescript
<MapPicker
  lat={37.9838}
  lng={23.7275}
  onChange={(location) => {
    console.log(location.lat, location.lng);
    console.log(location.formattedAddress);
    console.log(location.addressComponents);
  }}
/>
```

**Features:**
- Places (New) autocomplete search
- Draggable marker
- Reverse geocoding with Finnish prioritization
- Greek administrative hierarchy mapping
- Advanced marker support (when mapId configured)

See [component.md](component.md) for full documentation.

### ContactForm (beta)
Reusable contact form for listings and content pages.

**Interface:**
```typescript
<ContactForm
  source={{
    type: 'listing',
    listingId: 'abc123',
    title: 'Villa in Porto Rafti',
    url: 'https://kotikreikasta.com/listings/villa-porto-rafti',
    price: 450000
  }}
/>
```

**Features:**
- Firestore writes to `leads` collection
- Email/phone validation (at least one required)
- Terms consent required
- Optional marketing opt-in
- Admin notifications via Novu and SendGrid
- Finnish labels and validation messages

## Services Documentation

### Vertex AI Gemini Service (alpha)
Centralized Gemini model selection with EU-only regions.

**Models:**
- **Cost-optimized:** `gemini-1.5-flash-002` (internal tasks)
- **Quality:** `gemini-1.5-pro-002` (customer-facing content)

**Usage:**
```typescript
const text = await generateContent({
  prompt: 'Write a Finnish description...',
  tier: 'quality', // or 'cost'
  options: { temperature: 0.7, maxTokens: 500 }
});
```

See [services.md](services.md) for full documentation.

## Security & IAM

### Required IAM Roles

**Cloud Functions:**
- `roles/secretmanager.secretAccessor` - Access secrets
- `roles/aiplatform.user` - Vertex AI access
- `roles/datastore.user` - Firestore access
- `roles/pubsub.publisher` - Pub/Sub publishing

**Service Accounts:**
- Default App Engine service account for Cloud Functions
- Custom service account for admin operations

### Firestore Security Rules

```javascript
// Public read for published content
match /blog_posts/{postId} {
  allow read: if resource.data.status == 'published';
  allow write: if request.auth != null && request.auth.token.admin == true;
}

// Public create for leads (with validation)
match /leads/{leadId} {
  allow create: if request.resource.data.message != null
    && (request.resource.data.contact.email != null 
        || request.resource.data.contact.phone != null)
    && request.resource.data.consents.termsAccepted == true;
  allow read, update, delete: if request.auth != null 
    && request.auth.token.admin == true;
}
```

## Monitoring & Logging

### View Logs

**All functions:**
```bash
gcloud logging read 'resource.type=cloud_function' \
  --limit=50 \
  --project=kotikreikasta
```

**Specific function:**
```bash
gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=socialMediaScheduler' \
  --limit=20 \
  --project=kotikreikasta
```

**Social media publishing:**
```bash
gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=~"Publisher"' \
  --limit=50 \
  --project=kotikreikasta
```

### Key Metrics

- **Publishing success rate:** Successful posts / total attempts
- **Average duration:** Time from trigger to post
- **Character usage:** Average text length per platform
- **Retry rate:** Posts requiring retries
- **Platform distribution:** Shares per platform

## Testing

**Public site:**
```bash
cd hosting
npm test
```

**Admin panel:**
```bash
cd admin
npm test
```

**Manual testing:**
```bash
# Test social media publisher
./test-bluesky-pubsub.sh
```

## Documentation

### Project Documentation
- [README.md](README.md) - This file
- [component.md](component.md) - Reusable components
- [services.md](services.md) - Backend services
- [integration.md](integration.md) - External integrations

### Social Media
- [SOCIAL_MEDIA_PUBLISHER_ARCHITECTURE.md](SOCIAL_MEDIA_PUBLISHER_ARCHITECTURE.md) - Complete architecture
- [SOCIAL_DEPLOYMENT.md](SOCIAL_DEPLOYMENT.md) - Deployment guide
- [X_SETUP_INSTRUCTIONS.md](X_SETUP_INSTRUCTIONS.md) - X/Twitter setup
- [FACEBOOK_SETUP_INSTRUCTIONS.md](FACEBOOK_SETUP_INSTRUCTIONS.md) - Facebook setup
- [THREADS_SETUP_INSTRUCTIONS.md](THREADS_SETUP_INSTRUCTIONS.md) - Threads setup

### Implementation Plans
- [CONTENT_MARKETING_IMPLEMENTATION_PLAN.md](CONTENT_MARKETING_IMPLEMENTATION_PLAN.md)
- [SSG_MIGRATION_PLAN.md](SSG_MIGRATION_PLAN.md)
- [DEPLOYMENT_OPTIMIZATION.md](DEPLOYMENT_OPTIMIZATION.md)

### Troubleshooting
- [LESSONS_LEARNED.md](LESSONS_LEARNED.md)
- [ADMIN_403_REMEDIATION_PLAN.md](ADMIN_403_REMEDIATION_PLAN.md)
- [BLOG_SSR_FIX.md](BLOG_SSR_FIX.md)

## Contributing

This is a private project. For questions or issues, contact the repository owner.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contact

- **Website:** https://kotikreikasta.com
- **GitHub:** https://github.com/jahonen/kotikreikasta.com

---

**Built with ❤️ for Finnish buyers seeking their dream home in Greece**

*Last updated: March 19, 2026*
