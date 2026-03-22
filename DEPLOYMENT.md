# Deployment Guide

## Architecture

The application uses a **pure Cloud Run deployment** architecture:

```
Firebase Hosting (static files + rewrites)
  ↓ (HTTP rewrite)
Cloud Run Service: kotikreikasta-hosting
  ↓ (Next.js standalone server)
Application serving
```

## Deployment Process

### Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Firebase CLI installed and authenticated
- Docker (for local testing)
- Node.js 20

### Deploy to Production

**1. Build and Deploy Cloud Run Service**

```bash
# From project root
cd hosting

# Deploy using source-based deployment (builds with Dockerfile)
gcloud run deploy kotikreikasta-hosting \
  --source . \
  --region europe-west1 \
  --platform managed \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 60 \
  --set-env-vars NODE_ENV=production,GCLOUD_PROJECT=kotikreikasta
```

**2. Configure IAM Permissions**

The Cloud Run service must be publicly accessible. Configure via Google Cloud Console:

1. Go to: https://console.cloud.google.com/run/detail/europe-west1/kotikreikasta-hosting/security?project=kotikreikasta
2. Click "Add Principal"
3. Enter: `allUsers`
4. Role: `Cloud Run Invoker`
5. Save

**3. Deploy Firebase Hosting**

```bash
# From project root
firebase deploy --only hosting:kotikreikasta
```

### Deploy Admin Panel

The admin panel uses a separate Cloud Run service:

```bash
# Deploy admin Cloud Run service
cd admin
gcloud run deploy kotikreikasta-admin \
  --source . \
  --region europe-west1 \
  --platform managed \
  --memory 512Mi

# Deploy Firebase Hosting for admin
firebase deploy --only hosting:kotikreikasta-admin
```

### Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:functionName
```

## Configuration Files

### `hosting/Dockerfile`

Multi-stage Docker build for Next.js:
- Uses Node.js 20 Alpine
- Builds standalone output
- Optimized for production

### `hosting/next.config.js`

Key settings:
- `output: 'standalone'` - Enables Docker deployment
- `serverExternalPackages` - Excludes Firebase Admin SDK from bundling
- `images.unoptimized: true` - Serves original images

### `firebase.json`

Hosting configuration:
- `public: "hosting/public"` - Static files directory
- Rewrites to Cloud Run service `kotikreikasta-hosting`
- Separate rewrites for API services (maps-key, places-nearby)

## Environment Variables

Cloud Run services use these environment variables:

- `NODE_ENV=production`
- `GCLOUD_PROJECT=kotikreikasta`
- `FIREBASE_CONFIG` - Auto-injected by Firebase

Secrets are managed via Google Secret Manager and accessed by Cloud Functions.

## Monitoring

- **Cloud Run Logs**: https://console.cloud.google.com/run/detail/europe-west1/kotikreikasta-hosting/logs
- **Firebase Hosting**: https://console.firebase.google.com/project/kotikreikasta/hosting
- **Cloud Functions**: https://console.firebase.google.com/project/kotikreikasta/functions

## Rollback

If deployment fails:

1. **Revert Cloud Run**: Deploy previous revision
   ```bash
   gcloud run services update-traffic kotikreikasta-hosting \
     --to-revisions=PREVIOUS_REVISION=100 \
     --region=europe-west1
   ```

2. **Revert Hosting**: Previous versions are preserved
   ```bash
   firebase hosting:channel:list
   # Identify previous version and promote it
   ```

## Local Development

```bash
# Hosting (Next.js)
cd hosting
npm run dev

# Admin
cd admin
npm run dev

# Functions
cd functions
npm run serve
```

## Testing Before Production

Always test in a preview channel first:

```bash
# Deploy to preview channel
firebase hosting:channel:deploy preview-test

# Test at: https://kotikreikasta--preview-test-XXXXX.web.app

# If successful, deploy to production
firebase deploy --only hosting:kotikreikasta
```

## Troubleshooting

### Cloud Run 403 Errors

- Verify IAM permissions for `allUsers` with `Cloud Run Invoker` role
- Check organization policies aren't blocking public access

### Build Failures

- Ensure `output: 'standalone'` is set in `next.config.js`
- Check Dockerfile copies all necessary files
- Verify Node.js version matches (20)

### Hosting Rewrites Not Working

- Verify Cloud Run service name matches in `firebase.json`
- Check service is in correct region (`europe-west1`)
- Ensure service is publicly accessible

## Migration Notes

**Previous Architecture**: Firebase Hosting with Cloud Functions (frameworksBackend)  
**Current Architecture**: Firebase Hosting with Cloud Run (direct deployment)

**Benefits**:
- No ownership conflicts between Firebase and Cloud Functions
- Simpler deployment process
- Better control over container and runtime
- Faster deployments
- Direct access to Cloud Run logs and metrics
