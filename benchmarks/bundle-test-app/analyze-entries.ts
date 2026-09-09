#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { importBoundaryBudgets } from '@c15t/benchmarking/budgets';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult, MetricBudget } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { build } from 'esbuild';

interface EntryMeasurement {
	name: string;
	rawBytes: number;
	gzipBytes: number;
	topInputs: {
		path: string;
		bytesInOutput: number;
	}[];
	/** Bytes in output contributed by modules of each boundary family. */
	boundaries: Record<BoundaryFamily, { bytes: number; inputs: string[] }>;
}

type BoundaryFamily = 'iab' | 'devtools' | 'allLocales';

/**
 * Module families the ordinary route must not bundle. Paths come from the
 * esbuild metafile and are matched against the workspace package folders
 * so a published-name alias cannot hide them.
 */
const BOUNDARY_MATCHERS: Record<BoundaryFamily, RegExp> = {
	allLocales:
		/packages\/translations\/dist\/(?:all\.js|translations\/(?!en\.js)[^/]+\.js)$/u,
	devtools: /packages\/dev-tools\//u,
	iab: /packages\/iab\/|@iabtechlabtcf\//u,
};

const ORDINARY_ENTRY = 'ordinary-react';

const classifyBoundaries = function classifyBoundaries(
	inputs: Record<string, { bytesInOutput: number }>
): EntryMeasurement['boundaries'] {
	const boundaries: EntryMeasurement['boundaries'] = {
		allLocales: { bytes: 0, inputs: [] },
		devtools: { bytes: 0, inputs: [] },
		iab: { bytes: 0, inputs: [] },
	};
	for (const [path, input] of Object.entries(inputs)) {
		for (const family of Object.keys(BOUNDARY_MATCHERS) as BoundaryFamily[]) {
			if (BOUNDARY_MATCHERS[family].test(path)) {
				boundaries[family].bytes += input.bytesInOutput;
				boundaries[family].inputs.push(path);
			}
		}
	}
	return boundaries;
};

const appDir = dirname(fileURLToPath(import.meta.url));
const entriesDir = join(appDir, 'entries');
const outputDir = process.env.BENCH_OUTPUT_DIR
	? resolve(process.cwd(), process.env.BENCH_OUTPUT_DIR, '..', 'bundle-entries')
	: resolve(appDir, '../../.benchmarks/current/bundle-entries');

const measureEntry = async function measureEntry(
	entryPath: string
): Promise<EntryMeasurement> {
	const buildResult = await build({
		bundle: true,
		entryPoints: [entryPath],
		external: ['react', 'react-dom', 'react/jsx-runtime'],
		format: 'esm',
		loader: { '.css': 'empty' },
		metafile: true,
		minify: true,
		platform: 'browser',
		write: false,
	});
	const [outputFile] = buildResult.outputFiles;
	if (!outputFile) {
		throw new Error(`esbuild produced no output for ${entryPath}`);
	}

	const [outputMetadata] = Object.values(buildResult.metafile.outputs);
	const boundaries = classifyBoundaries(
		Object.fromEntries(
			Object.keys(buildResult.metafile.inputs).map((path) => [
				path,
				{
					bytesInOutput: outputMetadata?.inputs[path]?.bytesInOutput ?? 0,
				},
			])
		)
	);
	const topInputs = Object.entries(outputMetadata?.inputs ?? {})
		.map(([path, input]) => ({
			bytesInOutput: input.bytesInOutput,
			path,
		}))
		.sort((left, right) => right.bytesInOutput - left.bytesInOutput)
		.slice(0, 10);

	return {
		boundaries,
		gzipBytes: gzipSync(outputFile.contents).byteLength,
		name: basename(entryPath, extname(entryPath)),
		rawBytes: outputFile.contents.byteLength,
		topInputs,
	};
};

const toBenchmarkResult = function toBenchmarkResult(
	measurement: EntryMeasurement
): BenchmarkResult {
	const budgetDefinitions: MetricBudget[] =
		measurement.name === ORDINARY_ENTRY ? importBoundaryBudgets : [];
	return {
		baseSha: safeBaseSha(),
		budgetDefinitions,
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(),
		fixture: {
			consentCount: 0,
			localeCount: 0,
			name: measurement.name,
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: measurement.name === 'provider' ? 'react' : 'core',
		metadata: {
			allLocalesInputs: measurement.boundaries.allLocales.inputs,
			devtoolsInputs: measurement.boundaries.devtools.inputs,
			gitDirty: safeGitDirty(),
			iabInputs: measurement.boundaries.iab.inputs,
			topInputsByBytesInOutput: measurement.topInputs.map(
				(input) => `${input.path}:${input.bytesInOutput}`
			),
		},
		metrics: [
			...Object.entries(measurement.boundaries).map(([family, boundary]) =>
				summarizeMetric(`${family}InputModuleCount`, 'count', [
					boundary.inputs.length,
				])
			),
			summarizeMetric('gzipSize', 'bytes', [measurement.gzipBytes]),
			summarizeMetric('rawSize', 'bytes', [measurement.rawBytes]),
			summarizeMetric('iabInputBytes', 'bytes', [
				measurement.boundaries.iab.bytes,
			]),
			summarizeMetric('devtoolsInputBytes', 'bytes', [
				measurement.boundaries.devtools.bytes,
			]),
			summarizeMetric('allLocalesInputBytes', 'bytes', [
				measurement.boundaries.allLocales.bytes,
			]),
		],
		notes: [
			'Synthetic esbuild entry with React externals and empty CSS loaders.',
		],
		package: '@c15t/next-bundle-bench',
		runtime: 'esbuild',
		scenario: measurement.name,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'bundle',
		timestamp: new Date().toISOString(),
	};
};

const toMarkdown = function toMarkdown(
	measurements: EntryMeasurement[]
): string {
	const lines = [
		'# Bundle entry benchmarks',
		'',
		'| Entry | Raw bytes | Gzip bytes |',
		'| --- | ---: | ---: |',
	];

	for (const measurement of measurements) {
		lines.push(
			`| ${measurement.name} | ${measurement.rawBytes} | ${measurement.gzipBytes} |`
		);
	}

	for (const measurement of measurements) {
		lines.push('', `## ${measurement.name} top inputs`, '');
		lines.push('| Input | Bytes in output |', '| --- | ---: |');
		for (const input of measurement.topInputs) {
			lines.push(`| ${input.path} | ${input.bytesInOutput} |`);
		}
	}

	return `${lines.join('\n')}\n`;
};

const main = async function main() {
	const entries = (await readdir(entriesDir, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && extname(entry.name) === '.ts')
		.map((entry) => join(entriesDir, entry.name))
		.sort();
	const measurements = await Promise.all(entries.map(measureEntry));
	const results = measurements.map(toBenchmarkResult);

	for (const result of results) {
		writeJson(join(outputDir, `${result.scenario}.json`), result);
	}

	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(results, null, 2));
		return;
	}

	console.log(toMarkdown(measurements));
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
