#!/usr/bin/env bun
/**
 * Analyzes Next.js bundle sizes and detects server-side code leakage.
 *
 * Usage:
 *   bun run analyze-bundle.ts           # Markdown output
 *   bun run analyze-bundle.ts --json    # JSON output for CI
 */

import { gzipSync } from 'node:zlib';

interface AppBuildManifest {
	pages: Record<string, string[]>;
}

interface RouteSize {
	route: string;
	gzip: number;
	c15tAddition: number;
}

interface LeakageError {
	module: string;
	chunk: string;
}

interface AnalysisResult {
	timestamp: string;
	routes: RouteSize[];
	leakage: LeakageError[];
	hasLeakage: boolean;
}

// Server-only packages that should NEVER appear in client bundle
const LEAKAGE_PATTERNS = [
	{ pattern: /@c15t\/backend|c15t-backend/i, name: '@c15t/backend' },
	{ pattern: /@orpc|createORPCClient|ORPCError/i, name: '@orpc/*' },
	{ pattern: /neverthrow|ResultAsync|okAsync|errAsync/, name: 'neverthrow' },
	{ pattern: /superjson|SuperJSON/, name: 'superjson' },
];

async function analyzeBundle(): Promise<AnalysisResult> {
	const manifest: AppBuildManifest = await Bun.file(
		'.next/app-build-manifest.json'
	).json();

	const chunkSizes = new Map<string, number>();
	const leakage: LeakageError[] = [];

	// Get gzipped size and check for leakage
	async function getGzipSize(chunkPath: string): Promise<number> {
		if (chunkSizes.has(chunkPath)) {
			return chunkSizes.get(chunkPath)!;
		}

		try {
			const content = await Bun.file(`.next/${chunkPath}`).text();
			const gzip = gzipSync(Buffer.from(content)).length;
			chunkSizes.set(chunkPath, gzip);

			// Check for leakage
			for (const { pattern, name } of LEAKAGE_PATTERNS) {
				if (pattern.test(content)) {
					const chunk = chunkPath.split('/').pop() || chunkPath;
					if (!leakage.some((l) => l.module === name && l.chunk === chunk)) {
						leakage.push({ module: name, chunk });
					}
				}
			}

			return gzip;
		} catch {
			return 0;
		}
	}

	// Calculate sizes for each route
	const routes: RouteSize[] = [];
	let baselineGzip = 0;

	for (const [route, chunks] of Object.entries(manifest.pages)) {
		if (!route.endsWith('/page') || route === '/layout') {
			continue;
		}

		let totalGzip = 0;
		for (const chunk of chunks) {
			totalGzip += await getGzipSize(chunk);
		}

		const routeName = route.replace('/page', '') || '/';

		if (routeName === '/') {
			baselineGzip = totalGzip;
		}

		routes.push({
			route: routeName,
			gzip: totalGzip,
			c15tAddition: 0,
		});
	}

	// Calculate c15t additions
	for (const route of routes) {
		route.c15tAddition = route.route === '/' ? 0 : route.gzip - baselineGzip;
	}

	routes.sort((a, b) => a.route.localeCompare(b.route));

	return {
		timestamp: new Date().toISOString(),
		routes,
		leakage,
		hasLeakage: leakage.length > 0,
	};
}

function formatKB(bytes: number): string {
	return `${(bytes / 1024).toFixed(2)} kB`;
}

function toMarkdown(result: AnalysisResult): string {
	let md = '# Bundle Analysis\n\n';

	// Leakage status (most important)
	if (result.hasLeakage) {
		md += '## ❌ Server Code Leakage Detected!\n\n';
		md += '| Module | Chunk |\n|--------|-------|\n';
		for (const { module, chunk } of result.leakage) {
			md += `| \`${module}\` | ${chunk} |\n`;
		}
		md += '\n';
	} else {
		md += '## ✅ No Leakage\n\n';
		md += 'No server-only packages found in client bundle.\n\n';
	}

	// Bundle sizes
	md += '## Bundle Sizes (gzipped)\n\n';
	md += '| Route | Size | c15t Addition |\n';
	md += '|-------|------|---------------|\n';

	for (const { route, gzip, c15tAddition } of result.routes) {
		const addition = c15tAddition > 0 ? `+${formatKB(c15tAddition)}` : '-';
		md += `| ${route} | ${formatKB(gzip)} | ${addition} |\n`;
	}

	// Summary
	const core = result.routes.find((r) => r.route === '/core-only');
	const full = result.routes.find((r) => r.route === '/full');

	if (core && full) {
		md += '\n## Summary\n\n';
		md += `- **Core only**: +${formatKB(core.c15tAddition)}\n`;
		md += `- **Full (all components)**: +${formatKB(full.c15tAddition)}\n`;
	}

	return md;
}

// Main
const args = process.argv.slice(2);
const result = await analyzeBundle();

if (args.includes('--json')) {
	console.log(JSON.stringify(result, null, 2));
} else {
	console.log(toMarkdown(result));
}

// Exit with error if leakage detected (for CI)
if (result.hasLeakage) {
	process.exit(1);
}
