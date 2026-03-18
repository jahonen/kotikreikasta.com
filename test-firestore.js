// Quick test to verify Firestore connection works
const admin = require('firebase-admin');

async function test() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'kotikreikasta'
      });
    }
    
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    console.log('[TEST] Fetching blog posts...');
    const snapshot = await db
      .collection('blog_posts')
      .where('status', '==', 'published')
      .get();
    
    console.log(`[TEST] Found ${snapshot.docs.length} published blog posts`);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.title} (${data.urlStub})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('[TEST] Error:', error);
    process.exit(1);
  }
}

test();
