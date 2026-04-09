#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import { chromium } from 'playwright';

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

function pickFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				reject(new Error('Could not determine free port'));
				return;
			}
			const { port } = address;
			server.close(() => resolve(port));
		});
		server.on('error', reject);
	});
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url);
			if (res.ok || res.status < 500) {
				return;
			}
		} catch {
			// not ready yet
		}
		await sleep(250);
	}
	throw new Error(`Timed out waiting for server at ${url}`);
}

async function runCommand(args: string[], label: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
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
				resolve();
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
}

async function ensureBuild(): Promise<void> {
	if (existsSync(distDir)) {
		console.log('dist/ already exists — skipping build.');
		return;
	}
	console.log('dist/ not found — running vite build…');
	await runCommand(['run', 'build'], 'vite-react-repro build');
	console.log('Build complete.');
}

function extractMetricValue(metrics: CdpMetric[], name: string): number {
	return metrics.find((m) => m.name === name)?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Core iteration logic
// ---------------------------------------------------------------------------

async function collectOneSample(
	browser: import('playwright').Browser,
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
			ScriptDuration: scriptDurationMs,
			RecalcStyleDuration: recalcStyleDurationMs,
			LayoutDuration: layoutDurationMs,
			TaskDuration: taskDurationMs,
			JSHeapUsedSize: jsHeapUsedSize,
		};
	} finally {
		await context.close();
	}
}

// ---------------------------------------------------------------------------
// Statistics helpers (min/max/stddev beyond what summarizeMetric provides)
// ---------------------------------------------------------------------------

function stddev(values: number[]): number {
	if (values.length < 2) return 0;
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	const variance =
		values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
	return Math.sqrt(variance);
}

function min(values: number[]): number {
	return values.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
}

function max(values: number[]): number {
	return values.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
		: (sorted[mid] ?? 0);
}

// ---------------------------------------------------------------------------
// Table formatting
// ---------------------------------------------------------------------------

function pad(s: string, width: number, right = false): string {
	return right ? s.padStart(width) : s.padEnd(width);
}

function fmtMs(value: number): string {
	return `${value.toFixed(2)} ms`;
}

function fmtBytes(value: number): string {
	return `${(value / 1024).toFixed(1)} kB`;
}

interface MetricStats {
	name: string;
	unit: 'ms' | 'bytes';
	samples: number[];
}

function printTable(metrics: MetricStats[]): void {
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
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
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

		for (let round = 1; round <= ROUNDS; round += 1) {
			console.log(`\n  Round ${round}/${ROUNDS}`);

			// Warmup runs — results discarded.
			process.stdout.write(`    Warmup  [${' '.repeat(WARMUP_PER_ROUND)}]\r`);
			process.stdout.write('    Warmup  [');
			for (let w = 0; w < WARMUP_PER_ROUND; w += 1) {
				await collectOneSample(browser, baseUrl);
				process.stdout.write('.');
			}
			process.stdout.write(']\n');

			// Measured runs.
			process.stdout.write(`    Measure [${' '.repeat(MEASURED_PER_ROUND)}]\r`);
			process.stdout.write('    Measure [');
			for (let m = 0; m < MEASURED_PER_ROUND; m += 1) {
				const sample = await collectOneSample(browser, baseUrl);
				allSamples.push(sample);
				process.stdout.write('.');
			}
			process.stdout.write(']\n');
		}

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
				unit: 'ms',
				samples: taskDurations,
			},
			{ name: 'JS evaluation (Script)', unit: 'ms', samples: scriptDurations },
			{
				name: 'Style recalc',
				unit: 'ms',
				samples: recalcStyleDurations,
			},
			{ name: 'Layout', unit: 'ms', samples: layoutDurations },
			{ name: 'JS heap used', unit: 'bytes', samples: jsHeapSizes },
		]);

		// ---------------------------------------------------------------------------
		// Build BenchmarkResult and write JSON
		// ---------------------------------------------------------------------------

		const result: BenchmarkResult = {
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'browser-runtime',
			package: '@c15t/vite-react-repro',
			framework: 'react',
			runtime: 'playwright',
			scenario: 'first-paint',
			commitSha: safeCommitSha(),
			baseSha: safeBaseSha(),
			timestamp: new Date().toISOString(),
			environment: getEnvironment(browserVersion),
			fixture: {
				name: 'vite-react-repro',
				consentCount: 0,
				scriptCount: 0,
				localeCount: 1,
				themeComplexity: 'minimal',
				notes: [
					`CPU throttle: ${CPU_THROTTLE_RATE}x via CDP Emulation.setCPUThrottlingRate`,
					`${ROUNDS} rounds × ${MEASURED_PER_ROUND} measured + ${WARMUP_PER_ROUND} warmup per round`,
					'Metrics collected via CDP Performance.getMetrics() after load event.',
					'Timing values (ScriptDuration, RecalcStyleDuration, LayoutDuration, TaskDuration) converted from seconds to milliseconds.',
				],
			},
			metrics: [
				summarizeMetric('taskDuration', 'ms', taskDurations),
				summarizeMetric('scriptDuration', 'ms', scriptDurations),
				summarizeMetric('recalcStyleDuration', 'ms', recalcStyleDurations),
				summarizeMetric('layoutDuration', 'ms', layoutDurations),
				summarizeMetric('jsHeapUsedSize', 'bytes', jsHeapSizes),
			],
			budgetDefinitions: [],
			budgets: [],
			notes: [
				'Vite + React SPA first-paint benchmark via Chrome DevTools Protocol.',
				'TaskDuration approximates total main-thread work to first paint.',
				'ScriptDuration captures JS evaluation time specifically.',
			],
		};

		writeJson(join(outputDir, 'first-paint.json'), result);
		console.log(`Results written to ${join(outputDir, 'first-paint.json')}`);
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
			throw new Error(
				serverLogs || 'vite preview server exited with a non-zero code'
			);
		}
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
