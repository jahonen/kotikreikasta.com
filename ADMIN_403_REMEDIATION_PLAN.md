# Admin Site 403 Errors - Root Cause Analysis & Remediation Plan

## Executive Summary

The admin site at `admin.kotikreikasta.com` returns **403 Forbidden** for all requests including:
- Static assets (`/favicon.ico`)
- API routes (`/api/auth/session`, `/api/maps/key`)
- Next.js Server Components (RSC) requests (`/service-requests?_rsc=...`, `/marketing?_rsc=...`)

**Root Cause:** Firebase Hosting rewrites for the admin site are routing `/api/maps/key` and `/api/places/nearby` to Cloud Run services that **only allow Firebase service account invocations**, not the admin SSR function. All other requests (including `/api/auth/session`, pages, and static assets) are **not being routed to the admin SSR function at all** because there's no catch-all rewrite.

## Current Architecture Issues

### 1. **Missing Catch-All Rewrite for Admin SSR Function**
**Problem:** `firebase.json` admin site config only has explicit rewrites for `/api/maps/key` and `/api/places/nearby`. There's no rewrite to route all other requests to the admin Next.js SSR function (`ssrkotikreikastaadmin`).

**Impact:** 
- `/api/auth/session` → 403 (not routed anywhere)
- `/favicon.ico` → 403 (not routed anywhere)
- `/service-requests?_rsc=...` → 403 (not routed anywhere)
- All admin pages and API routes → 403

**Evidence:**
```json
// Current firebase.json admin config (INCOMPLETE)
{
  "source": "admin",
  "site": "kotikreikasta-admin",
  "rewrites": [
    {
      "source": "/api/maps/key",
      "run": { "serviceId": "maps-key", "region": "europe-west1" }
    },
    {
      "source": "/api/places/nearby",
      "run": { "serviceId": "places-nearby", "region": "europe-west1" }
    }
    // MISSING: catch-all rewrite to ssrkotikreikastaadmin
  ]
}
```

### 2. **Cloud Run IAM Permissions Too Restrictive**
**Problem:** `maps-key` and `places-nearby` services only allow invocation by Firebase service accounts, not by the admin SSR function's service account.

**Current IAM for maps-key:**
```json
{
  "bindings": [
    {
      "members": [
        "serviceAccount:service-854585552743@gcp-sa-firebase.iam.gserviceaccount.com"
      ],
      "role": "roles/run.invoker"
    }
  ]
}
```

**Impact:** Even if Hosting routes requests correctly, the admin SSR function cannot invoke these services.

### 3. **Admin Next.js Config Missing Favicon Handling**
**Problem:** `admin/next.config.js` doesn't have a favicon redirect like the hosting app does.

**Impact:** `/favicon.ico` requests aren't handled by Next.js, leading to 404/403.

### 4. **Duplicate API Routes Conflict**
**Problem:** Admin has `/admin/app/api/maps/key/route.ts` and `/admin/app/api/places/nearby/route.ts` but firebase.json rewrites bypass these and route to external Cloud Run services instead.

**Impact:** Confusion about which implementation is used; the admin API routes are unreachable.

## Remediation Plan

### Phase 1: Fix Firebase Hosting Configuration (CRITICAL)

#### Action 1.1: Add Catch-All Rewrite for Admin SSR Function
**File:** `firebase.json`

**Change:**
```json
{
  "source": "admin",
  "site": "kotikreikasta-admin",
  "appId": "1:854585552743:web:2f08e4338fc58b825209c2",
  "frameworksBackend": {
    "region": "europe-west1"
  },
  "rewrites": [
    {
      "source": "/api/maps/key",
      "run": {
        "serviceId": "maps-key",
        "region": "europe-west1"
      }
    },
    {
      "source": "/api/places/nearby",
      "run": {
        "serviceId": "places-nearby",
        "region": "europe-west1"
      }
    },
    {
      "source": "**",
      "function": {
        "functionId": "ssrkotikreikastaadmin",
        "region": "europe-west1"
      }
    }
  ]
}
```

**Rationale:** Firebase Hosting processes rewrites in order. Specific routes (`/api/maps/key`, `/api/places/nearby`) are matched first, then the catch-all `**` routes everything else to the admin SSR function.

**Alternative (Simpler):** Remove the `/api/maps/key` and `/api/places/nearby` rewrites entirely and let the admin Next.js API routes handle them (requires updating those routes to use Secret Manager).

#### Action 1.2: Deploy Hosting Configuration
```bash
firebase deploy --only hosting:kotikreikasta-admin
```

### Phase 2: Fix Cloud Run IAM Permissions

#### Action 2.1: Grant Admin SSR Function Permission to Invoke maps-key
```bash
gcloud run services add-iam-policy-binding maps-key \
  --region=europe-west1 \
  --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

#### Action 2.2: Grant Admin SSR Function Permission to Invoke places-nearby
```bash
gcloud run services add-iam-policy-binding places-nearby \
  --region=europe-west1 \
  --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**Rationale:** The admin SSR function runs under the App Engine default service account (`kotikreikasta@appspot.gserviceaccount.com`). It needs permission to invoke the Cloud Run services.

### Phase 3: Fix Admin Next.js Configuration

#### Action 3.1: Add Favicon Redirect to admin/next.config.js
**File:** `admin/next.config.js`

**Change:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/assets/favicon/favicon.ico",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

**Alternative:** Add a `public/favicon.ico` file to the admin app.

#### Action 3.2: Redeploy Admin App
```bash
firebase deploy --only hosting:kotikreikasta-admin
```

### Phase 4: Architectural Decision - API Route Strategy

**Decision Required:** Choose one of two approaches:

#### Option A: Use External Cloud Run Services (Current Intent)
- Keep firebase.json rewrites to `maps-key` and `places-nearby`.
- Remove `/admin/app/api/maps/key/route.ts` and `/admin/app/api/places/nearby/route.ts` (they're unreachable anyway).
- Update `MapPicker.tsx` and `PointsOfInterestPicker.tsx` to handle potential CORS or auth issues.
- **Pros:** Centralized secret management, reusable across apps.
- **Cons:** More complex IAM, potential CORS issues, harder to debug.

#### Option B: Use Admin Next.js API Routes (Simpler)
- Remove `/api/maps/key` and `/api/places/nearby` rewrites from firebase.json admin config.
- Update `/admin/app/api/maps/key/route.ts` to read from Secret Manager instead of env vars.
- Update `/admin/app/api/places/nearby/route.ts` to read Google API key from Secret Manager.
- **Pros:** Simpler routing, no IAM complexity, easier debugging.
- **Cons:** Duplicate secret access code across apps.

**Recommendation:** **Option B** - Use admin Next.js API routes with Secret Manager. This is simpler, aligns with the admin app being self-contained, and avoids IAM complexity.

### Phase 5: Implement Option B (Recommended)

#### Action 5.1: Update firebase.json - Remove Admin API Rewrites
**File:** `firebase.json`

**Change:**
```json
{
  "source": "admin",
  "site": "kotikreikasta-admin",
  "appId": "1:854585552743:web:2f08e4338fc58b825209c2",
  "frameworksBackend": {
    "region": "europe-west1"
  }
  // No explicit rewrites - frameworksBackend handles routing to SSR function
}
```

**Rationale:** When `frameworksBackend` is specified without explicit rewrites, Firebase Hosting automatically routes all requests to the SSR function.

#### Action 5.2: Update admin/app/api/maps/key/route.ts to Use Secret Manager
**File:** `admin/app/api/maps/key/route.ts`

**Change:**
```typescript
import { NextResponse } from 'next/server';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new SecretManagerServiceClient();

async function getGoogleMapsApiKey(): Promise<string | null> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'kotikreikasta';
    const name = `projects/${projectId}/secrets/GOOGLE_MAPS_API_KEY/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version?.payload?.data;
    if (!payload) return null;
    return typeof payload === 'string' ? payload : payload.toString('utf8');
  } catch (e: any) {
    console.error('Failed to fetch GOOGLE_MAPS_API_KEY from Secret Manager:', e?.message || String(e));
    return null;
  }
}

export async function GET() {
  try {
    const key = await getGoogleMapsApiKey();
    if (!key) {
      return NextResponse.json({ error: 'missing_key' }, { status: 500 });
    }
    return NextResponse.json({ key });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message || String(e) }, { status: 500 });
  }
}
```

#### Action 5.3: Update admin/app/api/places/nearby/route.ts to Use Secret Manager
**File:** `admin/app/api/places/nearby/route.ts`

**Change:** Similar to Action 5.2, update to fetch the Google Maps API key from Secret Manager instead of env vars.

#### Action 5.4: Ensure @google-cloud/secret-manager is in admin/package.json
```bash
cd admin
npm install @google-cloud/secret-manager
```

#### Action 5.5: Update admin/next.config.js serverExternalPackages
**File:** `admin/next.config.js`

**Change:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/secret-manager",
    "google-auth-library",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/assets/favicon/favicon.ico",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

### Phase 6: Verification & Testing

#### Test 6.1: Verify Admin SSR Function Direct Access
```bash
curl -i https://ssrkotikreikastaadmin-46sdi6q5sa-ew.a.run.app/api/auth/session
```
**Expected:** 200 OK with JSON response (not 403).

#### Test 6.2: Verify Admin Domain After Deploy
```bash
curl -i https://admin.kotikreikasta.com/api/auth/session
```
**Expected:** 200 OK with JSON response.

#### Test 6.3: Verify Maps Key Endpoint
```bash
curl -i https://admin.kotikreikasta.com/api/maps/key
```
**Expected:** 200 OK with `{ "key": "..." }`.

#### Test 6.4: Verify Favicon
```bash
curl -i https://admin.kotikreikasta.com/favicon.ico
```
**Expected:** 302 redirect or 200 OK (not 403).

#### Test 6.5: Verify Admin UI Loads
Open `https://admin.kotikreikasta.com` in browser.
**Expected:** Login page or admin dashboard (no 403 errors in console).

## Implementation Order

1. **Immediate (Critical):** Update `firebase.json` to remove admin API rewrites (Phase 5, Action 5.1).
2. **Immediate (Critical):** Add favicon redirect to `admin/next.config.js` (Phase 3, Action 3.1).
3. **Immediate (Critical):** Deploy hosting: `firebase deploy --only hosting:kotikreikasta-admin`.
4. **High Priority:** Update admin API routes to use Secret Manager (Phase 5, Actions 5.2-5.5).
5. **High Priority:** Redeploy admin app: `firebase deploy --only hosting:kotikreikasta-admin`.
6. **Verification:** Run all tests (Phase 6).

## Secret Manager Setup (If Not Already Done)

Ensure the following secrets exist in Google Secret Manager:
```bash
# Check if secret exists
gcloud secrets describe GOOGLE_MAPS_API_KEY --project=kotikreikasta

# If not, create it
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets create GOOGLE_MAPS_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=kotikreikasta

# Grant admin SSR function access
gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=kotikreikasta
```

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `firebase.json` | Remove admin `/api/maps/key` and `/api/places/nearby` rewrites | Let frameworksBackend handle all routing to admin SSR function |
| `admin/next.config.js` | Add favicon redirect and serverExternalPackages | Handle favicon requests, externalize Secret Manager SDK |
| `admin/app/api/maps/key/route.ts` | Use Secret Manager instead of env vars | Align with deployment policy |
| `admin/app/api/places/nearby/route.ts` | Use Secret Manager for API key | Align with deployment policy |
| `admin/package.json` | Ensure `@google-cloud/secret-manager` dependency | Required for Secret Manager access |

## Expected Outcome

After implementing this plan:
- ✅ `admin.kotikreikasta.com` loads without 403 errors
- ✅ `/api/auth/session` returns 200 OK
- ✅ `/api/maps/key` returns 200 OK with Maps key from Secret Manager
- ✅ `/api/places/nearby` returns 200 OK with nearby places data
- ✅ `/favicon.ico` redirects or serves correctly
- ✅ All admin pages and RSC requests work
- ✅ MapPicker and POI picker components function correctly
- ✅ No local env vars used in deployed code
- ✅ All secrets managed via Google Secret Manager
