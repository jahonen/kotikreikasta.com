# External Integrations

## Firebase Web Client (Public site) – API key restrictions (stable)
- Lifecycle tag: stable
- Scope: Public Next.js app under `hosting/`

### Summary
- Public client initializes Firebase using Hosting‑injected config from `https://<site>/__/firebase/init.json`.
- API key referrer allowlist updated to enable Firestore reads from production domains while remaining locked down.

### Configuration
- Web App appId: `1:854585552743:web:2f08e4338fc58b825209c2`
- API key resource: `projects/854585552743/locations/global/keys/591fee89-1912-4a7d-88cf-28fad9ccc26b` (Browser key – auto created by Firebase)
- Allowed referrers (HTTP):
  - `https://kotikreikasta.com/*`
  - `https://*.kotikreikasta.com/*`
  - `https://kotikreikasta.web.app/*`
  - `https://kotikreikasta.firebaseapp.com/*`
- API targets preserved (subset): `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `firebaseinstallations.googleapis.com`, `securetoken.googleapis.com`, etc.
- App Check enforcement: OFF (server‑side enforcement not enabled). If turning ON later, install the client SDK and register a web provider.

### Firestore rules alignment
- Public read is allowed only when `resource.data.status == "published"` (see `firestore.rules → match /blog_posts/{doc}`)
- Client queries explicitly filter `status == 'published'` and by `urlStub`.

### Verification steps
1. Hard refresh a blog URL `/blog/<slug>`; content should load and console should be free of `FirebaseError: Missing or insufficient permissions`.
2. Visit `https://kotikreikasta.com/__/firebase/init.json` and confirm the `apiKey` matches the configured resource.
3. If browsing via preview channels, add their host patterns to the allowlist (e.g. `https://kotikreikasta--*.web.app/*`).

### Operational notes
- Do not add `localhost` to production key. For local dev, use a separate env key or add a temporary referrer only on local machines.
- If App Check is enabled in the future, referrer allowlist remains required for the browser key; App Check tokens add another validation layer at Firebase services.

### Change log
- 2026‑03‑14: Added explicit apex + subdomain referrers for `kotikreikasta.com` and Web Hosting mirrors; verified Firestore reads from public pages.
