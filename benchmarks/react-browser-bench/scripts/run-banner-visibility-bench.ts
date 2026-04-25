#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4315;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/banner-visibility';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '15');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '2');

type Version = 'v2' | 'v3';

interface BenchState {
	version: Version;
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

function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((left, right) => left - right);
	return {
		avg: samples.reduce((acc, value) => acc + value, 0) / samples.length,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
	};
}

async function runCommand(args: string[], label: string) {
	await new Promise<void>((resolvePromise, rejectPromise) => {
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
}

async function ensureBuild() {
	if (existsSync(buildIdPath)) return;
	await runCommand(['run', 'build'], 'banner visibility benchmark build');
}

async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(`${BASE_URL}/banner-visibility`);
			if (response.ok) return;
		} catch {}
		await sleep(500);
	}
	throw new Error('Timed out waiting for banner visibility benchmark server');
}

async function collectSample(
	page: Page,
	version: Version
): Promise<BenchState> {
	await page.goto(`/banner-visibility?version=${version}`);
	await page.waitForFunction(
		(expectedVersion) => {
			const state = window.__c15tBannerVisibilityBench;
			return (
				!!state &&
				state.version === expectedVersion &&
				typeof state.bannerVisibleMs === 'number'
			);
		},
		version,
		{ timeout: 30_000 }
	);

	const state = await page.evaluate(() =>
		JSON.parse(JSON.stringify(window.__c15tBannerVisibilityBench ?? null))
	);
	if (!state) throw new Error(`${version}: missing benchmark state`);
	const typed = state as BenchState;
	if (typed.errorCount > 0) {
		throw new Error(`${version}: ${typed.errors.join('; ')}`);
	}
	return typed;
}

async function run() {
	await ensureBuild();
	const server = spawn(
		'bun',
		['run', 'start', '--', '-H', HOST, '-p', `${PORT}`],
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

	try {
		await waitForServer();
		const browser = await chromium.launch({ headless: true });
		const results: Array<{
			version: Version;
			bannerReadyMs: Stats;
			bannerVisibleMs: Stats;
			mountMs: Stats;
			renderCount: Stats;
		}> = [];

		for (const version of ['v2', 'v3'] as const) {
			const readySamples: number[] = [];
			const visibleSamples: number[] = [];
			const mountSamples: number[] = [];
			const renderSamples: number[] = [];

			for (let index = 0; index < warmupIterations + iterations; index += 1) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();
				const sample = await collectSample(page, version);
				if (index >= warmupIterations) {
					readySamples.push(sample.bannerReadyMs ?? 0);
					visibleSamples.push(sample.bannerVisibleMs ?? 0);
					mountSamples.push(sample.mountMs ?? 0);
					renderSamples.push(sample.renderCount);
				}
				await context.close();
			}

			results.push({
				version,
				bannerReadyMs: summarize(readySamples),
				bannerVisibleMs: summarize(visibleSamples),
				mountMs: summarize(mountSamples),
				renderCount: summarize(renderSamples),
			});
		}

		await browser.close();

		mkdirSync(outputDir, { recursive: true });
		writeFileSync(
			join(outputDir, 'react-v2-v3-banner-visibility.json'),
			`${JSON.stringify(
				{
					suite: 'react-banner-visibility',
					generatedAt: new Date().toISOString(),
					iterations,
					warmupIterations,
					results,
				},
				null,
				2
			)}\n`
		);

		const v2 = results.find((result) => result.version === 'v2');
		const v3 = results.find((result) => result.version === 'v3');
		console.log('# React banner visibility benchmark\n');
		console.log(`Iterations per metric: ${iterations}\n`);
		console.log(
			'| Metric | v2 median ms | v3 median ms | Δ | v2 p95 ms | v3 p95 ms | Δ |'
		);
		console.log('|---|---:|---:|---:|---:|---:|---:|');
		if (v2 && v3) {
			for (const metric of [
				'bannerReadyMs',
				'bannerVisibleMs',
				'mountMs',
			] as const) {
				const medianDelta =
					((v3[metric].median - v2[metric].median) / v2[metric].median) * 100;
				const p95Delta =
					((v3[metric].p95 - v2[metric].p95) / v2[metric].p95) * 100;
				console.log(
					`| ${metric} | ${v2[metric].median.toFixed(2)} | ${v3[metric].median.toFixed(2)} | ${medianDelta >= 0 ? '+' : ''}${medianDelta.toFixed(1)}% | ${v2[metric].p95.toFixed(2)} | ${v3[metric].p95.toFixed(2)} | ${p95Delta >= 0 ? '+' : ''}${p95Delta.toFixed(1)}% |`
				);
			}
		}
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (server.exitCode && server.exitCode !== 0) {
			throw new Error(logs || 'Banner visibility bench server failed');
		}
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
