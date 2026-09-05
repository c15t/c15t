#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// Subpath imports on purpose: the package root also re-exports the CSS-layer
// React runtime, which `tsx` cannot load (it imports `.css`).
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';

interface ClientAssetSize {
	fileName: string;
	type: 'css' | 'js';
	rawBytes: number;
	gzipBytes: number;
}

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientAssetsDir = join(appDir, 'build', 'client', '_app', 'immutable');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/bundle-sveltekit';

const readClientAssets = async function readClientAssets(
	directory: string
): Promise<ClientAssetSize[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const assets = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = join(directory, entry.name);
			if (entry.isDirectory()) {
				return await readClientAssets(fullPath);
			}
			if (!['.css', '.js'].includes(extname(entry.name))) {
				return [];
			}
			const contents = await readFile(fullPath);
			return [
				{
					fileName: fullPath.slice(clientAssetsDir.length + 1),
					gzipBytes: gzipSync(contents).byteLength,
					rawBytes: contents.byteLength,
					type: extname(entry.name).slice(1) as ClientAssetSize['type'],
				},
			];
		})
	);
	return assets.flat();
};

const sumGzipBytes = function sumGzipBytes(assets: ClientAssetSize[]): number {
	return assets.reduce((total, asset) => total + asset.gzipBytes, 0);
};

const toMarkdown = function toMarkdown(
	assets: ClientAssetSize[],
	jsGzipBytes: number,
	cssGzipBytes: number
): string {
	const jsCount = assets.filter((asset) => asset.type === 'js').length;
	const cssCount = assets.filter((asset) => asset.type === 'css').length;
	const topChunks = [...assets]
		.sort((left, right) => right.gzipBytes - left.gzipBytes)
		.slice(0, 15);
	const lines = [
		'# SvelteKit client bundle',
		'',
		'| Asset type | Files | Gzip bytes |',
		'| --- | ---: | ---: |',
		`| JavaScript | ${jsCount} | ${jsGzipBytes} |`,
		`| CSS | ${cssCount} | ${cssGzipBytes} |`,
		`| Total | ${jsCount + cssCount} | ${jsGzipBytes + cssGzipBytes} |`,
		'',
		'## Top 15 chunks by gzip size',
		'',
		'| Chunk | Type | Raw bytes | Gzip bytes |',
		'| --- | --- | ---: | ---: |',
	];

	for (const chunk of topChunks) {
		lines.push(
			`| ${chunk.fileName} | ${chunk.type} | ${chunk.rawBytes} | ${chunk.gzipBytes} |`
		);
	}

	return `${lines.join('\n')}\n`;
};

const main = async function main() {
	if (!existsSync(clientAssetsDir)) {
		throw new Error(
			`SvelteKit client assets were not found at ${clientAssetsDir}. Run "bun run build" first.`
		);
	}

	const assets = await readClientAssets(clientAssetsDir);
	const jsAssets = assets.filter((asset) => asset.type === 'js');
	const cssAssets = assets.filter((asset) => asset.type === 'css');
	const jsGzipBytes = sumGzipBytes(jsAssets);
	const cssGzipBytes = sumGzipBytes(cssAssets);
	const topChunks = [...assets]
		.sort((left, right) => right.gzipBytes - left.gzipBytes)
		.slice(0, 15);
	const result: BenchmarkResult = {
		baseSha: safeBaseSha(),
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(),
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: 'sveltekit-client-bundle',
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'svelte',
		metadata: {
			cssChunkCount: cssAssets.length,
			jsChunkCount: jsAssets.length,
			topChunksByGzip: topChunks.map(
				(chunk) => `${chunk.fileName}:${chunk.gzipBytes}`
			),
		},
		metrics: [
			summarizeMetric('gzipSize', 'bytes', [jsGzipBytes + cssGzipBytes]),
			summarizeMetric('jsGzipSize', 'bytes', [jsGzipBytes]),
			summarizeMetric('cssGzipSize', 'bytes', [cssGzipBytes]),
		],
		notes: [
			'Totals include every emitted .js and .css file in build/client/_app/immutable.',
			'The bench app has zero-consent baseline routes, so these totals cover both the measured and the floor arms.',
		],
		package: '@c15t/sveltekit-browser-bench',
		runtime: 'sveltekit',
		scenario: 'sveltekit-client-bundle',
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'bundle',
		timestamp: new Date().toISOString(),
	};

	writeJson(join(outputDir, `${result.scenario}.json`), result);

	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log(toMarkdown(assets, jsGzipBytes, cssGzipBytes));
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
