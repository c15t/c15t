#!/usr/bin/env bun
/**
 * Clears rslib/rspack cache directories across the monorepo.
 * This helps resolve build issues caused by corrupted cache.
 *
 * Removes:
 * - .rslib directories
 * - node_modules/.cache directories
 * - dist directories (optional, controlled by --dist flag)
 */

import { existsSync, rmSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT_DIR = new URL('..', import.meta.url).pathname;

interface Options {
	dist: boolean;
	verbose: boolean;
}

async function findDirectories(
	root: string,
	dirName: string
): Promise<string[]> {
	const dirs: string[] = [];
	const entries = await readdir(root, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(root, entry.name);

		// Skip node_modules and .git
		if (entry.name === 'node_modules' || entry.name === '.git') {
			continue;
		}

		if (entry.isDirectory()) {
			// Check if this is the directory we're looking for
			if (entry.name === dirName) {
				dirs.push(fullPath);
			}

			// Recursively search in subdirectories
			try {
				const subDirs = await findDirectories(fullPath, dirName);
				dirs.push(...subDirs);
			} catch {
				// Ignore permission errors
			}
		}
	}

	return dirs;
}

async function findCacheDirectories(root: string): Promise<string[]> {
	const dirs: string[] = [];
	const entries = await readdir(root, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(root, entry.name);

		// Skip .git
		if (entry.name === '.git') {
			continue;
		}

		if (entry.isDirectory()) {
			// Check for node_modules/.cache
			if (entry.name === 'node_modules') {
				const cachePath = join(fullPath, '.cache');
				try {
					const stats = await stat(cachePath);
					if (stats.isDirectory()) {
						dirs.push(cachePath);
					}
				} catch {
					// Cache directory doesn't exist, skip
				}
			}

			// Recursively search in subdirectories (but skip node_modules)
			if (entry.name !== 'node_modules') {
				try {
					const subDirs = await findCacheDirectories(fullPath);
					dirs.push(...subDirs);
				} catch {
					// Ignore permission errors
				}
			}
		}
	}

	return dirs;
}

async function clearCache(options: Options): Promise<void> {
	console.log('🧹 Clearing rslib/rspack cache...\n');

	const dirsToRemove: string[] = [];

	// Find .rslib directories
	console.log('Searching for .rslib directories...');
	const rslibDirs = await findDirectories(ROOT_DIR, '.rslib');
	dirsToRemove.push(...rslibDirs);

	// Find node_modules/.cache directories
	console.log('Searching for node_modules/.cache directories...');
	const cacheDirs = await findCacheDirectories(ROOT_DIR);
	dirsToRemove.push(...cacheDirs);

	// Optionally find dist directories
	if (options.dist) {
		console.log('Searching for dist directories...');
		const distDirs = await findDirectories(ROOT_DIR, 'dist');
		dirsToRemove.push(...distDirs);
	}

	if (dirsToRemove.length === 0) {
		console.log('✅ No cache directories found to remove.\n');
		return;
	}

	console.log(`\nFound ${dirsToRemove.length} directory(ies) to remove:\n`);
	for (const dir of dirsToRemove) {
		const relativePath = dir.replace(ROOT_DIR, '.').replace(/^\//, '');
		console.log(`  - ${relativePath}`);
	}

	console.log('\n');

	// Remove directories
	let removed = 0;
	let failed = 0;

	for (const dir of dirsToRemove) {
		try {
			if (existsSync(dir)) {
				rmSync(dir, { recursive: true, force: true });
				removed++;
				if (options.verbose) {
					const relativePath = dir.replace(ROOT_DIR, '.').replace(/^\//, '');
					console.log(`✅ Removed: ${relativePath}`);
				}
			}
		} catch (error) {
			failed++;
			const relativePath = dir.replace(ROOT_DIR, '.').replace(/^\//, '');
			console.error(`❌ Failed to remove: ${relativePath}`);
			if (options.verbose && error instanceof Error) {
				console.error(`   Error: ${error.message}`);
			}
		}
	}

	console.log(`\n✅ Cache cleared! Removed ${removed} directory(ies).`);
	if (failed > 0) {
		console.log(`⚠️  Failed to remove ${failed} directory(ies).`);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: Options = {
	dist: args.includes('--dist'),
	verbose: args.includes('--verbose') || args.includes('-v'),
};

if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Usage: bun scripts/clear-rslib-cache.ts [options]

Options:
  --dist      Also remove dist directories (default: false)
  --verbose   Show detailed output (default: false)
  --help      Show this help message

Examples:
  bun scripts/clear-rslib-cache.ts
  bun scripts/clear-rslib-cache.ts --dist
  bun scripts/clear-rslib-cache.ts --verbose
`);
	process.exit(0);
}

clearCache(options).catch((error) => {
	console.error('❌ Error clearing cache:', error);
	process.exit(1);
});
