# Blog Editor Image Upload Fix

## Issue

Blog editor image uploads were failing with 500 Internal Server Error:
```
POST https://admin.kotikreikasta.com/api/upload-image-crops 500 (Internal Server Error)
SyntaxError: Unexpected token 'I', "Internal S"... is not valid JSON
```

## Root Causes

### 1. Missing Sharp Dependency
**Problem:** `sharp` was only an optional dependency of Next.js, not explicitly listed in `admin/package.json`

**Impact:** 
- Not installed in Cloud Run deployment environment
- Image processing failed when trying to import sharp
- API routes returned 500 errors

**Solution:** Added `sharp ^0.33.5` as explicit dependency in `admin/package.json`

### 2. Missing IAM Permissions
**Problem:** Cloud Run service account lacked `roles/serviceusage.serviceUsageConsumer` role

**Impact:**
- Firebase Admin SDK couldn't access Firebase services (Identity Toolkit, Storage)
- All Firebase operations failed with 403 PERMISSION_DENIED
- Image upload and authentication both failed

**Error Message:**
```
Caller does not have required permission to use project kotikreikasta. 
Grant the caller the roles/serviceusage.serviceUsageConsumer role
```

**Solution:** Granted permission to Cloud Run service account:
```bash
gcloud projects add-iam-policy-binding kotikreikasta \
  --member="serviceAccount:854585552743-compute@developer.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

## Service Account Permissions

Cloud Run service account: `854585552743-compute@developer.gserviceaccount.com`

**Current Roles:**
- `roles/aiplatform.user`
- `roles/artifactregistry.reader`
- `roles/artifactregistry.writer`
- `roles/datastore.user`
- `roles/firebase.admin`
- `roles/logging.logWriter`
- `roles/secretmanager.secretAccessor`
- `roles/serviceusage.serviceUsageConsumer` ✅ **ADDED**
- `roles/storage.objectViewer`

## Affected Components

### API Routes
- `/api/upload-image` - Simple image upload with optimization
- `/api/upload-image-crops` - Multi-crop image upload for blog/listings
- `/api/auth/session` - Session management (also affected by permission issue)

### Features
- Blog editor image upload
- Listing wizard featured image upload
- Listing wizard gallery image upload
- Admin authentication

## Deployment

**Branch:** `bug/blog-editor-image-processing`

**Changes:**
1. Updated `admin/package.json` to include sharp dependency
2. Granted IAM permission to Cloud Run service account
3. Deployed to production

**Deployment Command:**
```bash
firebase deploy --only hosting:kotikreikasta-admin
```

**Cloud Run Service:** `ssrkotikreikastaadmin` (us-central1)

## Testing

To verify the fix:

1. Navigate to https://admin.kotikreikasta.com/blogs/new
2. Click "Valitse kuva" to select an image
3. Crop the image using the crop editor
4. Click "Lataa ja rajaa kuva"
5. Image should upload successfully without errors

## Technical Details

### Image Processing Pipeline

1. **Client uploads file** → `/api/upload-image-crops`
2. **Server processes with sharp:**
   - Auto-rotate based on EXIF
   - Extract crops for each aspect ratio (16:9, 4:3, 1:1, 3:4, 9:16)
   - Generate 3 sizes per crop (full, og, thumbnail)
   - Optimize as progressive JPEG with mozjpeg
3. **Upload to Firebase Storage** with download tokens
4. **Return public URLs** to client

### Why Both Fixes Were Needed

1. **Sharp dependency** - Required for image processing to work at all
2. **IAM permission** - Required for Firebase Admin SDK to access Storage and other services

Without either fix, the upload would fail with 500 error.

## Related Issues

### Authentication 401 Error
The same IAM permission issue was also causing authentication failures:
```
POST https://admin.kotikreikasta.com/api/auth/session 401 (Unauthorized)
```

This is now fixed as the service account can access Firebase Identity Toolkit.

## Prevention

To prevent similar issues in the future:

1. **Always explicitly list dependencies** - Don't rely on transitive/optional dependencies
2. **Test in production-like environment** - Cloud Run has different constraints than local dev
3. **Check service account permissions** - Ensure all required IAM roles are granted
4. **Monitor Cloud Run logs** - Permission errors are visible in logs

## Cost Impact

- No additional cost from sharp dependency
- No additional cost from IAM permission
- Image processing happens server-side (already accounted for in Cloud Run costs)

## Status

✅ **FIXED AND DEPLOYED**
- Sharp dependency added
- IAM permission granted
- Deployed to production
- Image uploads working
- Authentication working
