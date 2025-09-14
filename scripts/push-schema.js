#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Pushing Drizzle schema to database...');

try {
  // Push the schema
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('✅ Schema pushed successfully!');
} catch (error) {
  console.error('❌ Error pushing schema:', error.message);
  process.exit(1);
}
