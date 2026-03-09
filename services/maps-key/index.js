import http from 'http';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

function fetchMetadata(path) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: 'metadata.google.internal',
        path,
        headers: { 'Metadata-Flavor': 'Google' },
      },
      (resp) => {
        if (resp.statusCode !== 200) {
          resolve(undefined);
          return;
        }
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => resolve(data.trim()));
      }
    );
    req.on('error', () => resolve(undefined));
    req.setTimeout(1000, () => {
      try { req.destroy(); } catch {}
      resolve(undefined);
    });
  });
}

async function getProjectId() {
  const envProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.PROJECT_ID;
  if (envProject) return envProject;
  try {
    const cfg = process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG);
    if (cfg?.projectId) return cfg.projectId;
  } catch {}
  // Try Cloud Run metadata server
  const metaId = await fetchMetadata('/computeMetadata/v1/project/project-id');
  if (metaId) return metaId;
  const metaNum = await fetchMetadata('/computeMetadata/v1/project/numeric-project-id');
  if (metaNum) return metaNum;
  return undefined;
}

async function handler(req, res) {
  if (req.method !== 'GET' || req.url.split('?')[0] !== '/api/maps/key') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  try {
    const projectId = await getProjectId();
    if (!projectId) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Project not detected' }));
      return;
    }
    const name = `projects/${projectId}/secrets/MAPS_JS_BROWSER_KEY/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const key = version?.payload?.data?.toString() ?? version?.payload?.data;
    if (!key) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Key not found' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(JSON.stringify({ key }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to read key' }));
  }
}

const server = http.createServer(handler);
const port = process.env.PORT || 8080;
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`maps-key service listening on ${port}`);
});
