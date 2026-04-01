#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	browserBudgets,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4311;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/react';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '7');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '1');

const scenarios = [
	{ name: 'full-ui', path: '/full-ui' },
	{ name: 'headless', path: '/headless' },
	{ name: 'vanilla-core', path: '/vanilla-core' },
] as const;

async function measureInteractionLatency(
	page: import('playwright').Page,
	scenario: (typeof scenarios)[number]['name'] | 'repeat-visitor'
) {
	switch (scenario) {
		case 'full-ui': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onConsentSetCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('[data-testid="consent-banner-accept-button"]');
			await page.waitForFunction(
				(expected) => {
					const state = window.__c15tReactBench;
					return (
						!!state &&
						state.onConsentSetCount > expected &&
						state.activeUI === 'none'
					);
				},
				before,
				{ timeout: 30_000 }
			);
			return performance.now() - startedAt;
		}
		case 'headless': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onConsentSetCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('#headless-accept');
			await page.waitForFunction(
				(expected) => {
					const state = window.__c15tReactBench;
					return (
						!!state &&
						state.onConsentSetCount > expected &&
						state.activeUI === 'none'
					);
				},
				before,
				{ timeout: 30_000 }
			);
			return performance.now() - startedAt;
		}
		case 'vanilla-core': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onConsentSetCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('#vanilla-core-accept');
			await page.waitForFunction(
				(expected) => {
					const state = window.__c15tReactBench;
					return (
						!!state &&
						state.onConsentSetCount > expected &&
						state.activeUI === 'none'
					);
				},
				before,
				{ timeout: 30_000 }
			);
			return performance.now() - startedAt;
		}
		case 'repeat-visitor': {
			const startedAt = performance.now();
			await page.click('#full-ui-open-preferences');
			await page.waitForFunction(
				() => {
					const state = window.__c15tReactBench;
					return !!state && state.activeUI === 'dialog';
				},
				undefined,
				{ timeout: 30_000 }
			);
			return performance.now() - startedAt;
		}
	}
}

async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(`${BASE_URL}/`);
			if (response.ok) {
				return;
			}
		} catch {}
		await sleep(500);
	}

	throw new Error('Timed out waiting for react browser bench server');
}

async function runCommand(args: string[], label: string) {
	return await new Promise<void>((resolvePromise, rejectPromise) => {
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
				new Error(logs || `bun ${args.join(' ')} failed while running ${label}`)
			);
		});
		command.on('error', rejectPromise);
	});
}

async function ensureBuild() {
	if (existsSync(buildIdPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'react browser benchmark build');
}

async function collectPageMetrics(
	page: import('playwright').Page,
	scenario: string
) {
	await page.waitForLoadState('domcontentloaded');
	await page.waitForFunction(
		(targetScenario) => {
			const state = window.__c15tReactBench;
			return (
				state &&
				state.scenario === targetScenario &&
				typeof state.bannerReadyMs === 'number'
			);
		},
		scenario,
		{ timeout: 30_000 }
	);

	const state = await page.evaluate(() => window.__c15tReactBench);
	const navEntry = await page.evaluate(() => {
		const nav = performance.getEntriesByType('navigation')[0] as
			| PerformanceNavigationTiming
			| undefined;
		if (!nav) {
			return null;
		}
		return {
			domContentLoadedMs: nav.domContentLoadedEventEnd,
			loadEventMs: nav.loadEventEnd,
		};
	});
	const scriptEntry = await page.evaluate(() => {
		const entries = performance
			.getEntriesByType('resource')
			.filter(
				(entry): entry is PerformanceResourceTiming =>
					entry instanceof PerformanceResourceTiming &&
					entry.initiatorType === 'script'
			);
		if (entries.length === 0) {
			return null;
		}
		const ordered = [...entries].sort((a, b) => a.startTime - b.startTime);
		return {
			firstAppScriptStartMs: ordered[0]?.startTime ?? 0,
			lastAppScriptEndMs: ordered[ordered.length - 1]?.responseEnd ?? 0,
			appScriptCount: ordered.length,
		};
	});
	const longTaskInfo = await page.evaluate(() => {
		const entries = performance.getEntriesByType('longtask');
		const total = entries.reduce((sum, entry) => sum + entry.duration, 0);
		return {
			longTaskCount: entries.length,
			longTaskTotalMs: total,
			domNodeCount: document.querySelectorAll('*').length,
		};
	});

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...longTaskInfo,
	};
}

type ReactBrowserSample = Awaited<ReturnType<typeof collectPageMetrics>> & {
	interactionLatencyMs?: number;
};

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

		for (const scenario of scenarios) {
			const samples: ReactBrowserSample[] = [];
			for (let index = 0; index < warmupIterations + iterations; index += 1) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();
				await page.goto(scenario.path);
				const metrics = await collectPageMetrics(page, scenario.name);
				const interactionLatencyMs = await measureInteractionLatency(
					page,
					scenario.name
				);

				if (scenario.name === 'full-ui' && index >= warmupIterations) {
					const repeatContext = await browser.newContext({ baseURL: BASE_URL });
					const repeatPage = await repeatContext.newPage();
					await repeatPage.goto(scenario.path);
					const repeatMetrics = await collectPageMetrics(
						repeatPage,
						scenario.name
					);
					const repeatInteractionLatencyMs = await measureInteractionLatency(
						repeatPage,
						'repeat-visitor'
					);
					samples.push({
						...repeatMetrics,
						scenario: 'repeat-visitor',
						interactionLatencyMs: repeatInteractionLatencyMs,
					});
					await repeatContext.close();
				}

				if (index >= warmupIterations) {
					samples.push({
						...metrics,
						interactionLatencyMs,
					});
				}
				await context.close();
			}

			const grouped = new Map<string, typeof samples>();
			for (const sample of samples) {
				const key = sample.scenario ?? scenario.name;
				const existing = grouped.get(key) ?? [];
				existing.push(sample);
				grouped.set(key, existing);
			}

			for (const [groupScenario, groupedSamples] of grouped) {
				const result: BenchmarkResult = {
					schemaVersion: BENCHMARK_SCHEMA_VERSION,
					suite: 'browser-runtime',
					package: '@c15t/react-browser-bench',
					framework: groupScenario === 'vanilla-core' ? 'core' : 'react',
					runtime: 'playwright',
					scenario: groupScenario,
					commitSha: safeCommitSha(),
					baseSha: safeBaseSha(),
					timestamp: new Date().toISOString(),
					environment: getEnvironment(browser.version()),
					fixture: {
						name: groupScenario,
						consentCount: 5,
						scriptCount: 0,
						localeCount: 1,
						themeComplexity: 'minimal',
					},
					metrics: [
						summarizeMetric(
							'bannerReadyMs',
							'ms',
							groupedSamples.map((sample) => sample.bannerReadyMs ?? 0)
						),
						summarizeMetric(
							'bannerVisibleMs',
							'ms',
							groupedSamples.map((sample) => sample.bannerVisibleMs ?? 0)
						),
						summarizeMetric(
							'firstAppScriptStartMs',
							'ms',
							groupedSamples.map((sample) => sample.firstAppScriptStartMs ?? 0)
						),
						summarizeMetric(
							'lastAppScriptEndMs',
							'ms',
							groupedSamples.map((sample) => sample.lastAppScriptEndMs ?? 0)
						),
						summarizeMetric(
							'appScriptCount',
							'count',
							groupedSamples.map((sample) => sample.appScriptCount ?? 0)
						),
						summarizeMetric(
							'domContentLoadedMs',
							'ms',
							groupedSamples.map((sample) => sample.domContentLoadedMs ?? 0)
						),
						summarizeMetric(
							'loadEventMs',
							'ms',
							groupedSamples.map((sample) => sample.loadEventMs ?? 0)
						),
						summarizeMetric(
							'longTaskCount',
							'count',
							groupedSamples.map((sample) => sample.longTaskCount ?? 0)
						),
						summarizeMetric(
							'longTaskTotalMs',
							'ms',
							groupedSamples.map((sample) => sample.longTaskTotalMs ?? 0)
						),
						summarizeMetric(
							'domNodeCount',
							'count',
							groupedSamples.map((sample) => sample.domNodeCount ?? 0)
						),
						summarizeMetric(
							'mountCount',
							'count',
							groupedSamples.map((sample) => sample.mountCount ?? 0)
						),
						summarizeMetric(
							'renderCount',
							'count',
							groupedSamples.map((sample) => sample.renderCount ?? 0)
						),
						summarizeMetric(
							'interactionLatencyMs',
							'ms',
							groupedSamples.map((sample) => sample.interactionLatencyMs ?? 0)
						),
					],
					budgetDefinitions: browserBudgets.filter((budget) =>
						[
							'bannerReadyMs',
							'lastAppScriptEndMs',
							'interactionLatencyMs',
							'longTaskTotalMs',
						].includes(budget.metric)
					),
					budgets: [],
					notes: [
						'React browser bench runs with local deterministic init and subject endpoints.',
					],
				};

				writeJson(join(outputDir, `${groupScenario}.json`), result);
			}
		}

		await browser.close();
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (server.exitCode && server.exitCode !== 0) {
			throw new Error(logs || 'React browser bench server failed');
		}
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
