const admin = require('firebase-admin');

async function verify() {
  try {
    admin.initializeApp({
      projectId: 'kotikreikasta',
      credential: admin.credential.applicationDefault()
    });
    
    const db = admin.firestore();
    
    console.log('=== VERIFYING FIRESTORE DATA ===\n');
    
    const snapshot = await db.collection('blog_posts').get();
    console.log(`Total blog posts in collection: ${snapshot.docs.length}\n`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Post ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Title: ${data.title || 'NO TITLE'}`);
      console.log(`  Status: ${data.status || 'NO STATUS'}`);
      console.log(`  URL Stub: ${data.urlStub || 'NO URL STUB'}`);
      console.log(`  Published At: ${data.publishedAt ? data.publishedAt.toDate() : 'NO DATE'}`);
      console.log('');
    });
    
    const publishedSnapshot = await db.collection('blog_posts')
      .where('status', '==', 'published')
      .get();
    
    console.log(`\nPublished posts: ${publishedSnapshot.docs.length}`);
    publishedSnapshot.docs.forEach(doc => {
      console.log(`  - ${doc.data().title} (${doc.data().urlStub})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

verify();
