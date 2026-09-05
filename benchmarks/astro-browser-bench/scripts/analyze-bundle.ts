#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
	BENCHMARK_SCHEMA_VERSION,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import type { BenchmarkResult } from '@c15t/benchmarking';

interface ClientAssetSize {
	fileName: string;
	type: 'css' | 'js';
	rawBytes: number;
	gzipBytes: number;
}

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientAssetsDir = join(appDir, 'dist', 'client', '_astro');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/bundle-astro';

const readClientAssets = async function readClientAssets(): Promise<
	ClientAssetSize[]
> {
	const entries = await readdir(clientAssetsDir, { withFileTypes: true });
	const assetEntries = entries.filter(
		(entry) => entry.isFile() && ['.css', '.js'].includes(extname(entry.name))
	);

	return await Promise.all(
		assetEntries.map(async (entry) => {
			const contents = await readFile(join(clientAssetsDir, entry.name));
			return {
				fileName: entry.name,
				gzipBytes: gzipSync(contents).byteLength,
				rawBytes: contents.byteLength,
				type: extname(entry.name).slice(1) as ClientAssetSize['type'],
			};
		})
	);
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
		'# Astro client bundle',
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
			`Astro client assets were not found at ${clientAssetsDir}. Run "bun run build" first.`
		);
	}

	const assets = await readClientAssets();
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
			name: 'astro-client-bundle',
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'astro',
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
			'Totals include every emitted .js and .css file in dist/client/_astro for the manifest build.',
			'The dialog and IAB island chunks are counted here but only download when a visitor opens a dialog.',
		],
		package: '@c15t/astro-browser-bench',
		runtime: 'astro',
		scenario: 'astro-client-bundle',
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
