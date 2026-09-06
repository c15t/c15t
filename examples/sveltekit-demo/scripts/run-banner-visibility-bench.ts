#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
const PORT = 4176;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appDir, '../..');
const outputDir = join(repoRoot, '.benchmarks', 'current', 'banner-visibility');
const iterations = Number(process.env.BENCH_ITERATIONS ?? '15');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '2');

interface BenchState {
	activeUI: string;
	renderCount: number;
	mountMs?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	errorCount: number;
	errors: string[];
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
			rejectPromise(new Error(logs || `${label} failed`));
		});
		command.on('error', rejectPromise);
	});
};

const ensureBuild = async function ensureBuild() {
	await runCommand(['run', 'build'], 'svelte banner benchmark build');
};

const waitForServer = async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const response = await fetch(`${BASE_URL}/bench/banner-visibility`);
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore transient failures while polling or cleaning up.
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await sleep(500);
	}

	throw new Error('Timed out waiting for Svelte banner benchmark server');
};

const collectSample = async function collectSample(
	page: Page
): Promise<BenchState> {
	await page.goto('/bench/banner-visibility');
	await page.waitForFunction(
		() => {
			const state = window.__c15tBannerVisibilityBench;
			return !!state && typeof state.bannerVisibleMs === 'number';
		},
		undefined,
		{ timeout: 30_000 }
	);

	const state = await page.evaluate(() =>
		JSON.parse(JSON.stringify(window.__c15tBannerVisibilityBench ?? null))
	);
	if (!state) {
		throw new Error('Missing benchmark state');
	}
	const typed = state as BenchState;
	if (typed.errorCount > 0) {
		throw new Error(typed.errors.join('; '));
	}
	return typed;
};

const run = async function run() {
	await ensureBuild();
	const server = spawn(
		'bun',
		['run', 'preview', '--', '--host', HOST, '--port', `${PORT}`],
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
		const readySamples: number[] = [];
		const visibleSamples: number[] = [];
		const mountSamples: number[] = [];
		const renderSamples: number[] = [];
		const iterationIndexes = Array.from(
			{ length: warmupIterations + iterations },
			(_, index) => index
		);
		await iterationIndexes.reduce<Promise<void>>(
			async (previousIteration, index) => {
				await previousIteration;
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();
				const sample = await collectSample(page);
				if (index >= warmupIterations) {
					readySamples.push(sample.bannerReadyMs ?? 0);
					visibleSamples.push(sample.bannerVisibleMs ?? 0);
					mountSamples.push(sample.mountMs ?? 0);
					renderSamples.push(sample.renderCount);
				}
				await context.close();
			},
			Promise.resolve()
		);
		const result = {
			bannerReadyMs: summarize(readySamples),
			bannerVisibleMs: summarize(visibleSamples),
			mountMs: summarize(mountSamples),
			renderCount: summarize(renderSamples),
		};

		await browser.close();

		mkdirSync(outputDir, { recursive: true });
		writeFileSync(
			join(outputDir, 'svelte-banner-visibility.json'),
			`${JSON.stringify(
				{
					generatedAt: new Date().toISOString(),
					iterations,
					result,
					suite: 'svelte-banner-visibility',
					warmupIterations,
				},
				null,
				2
			)}\n`
		);

		console.log('# Svelte banner visibility benchmark\n');
		console.log(`Iterations per metric: ${iterations}\n`);
		console.log('| Metric | Median | p95 |');
		console.log('|---|---:|---:|');
		for (const metric of [
			'bannerReadyMs',
			'bannerVisibleMs',
			'mountMs',
		] as const) {
			console.log(
				`| ${metric} | ${result[metric].median.toFixed(2)} | ${result[metric].p95.toFixed(2)} |`
			);
		}
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (
			server.exitCode !== null &&
			server.exitCode !== 0 &&
			server.exitCode !== 143
		) {
			cleanupError = new Error(logs || 'Svelte banner benchmark server failed');
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
