#!/usr/bin/env node
/**
 * Export blog posts from Firestore to static markdown files
 * Run this locally when you need to update blog content
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
initializeApp({
  projectId: 'kotikreikasta'
});

const db = getFirestore();

async function exportBlogs() {
  console.log('Fetching published blog posts from Firestore...\n');
  
  const snapshot = await db.collection('blog_posts')
    .where('status', '==', 'published')
    .get();
  
  console.log(`Found ${snapshot.docs.length} published posts\n`);
  
  const outputDir = path.join(__dirname, 'hosting', 'content', 'blog');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const slug = data.urlStub || doc.id;
    
    console.log(`Exporting: ${data.title} (${slug})`);
    
    // Create frontmatter
    const frontmatter = {
      title: data.title || '',
      slug: slug,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || '',
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || '',
      status: data.status || 'published',
      featuredImage: data.featuredImage || null,
      seo: data.seo || {},
    };
    
    // Create markdown file with frontmatter
    const content = `---
${JSON.stringify(frontmatter, null, 2)}
---

${data.contentMd || ''}
`;
    
    const filename = `${slug}.md`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  ✓ Saved to ${filepath}\n`);
  }
  
  console.log('✅ Export complete!');
  process.exit(0);
}

exportBlogs().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
