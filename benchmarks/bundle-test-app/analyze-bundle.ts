#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';

import { artifactBudgets, bundleBudgets } from '@c15t/benchmarking/budgets';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';

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

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

interface RouteSize {
	route: string;
	jsGzip: number;
	cssGzip: number;
	totalGzip: number;
	c15tAddition: number;
}

const HOST = '127.0.0.1';
const PORT = 4309;
const BASE_URL = `http://${HOST}:${PORT}`;

// Turbopack hoists modules used by two or more routes into shared chunks. Route
// deltas under-report code when another route imports the same module. Use the
// entry benchmarks for transport-level comparisons.
const ROUTE_TO_SCENARIO: Record<string, string> = {
	'/': 'baseline',
	'/core-only': 'core-only',
	'/css-banner-modules': 'css-banner-modules',
	'/css-iab-lazy': 'css-iab-lazy',
	'/css-iab-modules': 'css-iab-modules',
	'/nextjs-basic': 'nextjs-basic',
	'/nextjs-ssr': 'nextjs-ssr',
	'/react-banner-only': 'react-banner-only',
	'/react-full': 'react-full',
	'/react-full-split': 'react-full-split',
	'/react-harness': 'react-harness',
	'/react-headless': 'react-headless',
	'/react-manifest-client': 'react-manifest-client',
	'/react-standard-script-loader': 'react-standard-script-loader',
};

const waitForServer = async function waitForServer() {
	const poll = async (attempt: number): Promise<void> => {
		if (attempt >= 120) {
			throw new Error('Timed out waiting for bundle benchmark server');
		}
		try {
			const response = await fetch(BASE_URL);
			if (response.ok) {
				return;
			}
		} catch {
			// The temporary artifact may already be absent.
		}
		await sleep(500);
		return poll(attempt + 1);
	};
	await poll(0);
};

const analyzeRouteSizes = async function analyzeRouteSizes() {
	const chunkSizes = new Map<string, number>();

	const getGzipSize = async function getGzipSize(
		chunkPath: string
	): Promise<number> {
		if (chunkSizes.has(chunkPath)) {
			return getDefined(chunkSizes.get(chunkPath));
		}

		try {
			const content = await readFile(
				join('.next', chunkPath.replace(/^\/_next\//u, '')),
				'utf8'
			);
			const gzip = gzipSync(Buffer.from(content)).length;
			chunkSizes.set(chunkPath, gzip);

			return gzip;
		} catch {
			return 0;
		}
	};

	const routes: RouteSize[] = [];
	let baselineGzip = 0;

	await Object.keys(ROUTE_TO_SCENARIO).reduce<Promise<void>>(
		async (previousRoute, routeName) => {
			await previousRoute;
			const response = await fetch(`${BASE_URL}${routeName}`);
			const html = await response.text();
			const scripts = Array.from(
				html.matchAll(/<script[^>]+src="[^"]+"/gu),
				(match) => match[0].slice(match[0].lastIndexOf('src="') + 5, -1)
			).filter((scriptPath): scriptPath is string =>
				Boolean(scriptPath?.startsWith('/_next/'))
			);
			const styles = Array.from(
				html.matchAll(/<link[^>]+href="[^"]+\.css[^"]*"/gu),
				(match) =>
					match[0].slice(match[0].lastIndexOf('href="') + 6, -1).split('?')[0]
			).filter((stylePath): stylePath is string =>
				Boolean(stylePath?.startsWith('/_next/'))
			);

			let jsTotal = 0;
			await Array.from(new Set(scripts)).reduce<Promise<void>>(
				async (previousScript, scriptPath) => {
					await previousScript;
					jsTotal += await getGzipSize(scriptPath);
				},
				Promise.resolve()
			);

			let cssTotal = 0;
			await Array.from(new Set(styles)).reduce<Promise<void>>(
				async (previousStyle, stylePath) => {
					await previousStyle;
					cssTotal += await getGzipSize(stylePath);
				},
				Promise.resolve()
			);

			if (routeName === '/') {
				baselineGzip = jsTotal + cssTotal;
			}

			routes.push({
				c15tAddition: 0,
				cssGzip: cssTotal,
				jsGzip: jsTotal,
				route: routeName,
				totalGzip: jsTotal + cssTotal,
			});
		},
		Promise.resolve()
	);

	for (const route of routes) {
		route.c15tAddition =
			route.route === '/' ? 0 : route.totalGzip - baselineGzip;
	}

	routes.sort((a, b) => a.route.localeCompare(b.route));
	return { routes };
};

const runTarballSize = function runTarballSize(packageDir: string): {
	size: number | null;
	notes: string[];
} {
	const resolvedDir = resolve(process.cwd(), packageDir);
	const result = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], {
		cwd: resolvedDir,
		encoding: 'utf8',
	});

	if (result.status !== 0 || !result.stdout) {
		return { notes: [], size: null };
	}

	try {
		const parsed = JSON.parse(result.stdout) as {
			filename?: string;
			size?: number;
		}[];
		const [artifact] = parsed;
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

		return { notes, size: artifact?.size ?? null };
	} catch {
		return { notes: [], size: null };
	}
};

const routeFixture = function routeFixture(route: RouteSize) {
	return {
		consentCount: 5,
		localeCount: 1,
		name: ROUTE_TO_SCENARIO[route.route] ?? route.route,
		scriptCount: 0,
		themeComplexity: 'minimal' as const,
	};
};

const toMarkdown = function toMarkdown(
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
};

const stopServer = async function stopServer(
	server: ReturnType<typeof spawn>,
	logs: string
): Promise<void> {
	const waitForExit = () =>
		createDeferredPromise<{
			code: number | null;
			signal: NodeJS.Signals | null;
		}>((fulfill) => {
			server.once('exit', (code, signal) => fulfill({ code, signal }));
		});

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
};

const main = async function main() {
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
		const frameworkForRoute = (
			route: RouteSize
		): BenchmarkResult['framework'] => {
			if (route.route.startsWith('/nextjs')) {
				return 'nextjs';
			}
			return 'react';
		};
		const bundleResults: BenchmarkResult[] = routes.map((route) => ({
			baseSha: safeBaseSha(),
			budgetDefinitions: bundleBudgets.filter(
				(budget) => budget.metric === routeFixture(route).name
			),
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(),
			fixture: routeFixture(route),
			framework: frameworkForRoute(route),
			metadata: { gitDirty: safeGitDirty() },
			metrics: [
				summarizeMetric('gzipSize', 'bytes', [route.totalGzip]),
				summarizeMetric('jsGzipSize', 'bytes', [route.jsGzip]),
				summarizeMetric('cssGzipSize', 'bytes', [route.cssGzip]),
				summarizeMetric(routeFixture(route).name, 'bytes', [
					route.c15tAddition,
				]),
			],
			notes: ['Route-level client bundle size benchmark.'],
			package: '@c15t/next-bundle-bench',
			runtime: 'next',
			scenario: ROUTE_TO_SCENARIO[route.route] ?? route.route,
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'bundle',
			timestamp: new Date().toISOString(),
		}));

		for (const result of bundleResults) {
			writeJson(join(outputDir, `${result.scenario}.json`), result);
		}

		const coreTarball = runTarballSize('../../packages/core');
		const reactTarball = runTarballSize('../../packages/react');
		const nextjsTarball = runTarballSize('../../packages/nextjs');

		const artifactResult: BenchmarkResult = {
			baseSha: safeBaseSha(),
			budgetDefinitions: artifactBudgets,
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(),
			fixture: {
				consentCount: 0,
				localeCount: 0,
				name: 'tarballs',
				scriptCount: 0,
				themeComplexity: 'minimal',
			},
			framework: 'core',
			metadata: { gitDirty: safeGitDirty() },
			metrics: [
				summarizeMetric('c15t', 'bytes', [coreTarball.size ?? 0]),
				summarizeMetric('@c15t/react', 'bytes', [reactTarball.size ?? 0]),
				summarizeMetric('@c15t/nextjs', 'bytes', [nextjsTarball.size ?? 0]),
			],
			notes: [
				'Tarball sizes are captured with npm pack --json when npm is available.',
				...coreTarball.notes,
				...reactTarball.notes,
				...nextjsTarball.notes,
			],
			package: '@c15t/next-bundle-bench',
			runtime: 'npm-pack',
			scenario: 'tarballs',
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'artifact',
			timestamp: new Date().toISOString(),
		};

		writeJson(
			join(outputDir, `${artifactResult.scenario}.json`),
			artifactResult
		);

		if (args.has('--json')) {
			console.log(
				JSON.stringify(
					{
						artifact: artifactResult,
						budgets: bundleBudgets,
						results: bundleResults,
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
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
