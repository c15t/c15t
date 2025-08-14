#!/usr/bin/env node

/**
 * Smart build detection for C15t documentation
 *
 * Exits with:
 * - 0: Skip build (no relevant changes)
 * - 1: Continue build (relevant changes detected)
 */

import { execSync } from 'node:child_process';

const DOCS_RELATED_PATTERNS = [
	'docs/**',
	'packages/*/src/**',
	'packages/*/package.json',
	'packages/*/CHANGELOG.md',
	'scripts/setup-docs.ts',
	'vercel.json',
	'package.json',
	'.docs/**',
];

const IGNORED_PATTERNS = [
	'examples/**',
	'*.md',
	'*.test.ts',
	'*.test.js',
	'test/**',
	'__tests__/**',
];

function checkForChanges() {
	try {
		console.log('🔍 Analyzing changes for documentation build...');

		// Get list of changed files
		const changedFiles = execSync('git diff HEAD^ HEAD --name-only', {
			encoding: 'utf8',
		})
			.trim()
			.split('\n')
			.filter(Boolean);

		console.log(`📝 Found ${changedFiles.length} changed files`);

		if (changedFiles.length === 0) {
			console.log('❌ No changes detected. Skipping build.');
			process.exit(0);
		}

		// Check if any changes are docs-related
		const relevantChanges = changedFiles.filter((file) => {
			// Skip ignored patterns
			if (
				IGNORED_PATTERNS.some((pattern) =>
					file.includes(pattern.replace('**', ''))
				)
			) {
				return false;
			}

			// Check if file matches docs-related patterns
			return DOCS_RELATED_PATTERNS.some((pattern) => {
				const regex = new RegExp(
					pattern.replace('**', '.*').replace('*', '[^/]*')
				);
				return regex.test(file);
			});
		});

		if (relevantChanges.length > 0) {
			console.log('✅ Documentation-related changes detected:');
			relevantChanges.forEach((file) => console.log(`   - ${file}`));
			console.log('🚀 Proceeding with build...');
			process.exit(1);
		} else {
			console.log('❌ No documentation-related changes. Skipping build.');
			console.log('Changed files were:');
			changedFiles.forEach((file) => console.log(`   - ${file}`));
			process.exit(0);
		}
	} catch (error) {
		console.error('⚠️  Error checking changes:', error.message);
		console.log('🚀 Proceeding with build due to error...');
		process.exit(1);
	}
}

checkForChanges();
