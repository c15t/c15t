import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { BenchmarkEnvironment, MetricSampleSet } from './schema';

export function percentile(values: number[], p: number): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const rank = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(rank, sorted.length - 1))] ?? 0;
}

export function average(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1]! + sorted[middle]!) / 2
		: sorted[middle]!;
}

export function summarizeMetric(
	name: string,
	unit: MetricSampleSet['unit'],
	samples: number[]
): MetricSampleSet {
	return {
		name,
		unit,
		samples,
		avg: Number(average(samples).toFixed(3)),
		median: Number(median(samples).toFixed(3)),
		p95: Number(percentile(samples, 95).toFixed(3)),
	};
}

export function getEnvironment(browserVersion?: string): BenchmarkEnvironment {
	return {
		os: process.platform,
		arch: process.arch,
		bunVersion: process.versions.bun,
		nodeVersion: process.version,
		browserVersion,
		ci: process.env.CI === 'true',
	};
}

export function ensureDir(path: string): void {
	mkdirSync(path, { recursive: true });
}

export function writeJson(path: string, value: unknown): void {
	ensureDir(dirname(path));
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function listJsonFiles(path: string): string[] {
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
}

export function safeCommitSha(): string {
	return (
		process.env.GITHUB_SHA ??
		process.env.VERCEL_GIT_COMMIT_SHA ??
		process.env.BENCHMARK_COMMIT_SHA ??
		'unknown'
	);
}

export function safeBaseSha(): string | undefined {
	return process.env.BENCHMARK_BASE_SHA ?? process.env.GITHUB_BASE_SHA;
}

export function formatMetric(
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
}

export function measureLoop(iterations: number, fn: () => void): number[] {
	const samples: number[] = [];

	for (let index = 0; index < iterations; index += 1) {
		const startedAt = performance.now();
		fn();
		const finishedAt = performance.now();
		samples.push((finishedAt - startedAt) * 1000);
	}

	return samples;
}

export function measureAsyncLoop(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	const samples: number[] = [];

	return (async () => {
		for (let index = 0; index < iterations; index += 1) {
			const startedAt = performance.now();
			await fn();
			const finishedAt = performance.now();
			samples.push((finishedAt - startedAt) * 1000);
		}

		return samples;
	})();
}

export function latestMtimeMs(path: string): number {
	return statSync(path).mtimeMs;
}
