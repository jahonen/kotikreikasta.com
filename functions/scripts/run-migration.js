#!/usr/bin/env node

/**
 * Local script to run image migration
 * Usage: node functions/scripts/run-migration.js
 */

const { migrateImagesToCrops } = require('../lib/scripts/migrate-images-to-crops');

console.log('Starting image migration...');
console.log('This will process all published blog posts and listings');
console.log('and generate multi-aspect-ratio crops for their images.\n');

migrateImagesToCrops()
  .then(() => {
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
