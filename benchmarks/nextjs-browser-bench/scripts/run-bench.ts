#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type {
	BenchPerfMetrics,
	BenchScriptResourceMetrics,
	readBenchNavigationTiming,
} from '@c15t/benchmarking/browser';
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	benchPerfMetricsExpression,
	benchScriptResourceExpression,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
} from '@c15t/benchmarking/browser';
import { nextjsBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
import {
	analyzeServerHtmlStream,
	bannerMarkupMarkers,
	readServerHtmlStream,
	toCookieHeader,
} from '@c15t/benchmarking/html-stream';
import type { ServerHtmlStreamAnalysis } from '@c15t/benchmarking/html-stream';
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
import {
	assertVisitBannerState,
	coldStateMetadata,
	describeColdState,
	savedConsentVisits,
} from '@c15t/benchmarking/visit-definitions';
import type {
	BenchColdState,
	BenchVisitKind,
	SavedConsentVisitDefinition,
} from '@c15t/benchmarking/visit-definitions';
import {
	serverHtmlMetadata,
	summarizeServerHtmlMetrics,
	summarizeVisitTimingMetrics,
	visitMetricGlossary,
} from '@c15t/benchmarking/visit-metrics';
import { chromium } from 'playwright';
import type * as PlaywrightTypes from 'playwright';

const HOST = '127.0.0.1';
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

const PORT = Number(
	readCliFlag('--port') ?? process.env.C15T_BENCH_PORT ?? '4312'
);
const BASE_URL = `http://${HOST}:${PORT}`;

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
] as const;

type FreshScenario = (typeof allScenarios)[number];

/**
 * Saved-consent visits reload the recommended manifest SSR route in a new
 * browser context carrying the recording visit's cookies and localStorage,
 * so the server sees the stored choice and must omit the banner.
 */
const savedConsentScenario = {
	name: 'manifest-ssr',
	path: '/manifest-ssr',
} as const satisfies FreshScenario;

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;
const selectedSavedVisits = scenarioFilter
	? savedConsentVisits.filter((visit) => visit.name === scenarioFilter)
	: savedConsentVisits;

if (
	scenarioFilter &&
	scenarios.length === 0 &&
	selectedSavedVisits.length === 0
) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ${[
			...allScenarios.map((scenario) => scenario.name),
			...savedConsentVisits.map((visit) => visit.name),
		].join(', ')}.`
	);
}

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario: FreshScenario['name'] | 'saved-consent' | 'ssr-repeat'
) {
	if (scenario === 'baseline') {
		const startedAt = performance.now();
		await page.click('#baseline-noop');
		return performance.now() - startedAt;
	}

	if (scenario === 'saved-consent' || scenario === 'ssr-repeat') {
		// A returning visitor has no banner; reopening preferences is the
		// interaction left to measure.
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

const waitForExit = async function waitForExit(
	child: ReturnType<typeof spawn>,
	timeoutMs: number
): Promise<boolean> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return true;
	}
	try {
		await once(child, 'exit', { signal: AbortSignal.timeout(timeoutMs) });
		return true;
	} catch {
		return false;
	}
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
	return await new Promise<void>((_resolve, reject) => {
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
				_resolve();
				return;
			}

			reject(
				new Error(logs || `bun ${args.join(' ')} failed while running ${label}`)
			);
		});
		command.on('error', reject);
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

/**
 * Read the raw server HTML stream for a route, once per measured iteration,
 * with the cookies of the visit being measured. Runs after the browser
 * samples and fixture counts so it cannot warm or skew them.
 */
const readServerHtml = async function readServerHtml(
	path: string,
	cookie: string | undefined
): Promise<ServerHtmlStreamAnalysis[]> {
	const reads: ServerHtmlStreamAnalysis[] = [];
	for (let index = 0; index < iterations; index += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Sequential reads keep timings independent.
		const capture = await readServerHtmlStream(`${BASE_URL}${path}`, {
			cookie,
		});
		reads.push(
			analyzeServerHtmlStream(
				capture.chunks,
				bannerMarkupMarkers(bannerRootTestId)
			)
		);
	}
	return reads;
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

	await page.goto(path);
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
	const scriptEntry = (await page.evaluate(
		benchScriptResourceExpression
	)) as BenchScriptResourceMetrics | null;
	const performanceObserverInfo = (await page.evaluate(
		benchPerfMetricsExpression
	)) as BenchPerfMetrics;
	const bannerCount = await page
		.locator(`[data-testid="${bannerRootTestId}"]`)
		.count();

	page.off('request', onRequest);
	page.off('console', onConsole);
	page.off('pageerror', onPageError);

	const history = state?.activeUiHistory ?? [];
	return {
		...state,
		...navEntry,
		...scriptEntry,
		...performanceObserverInfo,
		bannerCount,
		// Element Timing only; the probe's own reading is not a fallback.
		bannerPaintMs: performanceObserverInfo.bannerPaintMs,
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

const assertSampleBannerState = function assertSampleBannerState(
	sample: NextjsBrowserSample,
	scenario: string,
	visit: BenchVisitKind
) {
	assertVisitBannerState({
		activeUI: sample.activeUI,
		bannerCount: sample.bannerCount,
		hasStoredChoice: visit === 'fresh' ? undefined : sample.hasStoredChoice,
		scenario,
		visit,
	});
};

/**
 * Cold state of a fresh-visit sample. In `--cold-manifest` mode the server
 * starts with a new manifest URL token, so the first measured visit to a
 * manifest route is also the first time this process resolves that route's
 * manifest; later samples reuse it.
 */
const freshColdState = function freshColdState(
	scenario: string,
	sampleLabel: 'cold' | 'steady' | null
): BenchColdState {
	const usesManifestCache = isManifestScenario(scenario);
	if (sampleLabel === 'cold') {
		return describeColdState({
			freshBrowserContext: true,
			manifestCacheKeyIsNew: true,
			note: 'first measured visit to this route since the server started with a new manifest token (includes loading the route module); earlier scenarios in the same process may have fetched the manifest through /api/c15t/manifest',
			usesManifestCache,
		});
	}
	return describeColdState({
		freshBrowserContext: true,
		usesManifestCache,
	});
};

interface ScenarioResultInput {
	scenario: string;
	visit: BenchVisitKind;
	coldState: BenchColdState;
	samples: NextjsBrowserSample[];
	serverHtml: ServerHtmlStreamAnalysis[];
	fixtureCounts: BenchConsentFixtureCounts;
	browserVersion: string;
}

const writeScenarioResult = function writeScenarioResult(
	input: ScenarioResultInput
) {
	const { samples: groupedSamples, serverHtml, fixtureCounts } = input;
	const outputScenario = resultScenarioName(input.scenario);
	const result: BenchmarkResult = {
		baseSha: safeBaseSha(),
		budgetDefinitions: nextjsBrowserBudgetsForScenario(input.scenario),
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(input.browserVersion),
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: outputScenario,
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'nextjs',
		metadata: {
			...serverHtmlMetadata(serverHtml),
			...coldStateMetadata(input.coldState),
			bannerPaintMs: nullableMedian(
				groupedSamples.map((sample) => sample.bannerPaintMs)
			),
			cls: Number(
				median(groupedSamples.map((sample) => sample.cls ?? 0)).toFixed(4)
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
			visit: input.visit,
		},
		metrics: [
			summarizeNullableMetric(
				'bannerReadyMs',
				'ms',
				groupedSamples.map((sample) => sample.bannerReadyMs ?? null)
			),
			summarizeNullableMetric(
				'bannerVisibleMs',
				'ms',
				groupedSamples.map((sample) => sample.bannerVisibleMs ?? null)
			),
			summarizeNullableMetric(
				'bannerPaintMs',
				'ms',
				groupedSamples.map((sample) => sample.bannerPaintMs ?? null)
			),
			...summarizeVisitTimingMetrics(groupedSamples),
			...summarizeServerHtmlMetrics(serverHtml),
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
				groupedSamples.map((sample) => sample.manifestRequestsAfterLoad ?? 0)
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
				groupedSamples.map((sample) => sample.hydrationWarningCount ?? 0)
			),
			summarizeMetric(
				'promptTransitionCount',
				'count',
				groupedSamples.map((sample) => sample.promptTransitionCount ?? 0)
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
			'Next.js browser bench covers client, manifest, SSR, persisted ssr-repeat, and saved-consent (accept and reject) paths.',
			'consoleErrorCount counts console errors and page errors captured until the prompt settled; consoleWarningCount counts warnings; hydrationWarningCount is the subset of either matching React hydration messages.',
			`Visit: ${input.visit}. Cold state: ${input.coldState.setup}.`,
			...visitMetricGlossary,
		],
		package: '@c15t/nextjs-browser-bench',
		runtime: 'playwright',
		scenario: outputScenario,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'browser-runtime',
		timestamp: new Date().toISOString(),
	};

	writeJson(join(outputDir, resultFileName(input.scenario)), result);
};

const runFreshScenario = async function runFreshScenario(
	browser: PlaywrightTypes.Browser,
	scenario: FreshScenario
) {
	const samples: NextjsBrowserSample[] = [];
	const ssrRepeatSamples: NextjsBrowserSample[] = [];
	let ssrRepeatCookie: string | undefined;
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
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const context = await browser.newContext({ baseURL: BASE_URL });
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const page = await context.newPage();
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await applyPageProfile(context, page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectScenarioMetrics(
				page,
				scenario.name,
				scenario.path
			);
			if (scenario.name !== 'baseline') {
				assertSampleBannerState(metrics, scenario.name, 'fresh');
			}
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const interactionLatencyMs = await measureInteractionLatency(
				page,
				scenario.name
			);
			if (index >= effectiveWarmupIterations) {
				const measuredIndex = index - effectiveWarmupIterations;
				let sampleScenario: string = scenario.name;
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

				if (scenario.name === 'ssr') {
					// Persisted repeat visitor over SSR in the same context: the
					// accept above wrote the consent cookie, so the server sees it
					// on the next request and must render no banner. The browser
					// HTTP cache is warm here, unlike the saved-consent visits.
					// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
					await waitForConsentCookie(page);
					// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
					const repeatMetrics = await collectScenarioMetrics(
						page,
						scenario.name,
						scenario.path,
						'settled'
					);
					assertSampleBannerState(repeatMetrics, 'ssr-repeat', 'saved-accept');
					// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
					const repeatInteractionLatencyMs = await measureInteractionLatency(
						page,
						'ssr-repeat'
					);
					ssrRepeatSamples.push({
						...repeatMetrics,
						interactionLatencyMs: repeatInteractionLatencyMs,
						scenario: 'ssr-repeat',
					});
					// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
					ssrRepeatCookie = toCookieHeader(await context.cookies());
				}
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await context.close();
		}
	}
	const fixtureCounts = await readFixtureCounts();
	const freshServerHtml = await readServerHtml(scenario.path, undefined);

	const grouped = new Map<string, NextjsBrowserSample[]>();
	for (const sample of samples) {
		const key = sample.scenario ?? scenario.name;
		grouped.set(key, [...(grouped.get(key) ?? []), sample]);
	}
	for (const [groupScenario, groupedSamples] of grouped) {
		let sampleLabel: 'cold' | 'steady' | null = null;
		if (groupScenario.endsWith('-cold')) {
			sampleLabel = 'cold';
		} else if (groupScenario.endsWith('-steady')) {
			sampleLabel = 'steady';
		}
		writeScenarioResult({
			browserVersion: browser.version(),
			coldState: freshColdState(scenario.name, sampleLabel),
			fixtureCounts,
			samples: groupedSamples,
			scenario: groupScenario,
			serverHtml: freshServerHtml,
			visit: 'fresh',
		});
	}
	if (ssrRepeatSamples.length > 0) {
		writeScenarioResult({
			browserVersion: browser.version(),
			coldState: describeColdState({
				freshBrowserContext: false,
				note: 'reload in the context that accepted, so the stored choice and the HTTP cache both carry over',
				usesManifestCache: false,
			}),
			fixtureCounts,
			samples: ssrRepeatSamples,
			scenario: 'ssr-repeat',
			serverHtml: await readServerHtml(scenario.path, ssrRepeatCookie),
			visit: 'saved-accept',
		});
	}
};

/**
 * Unmeasured fresh visit that records the choice, then returns the
 * context's cookies and localStorage for the saved-consent visit.
 */
const recordChoice = async function recordChoice(
	browser: PlaywrightTypes.Browser,
	visit: SavedConsentVisitDefinition
) {
	const context = await browser.newContext({ baseURL: BASE_URL });
	try {
		const page = await context.newPage();
		await page.goto(savedConsentScenario.path);
		await page.waitForFunction(
			() => typeof window.__c15tNextBench?.bannerReadyMs === 'number',
			undefined,
			{ timeout: 30_000 }
		);
		await page.click(`[data-testid="${visit.buttonTestId}"]`);
		await page.waitForFunction(
			() => {
				const state = window.__c15tNextBench;
				return (
					!!state &&
					state.onChoiceRecordedCount > 0 &&
					state.activeUI === 'none'
				);
			},
			undefined,
			{ timeout: 30_000 }
		);
		await waitForConsentCookie(page);
		return await context.storageState();
	} finally {
		await context.close();
	}
};

const runSavedConsentVisit = async function runSavedConsentVisit(
	browser: PlaywrightTypes.Browser,
	visit: SavedConsentVisitDefinition
) {
	const samples: NextjsBrowserSample[] = [];
	let lastCookie: string | undefined;
	await resetFixtureCounts();
	for (let index = 0; index < warmupIterations + iterations; index += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const storageState = await recordChoice(browser, visit);
		lastCookie = toCookieHeader(storageState.cookies);
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const context = await browser.newContext({
			baseURL: BASE_URL,
			storageState,
		});
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const page = await context.newPage();
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await applyPageProfile(context, page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectScenarioMetrics(
				page,
				savedConsentScenario.name,
				savedConsentScenario.path,
				'settled'
			);
			assertSampleBannerState(metrics, visit.name, visit.visit);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const interactionLatencyMs = await measureInteractionLatency(
				page,
				'saved-consent'
			);
			if (index >= warmupIterations) {
				samples.push({ ...metrics, interactionLatencyMs });
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await context.close();
		}
	}
	const fixtureCounts = await readFixtureCounts();
	const serverHtml = await readServerHtml(
		savedConsentScenario.path,
		lastCookie
	);
	for (const read of serverHtml) {
		if (read.bannerInServerHtml) {
			throw new Error(
				`${visit.name}: the server HTML still contained the banner for a stored ${visit.action} choice`
			);
		}
	}
	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'cookies and localStorage carried over from the recording visit',
			usesManifestCache: true,
		}),
		fixtureCounts,
		samples,
		scenario: visit.name,
		serverHtml,
		visit: visit.visit,
	});
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

		for (const scenario of scenarios) {
			// oxlint-disable-next-line no-await-in-loop -- Scenarios run sequentially.
			await runFreshScenario(browser, scenario);
		}
		for (const visit of selectedSavedVisits) {
			// oxlint-disable-next-line no-await-in-loop -- Scenarios run sequentially.
			await runSavedConsentVisit(browser, visit);
		}

		await browser.close();
	} finally {
		server.kill('SIGTERM');
		// `killed` only confirms signal delivery; wait for the process to
		// actually exit before judging its status, escalating if it lingers.
		if (!(await waitForExit(server, 500))) {
			server.kill('SIGKILL');
			await waitForExit(server, 2000);
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
			(server.exitCode === null || server.exitCode === undefined) &&
			!(
				server.signalCode &&
				expectedServerShutdownSignals.has(server.signalCode)
			)
		) {
			// Killed by a signal we did not send, or still running after the
			// bounded wait (both status fields unset).
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
