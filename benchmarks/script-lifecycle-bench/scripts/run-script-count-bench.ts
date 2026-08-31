#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import type { Page } from 'playwright';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const _createDeferredPromise = function _createDeferredPromise<Value>(
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

const HOST = '127.0.0.1';
const PORT = 4314;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/script-count';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '9');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '1');
const counts = (process.env.SCRIPT_COUNTS ?? '5,10,25,50')
	.split(',')
	.map((value) => Number(value.trim()))
	.filter((value) => Number.isFinite(value) && value > 0);

type Version = 'v2' | 'v3';

interface BenchState {
	version: Version;
	count: number;
	actionStartedAtMs: number | null;
	completedAtMs: number | null;
	activeUI: string;
	loadedIds: string[];
	executedIds: string[];
	domIds: string[];
	errors: string[];
	initialReady: boolean;
	complete: boolean;
}

interface Stats {
	avg: number;
	median: number;
	p95: number;
	min: number;
	max: number;
}

const summarize = function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((left, right) => left - right);
	return {
		avg: samples.reduce((acc, value) => acc + value, 0) / samples.length,
		max: sorted[sorted.length - 1] ?? 0,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		min: sorted[0] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
	};
};

const runCommand = async function runCommand(args: string[], label: string) {
	await createVoidDeferredPromise((resolvePromise, rejectPromise) => {
		const command = spawn('bun', args, {
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let logs = '';
		command.stdout.on('data', (chunk) => {
			logs += String(chunk);
		});
		command.stderr.on('data', (chunk) => {
			logs += String(chunk);
		});

		command.on('exit', (code) => {
			if (code === 0) {
				resolvePromise();
				return;
			}
			rejectPromise(
				new Error(logs || `bun ${args.join(' ')} failed: ${label}`)
			);
		});
		command.on('error', rejectPromise);
	});
};

const ensureBuild = async function ensureBuild() {
	rmSync(join(appDir, '.next'), { force: true, recursive: true });
	await runCommand(['run', 'build'], 'script count benchmark build');
};

const waitForServer = async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
			const response = await fetch(`${BASE_URL}/script-count`);
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore transient failures while polling or cleaning up.
		}
		// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
		await sleep(500);
	}
	throw new Error('Timed out waiting for script count benchmark server');
};

const readState = async function readState(page: Page): Promise<BenchState> {
	const state = await page.evaluate(() =>
		JSON.parse(
			JSON.stringify(
				window.__c15tGetScriptCountBenchState?.() ??
					window.__c15tScriptCountBench ??
					null
			)
		)
	);
	if (!state) {
		throw new Error('Missing window.__c15tScriptCountBench');
	}
	return state as BenchState;
};

const assertState = function assertState(
	state: BenchState,
	version: Version,
	count: number
) {
	if (state.version !== version) {
		throw new Error(`Expected ${version} state, saw ${state.version}`);
	}
	if (state.count !== count) {
		throw new Error(`Expected ${count} scripts, saw ${state.count}`);
	}
	if (state.errors.length > 0) {
		throw new Error(`${version}/${count}: ${state.errors.join('; ')}`);
	}
	if (!state.complete) {
		throw new Error(`${version}/${count}: completion marker missing`);
	}
	if (state.executedIds.length !== count) {
		throw new Error(
			`${version}/${count}: expected ${count} executed scripts, saw ${state.executedIds.length}`
		);
	}
	if (state.loadedIds.length !== count) {
		throw new Error(
			`${version}/${count}: expected ${count} loaded IDs, saw ${state.loadedIds.length}`
		);
	}
};

const collectSample = async function collectSample(
	page: Page,
	version: Version,
	count: number
) {
	await page.goto(`/script-count?version=${version}&count=${count}`);
	await page.waitForFunction(
		() => window.__c15tScriptCountBench?.initialReady === true,
		undefined,
		{ timeout: 30_000 }
	);

	const startedAt = performance.now();
	await page.click('#run-script-count');
	await page.waitForFunction(
		(expectedCount) =>
			window.__c15tScriptCountBench?.complete === true &&
			window.__c15tScriptCountBench.executedIds.length === expectedCount,
		count,
		{ timeout: 30_000 }
	);
	const playwrightDurationMs = performance.now() - startedAt;
	const state = await readState(page);
	assertState(state, version, count);

	const inPageDurationMs =
		state.actionStartedAtMs !== null && state.completedAtMs !== null
			? state.completedAtMs - state.actionStartedAtMs
			: playwrightDurationMs;

	return {
		inPageDurationMs,
		playwrightDurationMs,
		state,
	};
};

const run = async function run() {
	await ensureBuild();
	const server = spawn(
		'bun',
		['run', 'next', 'start', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);

	let logs = '';
	server.stdout.on('data', (chunk) => {
		logs += String(chunk);
	});
	server.stderr.on('data', (chunk) => {
		logs += String(chunk);
	});

	let cleanupError: Error | undefined;
	try {
		await waitForServer();
		const browser = await chromium.launch({ headless: true });
		const results: {
			version: Version;
			count: number;
			inPageDurationMs: Stats;
			playwrightDurationMs: Stats;
		}[] = [];

		for (const count of counts) {
			for (const version of ['v2', 'v3'] as const) {
				const inPageSamples: number[] = [];
				const playwrightSamples: number[] = [];

				for (let index = 0; index < warmupIterations + iterations; index += 1) {
					// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
					const context = await browser.newContext({ baseURL: BASE_URL });
					// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
					const page = await context.newPage();
					// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
					const sample = await collectSample(page, version, count);
					if (index >= warmupIterations) {
						inPageSamples.push(sample.inPageDurationMs);
						playwrightSamples.push(sample.playwrightDurationMs);
					}
					// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
					await context.close();
				}

				results.push({
					count,
					inPageDurationMs: summarize(inPageSamples),
					playwrightDurationMs: summarize(playwrightSamples),
					version,
				});
			}
		}

		await browser.close();

		mkdirSync(outputDir, { recursive: true });
		writeFileSync(
			join(outputDir, 'react-v2-v3-script-count.json'),
			`${JSON.stringify(
				{
					counts,
					generatedAt: new Date().toISOString(),
					iterations,
					results,
					suite: 'react-script-count',
					warmupIterations,
				},
				null,
				2
			)}\n`
		);

		console.log('# React script loading count benchmark\n');
		console.log(`Iterations per metric: ${iterations}\n`);
		console.log(
			'| Scripts | v2 median ms | v3 median ms | Δ | v2 p95 ms | v3 p95 ms | Δ |'
		);
		console.log('|---:|---:|---:|---:|---:|---:|---:|');
		for (const count of counts) {
			const v2 = results.find(
				(result) => result.count === count && result.version === 'v2'
			);
			const v3 = results.find(
				(result) => result.count === count && result.version === 'v3'
			);
			if (!v2 || !v3) {
				continue;
			}
			const medianDelta =
				((v3.inPageDurationMs.median - v2.inPageDurationMs.median) /
					v2.inPageDurationMs.median) *
				100;
			const p95Delta =
				((v3.inPageDurationMs.p95 - v2.inPageDurationMs.p95) /
					v2.inPageDurationMs.p95) *
				100;
			console.log(
				`| ${count} | ${v2.inPageDurationMs.median.toFixed(2)} | ${v3.inPageDurationMs.median.toFixed(2)} | ${medianDelta >= 0 ? '+' : ''}${medianDelta.toFixed(1)}% | ${v2.inPageDurationMs.p95.toFixed(2)} | ${v3.inPageDurationMs.p95.toFixed(2)} | ${p95Delta >= 0 ? '+' : ''}${p95Delta.toFixed(1)}% |`
			);
		}
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (server.exitCode && server.exitCode !== 0) {
			cleanupError = new Error(logs || 'Script count bench server failed');
		}
	}
	if (cleanupError) {
		throw cleanupError;
	}
};

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
