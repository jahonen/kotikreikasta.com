/* Simple Cloud Run service to proxy Google Places API (New) nearby search */
const express = require('express');

const ALLOWED_ORIGINS = [
  'https://kotikreikasta.com',
  'https://www.kotikreikasta.com',
  'https://kotikreikasta.web.app',
  'https://kotikreikasta.firebaseapp.com',
  'https://kotikreikasta-hosting-46sdi6q5sa-ew.a.run.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (req.path === '/healthz') return next();
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+-kotikreikasta-[a-z0-9]+-ew\.a\.run\.app$/.test(origin) ||
    /^https:\/\/[\w-]+-kotikreikasta-[a-z0-9]+-uc\.a\.run\.app$/.test(origin);
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
});

let cachedProjectId = null;
async function getProjectId() {
  if (cachedProjectId) return cachedProjectId;
  if (process.env.GOOGLE_CLOUD_PROJECT) return (cachedProjectId = process.env.GOOGLE_CLOUD_PROJECT);
  if (process.env.GCLOUD_PROJECT) return (cachedProjectId = process.env.GCLOUD_PROJECT);
  if (process.env.GCP_PROJECT) return (cachedProjectId = process.env.GCP_PROJECT);
  if (process.env.FIREBASE_CONFIG) {
    try {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
      if (cfg && cfg.projectId) return (cachedProjectId = cfg.projectId);
    } catch {}
  }
  // Cloud Run fallback: query metadata server
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 800);
    const resp = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(t);
    if (resp && resp.ok) {
      const pid = (await resp.text()).trim();
      if (pid) return (cachedProjectId = pid);
    }
  } catch {}
  return undefined;
}

let cachedKey = null;
let loggedSecretMeta = false;
async function getApiKey() {
  const projectId = await getProjectId();
  const secretName = process.env.GOOGLE_PLACES_API_KEY_SECRET || 'MAPS_JS_BROWSER_KEY';
  if (!projectId) throw new Error('Missing project id');
  const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  if (cachedKey) return cachedKey;
  if (!loggedSecretMeta) {
    try { console.log('Using secret for Places key', { projectId, secretName }); } catch {}
    loggedSecretMeta = true;
  }
  let version;
  try {
    [version] = await client.accessSecretVersion({ name: `projects/${projectId}/secrets/${secretName}/versions/latest` });
  } catch (e) {
    const err = new Error(`Failed to access secret ${secretName}: ${e?.message || e}`);
    err.status = 500;
    throw err;
  }
  const bytes = version.payload && version.payload.data ? version.payload.data : undefined;
  const payload = bytes ? Buffer.from(bytes).toString('utf8') : undefined;
  if (!payload) throw new Error('Missing Places API key');
  cachedKey = payload.trim();
  return cachedKey;
}

async function searchNearby(center, radius, includedTypes) {
  const key = await getApiKey();
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const payload = {
    languageCode: 'fi',
    locationRestriction: {
      circle: {
        center: { latitude: Number(center.latitude ?? center.lat), longitude: Number(center.longitude ?? center.lng) },
        radius: Math.min(Math.max(Number(radius || 2000), 1), 50000),
      },
    },
    includedTypes: Array.isArray(includedTypes) && includedTypes.length ? includedTypes : undefined,
    maxResultCount: 20,
  };
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.primaryType',
    'places.types',
    'places.location',
  ].join(',');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`Places API error: ${resp.status}`);
    err.status = 502;
    err.details = text;
    throw err;
  }
  return resp.json();
}

function ok(res, body) {
  res.set('Cache-Control', 'no-store');
  return res.status(200).json(body);
}
function bad(res, code, message, extra) {
  res.set('Cache-Control', 'no-store');
  return res.status(code).json({ error: message, ...(extra || {}) });
}

// Accept both the exact route used by Hosting rewrite and a shorter variant
app.post(['/api/places/nearby', '/places/nearby', '/nearby'], async (req, res) => {
  try {
    console.log('REQ /nearby', { path: req.path, body: req.body });
    const body = req.body || {};
    const { center, radius, includedTypes } = body;
    const lat = Number(center?.lat ?? center?.latitude);
    const lng = Number(center?.lng ?? center?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return bad(res, 400, 'Invalid center');
    }
    const data = await searchNearby({ lat, lng }, radius, includedTypes);
    return ok(res, data);
  } catch (e) {
    console.error('ERR /nearby', e);
    const code = e && e.status ? e.status : 500;
    return bad(res, code, e?.message || 'Unexpected error', e?.details ? { details: e.details } : undefined);
  }
});

app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/', (req, res) => res.status(200).send('places-nearby'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`places-nearby listening on ${PORT}`);
});
