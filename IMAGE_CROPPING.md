# Multi-Aspect-Ratio Image Cropping

## Overview

This feature provides a reusable image cropping component that generates 5 different aspect ratio crops for every uploaded image, ensuring optimal display across all platforms and contexts.

## Aspect Ratios

- **16:9 (Landscape)** - OG images, Twitter cards, hero sections (2868x1613px)
- **4:3 (Standard)** - Preview cards, traditional displays (2868x2151px)
- **1:1 (Square)** - Instagram, thumbnails, grid layouts (2868x2868px)
- **3:4 (Portrait)** - Mobile hero, Pinterest (2151x2868px)
- **9:16 (Vertical)** - Stories, TikTok, mobile-first (1613x2868px)

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
```typescript
{
  success: true,
  original: string, // Original image URL
  crops: {
    '16:9': string,
    '4:3': string,
    '1:1': string,
    '3:4': string,
    '9:16': string
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

### Blog Posts
```typescript
{
  featuredImage: {
    url: string,
    alt?: string,
    crops?: {
      '16:9'?: string,
      '4:3'?: string,
      '1:1'?: string,
      '3:4'?: string,
      '9:16'?: string
    }
  }
}
```

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

## Notes

- All crops are JPEG format (85% quality)
- Max dimensions: 2868px (high quality for retina displays)
- Crops are generated server-side for consistency
- Original images are preserved
- Fallback to original URL if crops not available
- Social media platforms automatically use optimal crops via OG metadata
- Platform-specific recommendations: Bluesky/Facebook/Twitter use 16:9, Threads/Instagram use 1:1
