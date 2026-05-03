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
	type MetricBudget,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4312;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/nextjs';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '7');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '1');
const initPrefix = `${BASE_URL}/api/bench-consent/init`;
const expectedServerShutdownCodes = new Set([0, 137, 143]);

const scenarios = [
	{ name: 'client', path: '/client' },
	{ name: 'ssr', path: '/ssr' },
	{ name: 'prefetch', path: '/prefetch' },
] as const;

async function measureInteractionLatency(
	page: import('playwright').Page,
	scenario: (typeof scenarios)[number]['name'] | 'repeat-visitor'
) {
	if (scenario === 'repeat-visitor') {
		const startedAt = performance.now();
		await page.click('#open-preferences');
		await page.waitForFunction(
			() => {
				const state = window.__c15tNextBench;
				return !!state && state.activeUI === 'dialog';
			},
			undefined,
			{ timeout: 30_000 }
		);
		return performance.now() - startedAt;
	}

	const before = await page.evaluate(
		() => window.__c15tNextBench?.onConsentSetCount ?? 0
	);
	const startedAt = performance.now();
	await page.click('[data-testid="consent-banner-accept-button"]');
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tNextBench;
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

	throw new Error('Timed out waiting for nextjs browser bench server');
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

	await runCommand(['run', 'build'], 'nextjs browser benchmark build');
}

async function collectScenarioMetrics(
	page: import('playwright').Page,
	scenario: string
) {
	let initRequests = 0;
	page.on('request', (request) => {
		if (request.url().startsWith(initPrefix)) {
			initRequests += 1;
		}
	});

	await page.goto(`/${scenario}`);
	await page.waitForFunction(
		(targetScenario) => {
			const state = window.__c15tNextBench;
			return (
				state &&
				state.scenario === targetScenario &&
				typeof state.bannerReadyMs === 'number'
			);
		},
		scenario,
		{ timeout: 30_000 }
	);

	const state = await page.evaluate(() => window.__c15tNextBench);
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
		return {
			longTaskCount: entries.length,
			longTaskTotalMs: entries.reduce((sum, entry) => sum + entry.duration, 0),
			domNodeCount: document.querySelectorAll('*').length,
		};
	});

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...longTaskInfo,
		initRequestsAfterLoad: initRequests,
	};
}

type NextjsBrowserSample = Awaited<
	ReturnType<typeof collectScenarioMetrics>
> & {
	interactionLatencyMs?: number;
};

function budgetsForScenario(scenario: string): MetricBudget[] {
	const shared = browserBudgets.filter((budget) =>
		[
			'bannerReadyMs',
			'lastAppScriptEndMs',
			'interactionLatencyMs',
			'longTaskTotalMs',
		].includes(budget.metric)
	);

	if (scenario === 'ssr') {
		return [
			...shared,
			{
				metric: 'initRequestsAfterLoad',
				comparator: 'count-eq',
				threshold: 0,
				description:
					'SSR routes should not trigger browser-observed init requests.',
			},
		];
	}

	if (scenario === 'repeat-visitor') {
		return shared;
	}

	return [
		...shared,
		{
			metric: 'initRequestsAfterLoad',
			comparator: 'count-eq',
			threshold: 1,
			description:
				'Client and prefetch flows should make exactly one init request on cold load.',
		},
	];
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

	let serverFailure: Error | null = null;
	try {
		await waitForServer();
		const browser = await chromium.launch({ headless: true });

		for (const scenario of scenarios) {
			const samples: NextjsBrowserSample[] = [];
			for (let index = 0; index < warmupIterations + iterations; index += 1) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();
				const metrics = await collectScenarioMetrics(page, scenario.name);
				const interactionLatencyMs = await measureInteractionLatency(
					page,
					scenario.name
				);
				if (index >= warmupIterations) {
					samples.push({
						...metrics,
						interactionLatencyMs,
					});
				}

				if (scenario.name === 'client' && index >= warmupIterations) {
					const repeatContext = await browser.newContext({ baseURL: BASE_URL });
					const repeatPage = await repeatContext.newPage();
					const repeatMetrics = await collectScenarioMetrics(
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
					package: '@c15t/nextjs-browser-bench',
					framework: 'nextjs',
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
							'initRequestsAfterLoad',
							'count',
							groupedSamples.map((sample) => sample.initRequestsAfterLoad ?? 0)
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
							'interactionLatencyMs',
							'ms',
							groupedSamples.map((sample) => sample.interactionLatencyMs ?? 0)
						),
					],
					budgetDefinitions: budgetsForScenario(groupScenario),
					budgets: [],
					notes: [
						'Next.js browser bench covers client, SSR, prefetch, and repeat-visitor paths.',
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
		if (
			server.exitCode != null &&
			!expectedServerShutdownCodes.has(server.exitCode)
		) {
			serverFailure = new Error(logs || 'Next.js browser bench server failed');
		}
	}

	if (serverFailure) {
		throw serverFailure;
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
