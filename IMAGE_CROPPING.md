# Multi-Aspect-Ratio Image Cropping

## Overview

The image cropping feature allows content creators to define optimal crops for 5 different aspect ratios, each generated in 3 sizes:

### Aspect Ratios
- **16:9** - Landscape (ideal for OG images, Twitter cards, hero sections)
- **4:3** - Standard (ideal for preview cards)
- **1:1** - Square (ideal for Instagram, small previews)
- **3:4** - Portrait (ideal for mobile stories)
- **9:16** - Vertical (ideal for mobile stories, reels)

### Image Sizes (per aspect ratio)
- **Full** (2868px max) - High quality for hero sections, cards, and main content display
- **OG** (1200px max) - Optimized for social media OG metadata (compliant with platform requirements)
- **Thumbnail** (400px max) - Small previews for performance optimization

**Total: 15 versions per image** (5 aspect ratios × 3 sizes)

Each crop is generated server-side with automatic EXIF rotation correction and stored in Firebase Storage with download tokens for public access.

## Components

### ImageCropEditor
**Location:** `admin/components/admin/ImageCropEditor.tsx`

A 5-step wizard that guides users through cropping an image for all aspect ratios.

**Features:**
- Interactive cropper with zoom/pan controls
- Progress indicator
- Finnish labels
- Visual feedback for completed crops
- Responsive design

**Usage:**
```tsx
import ImageCropEditor from './ImageCropEditor';

const [showCropEditor, setShowCropEditor] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);

<ImageCropEditor
  open={showCropEditor}
  onClose={() => setShowCropEditor(false)}
  onSave={async (crops) => {
    const result = await uploadImageWithCrops(
      selectedFile,
      crops,
      'blog-images',
      docId
    );
    // result.original - original image URL
    // result.crops - object with all crop URLs
  }}
  imageFile={selectedFile}
  title="Rajaa kuva"
/>
```

## API Endpoints

### POST /api/upload-image-crops

Uploads an image and generates all 5 aspect ratio crops.

**Authentication:** Requires a valid Firebase ID token in the `Authorization: Bearer <token>` or `x-firebase-auth: <token>` header, and the token must belong to a `@kotikreikasta.com` user.

**Allowed path prefixes:** `media/public/`, `media/admin/`, `blog/`, `blog-images/`, `listings/`. Requests to other storage paths are rejected with `400 invalid_path`. Path traversal (`..`) is also rejected.

**Request:**
```typescript
FormData {
  file: File,
  crops: JSON string of crop coordinates,
  path: string (e.g., 'blog-images'),
  docId: string
}
```

**Response:**
```json
{
  "success": true,
  "original": "https://firebasestorage.googleapis.com/...",
  "crops": {
    "16:9": {
      "full": "https://firebasestorage.googleapis.com/.../16-9.jpg",
      "og": "https://firebasestorage.googleapis.com/.../16-9-og.jpg",
      "thumbnail": "https://firebasestorage.googleapis.com/.../16-9-thumb.jpg"
    },
    "4:3": {
      "full": "https://firebasestorage.googleapis.com/.../4-3.jpg",
      "og": "https://firebasestorage.googleapis.com/.../4-3-og.jpg",
      "thumbnail": "https://firebasestorage.googleapis.com/.../4-3-thumb.jpg"
    },
    "1:1": {
      "full": "https://firebasestorage.googleapis.com/.../1-1.jpg",
      "og": "https://firebasestorage.googleapis.com/.../1-1-og.jpg",
      "thumbnail": "https://firebasestorage.googleapis.com/.../1-1-thumb.jpg"
    },
    "3:4": {
      "full": "https://firebasestorage.googleapis.com/.../3-4.jpg",
      "og": "https://firebasestorage.googleapis.com/.../3-4-og.jpg",
      "thumbnail": "https://firebasestorage.googleapis.com/.../3-4-thumb.jpg"
    },
    "9:16": {
      "full": "https://firebasestorage.googleapis.com/.../9-16.jpg",
      "og": "https://firebasestorage.googleapis.com/.../9-16-og.jpg",
      "thumbnail": "https://firebasestorage.googleapis.com/.../9-16-thumb.jpg"
    }
  }
}
```

## Utilities

### uploadImageWithCrops
**Location:** `admin/lib/crop-utils.ts`

Helper function to upload images with crops.

```typescript
const result = await uploadImageWithCrops(
  file: File,
  crops: Record<string, CropArea>,
  path: string,
  docId: string
);
```

### getOptimalCrop
**Location:** `hosting/lib/image-utils.ts`

Smart image selection based on context.

```typescript
import { getOptimalCrop } from '../lib/image-utils';

// Get best crop for OG tags (16:9)
const ogImage = getOptimalCrop(featuredImage, 'og');

// Get best crop for preview cards (4:3)
const cardImage = getOptimalCrop(featuredImage, 'card');

// Get best crop for gallery (1:1)
const thumbImage = getOptimalCrop(featuredImage, 'gallery');
```

**Contexts:**
- `og` - Open Graph images (16:9)
- `twitter` - Twitter cards (16:9)
- `hero` - Hero sections (16:9)
- `card` - Preview cards (4:3)
- `preview` - Small previews (1:1)
- `gallery` - Gallery grids (1:1)

## Firestore Schema

**Collection:** `blogs` or `listings`

```typescript
{
  featuredImage: {
    url: string,
    alt?: string,
    crops?: {
      '16:9'?: {
        full: string,
        og: string,
        thumbnail: string
      },
      '4:3'?: {
        full: string,
        og: string,
        thumbnail: string
      },
      '1:1'?: {
        full: string,
        og: string,
        thumbnail: string
      },
      '3:4'?: {
        full: string,
        og: string,
        thumbnail: string
      },
      '9:16'?: {
        full: string,
        og: string,
        thumbnail: string
      }
    }
  }
}
```

**Note:** The schema is backward compatible with the old flat structure where crops were stored as direct strings.

### Listings
```typescript
{
  media: {
    featured: {
      url: string,
      crops?: {
        '16:9'?: string,
        '4:3'?: string,
        '1:1'?: string,
        '3:4'?: string,
        '9:16'?: string
      }
    },
    gallery: [{
      url: string,
      crops?: {
        '1:1'?: string
      }
    }]
  }
}
```

## Storage Structure

```
blog-images/
  {docId}/
    original.jpg
    16-9.jpg
    4-3.jpg
    1-1.jpg
    3-4.jpg
    9-16.jpg

listings/
  {docId}/
    original.jpg
    16-9.jpg
    4-3.jpg
    1-1.jpg
    3-4.jpg
    9-16.jpg
  {docId}-gallery-0/
    original.jpg
    1-1.jpg
```

## Migration

### Migrate Existing Images

Run the migration script to add crops to existing blog posts and listings:

```bash
# Deploy the migration function
cd functions
npm run deploy -- --only functions:migrateImages

# Trigger the migration
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/migrateImages
```

**What it does:**
- Downloads existing images
- Calculates center crops for each aspect ratio
- Generates and uploads all 5 crops
- Updates Firestore documents with crop URLs
- Processes both blog posts and listings
- Handles gallery images (1:1 crop only)

**Safety:**
- Skips images that already have crops
- Skips documents without images
- Logs all operations
- Non-destructive (adds crops, doesn't modify originals)

## Integration

### BlogEditor
Already integrated. When uploading a featured image:
1. User selects image file
2. ImageCropEditor opens with 5-step wizard
3. User crops each aspect ratio
4. All crops are uploaded to Firebase Storage
5. URLs saved to `featuredImage.crops`

### ListingWizard
Already integrated. Supports:
- **Featured images**: All 5 aspect ratios
- **Gallery images**: 1:1 crop only

### Public Pages
Blog and listing pages automatically use optimal crops:
- OG tags use 16:9 crops
- Twitter cards use 16:9 crops
- Hero sections use 16:9 crops
- Preview cards can use 4:3 crops
- Gallery grids use 1:1 crops

## Benefits

✅ **Better SEO** - Optimal OG images for each platform  
✅ **Faster Loading** - Right-sized images for each context  
✅ **Better UX** - Images always look good, no awkward crops  
✅ **Future-proof** - Ready for new social platforms  
✅ **Reusable** - One component for all image uploads  
✅ **Backward Compatible** - Existing images still work  

## Dependencies

- `react-easy-crop` - Interactive cropping UI
- `sharp` - Server-side image processing
- `firebase-admin` - Storage and Firestore access

## Social Media Integration

### Platform-Specific Optimal Crops

The system automatically serves the best crop for each platform via OG metadata:

**Bluesky**
- Uses: 16:9 crop (landscape)
- Why: Bluesky displays landscape images prominently in feeds
- Implementation: OG tags use `getOptimalCrop(featuredImage, 'og')`

**Threads (Instagram)**
- Uses: 1:1 crop (square) via link preview
- Why: Instagram-style square format native to platform
- Implementation: Link attachment pulls OG image (16:9), but 1:1 available for future direct uploads

**Facebook**
- Uses: 16:9 crop (landscape)
- Why: Link previews display landscape format optimally
- Implementation: OG tags use `getOptimalCrop(featuredImage, 'og')`

**Twitter/X**
- Uses: 16:9 crop (landscape)
- Why: Twitter cards prefer 16:9 aspect ratio
- Implementation: Twitter-specific OG tags use `getOptimalCrop(featuredImage, 'twitter')`

### Cloud Functions

All social media publishing Cloud Functions (`functions/src/consumers/`) automatically benefit from optimal crops because they:

1. **Scrape OG metadata** from the published URL
2. **Extract the image** from OG tags
3. **Upload to platform** - the image is already optimized

No code changes needed in consumers - they inherit the optimal crop automatically via OG tags.

### Future Direct Uploads

For platforms that support direct image uploads (not just link previews), use the `image-crop-utils.ts` helper:

```typescript
import { extractOptimalImage } from '../utils/image-crop-utils';

// Get optimal crop for specific platform
const imageUrl = extractOptimalImage(featuredImage, 'bluesky'); // 16:9
const imageUrl = extractOptimalImage(featuredImage, 'threads'); // 1:1
const imageUrl = extractOptimalImage(featuredImage, 'facebook'); // 16:9
const imageUrl = extractOptimalImage(featuredImage, 'instagram'); // 1:1
```

## Deployment

The image cropping feature is deployed as part of the admin Cloud Run service.

### Admin Service Deployment

```bash
# Deploy admin service with image upload API
cd admin
gcloud run deploy ssrkotikreikastaadmin \
  --source . \
  --region europe-west1 \
  --platform managed \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 60 \
  --set-env-vars NODE_ENV=production,GCLOUD_PROJECT=kotikreikasta
```

### Firebase Storage Configuration

The feature uses Firebase Storage with **uniform bucket-level access** enabled. Files are made publicly accessible using download tokens instead of individual file ACLs.

Each uploaded file gets a unique token in its metadata:
```
firebaseStorageDownloadTokens: <random-hex-token>
```

URLs follow this format:
```
https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
```

## Troubleshooting

### Issue: "Cannot update access control for an object when uniform bucket-level access is enabled"

**Cause**: Attempting to use `makePublic()` on individual files when the bucket has uniform bucket-level access enabled.

**Solution**: Use Firebase Storage download tokens instead. The API route automatically generates tokens for each uploaded file.

### Issue: "extract_area: bad extract area"

**Cause**: Crop coordinates are invalid (negative, out of bounds, or zero width/height).

**Solution**: The API route now validates and clamps crop coordinates to ensure they're within image bounds:
- Coordinates are clamped to `[0, imageWidth-1]` and `[0, imageHeight-1]`
- Width and height are clamped to `[1, imageWidth-left]` and `[1, imageHeight-top]`

### Issue: "The default Firebase app does not exist"

**Cause**: Firebase Admin SDK not properly initialized in Cloud Run environment.

**Solution**: The API route uses lazy initialization with Application Default Credentials:
```typescript
function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: 'kotikreikasta.firebasestorage.app',
  });
}
```

## Mobile Responsiveness

The `ImageCropEditor` component is fully responsive and optimized for mobile devices:

- **Flexible modal sizing** - Uses `min(1000px, 90vw)` for responsive width
- **Adaptive cropper height** - 300px minimum with 50vh for better mobile fit
- **Responsive typography** - Uses `clamp()` for scalable font sizes
- **Compact spacing** - Reduced padding on mobile devices
- **Touch-friendly controls** - Improved spacing and button sizing
- **Flexible button layout** - Buttons wrap properly on narrow screens
- **Tested and confirmed working** on mobile devices for both BlogEditor and ListingWizard

## Notes

- All crops are JPEG format (85% quality for full/og, 80% for thumbnails)
- **Three sizes per aspect ratio:**
  - Full: 2868px max (high quality for retina displays)
  - OG: 1200px max (social media compliant)
  - Thumbnail: 400px max (performance optimized)
- **EXIF rotation correction** applied automatically before cropping
- Crops are generated server-side for consistency
- Original images are preserved
- Fallback to original URL if crops not available
- **Smart size selection:**
  - OG metadata uses 1200px versions (social media compliant)
  - Hero/card/preview use full size versions (high quality)
  - Thumbnails use 400px versions (performance)
- Social media platforms automatically use optimal crops via OG metadata
- Platform-specific recommendations: Bluesky/Facebook/Twitter use 16:9, Threads/Instagram use 1:1
- Uniform bucket-level access is enabled on Firebase Storage
- Download tokens provide public access without individual file ACLs
- **Backward compatible** with old flat crop structure
