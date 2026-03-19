# TODO: Admin UI Integration for Social Media Test Function

## Feature Request
Add a button/interface in the admin UI to trigger test posts to social media platforms.

## Implementation Details

### Backend (Already Complete)
- ✅ Cloud Function: `testBlueskyPost`
- ✅ URL: `https://europe-west1-kotikreikasta.cloudfunctions.net/testBlueskyPost`
- ✅ Method: POST
- ✅ Authentication: Service account (cloud-scheduler-invoker)
- ✅ Response: `{ ok: true, message: 'Test post successful', postId: string, text: string }`

### Frontend (To Be Implemented)

**Location:** `admin/app/markkinointi/page.tsx` or new page `admin/app/social/page.tsx`

**UI Components:**
1. **Test Button**
   - Label: "Testaa Bluesky-julkaisu" (Finnish)
   - Icon: 🇬🇷 or social media icon
   - Disabled state while posting

2. **Status Display**
   - Success message: "Julkaisu onnistui! Post ID: {postId}"
   - Error message: "Julkaisu epäonnistui: {error}"
   - Loading indicator

3. **Post Preview**
   - Show the test message: "Terveisiä Kreikasta! 🇬🇷"
   - Link to Bluesky post (if successful)

**Implementation:**
```typescript
// admin/app/social/page.tsx
'use client';

import { useState } from 'react';

export default function SocialTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestPost = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        'https://europe-west1-kotikreikasta.cloudfunctions.net/testBlueskyPost',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Tuntematon virhe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sosiaalisen median testaus</h1>
      
      <div className="mb-6">
        <button
          onClick={handleTestPost}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Julkaistaan...' : 'Testaa Bluesky-julkaisu 🇬🇷'}
        </button>
      </div>

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold text-green-800">✅ Julkaisu onnistui!</p>
          <p className="text-sm text-gray-600 mt-2">
            Viesti: {result.text}
          </p>
          <p className="text-sm text-gray-600">
            Post ID: {result.postId}
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-800">❌ Julkaisu epäonnistui</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      )}
    </div>
  );
}
```

**Navigation:**
Add link to main admin navigation or marketing page.

## Future Enhancements
- [ ] Add test functions for X, Facebook, Threads
- [ ] Allow custom test message input
- [ ] Show recent test posts history
- [ ] Add "Delete test post" functionality
- [ ] Display posting schedule and next scheduled post time
- [ ] Show queue status (pending items count)

## Priority
**Medium** - Nice to have for testing, but not critical for MVP functionality.

## Notes
- Function is already deployed and working
- Only needs frontend UI implementation
- Should be admin-only (already protected by admin routes)
- Consider adding to existing marketing/social media management page
