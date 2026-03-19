# TODO: Admin UI Integration for Social Media Test Functions

## Feature Request
Add buttons/interface in the admin UI to trigger test posts to social media platforms.

## Implementation Details

### Backend (Already Complete)

#### Bluesky
- ✅ Cloud Function: `testBlueskyPost`
- ✅ URL: `https://europe-west1-kotikreikasta.cloudfunctions.net/testBlueskyPost`
- ✅ Method: POST
- ✅ Authentication: User account or service account
- ✅ Response: `{ ok: true, message: 'Test post successful', postId: string, text: string }`
- ✅ Status: **Working** - Successfully posts to Bluesky

#### X (Twitter)
- ✅ Cloud Function: `testXPost`
- ✅ URL: `https://europe-west1-kotikreikasta.cloudfunctions.net/testXPost`
- ✅ Method: POST
- ✅ Authentication: User account or service account
- ✅ Response: `{ ok: true, message: 'Test post successful', tweetId: string, text: string, url: string }`
- ✅ Status: **Working** - Successfully posts to X/Twitter

#### Facebook
- ✅ Cloud Function: `testFacebookPost`
- ✅ URL: `https://europe-west1-kotikreikasta.cloudfunctions.net/testFacebookPost`
- ✅ Method: POST
- ✅ Authentication: User account or service account
- ✅ Response: `{ ok: true, message: 'Test post successful', postId: string, text: string, url: string }`
- ✅ Status: **Working** - Successfully posts to Facebook Page using System User token

#### Threads
- ✅ Cloud Function: `testThreadsPost`
- ✅ URL: `https://europe-west1-kotikreikasta.cloudfunctions.net/testThreadsPost`
- ✅ Method: POST
- ✅ Authentication: User account or service account
- ✅ Response: `{ ok: true, message: 'Test post successful', threadId: string, text: string, url: string }`
- ✅ Status: **Working** - Successfully posts to Threads using long-lived user access token (60 days)

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

type Platform = 'bluesky' | 'x' | 'facebook' | 'threads';

export default function SocialTestPage() {
  const [loading, setLoading] = useState<Platform | null>(null);
  const [results, setResults] = useState<Record<Platform, any>>({} as any);
  const [errors, setErrors] = useState<Record<Platform, string>>({} as any);

  const handleTestPost = async (platform: Platform) => {
    setLoading(platform);
    setErrors({ ...errors, [platform]: '' });
    setResults({ ...results, [platform]: null });

    const endpoints = {
      bluesky: 'https://europe-west1-kotikreikasta.cloudfunctions.net/testBlueskyPost',
      x: 'https://europe-west1-kotikreikasta.cloudfunctions.net/testXPost',
      facebook: 'https://europe-west1-kotikreikasta.cloudfunctions.net/testFacebookPost',
      threads: 'https://europe-west1-kotikreikasta.cloudfunctions.net/testThreadsPost',
    };

    try {
      const response = await fetch(endpoints[platform], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults({ ...results, [platform]: data });
    } catch (err: any) {
      setErrors({ ...errors, [platform]: err.message || 'Tuntematon virhe' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sosiaalisen median testaus</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bluesky */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Bluesky</h2>
          <button
            onClick={() => handleTestPost('bluesky')}
            disabled={loading === 'bluesky'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 w-full"
          >
            {loading === 'bluesky' ? 'Julkaistaan...' : 'Testaa Bluesky 🇬🇷'}
          </button>
          
          {results.bluesky && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-800 text-sm">✅ Onnistui!</p>
              <p className="text-xs text-gray-600 mt-1">{results.bluesky.text}</p>
              <p className="text-xs text-gray-500">Post ID: {results.bluesky.postId}</p>
            </div>
          )}
          
          {errors.bluesky && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-800 text-sm">❌ Epäonnistui</p>
              <p className="text-xs text-gray-600 mt-1">{errors.bluesky}</p>
            </div>
          )}
        </div>

        {/* X (Twitter) */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">X (Twitter)</h2>
          <button
            onClick={() => handleTestPost('x')}
            disabled={loading === 'x'}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 w-full"
          >
            {loading === 'x' ? 'Julkaistaan...' : 'Testaa X 🇬🇷'}
          </button>
          
          {results.x && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-800 text-sm">✅ Onnistui!</p>
              <p className="text-xs text-gray-600 mt-1">{results.x.text}</p>
              <a 
                href={results.x.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Katso twiitti →
              </a>
            </div>
          )}
          
          {errors.x && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-800 text-sm">❌ Epäonnistui</p>
              <p className="text-xs text-gray-600 mt-1">{errors.x}</p>
            </div>
          )}
        </div>

        {/* Facebook */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Facebook</h2>
          <button
            onClick={() => handleTestPost('facebook')}
            disabled={loading === 'facebook'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 w-full"
          >
            {loading === 'facebook' ? 'Julkaistaan...' : 'Testaa Facebook 🇬🇷'}
          </button>
          
          {results.facebook && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-800 text-sm">✅ Onnistui!</p>
              <p className="text-xs text-gray-600 mt-1">{results.facebook.text}</p>
              <a 
                href={results.facebook.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Katso julkaisu →
              </a>
            </div>
          )}
          
          {errors.facebook && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-800 text-sm">❌ Epäonnistui</p>
              <p className="text-xs text-gray-600 mt-1">{errors.facebook}</p>
            </div>
          )}
        </div>

        {/* Threads */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Threads</h2>
          <button
            onClick={() => handleTestPost('threads')}
            disabled={loading === 'threads'}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 w-full"
          >
            {loading === 'threads' ? 'Julkaistaan...' : 'Testaa Threads 🇬🇷'}
          </button>
          
          {results.threads && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-800 text-sm">✅ Onnistui!</p>
              <p className="text-xs text-gray-600 mt-1">{results.threads.text}</p>
              <a 
                href={results.threads.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Katso julkaisu →
              </a>
            </div>
          )}
          
          {errors.threads && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-800 text-sm">❌ Epäonnistui</p>
              <p className="text-xs text-gray-600 mt-1">{errors.threads}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Navigation:**
Add link to main admin navigation or marketing page.

## Future Enhancements
- [x] Add test function for X (Twitter) - **DONE**
- [x] Add test function for Facebook - **DONE**
- [x] Add test function for Threads - **DONE**
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
