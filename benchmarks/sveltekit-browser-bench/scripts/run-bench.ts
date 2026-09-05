#!/usr/bin/env node
/**
 * SvelteKit browser benchmark runner.
 *
 * Same shape as `benchmarks/nuxt-browser-bench/scripts/run-bench.ts`: same
 * scenario names, same metrics, same throttle profiles, same
 * `BENCH_OUTPUT_DIR` convention and the same result schema, so the gate
 * report can put the two suites in one table.
 *
 * The measured arms run against the shipped `@c15t/svelte/kit` layer
 * (`c15tHandle`, `loadConsent`, `createSvelteKitConsentRouteHandlers`); the
 * `baseline` arms render the same shell with no c15t in the route's module
 * graph at all, which is the floor `consentTax = bannerVisible − floor`
 * subtracts.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type { readBenchNavigationTiming } from '@c15t/benchmarking/browser';
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
} from '@c15t/benchmarking/browser';
import { browserBudgets } from '@c15t/benchmarking/budgets';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult, MetricBudget } from '@c15t/benchmarking/schema';
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
import type * as PlaywrightTypes from 'playwright';

type SvelteKitBenchScenario =
	| 'baseline'
	| 'baseline-client'
	| 'ssr'
	| 'ssr-manifest'
	| 'client'
	| 'client-manifest'
	| 'repeat-visitor';

interface SvelteKitBrowserBenchState {
	scenario: SvelteKitBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	onBannerFetchedMs?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
}

declare global {
	interface Window {
		__c15tSvelteBench?: SvelteKitBrowserBenchState;
		__c15tBenchPerfMetrics?: {
			cls: number;
			longTaskCount: number;
			longTaskTotalMs: number;
			bannerPaintMs: number | null;
		};
	}
}

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
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
const PORT = 4333;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntryPath = join(appDir, 'build', 'index.js');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/sveltekit';
const expectedServerShutdownCodes = new Set([0, 137, 143]);
const expectedServerShutdownSignals = new Set(['SIGTERM', 'SIGKILL']);
const bannerRootTestId = 'consent-banner-root';
const bannerAcceptButtonTestId = 'consent-banner-accept-button';
const bannerElementTimingName = 'c15t-consent-banner';
const repeatVisitorCookieValue = [
	'c.necessary:1',
	'c.functionality:1',
	'c.experience:1',
	'c.measurement:1',
	'c.marketing:1',
	'i.t:1800000000000',
	'i.sid:sub_2VZxR7YmNpKq3WfLs8TgHd',
].join(',');

/**
 * Escape hatch for machines whose Playwright browser cache does not hold the
 * headless shell this Playwright version pins — point it at any Chromium
 * build and the suite runs unchanged.
 */
const chromiumExecutablePath = process.env.C15T_BENCH_CHROMIUM_PATH;

const readCliFlag = function readCliFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index >= 0) {
		return process.argv[index + 1];
	}

	const prefix = `${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match?.slice(prefix.length);
};

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

const allScenarios = [
	{ name: 'baseline', path: '/baseline' },
	{ name: 'baseline-client', path: '/baseline-client' },
	{ name: 'ssr', path: '/ssr' },
	{ name: 'ssr-manifest', path: '/ssr-manifest' },
	{ name: 'client', path: '/client' },
	{ name: 'client-manifest', path: '/client-manifest' },
	{ name: 'repeat-visitor', path: '/repeat-visitor' },
] as const satisfies readonly {
	name: SvelteKitBenchScenario;
	path: string;
}[];

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;

if (scenarioFilter && scenarios.length === 0) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected one of ${allScenarios
			.map((scenario) => scenario.name)
			.join(', ')}.`
	);
}

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario: SvelteKitBenchScenario
) {
	if (scenario === 'baseline' || scenario === 'baseline-client') {
		// Zero-consent arm: a trivial interaction is the floor.
		const startedAt = performance.now();
		await page.click('#baseline-noop');
		return performance.now() - startedAt;
	}

	if (scenario === 'repeat-visitor') {
		const startedAt = performance.now();
		await page.click('#open-preferences');
		await page.waitForFunction(
			() => window.__c15tSvelteBench?.activeUI === 'dialog',
			undefined,
			{ timeout: 30_000 }
		);
		return performance.now() - startedAt;
	}

	const before = await page.evaluate(
		() => window.__c15tSvelteBench?.onConsentSetCount ?? 0
	);
	const startedAt = performance.now();
	await page.click(`[data-testid="${bannerAcceptButtonTestId}"]`);
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tSvelteBench;
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
};

const waitForServer = async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const response = await fetch(`${BASE_URL}/`);
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore transient failures while polling or cleaning up.
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await sleep(500);
	}

	throw new Error('Timed out waiting for sveltekit browser bench server');
};

const runCommand = async function runCommand(args: string[], label: string) {
	return await createVoidDeferredPromise((resolvePromise, rejectPromise) => {
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
};

const ensureBuild = async function ensureBuild() {
	if (existsSync(serverEntryPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'sveltekit browser benchmark build');
};

const applyPageProfile = async function applyPageProfile(
	context: PlaywrightTypes.BrowserContext,
	page: PlaywrightTypes.Page
) {
	const session = await context.newCDPSession(page);
	await applyBenchThrottleProfile(session, throttleProfile);
	await installBenchPerformanceObservers(page, {
		bannerElementTimingName,
		bannerRootTestId,
	});
};

const seedRepeatVisitorCookie = async function seedRepeatVisitorCookie(
	context: PlaywrightTypes.BrowserContext
) {
	await context.addCookies([
		{
			domain: HOST,
			expires: Math.floor(Date.now() / 1000) + 60 * 60,
			httpOnly: false,
			name: 'c15t',
			path: '/',
			sameSite: 'Lax',
			secure: false,
			value: repeatVisitorCookieValue,
		},
	]);
};

const resultScenarioName = function resultScenarioName(
	scenario: string
): string {
	if (throttleProfile === 'none' && initLatencyMs === 0) {
		return scenario;
	}

	return `${scenario}:profile-${throttleProfile}:latency-${initLatencyMs}ms`;
};

const resultFileName = function resultFileName(scenario: string): string {
	return `${resultScenarioName(scenario).replaceAll(':', '-')}.json`;
};

const nullableMedian = function nullableMedian(
	values: (number | null | undefined)[]
): number | null {
	const numbers = values.filter(
		(value): value is number =>
			typeof value === 'number' && Number.isFinite(value)
	);
	return numbers.length > 0 ? Number(median(numbers).toFixed(3)) : null;
};

const collectScenarioMetrics = async function collectScenarioMetrics(
	page: PlaywrightTypes.Page,
	scenario: SvelteKitBenchScenario,
	path: string
) {
	let initRequests = 0;
	let sameOriginInitRequests = 0;
	let manifestRequests = 0;
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname.endsWith('/init')) {
			initRequests += 1;
			if (url.origin === BASE_URL) {
				sameOriginInitRequests += 1;
			}
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
	await page.waitForLoadState('domcontentloaded');
	await page.waitForFunction(
		(targetScenario) => {
			const state = window.__c15tSvelteBench;
			return (
				!!state &&
				state.scenario === targetScenario &&
				typeof state.bannerReadyMs === 'number'
			);
		},
		scenario,
		{ timeout: 30_000 }
	);
	await page.waitForLoadState('load');
	await page.waitForTimeout(250);

	const state = await page.evaluate(() => window.__c15tSvelteBench);
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
			appScriptCount: ordered.length,
			firstAppScriptStartMs: ordered[0]?.startTime ?? 0,
			lastAppScriptEndMs: ordered[ordered.length - 1]?.responseEnd ?? 0,
		};
	});
	const performanceObserverInfo = await page.evaluate(() => {
		const metrics = window.__c15tBenchPerfMetrics;
		return {
			bannerPaintMs: metrics?.bannerPaintMs ?? null,
			cls: metrics?.cls ?? 0,
			domNodeCount: document.querySelectorAll('*').length,
			longTaskCount: metrics?.longTaskCount ?? 0,
			longTaskTotalMs: metrics?.longTaskTotalMs ?? 0,
		};
	});

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...performanceObserverInfo,
		bannerInFirstHtml,
		bannerPaintMs:
			performanceObserverInfo.bannerPaintMs ?? state?.bannerPaintMs ?? null,
		initRequestsAfterLoad: initRequests,
		manifestRequestsAfterLoad: manifestRequests,
		sameOriginInitRequestsAfterLoad: sameOriginInitRequests,
	};
};

type SvelteKitBrowserSample = Omit<
	Awaited<ReturnType<typeof collectScenarioMetrics>>,
	'scenario'
> & {
	scenario?: string;
	interactionLatencyMs?: number;
};

const budgetsForScenario = function budgetsForScenario(
	scenario: string
): MetricBudget[] {
	const shared = browserBudgets.filter((budget) =>
		[
			'bannerReadyMs',
			'lastAppScriptEndMs',
			'interactionLatencyMs',
			'longTaskTotalMs',
		].includes(budget.metric)
	);

	if (scenario === 'baseline' || scenario === 'baseline-client') {
		// Zero-consent floors: no consent traffic is the whole point.
		return [
			...shared,
			{
				comparator: 'count-eq',
				description:
					'The zero-consent baseline must not touch a consent endpoint.',
				metric: 'initRequestsAfterLoad',
				threshold: 0,
			},
		];
	}

	if (
		scenario === 'ssr' ||
		scenario === 'ssr-manifest' ||
		scenario === 'repeat-visitor'
	) {
		return [
			...shared,
			{
				comparator: 'count-eq',
				description:
					'SSR and repeat-visitor routes should not trigger browser-observed init requests.',
				metric: 'initRequestsAfterLoad',
				threshold: 0,
			},
		];
	}

	if (scenario === 'client-manifest') {
		return [
			...shared,
			{
				comparator: 'count-eq',
				description:
					'Browser-resolved manifest mode boots without any init request.',
				metric: 'initRequestsAfterLoad',
				threshold: 0,
			},
		];
	}

	return [
		...shared,
		{
			comparator: 'count-eq',
			description:
				'Client SPA flow should make exactly one init request on cold load.',
			metric: 'initRequestsAfterLoad',
			threshold: 1,
		},
	];
};

interface BenchConsentFixtureCounts {
	init: number;
	manifest: number;
	subjects: number;
}

const resetFixtureCounts = async function resetFixtureCounts(): Promise<void> {
	await fetch(`${BASE_URL}/api/bench-consent/stats`, {
		cache: 'no-store',
		method: 'POST',
	});
};

const readFixtureCounts =
	async function readFixtureCounts(): Promise<BenchConsentFixtureCounts> {
		const response = await fetch(`${BASE_URL}/api/bench-consent/stats`, {
			cache: 'no-store',
		});
		return (await response.json()) as BenchConsentFixtureCounts;
	};

const run = async function run() {
	await ensureBuild();

	const env = {
		...process.env,
		C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
		HOST,
		// adapter-node assumes https when nothing tells it otherwise, and the
		// kit route handlers resolve the relative manifest URL against that
		// origin. Without this the in-process manifest fetch speaks TLS to a
		// plain HTTP port and every manifest arm 500s.
		ORIGIN: BASE_URL,
		PORT: `${PORT}`,
	};

	const server = spawn('node', ['build/index.js'], {
		cwd: appDir,
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	});

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
		const browser = await chromium.launch({
			executablePath: chromiumExecutablePath,
			headless: true,
		});

		await Array.from(scenarios).reduce<Promise<void>>(
			async (previousScenario, scenario) => {
				await previousScenario;
				const samples: SvelteKitBrowserSample[] = [];
				await resetFixtureCounts();
				const iterationIndexes = Array.from(
					{ length: warmupIterations + iterations },
					(_, index) => index
				);
				await iterationIndexes.reduce<Promise<void>>(
					async (previousIteration, index) => {
						await previousIteration;
						const context = await browser.newContext({ baseURL: BASE_URL });
						if (scenario.name === 'repeat-visitor') {
							await seedRepeatVisitorCookie(context);
						}
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
						if (index >= warmupIterations) {
							samples.push({ ...metrics, interactionLatencyMs });
						}
						await context.close();
					},
					Promise.resolve()
				);
				const fixtureCounts = await readFixtureCounts();
				const outputScenario = resultScenarioName(scenario.name);

				const result: BenchmarkResult = {
					baseSha: safeBaseSha(),
					budgetDefinitions: budgetsForScenario(scenario.name),
					budgets: [],
					commitSha: safeCommitSha(),
					environment: getEnvironment(browser.version()),
					fixture: {
						consentCount: 5,
						localeCount: 1,
						name: outputScenario,
						scriptCount: 0,
						themeComplexity: 'minimal',
					},
					framework: 'svelte',
					metadata: {
						bannerInFirstHtml: samples.every(
							(sample) => sample.bannerInFirstHtml
						),
						bannerPaintMs: nullableMedian(
							samples.map((sample) => sample.bannerPaintMs)
						),
						cls: Number(
							median(samples.map((sample) => sample.cls ?? 0)).toFixed(4)
						),
						fixtureInitExecutions: fixtureCounts.init,
						fixtureManifestExecutions: fixtureCounts.manifest,
						fixtureSubjectExecutions: fixtureCounts.subjects,
						initLatencyMs,
						profile: throttleProfile,
						zeroConsentBaseline:
							scenario.name === 'baseline' ||
							scenario.name === 'baseline-client',
					},
					metrics: [
						summarizeMetric(
							'bannerReadyMs',
							'ms',
							samples.map((sample) => sample.bannerReadyMs ?? 0)
						),
						summarizeMetric(
							'bannerVisibleMs',
							'ms',
							samples.map((sample) => sample.bannerVisibleMs ?? 0)
						),
						summarizeNullableMetric(
							'bannerPaintMs',
							'ms',
							samples.map((sample) => sample.bannerPaintMs ?? null)
						),
						summarizeMetric(
							'bannerInFirstHtml',
							'count',
							samples.map((sample) => (sample.bannerInFirstHtml ? 1 : 0))
						),
						summarizeMetric(
							'cls',
							'ratio',
							samples.map((sample) => sample.cls ?? 0)
						),
						summarizeMetric(
							'firstAppScriptStartMs',
							'ms',
							samples.map((sample) => sample.firstAppScriptStartMs ?? 0)
						),
						summarizeMetric(
							'lastAppScriptEndMs',
							'ms',
							samples.map((sample) => sample.lastAppScriptEndMs ?? 0)
						),
						summarizeMetric(
							'appScriptCount',
							'count',
							samples.map((sample) => sample.appScriptCount ?? 0)
						),
						summarizeMetric(
							'ttfbMs',
							'ms',
							samples.map((sample) => sample.ttfbMs ?? 0)
						),
						summarizeMetric(
							'htmlDoneMs',
							'ms',
							samples.map((sample) => sample.htmlDoneMs ?? 0)
						),
						summarizeMetric(
							'domContentLoadedMs',
							'ms',
							samples.map((sample) => sample.domContentLoadedMs ?? 0)
						),
						summarizeMetric(
							'loadEventMs',
							'ms',
							samples.map((sample) => sample.loadEventMs ?? 0)
						),
						summarizeMetric(
							'initRequestsAfterLoad',
							'count',
							samples.map((sample) => sample.initRequestsAfterLoad ?? 0)
						),
						summarizeMetric(
							'sameOriginInitRequestsAfterLoad',
							'count',
							samples.map(
								(sample) => sample.sameOriginInitRequestsAfterLoad ?? 0
							)
						),
						summarizeMetric(
							'manifestRequestsAfterLoad',
							'count',
							samples.map((sample) => sample.manifestRequestsAfterLoad ?? 0)
						),
						summarizeMetric(
							'mountCount',
							'count',
							samples.map((sample) => sample.mountCount ?? 0)
						),
						summarizeMetric(
							'renderCount',
							'count',
							samples.map((sample) => sample.renderCount ?? 0)
						),
						summarizeMetric(
							'longTaskCount',
							'count',
							samples.map((sample) => sample.longTaskCount ?? 0)
						),
						summarizeMetric(
							'longTaskTotalMs',
							'ms',
							samples.map((sample) => sample.longTaskTotalMs ?? 0)
						),
						summarizeMetric(
							'domNodeCount',
							'count',
							samples.map((sample) => sample.domNodeCount ?? 0)
						),
						summarizeMetric(
							'interactionLatencyMs',
							'ms',
							samples.map((sample) => sample.interactionLatencyMs ?? 0)
						),
					],
					notes: [
						'SvelteKit browser bench covers the @c15t/svelte/kit SSR paths (direct init and manifest), browser-side SPA arms, a pre-seeded repeat visitor, and zero-consent baseline floors.',
						'The client-manifest arm resolves the manifest in the browser; @c15t/svelte ships server-side manifest resolution, so that arm prices the alternative rather than a shipped mode.',
					],
					package: '@c15t/sveltekit-browser-bench',
					runtime: 'playwright',
					scenario: outputScenario,
					schemaVersion: BENCHMARK_SCHEMA_VERSION,
					suite: 'browser-runtime',
					timestamp: new Date().toISOString(),
				};

				writeJson(join(outputDir, resultFileName(scenario.name)), result);
			},
			Promise.resolve()
		);

		await browser.close();
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (
			server.exitCode !== null &&
			server.exitCode !== undefined &&
			!expectedServerShutdownCodes.has(server.exitCode)
		) {
			serverFailure = new Error(
				`${logs || 'SvelteKit browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode === null ||
			(server.exitCode === undefined &&
				server.signalCode !== null &&
				server.signalCode !== undefined &&
				!expectedServerShutdownSignals.has(server.signalCode))
		) {
			serverFailure = new Error(
				`${logs || 'SvelteKit browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
			);
		}
	}

	if (serverFailure) {
		throw serverFailure;
	}
};

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
