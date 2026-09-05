#!/usr/bin/env node
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
import { nuxtBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	median,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { chromium } from 'playwright';
import type * as PlaywrightTypes from 'playwright';

import { assertConsentFreeBaseline, baselineServerOutputDir } from './baseline';
import {
	assertRepeatVisitor,
	createRepeatVisitorCookie,
} from './repeat-visitor';

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

type NuxtBenchScenario =
	| 'baseline'
	| 'baseline-client'
	| 'ssr'
	| 'ssr-manifest'
	| 'client'
	| 'client-manifest'
	| 'repeat-visitor';

interface NuxtBrowserBenchState {
	scenario: NuxtBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	cls?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onChoiceRecordedCount: number;
	onErrorCount: number;
}

declare global {
	interface Window {
		__c15tNuxtBench?: NuxtBrowserBenchState;
		__c15tBenchPerfMetrics?: {
			cls: number;
			longTaskCount: number;
			longTaskTotalMs: number;
			bannerPaintMs: number | null;
		};
	}
}

const HOST = '127.0.0.1';
const PORT = 4313;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = (baseline: boolean) =>
	join(
		baseline ? baselineServerOutputDir : join(appDir, '.output'),
		'server',
		'index.mjs'
	);
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/nuxt';
const expectedServerShutdownCodes = new Set([0, 137, 143]);
const expectedServerShutdownSignals = new Set(['SIGTERM', 'SIGKILL']);
const bannerRootTestId = 'consent-banner-root';
const bannerAcceptButtonTestId = 'consent-banner-accept-button';
const bannerElementTimingName = 'c15t-consent-banner';

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
const coldManifestMode =
	readCliFlag('--cold-manifest') === 'true' ||
	readCliFlag('--cold-manifest') === '1' ||
	process.env.C15T_BENCH_COLD_MANIFEST === '1' ||
	process.env.C15T_BENCH_COLD_MANIFEST === 'true';

const allScenarios = [
	{ name: 'baseline', path: '/baseline' },
	{ name: 'baseline-client', path: '/baseline-client' },
	{ name: 'ssr', path: '/ssr' },
	{ name: 'ssr-manifest', path: '/ssr-manifest' },
	{ name: 'client', path: '/client' },
	{ name: 'client-manifest', path: '/client-manifest' },
	{ name: 'repeat-visitor', path: '/repeat-visitor' },
] as const satisfies readonly {
	name: NuxtBenchScenario;
	path: string;
}[];

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;

if (scenarioFilter && scenarios.length === 0) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ssr, ssr-manifest, client, client-manifest, or repeat-visitor.`
	);
}

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario: NuxtBenchScenario
) {
	if (scenario === 'baseline' || scenario === 'baseline-client') {
		// Zero-consent arm: trivial interaction = the floor.
		const startedAt = performance.now();
		await page.click('#baseline-noop');
		return performance.now() - startedAt;
	}

	if (scenario === 'repeat-visitor') {
		const startedAt = performance.now();
		await page.click('#open-preferences');
		await page.waitForFunction(
			() => {
				const state = window.__c15tNuxtBench;
				return !!state && state.activeUI === 'dialog';
			},
			undefined,
			{ timeout: 30_000 }
		);
		return performance.now() - startedAt;
	}

	const before = await page.evaluate(
		() => window.__c15tNuxtBench?.onChoiceRecordedCount ?? 0
	);
	const startedAt = performance.now();
	await page.click(`[data-testid="${bannerAcceptButtonTestId}"]`);
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tNuxtBench;
			return (
				!!state &&
				state.onChoiceRecordedCount > expected &&
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

	throw new Error('Timed out waiting for nuxt browser bench server');
};

const runCommand = async function runCommand(
	args: string[],
	label: string,
	baseline: boolean
) {
	return await createVoidDeferredPromise((resolvePromise, rejectPromise) => {
		const command = spawn('bun', args, {
			cwd: appDir,
			env: { ...process.env, C15T_BENCH_BASELINE: baseline ? '1' : '0' },
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

const ensureBuild = async function ensureBuild(baseline: boolean) {
	if (existsSync(serverEntry(baseline))) {
		return;
	}

	await runCommand(['run', 'build'], 'nuxt browser benchmark build', baseline);
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
			value: createRepeatVisitorCookie(),
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
	scenario: NuxtBenchScenario,
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
			const state = window.__c15tNuxtBench;
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

	if (scenario === 'baseline' || scenario === 'baseline-client') {
		assertConsentFreeBaseline({
			bannerCount: await page
				.locator('[data-testid="consent-banner-root"]')
				.count(),
			bannerInFirstHtml,
			initRequests,
			manifestRequests,
		});
	}

	const state = await page.evaluate(() => window.__c15tNuxtBench);
	if (scenario === 'repeat-visitor') {
		assertRepeatVisitor({
			bannerCount: await page
				.locator('[data-testid="consent-banner-root"]')
				.count(),
			bannerInFirstHtml,
			hasStoredChoice: state?.hasStoredChoice,
		});
	}
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

type NuxtBrowserSample = Omit<
	Awaited<ReturnType<typeof collectScenarioMetrics>>,
	'scenario'
> & {
	scenario?: string;
	interactionLatencyMs?: number;
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

const isManifestScenario = function isManifestScenario(
	scenario: string
): boolean {
	return scenario.includes('manifest');
};

const run = async function run(baseline: boolean) {
	const buildScenarios = scenarios.filter(
		(scenario) => scenario.name.startsWith('baseline') === baseline
	);
	if (buildScenarios.length === 0) {
		return;
	}
	await ensureBuild(baseline);

	const env = {
		...process.env,
		C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
		HOST,
		NITRO_HOST: HOST,
		NITRO_PORT: `${PORT}`,
		PORT: `${PORT}`,
	};
	if (coldManifestMode) {
		env.C15T_BENCH_COLD_MANIFEST_TOKEN = String(Date.now());
	}

	const server = spawn('node', [serverEntry(baseline)], {
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
		const browser = await chromium.launch({ headless: true });

		await Array.from(buildScenarios).reduce<Promise<void>>(
			async (previousScenario, scenario) => {
				await previousScenario;
				const samples: NuxtBrowserSample[] = [];
				await resetFixtureCounts();
				const effectiveWarmupIterations =
					coldManifestMode && isManifestScenario(scenario.name)
						? 0
						: warmupIterations;
				const iterationIndexes = Array.from(
					{ length: effectiveWarmupIterations + iterations },
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
						if (index >= effectiveWarmupIterations) {
							const measuredIndex = index - effectiveWarmupIterations;
							let sampleScenario = metrics.scenario;
							if (coldManifestMode && isManifestScenario(scenario.name)) {
								sampleScenario =
									measuredIndex === 0
										? `${scenario.name}-cold`
										: `${scenario.name}-steady`;
							}
							samples.push({
								...metrics,
								interactionLatencyMs,
								scenario: sampleScenario,
							});
						}
						await context.close();
					},
					Promise.resolve()
				);
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
						baseSha: safeBaseSha(),
						budgetDefinitions: nuxtBrowserBudgetsForScenario(groupScenario),
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
						framework: 'vue',
						metadata: {
							bannerInFirstHtml: groupedSamples.every(
								(sample) => sample.bannerInFirstHtml
							),
							bannerPaintMs: nullableMedian(
								groupedSamples.map((sample) => sample.bannerPaintMs)
							),
							cls: Number(
								median(groupedSamples.map((sample) => sample.cls ?? 0)).toFixed(
									4
								)
							),
							coldManifestMode,
							fixtureInitExecutions: fixtureCounts.init,
							fixtureManifestExecutions: fixtureCounts.manifest,
							fixtureSubjectExecutions: fixtureCounts.subjects,
							gitDirty: safeGitDirty(),
							initLatencyMs,
							profile: throttleProfile,
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
								groupedSamples.map((sample) =>
									sample.bannerInFirstHtml ? 1 : 0
								)
							),
							summarizeMetric(
								'cls',
								'ratio',
								groupedSamples.map((sample) => sample.cls ?? 0)
							),
							summarizeMetric(
								'firstAppScriptStartMs',
								'ms',
								groupedSamples.map(
									(sample) => sample.firstAppScriptStartMs ?? 0
								)
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
								groupedSamples.map(
									(sample) => sample.initRequestsAfterLoad ?? 0
								)
							),
							summarizeMetric(
								'sameOriginInitRequestsAfterLoad',
								'count',
								groupedSamples.map(
									(sample) => sample.sameOriginInitRequestsAfterLoad ?? 0
								)
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
						notes: [
							'Nuxt browser bench covers SSR, client SPA, and pre-seeded repeat-visitor paths with local deterministic Nitro endpoints.',
						],
						package: '@c15t/vue',
						runtime: 'playwright',
						scenario: outputScenario,
						schemaVersion: BENCHMARK_SCHEMA_VERSION,
						suite: 'browser-runtime',
						timestamp: new Date().toISOString(),
					};

					writeJson(join(outputDir, resultFileName(groupScenario)), result);
				}
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
				`${logs || 'Nuxt browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode === null ||
			(server.exitCode === undefined &&
				server.signalCode !== null &&
				server.signalCode !== undefined &&
				!expectedServerShutdownSignals.has(server.signalCode))
		) {
			serverFailure = new Error(
				`${logs || 'Nuxt browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
			);
		}
	}

	if (serverFailure) {
		throw serverFailure;
	}
};

try {
	await run(true);
	await run(false);
} catch (error) {
	console.error(error);
	process.exit(1);
}
