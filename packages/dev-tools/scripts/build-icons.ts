#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(__dirname, './subs/build-sprite.ts');
const scanScript = path.join(__dirname, './subs/scan-icons.ts');

// First build the sprite sheet from all icons in src/icons
console.log('🔨 Step 1: Building sprite sheet from icons...');
execSync(`tsx ${buildScript}`, { stdio: 'inherit' });

// Then update the IconName type with all icons
console.log('\n🔍 Step 2: Updating IconName type...');
execSync(`tsx ${scanScript}`, { stdio: 'inherit' });

console.log('\n✅ Icon build process complete!');
