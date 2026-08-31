#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
	BENCHMARK_SCHEMA_VERSION,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import type { BenchmarkResult } from '@c15t/benchmarking';
import { chromium } from 'playwright';
import type * as PlaywrightTypes from 'playwright';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const createVoidDeferredPromise = function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROUNDS = 3;
const WARMUP_PER_ROUND = 5;
const MEASURED_PER_ROUND = 20;
const CPU_THROTTLE_RATE = 6;

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(appDir, 'dist');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ??
	join(appDir, '../../.benchmarks/current/first-paint');

// ---------------------------------------------------------------------------
// CDP metric names collected from Performance.getMetrics()
// All timing values returned by CDP are in seconds; we convert to ms.
// JSHeapUsedSize is in bytes and is passed through unchanged.
// ---------------------------------------------------------------------------

interface CdpMetric {
	name: string;
	value: number;
}

interface CollectedSample {
	ScriptDuration: number;
	RecalcStyleDuration: number;
	LayoutDuration: number;
	TaskDuration: number;
	JSHeapUsedSize: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pickFreePort = function pickFreePort(): Promise<number> {
	return createDeferredPromise((fulfill, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				reject(new Error('Could not determine free port'));
				return;
			}
			const { port } = address;
			server.close(() => fulfill(port));
		});
		server.on('error', reject);
	});
};

const waitForServer = async function waitForServer(
	url: string,
	timeoutMs = 30_000
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	const poll = async (): Promise<void> => {
		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for server at ${url}`);
		}
		try {
			const res = await fetch(url);
			if (res.ok || res.status < 500) {
				return;
			}
		} catch {
			// not ready yet
		}
		await sleep(250);
		return poll();
	};
	await poll();
};

const runCommand = async function runCommand(
	args: string[],
	label: string
): Promise<void> {
	await createVoidDeferredPromise((fulfill, reject) => {
		const child = spawn('bun', args, {
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let logs = '';
		child.stdout.on('data', (chunk) => {
			logs += String(chunk);
		});
		child.stderr.on('data', (chunk) => {
			logs += String(chunk);
		});

		child.on('exit', (code) => {
			if (code === 0) {
				fulfill();
			} else {
				reject(
					new Error(
						logs || `bun ${args.join(' ')} failed while running ${label}`
					)
				);
			}
		});
		child.on('error', reject);
	});
};

const ensureBuild = async function ensureBuild(): Promise<void> {
	if (existsSync(distDir)) {
		console.log('dist/ already exists — skipping build.');
		return;
	}
	console.log('dist/ not found — running vite build…');
	await runCommand(['run', 'build'], 'vite-react-repro build');
	console.log('Build complete.');
};

const extractMetricValue = function extractMetricValue(
	metrics: CdpMetric[],
	name: string
): number {
	return metrics.find((m) => m.name === name)?.value ?? 0;
};

// ---------------------------------------------------------------------------
// Core iteration logic
// ---------------------------------------------------------------------------

const collectOneSample = async function collectOneSample(
	browser: PlaywrightTypes.Browser,
	url: string
): Promise<CollectedSample> {
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		const cdp = await context.newCDPSession(page);

		// Enable Performance domain before navigation so counters start from zero.
		await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });

		// Apply CPU throttle.
		await cdp.send('Emulation.setCPUThrottlingRate', {
			rate: CPU_THROTTLE_RATE,
		});

		// Navigate and wait for the load event to fire.
		await page.goto(url, { waitUntil: 'load' });

		const { metrics } = (await cdp.send('Performance.getMetrics')) as {
			metrics: CdpMetric[];
		};

		// Timing values are in seconds — convert to milliseconds.
		const scriptDurationMs =
			extractMetricValue(metrics, 'ScriptDuration') * 1000;
		const recalcStyleDurationMs =
			extractMetricValue(metrics, 'RecalcStyleDuration') * 1000;
		const layoutDurationMs =
			extractMetricValue(metrics, 'LayoutDuration') * 1000;
		const taskDurationMs = extractMetricValue(metrics, 'TaskDuration') * 1000;
		// JSHeapUsedSize is already in bytes.
		const jsHeapUsedSize = extractMetricValue(metrics, 'JSHeapUsedSize');

		return {
			JSHeapUsedSize: jsHeapUsedSize,
			LayoutDuration: layoutDurationMs,
			RecalcStyleDuration: recalcStyleDurationMs,
			ScriptDuration: scriptDurationMs,
			TaskDuration: taskDurationMs,
		};
	} finally {
		await context.close();
	}
};

// ---------------------------------------------------------------------------
// Statistics helpers (min/max/stddev beyond what summarizeMetric provides)
// ---------------------------------------------------------------------------

const stddev = function stddev(values: number[]): number {
	if (values.length < 2) {
		return 0;
	}
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	const variance =
		values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
	return Math.sqrt(variance);
};

const min = function min(values: number[]): number {
	return values.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
};

const max = function max(values: number[]): number {
	return values.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
};

const median = function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
		: (sorted[mid] ?? 0);
};

// ---------------------------------------------------------------------------
// Table formatting
// ---------------------------------------------------------------------------

const pad = function pad(s: string, width: number, right = false): string {
	return right ? s.padStart(width) : s.padEnd(width);
};

const fmtMs = function fmtMs(value: number): string {
	return `${value.toFixed(2)} ms`;
};

const fmtBytes = function fmtBytes(value: number): string {
	return `${(value / 1024).toFixed(1)} kB`;
};

interface MetricStats {
	name: string;
	unit: 'ms' | 'bytes';
	samples: number[];
}

const printTable = function printTable(metrics: MetricStats[]): void {
	const header = ['Metric', 'Mean', 'Median', 'Stddev', 'Min', 'Max'];
	const colWidths = [28, 14, 14, 14, 14, 14];

	const sep = colWidths.map((w) => '-'.repeat(w)).join('-+-');
	const headerRow = header
		.map((h, i) => pad(h, colWidths[i] ?? 14))
		.join(' | ');

	console.log('');
	console.log(headerRow);
	console.log(sep);

	for (const { name, unit, samples } of metrics) {
		const fmt = unit === 'bytes' ? fmtBytes : fmtMs;
		const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
		const row = [
			pad(name, colWidths[0] ?? 28),
			pad(fmt(avg), colWidths[1] ?? 14, true),
			pad(fmt(median(samples)), colWidths[2] ?? 14, true),
			pad(fmt(stddev(samples)), colWidths[3] ?? 14, true),
			pad(fmt(min(samples)), colWidths[4] ?? 14, true),
			pad(fmt(max(samples)), colWidths[5] ?? 14, true),
		].join(' | ');
		console.log(row);
	}

	console.log('');
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = async function run(): Promise<void> {
	await ensureBuild();

	const port = await pickFreePort();
	const baseUrl = `http://localhost:${port}`;

	console.log(`Starting vite preview on port ${port}…`);
	const previewServer = spawn(
		'bun',
		['run', 'vite', 'preview', '--port', String(port), '--strictPort'],
		{
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);

	let serverLogs = '';
	previewServer.stdout.on('data', (chunk) => {
		serverLogs += String(chunk);
	});
	previewServer.stderr.on('data', (chunk) => {
		serverLogs += String(chunk);
	});

	let runError: unknown;
	try {
		await waitForServer(baseUrl);
		console.log(`Server ready at ${baseUrl}`);

		const browser = await chromium.launch({ headless: true });

		const allSamples: CollectedSample[] = [];
		const totalRuns = ROUNDS * MEASURED_PER_ROUND;
		const totalWithWarmup = ROUNDS * (WARMUP_PER_ROUND + MEASURED_PER_ROUND);

		console.log(
			`Running ${ROUNDS} rounds × ${MEASURED_PER_ROUND} measured + ${WARMUP_PER_ROUND} warmup = ${totalRuns} samples (${totalWithWarmup} total navigations).`
		);
		console.log(`CPU throttle: ${CPU_THROTTLE_RATE}x`);

		const rounds = Array.from({ length: ROUNDS }, (_, index) => index + 1);
		await rounds.reduce<Promise<void>>(async (previousRound, round) => {
			await previousRound;
			console.log(`\n  Round ${round}/${ROUNDS}`);

			// Warmup runs — results discarded.
			process.stdout.write(`    Warmup  [${' '.repeat(WARMUP_PER_ROUND)}]\r`);
			process.stdout.write('    Warmup  [');
			const warmups = Array.from({ length: WARMUP_PER_ROUND });
			await warmups.reduce<Promise<void>>(async (previousWarmup) => {
				await previousWarmup;
				await collectOneSample(browser, baseUrl);
				process.stdout.write('.');
			}, Promise.resolve());
			process.stdout.write(']\n');

			// Measured runs.
			process.stdout.write(`    Measure [${' '.repeat(MEASURED_PER_ROUND)}]\r`);
			process.stdout.write('    Measure [');
			const measurements = Array.from({ length: MEASURED_PER_ROUND });
			await measurements.reduce<Promise<void>>(async (previousMeasurement) => {
				await previousMeasurement;
				const sample = await collectOneSample(browser, baseUrl);
				allSamples.push(sample);
				process.stdout.write('.');
			}, Promise.resolve());
			process.stdout.write(']\n');
		}, Promise.resolve());

		const browserVersion = browser.version();
		await browser.close();

		// ---------------------------------------------------------------------------
		// Aggregate samples per metric
		// ---------------------------------------------------------------------------

		const scriptDurations = allSamples.map((s) => s.ScriptDuration);
		const recalcStyleDurations = allSamples.map((s) => s.RecalcStyleDuration);
		const layoutDurations = allSamples.map((s) => s.LayoutDuration);
		const taskDurations = allSamples.map((s) => s.TaskDuration);
		const jsHeapSizes = allSamples.map((s) => s.JSHeapUsedSize);

		// ---------------------------------------------------------------------------
		// Print summary table
		// ---------------------------------------------------------------------------

		console.log('\n=== First-Paint Benchmark Results ===');
		console.log(
			`  ${totalRuns} samples  |  CPU throttle ${CPU_THROTTLE_RATE}x  |  Chromium headless`
		);

		printTable([
			{
				name: 'Total → first paint (Task)',
				samples: taskDurations,
				unit: 'ms',
			},
			{ name: 'JS evaluation (Script)', samples: scriptDurations, unit: 'ms' },
			{
				name: 'Style recalc',
				samples: recalcStyleDurations,
				unit: 'ms',
			},
			{ name: 'Layout', samples: layoutDurations, unit: 'ms' },
			{ name: 'JS heap used', samples: jsHeapSizes, unit: 'bytes' },
		]);

		// ---------------------------------------------------------------------------
		// Build BenchmarkResult and write JSON
		// ---------------------------------------------------------------------------

		const result: BenchmarkResult = {
			baseSha: safeBaseSha(),
			budgetDefinitions: [],
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(browserVersion),
			fixture: {
				consentCount: 0,
				localeCount: 1,
				name: 'vite-react-repro',
				notes: [
					`CPU throttle: ${CPU_THROTTLE_RATE}x via CDP Emulation.setCPUThrottlingRate`,
					`${ROUNDS} rounds × ${MEASURED_PER_ROUND} measured + ${WARMUP_PER_ROUND} warmup per round`,
					'Metrics collected via CDP Performance.getMetrics() after load event.',
					'Timing values (ScriptDuration, RecalcStyleDuration, LayoutDuration, TaskDuration) converted from seconds to milliseconds.',
				],
				scriptCount: 0,
				themeComplexity: 'minimal',
			},
			framework: 'react',
			metrics: [
				summarizeMetric('taskDuration', 'ms', taskDurations),
				summarizeMetric('scriptDuration', 'ms', scriptDurations),
				summarizeMetric('recalcStyleDuration', 'ms', recalcStyleDurations),
				summarizeMetric('layoutDuration', 'ms', layoutDurations),
				summarizeMetric('jsHeapUsedSize', 'bytes', jsHeapSizes),
			],
			notes: [
				'Vite + React SPA first-paint benchmark via Chrome DevTools Protocol.',
				'TaskDuration approximates total main-thread work to first paint.',
				'ScriptDuration captures JS evaluation time specifically.',
			],
			package: '@c15t/vite-react-repro',
			runtime: 'playwright',
			scenario: 'first-paint',
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'browser-runtime',
			timestamp: new Date().toISOString(),
		};

		writeJson(join(outputDir, 'first-paint.json'), result);
		console.log(`Results written to ${join(outputDir, 'first-paint.json')}`);
	} catch (error) {
		runError = error;
	} finally {
		previewServer.kill('SIGTERM');
		await sleep(500);
		if (!previewServer.killed) {
			previewServer.kill('SIGKILL');
		}
		// 143 = SIGTERM (128 + 15) — expected since we kill the server ourselves.
		if (
			previewServer.exitCode &&
			previewServer.exitCode !== 0 &&
			previewServer.exitCode !== 143
		) {
			runError = new Error(
				serverLogs || 'vite preview server exited with a non-zero code'
			);
		}
	}
	if (runError) {
		throw runError;
	}
};

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
