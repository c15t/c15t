#!/usr/bin/env node

/**
 * Vercel-optimized build detection for C15t documentation
 *
 * Uses Vercel environment variables when available, falls back to git
 *
 * Exits with:
 * - 0: Skip build (no relevant changes)
 * - 1: Continue build (relevant changes detected)
 */

import { execSync } from 'node:child_process';

// Files/patterns that should trigger documentation builds
const DOCS_TRIGGERS = [
	'docs/',
	'packages/',
	'scripts/setup-docs.ts',
	'vercel.json',
	'package.json',
];

// Files/patterns that should NOT trigger builds
const IGNORE_PATTERNS = [
	'examples/',
	'README.md',
	'.md',
	'.test.ts',
	'.test.js',
	'test/',
	'__tests__/',
];

function shouldBuild() {
	console.log('🔍 Vercel build detection for C15t docs...');

	try {
		let changedFiles = [];

		// Method 1: Use Vercel environment variables (most reliable)
		if (
			process.env.VERCEL_GIT_PREVIOUS_SHA &&
			process.env.VERCEL_GIT_COMMIT_SHA
		) {
			console.log('📡 Using Vercel environment variables for diff');
			const prevSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
			const currentSha = process.env.VERCEL_GIT_COMMIT_SHA;

			const diffOutput = execSync(
				`git diff --name-only ${prevSha} ${currentSha}`,
				{
					encoding: 'utf8',
				}
			).trim();

			changedFiles = diffOutput ? diffOutput.split('\n') : [];
		}
		// Method 2: Fallback to recent commits
		else {
			console.log('🔄 Fallback: analyzing recent commits');

			try {
				const diffOutput = execSync('git diff --name-only HEAD~1 HEAD', {
					encoding: 'utf8',
				}).trim();
				changedFiles = diffOutput ? diffOutput.split('\n') : [];
			} catch {
				// If single commit diff fails, check recent changes
				console.log('⚠️  Single commit diff failed, checking recent changes');
				const diffOutput = execSync('git log --name-only --pretty=format: -5', {
					encoding: 'utf8',
				}).trim();
				changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];
			}
		}

		console.log(`📝 Analyzing ${changedFiles.length} changed files...`);

		if (changedFiles.length === 0) {
			console.log('❌ No changes detected. Proceeding with build to be safe.');
			return true; // Build when uncertain
		}

		// Check each file
		for (const file of changedFiles) {
			if (!file.trim()) continue;

			console.log(`   📄 Checking: ${file}`);

			// Skip ignored files
			const isIgnored = IGNORE_PATTERNS.some((pattern) => {
				if (pattern.endsWith('/')) {
					return file.startsWith(pattern);
				}
				return file.includes(pattern);
			});

			if (isIgnored) {
				console.log(`   🚫 Ignored: ${file}`);
				continue;
			}

			// Check if file should trigger build
			const shouldTrigger = DOCS_TRIGGERS.some((pattern) => {
				if (pattern.endsWith('/')) {
					return file.startsWith(pattern);
				}
				return file.includes(pattern) || file === pattern;
			});

			if (shouldTrigger) {
				console.log(`   ✅ Build trigger found: ${file}`);
				console.log('🚀 Proceeding with build...');
				return true;
			}
		}

		console.log('❌ No documentation-related changes found.');
		console.log('🏃‍♂️ Skipping build...');
		return false;
	} catch (error) {
		console.error('⚠️  Error during analysis:', error.message);
		console.log('🚀 Proceeding with build due to error (safe fallback)...');
		return true; // Build when there's an error
	}
}

// Run the check and exit with appropriate code
const build = shouldBuild();
process.exit(build ? 1 : 0);
