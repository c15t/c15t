#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import {
	artifactBudgets,
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	bundleBudgets,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';

interface RouteSize {
	route: string;
	gzip: number;
	c15tAddition: number;
}

const HOST = '127.0.0.1';
const PORT = 4309;
const BASE_URL = `http://${HOST}:${PORT}`;

const ROUTE_TO_SCENARIO: Record<string, string> = {
	'/': 'baseline',
	'/core-only': 'core-only',
	'/react-headless': 'react-headless',
	'/react-banner-only': 'react-banner-only',
	'/react-full': 'react-full',
	'/nextjs-basic': 'nextjs-basic',
	'/nextjs-ssr': 'nextjs-ssr',
};

async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(BASE_URL);
			if (response.ok) {
				return;
			}
		} catch {}
		await sleep(500);
	}

	throw new Error('Timed out waiting for bundle benchmark server');
}

async function analyzeRouteSizes() {
	const chunkSizes = new Map<string, number>();

	async function getGzipSize(chunkPath: string): Promise<number> {
		if (chunkSizes.has(chunkPath)) {
			return chunkSizes.get(chunkPath)!;
		}

		try {
			const content = await readFile(
				join('.next', chunkPath.replace(/^\/_next\//, '')),
				'utf8'
			);
			const gzip = gzipSync(Buffer.from(content)).length;
			chunkSizes.set(chunkPath, gzip);

			return gzip;
		} catch {
			return 0;
		}
	}

	const routes: RouteSize[] = [];
	let baselineGzip = 0;

	for (const routeName of Object.keys(ROUTE_TO_SCENARIO)) {
		const response = await fetch(`${BASE_URL}${routeName}`);
		const html = await response.text();
		const scripts = Array.from(
			html.matchAll(/<script[^>]+src="([^"]+)"/g),
			(match) => match[1]
		).filter((scriptPath): scriptPath is string =>
			Boolean(scriptPath?.startsWith('/_next/'))
		);

		let total = 0;
		for (const scriptPath of new Set(scripts)) {
			total += await getGzipSize(scriptPath);
		}

		if (routeName === '/') {
			baselineGzip = total;
		}

		routes.push({
			route: routeName,
			gzip: total,
			c15tAddition: 0,
		});
	}

	for (const route of routes) {
		route.c15tAddition = route.route === '/' ? 0 : route.gzip - baselineGzip;
	}

	routes.sort((a, b) => a.route.localeCompare(b.route));
	return { routes };
}

function runTarballSize(packageDir: string): {
	size: number | null;
	notes: string[];
} {
	const resolvedDir = resolve(process.cwd(), packageDir);
	const result = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], {
		cwd: resolvedDir,
		encoding: 'utf8',
	});

	if (result.status !== 0 || !result.stdout) {
		return { size: null, notes: [] };
	}

	try {
		const parsed = JSON.parse(result.stdout) as Array<{
			filename?: string;
			size?: number;
		}>;
		const artifact = parsed[0];
		const notes: string[] = [];

		if (artifact?.filename) {
			try {
				unlinkSync(join(resolvedDir, artifact.filename));
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unknown cleanup failure';
				notes.push(`Failed to remove tarball ${artifact.filename}: ${message}`);
			}
		}

		return { size: artifact?.size ?? null, notes };
	} catch {
		return { size: null, notes: [] };
	}
}

function routeFixture(route: RouteSize) {
	return {
		name: ROUTE_TO_SCENARIO[route.route] ?? route.route,
		consentCount: 5,
		scriptCount: 0,
		localeCount: 1,
		themeComplexity: 'minimal' as const,
	};
}

function toMarkdown(
	results: BenchmarkResult[],
	artifactResult: BenchmarkResult
): string {
	const lines = ['# Bundle and Artifact Benchmarks', ''];

	for (const result of results) {
		lines.push(`## ${result.scenario}`);
		lines.push('');
		lines.push('| Metric | Median | Unit |');
		lines.push('| --- | ---: | --- |');
		for (const metric of result.metrics) {
			lines.push(`| ${metric.name} | ${metric.median} | ${metric.unit} |`);
		}
		lines.push('');
	}

	lines.push('## Artifact Sizes');
	lines.push('');
	lines.push('| Metric | Median | Unit |');
	lines.push('| --- | ---: | --- |');
	for (const metric of artifactResult.metrics) {
		lines.push(`| ${metric.name} | ${metric.median} | ${metric.unit} |`);
	}
	lines.push('');

	return `${lines.join('\n')}\n`;
}

async function stopServer(
	server: ReturnType<typeof spawn>,
	logs: string
): Promise<void> {
	const waitForExit = () =>
		new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
			(resolve) => {
				server.once('exit', (code, signal) => resolve({ code, signal }));
			}
		);

	let result =
		server.exitCode !== null || server.signalCode !== null
			? {
					code: server.exitCode,
					signal: server.signalCode,
				}
			: null;

	if (result === null) {
		const exitPromise = waitForExit();

		server.kill('SIGTERM');

		result = await Promise.race([exitPromise, sleep(5_000).then(() => null)]);

		if (result === null) {
			server.kill('SIGKILL');
			result = await exitPromise;
		}
	}

	const expectedShutdown =
		result.code === 0 ||
		result.code === 143 ||
		result.signal === 'SIGTERM' ||
		result.signal === 'SIGKILL';

	if (!expectedShutdown) {
		throw new Error(logs || 'Bundle benchmark server failed');
	}
}

async function main() {
	const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/bundle';
	const args = new Set(process.argv.slice(2));
	const server = spawn(
		'bun',
		['run', 'next', 'start', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: process.cwd(),
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

	await waitForServer();
	const { routes } = await analyzeRouteSizes();

	try {
		const bundleResults: BenchmarkResult[] = routes.map((route) => ({
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'bundle',
			package: '@c15t/next-bundle-bench',
			framework: route.route.startsWith('/nextjs')
				? 'nextjs'
				: route.route === '/core-only'
					? 'core'
					: 'react',
			runtime: 'next',
			scenario: ROUTE_TO_SCENARIO[route.route] ?? route.route,
			commitSha: safeCommitSha(),
			baseSha: safeBaseSha(),
			timestamp: new Date().toISOString(),
			environment: getEnvironment(),
			fixture: routeFixture(route),
			metrics: [
				summarizeMetric('gzipSize', 'bytes', [route.gzip]),
				summarizeMetric(routeFixture(route).name, 'bytes', [
					route.c15tAddition,
				]),
			],
			budgetDefinitions: [
				...bundleBudgets.filter(
					(budget) => budget.metric === routeFixture(route).name
				),
			],
			budgets: [],
			notes: ['Route-level client bundle size benchmark.'],
		}));

		for (const result of bundleResults) {
			writeJson(join(outputDir, `${result.scenario}.json`), result);
		}

		const coreTarball = runTarballSize('../../packages/core');
		const reactTarball = runTarballSize('../../packages/react');
		const nextjsTarball = runTarballSize('../../packages/nextjs');

		const artifactResult: BenchmarkResult = {
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'artifact',
			package: '@c15t/next-bundle-bench',
			framework: 'core',
			runtime: 'npm-pack',
			scenario: 'tarballs',
			commitSha: safeCommitSha(),
			baseSha: safeBaseSha(),
			timestamp: new Date().toISOString(),
			environment: getEnvironment(),
			fixture: {
				name: 'tarballs',
				consentCount: 0,
				scriptCount: 0,
				localeCount: 0,
				themeComplexity: 'minimal',
			},
			metrics: [
				summarizeMetric('c15t', 'bytes', [coreTarball.size ?? 0]),
				summarizeMetric('@c15t/react', 'bytes', [reactTarball.size ?? 0]),
				summarizeMetric('@c15t/nextjs', 'bytes', [nextjsTarball.size ?? 0]),
			],
			budgetDefinitions: artifactBudgets,
			budgets: [],
			notes: [
				'Tarball sizes are captured with npm pack --json when npm is available.',
				...coreTarball.notes,
				...reactTarball.notes,
				...nextjsTarball.notes,
			],
		};

		writeJson(
			join(outputDir, `${artifactResult.scenario}.json`),
			artifactResult
		);

		if (args.has('--json')) {
			console.log(
				JSON.stringify(
					{
						results: bundleResults,
						artifact: artifactResult,
						budgets: bundleBudgets,
					},
					null,
					2
				)
			);
			return;
		}

		console.log(toMarkdown(bundleResults, artifactResult));
	} finally {
		await stopServer(server, logs);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
