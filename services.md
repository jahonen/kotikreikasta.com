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

## Maps JS Browser Key Service (beta)
- Lifecycle tag: beta
- Purpose: Provide the Google Maps JavaScript API browser key to the client securely via a backend endpoint.
- Region: EU (run in Hosting/Next.js runtime; Secret Manager in EU project scope per policy).

### Implementation
- Next.js route: `hosting/app/api/maps/key/route.ts`
  - Uses `@google-cloud/secret-manager` to access secret `MAPS_JS_BROWSER_KEY`.
  - Returns JSON `{ key: string }`.
  - Config: `export const dynamic = 'force-dynamic'` and `runtime = 'nodejs'`.

### Interface (required)
- Inputs
  - HTTP GET (no params)
- Outputs
  - 200 JSON: `{ key: string }`
  - 500 JSON: error shape on failures (no secret leakage)
- Side effects
  - Reads Secret Manager secret at call time (short in-memory cache recommended if needed later).
  - Logs start/end/errors without exposing secrets.

### Consumers
- `MapPicker` component loads Google Maps JS by calling `/api/maps/key` and then injecting the Maps script with `language=fi` and required libraries (`places`, plus `marker` if `mapId` exists).

### Notes
- Keep the secret value only in Secret Manager; never hardcode in source.
- If migrated to Cloud Run in the future, reflect the new endpoint here and deprecate the Next.js route.
