#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
	readBenchNavigationTiming,
} from '@c15t/benchmarking/browser';
import { browserBudgets } from '@c15t/benchmarking/budgets';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	type MetricBudget,
} from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	median,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4312;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/nextjs';
const expectedServerShutdownCodes = new Set([0, 137, 143]);
const expectedServerShutdownSignals = new Set(['SIGTERM', 'SIGKILL']);
const bannerRootTestId = 'consent-banner-root';
const bannerElementTimingName = 'c15t-consent-banner';

function readCliFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index >= 0) {
		return process.argv[index + 1];
	}

	const prefix = `${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match?.slice(prefix.length);
}

const iterations = Number(
	readCliFlag('--iterations') ??
		process.env.C15T_BENCH_ITERATIONS ??
		process.env.BENCH_ITERATIONS ??
		'7'
);
const warmupIterations = Number(
	readCliFlag('--warmup') ??
		process.env.C15T_BENCH_WARMUP_ITERATIONS ??
		process.env.BENCH_WARMUP_ITERATIONS ??
		'1'
);
const throttleProfile = parseBenchThrottleProfile(
	readCliFlag('--profile') ?? process.env.C15T_BENCH_PROFILE
);
const initLatencyMs = parseBenchInitLatencyMs(
	readCliFlag('--init-latency-ms') ??
		readCliFlag('--init-latency') ??
		process.env.C15T_BENCH_INIT_LATENCY_MS
);
const scenarioFilter =
	readCliFlag('--scenario') ?? process.env.C15T_BENCH_SCENARIO;
const coldManifestMode =
	readCliFlag('--cold-manifest') === 'true' ||
	readCliFlag('--cold-manifest') === '1' ||
	process.env.C15T_BENCH_COLD_MANIFEST === '1' ||
	process.env.C15T_BENCH_COLD_MANIFEST === 'true';

const allScenarios = [
	{ name: 'client', path: '/client' },
	{ name: 'ssr', path: '/ssr' },
	{ name: 'prefetch', path: '/prefetch' },
] as const;

const v3Scenarios = [
	{ name: 'nextjs-v3-client', path: '/v3-client' },
	{ name: 'nextjs-v3-manifest-client', path: '/v3-manifest-client' },
	{ name: 'nextjs-v3-ssr', path: '/v3-ssr' },
	{ name: 'nextjs-v3-manifest-ssr', path: '/v3-manifest-ssr' },
	{ name: 'nextjs-v3-rsc-ssr', path: '/v3-rsc-ssr' },
] as const;

const allBenchmarkScenarios = [...allScenarios, ...v3Scenarios] as const;

const scenarios = scenarioFilter
	? allBenchmarkScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allBenchmarkScenarios;

if (scenarioFilter && scenarios.length === 0) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ${allBenchmarkScenarios
			.map((scenario) => scenario.name)
			.join(', ')}.`
	);
}

async function measureInteractionLatency(
	page: import('playwright').Page,
	scenario:
		| (typeof allBenchmarkScenarios)[number]['name']
		| 'repeat-visitor'
		| 'nextjs-v3-repeat'
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

	if (scenario === 'nextjs-v3-repeat') {
		const startedAt = performance.now();
		await page.click('#v3-open-preferences');
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

async function applyPageProfile(
	context: import('playwright').BrowserContext,
	page: import('playwright').Page
) {
	const session = await context.newCDPSession(page);
	await applyBenchThrottleProfile(session, throttleProfile);
	await installBenchPerformanceObservers(page, {
		bannerElementTimingName,
		bannerRootTestId,
	});
}

function resultScenarioName(scenario: string): string {
	if (throttleProfile === 'none' && initLatencyMs === 0) {
		return scenario;
	}

	return `${scenario}:profile-${throttleProfile}:latency-${initLatencyMs}ms`;
}

function resultFileName(scenario: string): string {
	return `${resultScenarioName(scenario).replaceAll(':', '-')}.json`;
}

function nullableMedian(
	values: Array<number | null | undefined>
): number | null {
	const numbers = values.filter(
		(value): value is number =>
			typeof value === 'number' && Number.isFinite(value)
	);
	return numbers.length > 0 ? Number(median(numbers).toFixed(3)) : null;
}

async function collectScenarioMetrics(
	page: import('playwright').Page,
	scenario: string,
	path: string
) {
	let initRequests = 0;
	let manifestRequests = 0;
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname.endsWith('/init')) {
			initRequests += 1;
		}
		if (url.pathname.endsWith('/manifest')) {
			manifestRequests += 1;
		}
	});

	const response = await page.goto(path);
	const firstHtml = (await response?.text().catch(() => '')) ?? '';
	const bannerInFirstHtml =
		firstHtml.includes(`data-testid="${bannerRootTestId}"`) ||
		firstHtml.includes(`data-testid='${bannerRootTestId}'`);
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
	await page.waitForLoadState('load');
	await page.waitForTimeout(250);

	const state = await page.evaluate(() => window.__c15tNextBench);
	const navEntry = (await page.evaluate(
		benchNavigationTimingExpression
	)) as Awaited<ReturnType<typeof readBenchNavigationTiming>>;
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
			jsBytes: ordered.reduce(
				(sum, entry) => sum + (entry.transferSize || entry.encodedBodySize),
				0
			),
		};
	});
	const performanceObserverInfo = await page.evaluate(() => {
		const metrics = (
			window as typeof window & {
				__c15tBenchPerfMetrics?: {
					cls: number;
					longTaskCount: number;
					longTaskTotalMs: number;
					bannerPaintMs: number | null;
				};
			}
		).__c15tBenchPerfMetrics;
		return {
			cls: metrics?.cls ?? 0,
			longTaskCount: metrics?.longTaskCount ?? 0,
			longTaskTotalMs: metrics?.longTaskTotalMs ?? 0,
			bannerPaintMs: metrics?.bannerPaintMs ?? null,
			domNodeCount: document.querySelectorAll('*').length,
		};
	});

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...performanceObserverInfo,
		bannerPaintMs:
			performanceObserverInfo.bannerPaintMs ?? state?.bannerPaintMs ?? null,
		bannerInFirstHtml,
		initRequestsAfterLoad: initRequests,
		manifestRequestsAfterLoad: manifestRequests,
	};
}

type NextjsBrowserSample = Omit<
	Awaited<ReturnType<typeof collectScenarioMetrics>>,
	'scenario'
> & {
	scenario?: string;
	interactionLatencyMs?: number;
};

function budgetsForScenario(scenario: string): MetricBudget[] {
	const baseScenario = scenario.replace(/-(cold|steady)$/, '');
	const shared = browserBudgets.filter((budget) =>
		[
			'bannerReadyMs',
			'lastAppScriptEndMs',
			'interactionLatencyMs',
			'longTaskTotalMs',
		].includes(budget.metric)
	);

	if (
		baseScenario === 'ssr' ||
		baseScenario === 'nextjs-v3-ssr' ||
		baseScenario === 'nextjs-v3-manifest-ssr' ||
		baseScenario === 'nextjs-v3-rsc-ssr'
	) {
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

	if (
		baseScenario === 'repeat-visitor' ||
		baseScenario === 'nextjs-v3-repeat'
	) {
		return shared;
	}

	if (baseScenario === 'nextjs-v3-manifest-client') {
		return [
			...shared,
			{
				metric: 'initRequestsAfterLoad',
				comparator: 'count-eq',
				threshold: 0,
				description:
					'Client manifest flow should resolve init from /manifest without a browser /init request.',
			},
		];
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

interface BenchConsentFixtureCounts {
	init: number;
	manifest: number;
	subjects: number;
}

async function resetFixtureCounts(): Promise<void> {
	await fetch(`${BASE_URL}/api/bench-consent/stats`, {
		method: 'POST',
		cache: 'no-store',
	});
}

async function readFixtureCounts(): Promise<BenchConsentFixtureCounts> {
	const response = await fetch(`${BASE_URL}/api/bench-consent/stats`, {
		cache: 'no-store',
	});
	return (await response.json()) as BenchConsentFixtureCounts;
}

function isManifestScenario(scenario: string): boolean {
	return scenario.includes('manifest');
}

async function run() {
	await ensureBuild();

	const server = spawn(
		'bun',
		['run', 'start', '--', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: appDir,
			env: {
				...process.env,
				C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
				...(coldManifestMode
					? { C15T_BENCH_COLD_MANIFEST_TOKEN: String(Date.now()) }
					: {}),
			},
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
			await resetFixtureCounts();
			const effectiveWarmupIterations =
				coldManifestMode && isManifestScenario(scenario.name)
					? 0
					: warmupIterations;
			for (
				let index = 0;
				index < effectiveWarmupIterations + iterations;
				index += 1
			) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();
				await applyPageProfile(context, page);
				const metrics = await collectScenarioMetrics(
					page,
					scenario.name,
					scenario.path
				);
				const interactionLatencyMs = await measureInteractionLatency(
					page,
					scenario.name
				);
				if (index >= effectiveWarmupIterations) {
					const measuredIndex = index - effectiveWarmupIterations;
					samples.push({
						...metrics,
						scenario:
							coldManifestMode &&
							isManifestScenario(scenario.name) &&
							measuredIndex === 0
								? `${scenario.name}-cold`
								: coldManifestMode && isManifestScenario(scenario.name)
									? `${scenario.name}-steady`
									: metrics.scenario,
						interactionLatencyMs,
					});
				}

				if (
					(scenario.name === 'client' ||
						scenario.name === 'nextjs-v3-client') &&
					index >= effectiveWarmupIterations
				) {
					const repeatContext = await browser.newContext({ baseURL: BASE_URL });
					const repeatPage = await repeatContext.newPage();
					await applyPageProfile(repeatContext, repeatPage);
					const repeatMetrics = await collectScenarioMetrics(
						repeatPage,
						scenario.name,
						scenario.path
					);
					const repeatInteractionLatencyMs = await measureInteractionLatency(
						repeatPage,
						scenario.name === 'nextjs-v3-client'
							? 'nextjs-v3-repeat'
							: 'repeat-visitor'
					);
					samples.push({
						...repeatMetrics,
						scenario:
							scenario.name === 'nextjs-v3-client'
								? 'nextjs-v3-repeat'
								: 'repeat-visitor',
						interactionLatencyMs: repeatInteractionLatencyMs,
					});
					await repeatContext.close();
				}

				await context.close();
			}
			const fixtureCounts = await readFixtureCounts();

			const grouped = new Map<string, typeof samples>();
			for (const sample of samples) {
				const key = sample.scenario ?? scenario.name;
				const existing = grouped.get(key) ?? [];
				existing.push(sample);
				grouped.set(key, existing);
			}

			for (const [groupScenario, groupedSamples] of grouped) {
				const outputScenario = resultScenarioName(groupScenario);
				const result: BenchmarkResult = {
					schemaVersion: BENCHMARK_SCHEMA_VERSION,
					suite: 'browser-runtime',
					package: '@c15t/nextjs-browser-bench',
					framework: 'nextjs',
					runtime: 'playwright',
					scenario: outputScenario,
					commitSha: safeCommitSha(),
					baseSha: safeBaseSha(),
					timestamp: new Date().toISOString(),
					environment: getEnvironment(browser.version()),
					fixture: {
						name: outputScenario,
						consentCount: 5,
						scriptCount: 0,
						localeCount: 1,
						themeComplexity: 'minimal',
					},
					metadata: {
						profile: throttleProfile,
						initLatencyMs,
						coldManifestMode,
						fixtureInitExecutions: fixtureCounts.init,
						fixtureManifestExecutions: fixtureCounts.manifest,
						fixtureSubjectExecutions: fixtureCounts.subjects,
						bannerInFirstHtml: groupedSamples.every(
							(sample) => sample.bannerInFirstHtml
						),
						bannerPaintMs: nullableMedian(
							groupedSamples.map((sample) => sample.bannerPaintMs)
						),
						cls: Number(
							median(groupedSamples.map((sample) => sample.cls ?? 0)).toFixed(4)
						),
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
						summarizeNullableMetric(
							'bannerPaintMs',
							'ms',
							groupedSamples.map((sample) => sample.bannerPaintMs ?? null)
						),
						summarizeMetric(
							'bannerInFirstHtml',
							'count',
							groupedSamples.map((sample) => (sample.bannerInFirstHtml ? 1 : 0))
						),
						summarizeMetric(
							'cls',
							'ratio',
							groupedSamples.map((sample) => sample.cls ?? 0)
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
							'jsBytes',
							'bytes',
							groupedSamples.map((sample) => sample.jsBytes ?? 0)
						),
						summarizeMetric(
							'ttfbMs',
							'ms',
							groupedSamples.map((sample) => sample.ttfbMs ?? 0)
						),
						summarizeMetric(
							'htmlDoneMs',
							'ms',
							groupedSamples.map((sample) => sample.htmlDoneMs ?? 0)
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
							'manifestRequestsAfterLoad',
							'count',
							groupedSamples.map(
								(sample) => sample.manifestRequestsAfterLoad ?? 0
							)
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

				writeJson(join(outputDir, resultFileName(groupScenario)), result);
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
			serverFailure = new Error(
				`${logs || 'Next.js browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode == null &&
			server.signalCode != null &&
			!expectedServerShutdownSignals.has(server.signalCode)
		) {
			serverFailure = new Error(
				`${logs || 'Next.js browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
			);
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
