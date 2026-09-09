import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { BenchmarkEnvironment, MetricSampleSet } from './schema';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

export const percentile = function percentile(
	values: number[],
	p: number
): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const rank = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(rank, sorted.length - 1))] ?? 0;
};

export const average = function average(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const median = function median(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (getDefined(sorted[middle - 1]) + getDefined(sorted[middle])) / 2
		: getDefined(sorted[middle]);
};

export const summarizeMetric = function summarizeMetric(
	name: string,
	unit: MetricSampleSet['unit'],
	samples: number[]
): MetricSampleSet {
	return {
		avg: Number(average(samples).toFixed(3)),
		median: Number(median(samples).toFixed(3)),
		name,
		p95: Number(percentile(samples, 95).toFixed(3)),
		samples,
		unit,
	};
};

export const summarizeNullableMetric = function summarizeNullableMetric(
	name: string,
	unit: MetricSampleSet['unit'],
	samples: (number | null | undefined)[]
): MetricSampleSet {
	const values = samples.map((sample) =>
		typeof sample === 'number' && Number.isFinite(sample) ? sample : null
	);
	const numbers = values.filter((sample): sample is number => sample !== null);
	return {
		avg: numbers.length > 0 ? Number(average(numbers).toFixed(3)) : null,
		median: numbers.length > 0 ? Number(median(numbers).toFixed(3)) : null,
		name,
		p95: numbers.length > 0 ? Number(percentile(numbers, 95).toFixed(3)) : null,
		samples: values,
		unit,
	} as unknown as MetricSampleSet;
};

export const getEnvironment = function getEnvironment(
	browserVersion?: string
): BenchmarkEnvironment {
	return {
		arch: process.arch,
		browserVersion,
		bunVersion: process.versions.bun,
		ci: process.env.CI === 'true',
		nodeVersion: process.version,
		os: process.platform,
	};
};

export const ensureDir = function ensureDir(path: string): void {
	mkdirSync(path, { recursive: true });
};

export const writeJson = function writeJson(
	path: string,
	value: unknown
): void {
	ensureDir(dirname(path));
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const readJson = function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
};

export const listJsonFiles = function listJsonFiles(path: string): string[] {
	try {
		statSync(path);
	} catch {
		return [];
	}

	const entries = readdirSync(path, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = join(path, entry.name);
		if (entry.isDirectory()) {
			files.push(...listJsonFiles(fullPath));
			continue;
		}

		if (entry.isFile() && fullPath.endsWith('.json')) {
			files.push(fullPath);
		}
	}

	return files;
};

const readGit = function readGit(args: string[]): string | undefined {
	try {
		return execFileSync('git', args, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return undefined;
	}
};

/**
 * Commit the measured source came from. CI environment variables win;
 * otherwise the working tree's `HEAD` is read so local artifacts carry
 * real provenance instead of `unknown`.
 */
export const safeCommitSha = function safeCommitSha(): string {
	return (
		process.env.GITHUB_SHA ??
		process.env.VERCEL_GIT_COMMIT_SHA ??
		process.env.BENCHMARK_COMMIT_SHA ??
		readGit(['rev-parse', 'HEAD']) ??
		'unknown'
	);
};

/**
 * Whether the measured working tree differs from `HEAD`. `null` when git
 * is unavailable. Runners record this so a result cannot silently claim a
 * commit it does not match.
 */
export const safeGitDirty = function safeGitDirty(): boolean | null {
	if (process.env.BENCHMARK_GIT_DIRTY !== undefined) {
		return process.env.BENCHMARK_GIT_DIRTY === 'true';
	}
	const status = readGit(['status', '--porcelain', '--untracked-files=no']);
	if (status === undefined) {
		return null;
	}
	return status.length > 0;
};

export const safeBaseSha = function safeBaseSha(): string | undefined {
	return process.env.BENCHMARK_BASE_SHA ?? process.env.GITHUB_BASE_SHA;
};

export const formatMetric = function formatMetric(
	value: number | null,
	unit: MetricSampleSet['unit']
): string {
	if (value === null) {
		return 'n/a';
	}

	if (unit === 'bytes') {
		return `${(value / 1024).toFixed(2)} kB`;
	}

	if (unit === 'count') {
		return `${value}`;
	}

	return `${value.toFixed(2)} ${unit}`;
};

export const measureLoop = function measureLoop<Result>(
	iterations: number,
	fn: () => Result,
	cleanup?: (result: Result) => void
): number[] {
	const samples: number[] = [];

	for (let index = 0; index < iterations; index += 1) {
		const startedAt = performance.now();
		const result = fn();
		const finishedAt = performance.now();
		cleanup?.(result);
		samples.push((finishedAt - startedAt) * 1000);
	}

	return samples;
};

export const measureAsyncLoop = function measureAsyncLoop<Result>(
	iterations: number,
	fn: () => Promise<Result>,
	cleanup?: (result: Result) => void
): Promise<number[]> {
	const samples: number[] = [];
	const iterationIndexes = Array.from(
		{ length: iterations },
		(_, index) => index
	);

	return iterationIndexes.reduce<Promise<number[]>>(
		async (previous, _index) => {
			await previous;
			const startedAt = performance.now();
			const result = await fn();
			const finishedAt = performance.now();
			cleanup?.(result);
			samples.push((finishedAt - startedAt) * 1000);
			return samples;
		},
		Promise.resolve(samples)
	);
};

export const latestMtimeMs = function latestMtimeMs(path: string): number {
	return statSync(path).mtimeMs;
};
