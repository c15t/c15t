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
import { nextjsBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
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
	{ name: 'client', path: '/client' },
	{ name: 'manifest-client', path: '/manifest-client' },
	{ name: 'ssr', path: '/ssr' },
	{ name: 'manifest-ssr', path: '/manifest-ssr' },
	{ name: 'rsc-ssr', path: '/rsc-ssr' },
] as const;

const allBenchmarkScenarios = allScenarios;

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

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario:
		| (typeof allBenchmarkScenarios)[number]['name']
		| 'repeat-visitor'
		| 'ssr-repeat'
) {
	if (scenario === 'baseline') {
		const startedAt = performance.now();
		await page.click('#baseline-noop');
		return performance.now() - startedAt;
	}

	if (scenario === 'repeat-visitor' || scenario === 'ssr-repeat') {
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
		() => window.__c15tNextBench?.onChoiceRecordedCount ?? 0
	);
	const startedAt = performance.now();
	await page.click('[data-testid="consent-banner-accept-button"]');
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tNextBench;
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

	throw new Error('Timed out waiting for nextjs browser bench server');
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
	if (existsSync(buildIdPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'nextjs browser benchmark build');
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

/**
 * Persistence writes are debounced behind the save; wait until the consent
 * cookie is actually present before a load that depends on it.
 */
const waitForConsentCookie = async function waitForConsentCookie(
	page: PlaywrightTypes.Page
) {
	await page.waitForFunction(
		() =>
			document.cookie
				.split(';')
				.some((entry) => entry.trim().startsWith('c15t=')),
		undefined,
		{ timeout: 10_000 }
	);
};

const HYDRATION_WARNING_PATTERN =
	/hydrat|#418|#423|#425|did not match|Text content does not match/iu;

/**
 * Collect one page load. `waitFor: 'banner'` waits for the banner to be
 * ready; `'settled'` waits for policy resolution to settle whatever prompt
 * it produced, which is what a persisted repeat visitor needs.
 */
const collectScenarioMetrics = async function collectScenarioMetrics(
	page: PlaywrightTypes.Page,
	scenario: string,
	path: string,
	waitFor: 'banner' | 'settled' = 'banner'
) {
	let initRequests = 0;
	let manifestRequests = 0;
	let consoleErrorCount = 0;
	let consoleWarningCount = 0;
	let hydrationWarningCount = 0;
	const consoleErrors: string[] = [];
	const recordConsoleError = (text: string) => {
		consoleErrorCount += 1;
		consoleErrors.push(text);
		if (HYDRATION_WARNING_PATTERN.test(text)) {
			hydrationWarningCount += 1;
		}
	};
	const onRequest = (request: PlaywrightTypes.Request) => {
		const url = new URL(request.url());
		if (url.pathname.endsWith('/init')) {
			initRequests += 1;
		}
		if (url.pathname.endsWith('/manifest')) {
			manifestRequests += 1;
		}
	};
	const onConsole = (message: PlaywrightTypes.ConsoleMessage) => {
		// React reports hydration mismatches through console.error, so errors
		// gate; warnings (including the benchmark's own PerformanceObserver
		// deprecation notice) are counted separately for the report.
		if (message.type() === 'error') {
			recordConsoleError(message.text());
		} else if (message.type() === 'warning') {
			consoleWarningCount += 1;
			if (HYDRATION_WARNING_PATTERN.test(message.text())) {
				hydrationWarningCount += 1;
			}
		}
	};
	const onPageError = (error: Error) => {
		recordConsoleError(error.message);
	};
	page.on('request', onRequest);
	page.on('console', onConsole);
	page.on('pageerror', onPageError);

	const response = await page.goto(path);
	const firstHtml = (await response?.text().catch(() => '')) ?? '';
	const bannerInFirstHtml =
		firstHtml.includes(`data-testid="${bannerRootTestId}"`) ||
		firstHtml.includes(`data-testid='${bannerRootTestId}'`);
	await page.waitForFunction(
		({ targetScenario, mode }) => {
			const state = window.__c15tNextBench;
			if (!state || state.scenario !== targetScenario) {
				return false;
			}
			return mode === 'settled'
				? typeof state.promptSettledMs === 'number'
				: typeof state.bannerReadyMs === 'number';
		},
		{ mode: waitFor, targetScenario: scenario },
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
			appScriptCount: ordered.length,
			firstAppScriptStartMs: ordered[0]?.startTime ?? 0,
			jsBytes: ordered.reduce(
				(sum, entry) => sum + (entry.transferSize || entry.encodedBodySize),
				0
			),
			lastAppScriptEndMs: ordered[ordered.length - 1]?.responseEnd ?? 0,
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
			bannerPaintMs: metrics?.bannerPaintMs ?? null,
			cls: metrics?.cls ?? 0,
			domNodeCount: document.querySelectorAll('*').length,
			longTaskCount: metrics?.longTaskCount ?? 0,
			longTaskTotalMs: metrics?.longTaskTotalMs ?? 0,
		};
	});

	page.off('request', onRequest);
	page.off('console', onConsole);
	page.off('pageerror', onPageError);

	const history = state?.activeUiHistory ?? [];
	return {
		...state,
		...navEntry,
		...scriptEntry,
		...performanceObserverInfo,
		bannerInFirstHtml,
		bannerPaintMs:
			performanceObserverInfo.bannerPaintMs ?? state?.bannerPaintMs ?? null,
		consoleErrorCount,
		consoleErrors,
		consoleWarningCount,
		hydrationWarningCount,
		initRequestsAfterLoad: initRequests,
		manifestRequestsAfterLoad: manifestRequests,
		promptShownCount: history.includes('banner') ? 1 : 0,
		promptTransitionCount: Math.max(0, history.length - 1),
	};
};

type NextjsBrowserSample = Omit<
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

const run = async function run() {
	await ensureBuild();

	const env: NodeJS.ProcessEnv = {
		...process.env,
		C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
	};
	if (coldManifestMode) {
		env.C15T_BENCH_COLD_MANIFEST_TOKEN = String(Date.now());
	}

	const server = spawn(
		'bun',
		['run', 'start', '--', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: appDir,
			env,
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

		await Array.from(scenarios).reduce<Promise<void>>(
			async (previousScenario, scenario) => {
				await previousScenario;
				const samples: NextjsBrowserSample[] = [];
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
							let sampleScenario: string | undefined = metrics.scenario;
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

						if (
							scenario.name === 'client' &&
							index >= effectiveWarmupIterations
						) {
							const repeatContext = await browser.newContext({
								baseURL: BASE_URL,
							});
							const repeatPage = await repeatContext.newPage();
							await applyPageProfile(repeatContext, repeatPage);
							const repeatMetrics = await collectScenarioMetrics(
								repeatPage,
								scenario.name,
								scenario.path
							);
							const repeatInteractionLatencyMs =
								await measureInteractionLatency(repeatPage, 'repeat-visitor');
							samples.push({
								...repeatMetrics,
								interactionLatencyMs: repeatInteractionLatencyMs,
								scenario: 'repeat-visitor',
							});
							await repeatContext.close();
						}

						if (scenario.name === 'ssr' && index >= effectiveWarmupIterations) {
							// Persisted repeat visitor over SSR: the accept above wrote the
							// consent cookie in this context, so the server sees it on the
							// next request and must render no banner; the client must
							// hydrate to the same prompt state without a flash.
							await waitForConsentCookie(page);
							const repeatMetrics = await collectScenarioMetrics(
								page,
								scenario.name,
								scenario.path,
								'settled'
							);
							const repeatInteractionLatencyMs =
								await measureInteractionLatency(page, 'ssr-repeat');
							samples.push({
								...repeatMetrics,
								interactionLatencyMs: repeatInteractionLatencyMs,
								scenario: 'ssr-repeat',
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
						budgetDefinitions: nextjsBrowserBudgetsForScenario(groupScenario),
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
						framework: 'nextjs',
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
							consoleErrors: groupedSamples.flatMap(
								(sample) => sample.consoleErrors ?? []
							),
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
								groupedSamples.map(
									(sample) => sample.initRequestsAfterLoad ?? 0
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
							summarizeMetric(
								'consoleErrorCount',
								'count',
								groupedSamples.map((sample) => sample.consoleErrorCount ?? 0)
							),
							summarizeMetric(
								'consoleWarningCount',
								'count',
								groupedSamples.map((sample) => sample.consoleWarningCount ?? 0)
							),
							summarizeMetric(
								'hydrationWarningCount',
								'count',
								groupedSamples.map(
									(sample) => sample.hydrationWarningCount ?? 0
								)
							),
							summarizeMetric(
								'promptTransitionCount',
								'count',
								groupedSamples.map(
									(sample) => sample.promptTransitionCount ?? 0
								)
							),
							summarizeMetric(
								'hydratedChoicePresent',
								'count',
								groupedSamples.map((sample) => (sample.hasStoredChoice ? 1 : 0))
							),
							summarizeMetric(
								'promptShownCount',
								'count',
								groupedSamples.map((sample) => sample.promptShownCount ?? 0)
							),
							summarizeNullableMetric(
								'promptSettledMs',
								'ms',
								groupedSamples.map((sample) => sample.promptSettledMs ?? null)
							),
						],
						notes: [
							'Next.js browser bench covers client, manifest, SSR, RSC, repeat-visitor, and persisted ssr-repeat paths.',
							'consoleErrorCount counts console errors and page errors captured until the prompt settled; consoleWarningCount counts warnings; hydrationWarningCount is the subset of either matching React hydration messages.',
						],
						package: '@c15t/nextjs-browser-bench',
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
				`${logs || 'Next.js browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode === null ||
			(server.exitCode === undefined &&
				server.signalCode !== null &&
				server.signalCode !== undefined &&
				!expectedServerShutdownSignals.has(server.signalCode))
		) {
			serverFailure = new Error(
				`${logs || 'Next.js browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
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
