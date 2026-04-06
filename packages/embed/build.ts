/**
 * Build script for @c15t/embed.
 *
 * Uses esbuild API directly (instead of CLI) to configure aliases that
 * resolve monorepo packages from source, enabling proper tree-shaking.
 *
 * Without this, esbuild resolves `c15t` → `packages/core/dist/index.js`
 * (a single barrel) which pulls in @c15t/translations (206KB of every
 * language file) and @c15t/schema (35KB of validators) that the embed
 * never uses.
 */

import { resolve } from 'node:path';
import { build, context } from 'esbuild';

const ROOT = resolve(import.meta.dir, '../..');
const isWatch = process.argv.includes('--watch');
const isMinify = !isWatch;

const config = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	outfile: 'dist/c15t.js',
	format: 'iife' as const,
	target: 'es2020',
	platform: 'browser' as const,
	minify: isMinify,
	conditions: ['import'],
	metafile: true,
	// Resolve monorepo packages from source for tree-shaking.
	// The dist barrels re-export everything, defeating tree-shaking.
	alias: {
		// Granular core imports — bypass the barrel to avoid pulling in
		// everything (IAB, iframe-blocker, network-blocker, etc.)
		'c15t/runtime': resolve(ROOT, 'packages/core/src/runtime/index.ts'),
		'c15t/policy-actions': resolve(
			ROOT,
			'packages/core/src/libs/policy-actions.ts'
		),
		'c15t/script-loader': resolve(
			ROOT,
			'packages/core/src/libs/script-loader/index.ts'
		),
		// Scripts package — resolveManifest + vendor manifests
		'@c15t/scripts/resolve': resolve(ROOT, 'packages/scripts/src/resolve.ts'),
		'@c15t/scripts/types': resolve(ROOT, 'packages/scripts/src/types.ts'),
		// Translations: resolve from source so unused languages are excluded
		'@c15t/translations': resolve(ROOT, 'packages/translations/src/index.ts'),
		// Schema: resolve from source so unused validators are excluded
		'@c15t/schema': resolve(ROOT, 'packages/schema/src/index.ts'),
		'@c15t/schema/types': resolve(ROOT, 'packages/schema/src/types.ts'),
	},
	// Resolve the ~ path alias used inside the core package source
	plugins: [
		{
			name: 'resolve-tilde',
			setup(build) {
				build.onResolve({ filter: /^~\// }, async (args) => {
					const base = args.path.replace(
						/^~\//,
						resolve(ROOT, 'packages/core/src') + '/'
					);
					// Try with common extensions since source imports omit them
					for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
						const candidate = base + ext;
						const file = Bun.file(candidate);
						if (await file.exists()) {
							return { path: candidate };
						}
					}
					return { path: base };
				});
			},
		},
	],
};

if (isWatch) {
	const ctx = await context(config);
	await ctx.watch();
	console.log('  watching for changes...');
} else {
	const result = await build(config);

	// Report bundle size
	const output = Object.values(result.metafile!.outputs)[0];
	const sizeKb = (output.bytes / 1024).toFixed(1);
	console.log(`  dist/c15t.js  ${sizeKb}kb`);

	// Report top 10 modules by size for debugging
	if (process.argv.includes('--analyze')) {
		const inputs = Object.entries(result.metafile!.inputs)
			.sort((a, b) => b[1].bytes - a[1].bytes)
			.slice(0, 15);
		console.log('\n  Top modules:');
		for (const [k, v] of inputs) {
			console.log(`  ${(v.bytes / 1024).toFixed(1).padStart(7)}kb  ${k}`);
		}
	}
}
