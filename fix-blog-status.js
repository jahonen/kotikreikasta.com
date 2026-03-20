const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'kotikreikasta',
});

const db = admin.firestore();

async function fixBlogStatus() {
  const blogId = 'Wyr2wQxm5eaqopM1Qf08';
  
  try {
    console.log(`Updating blog post ${blogId} status to 'published'...`);
    
    await db.collection('blog_posts').doc(blogId).update({
      status: 'published',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Blog post status updated to "published"');
    console.log('This should trigger the onBlogPostPublished Cloud Function');
    console.log('which will queue it for social media publishing.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating blog post:', error);
    process.exit(1);
  }
}

fixBlogStatus();
