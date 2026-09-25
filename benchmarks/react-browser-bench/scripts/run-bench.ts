#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type {
	BenchPerfMetrics,
	readBenchNavigationTiming,
} from '@c15t/benchmarking/browser';
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	benchPerfMetricsExpression,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
} from '@c15t/benchmarking/browser';
import { reactBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
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

import { policyScenarios, runPolicyScenarios } from './policy-scenarios';

const HOST = '127.0.0.1';
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/react';
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
	readCliFlag('--port') ?? process.env.C15T_BENCH_PORT ?? '4311'
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

const allScenarios = [
	{ name: 'banner-css', path: '/banner-css' },
	{ name: 'baseline', path: '/baseline' },
	{ name: 'css-banner-modules', path: '/css-banner-modules' },
	{ name: 'full-ui', path: '/full-ui' },
	{ name: 'headless', path: '/headless' },
] as const;

/** Saved-consent visits reload the full UI route with carried-over storage. */
const savedConsentPath = '/full-ui';
const savedConsentProbeScenario = 'full-ui';

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;
const selectedSavedVisits = scenarioFilter
	? savedConsentVisits.filter((visit) => visit.name === scenarioFilter)
	: savedConsentVisits;
const selectedPolicyScenarios = scenarioFilter
	? policyScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: policyScenarios;

if (
	scenarioFilter &&
	scenarios.length === 0 &&
	selectedSavedVisits.length === 0 &&
	selectedPolicyScenarios.length === 0
) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ${[
			...allScenarios.map((scenario) => scenario.name),
			...savedConsentVisits.map((visit) => visit.name),
			...policyScenarios.map((scenario) => scenario.name),
		].join(', ')}.`
	);
}

type MeasuredScenarioName =
	| (typeof allScenarios)[number]['name']
	| SavedConsentVisitDefinition['name'];

const waitForChoiceRecorded = async function waitForChoiceRecorded(
	page: PlaywrightTypes.Page,
	before: number
) {
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tReactBench;
			return (
				!!state &&
				state.onChoiceRecordedCount > expected &&
				state.activeUI === 'none'
			);
		},
		before,
		{ timeout: 30_000 }
	);
};

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario: MeasuredScenarioName
) {
	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (scenario) {
		case 'baseline': {
			// Zero-consent arm: measure a trivial interaction as the floor.
			const startedAt = performance.now();
			await page.click('#baseline-noop');
			return performance.now() - startedAt;
		}
		case 'full-ui':
		case 'banner-css':
		case 'css-banner-modules': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onChoiceRecordedCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('[data-testid="consent-banner-accept-button"]');
			await waitForChoiceRecorded(page, before);
			return performance.now() - startedAt;
		}
		case 'headless': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onChoiceRecordedCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('#headless-accept');
			await waitForChoiceRecorded(page, before);
			return performance.now() - startedAt;
		}
		case 'saved-consent-accept':
		case 'saved-consent-reject': {
			// A returning visitor has no banner; reopening preferences is the
			// interaction left to measure.
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

	throw new Error('Timed out waiting for react browser bench server');
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

	await runCommand(['run', 'build'], 'react browser benchmark build');
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

/**
 * Read the raw server HTML stream for a route, once per measured iteration,
 * with the cookies of the visit being measured. Runs after the browser
 * samples so it cannot warm anything they measure.
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
 * Collect one page load. `waitFor: 'banner'` waits for the hydrated banner;
 * `'settled'` waits for policy resolution, which is all a saved-consent
 * visit produces.
 */
const collectPageMetrics = async function collectPageMetrics(
	page: PlaywrightTypes.Page,
	scenario: string,
	waitFor: 'banner' | 'settled' = 'banner'
) {
	await page.waitForLoadState('domcontentloaded');
	await page.waitForFunction(
		({ targetScenario, mode }) => {
			const state = window.__c15tReactBench;
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

	const state = await page.evaluate(() => window.__c15tReactBench);
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
	const cssEntry = await page.evaluate(() => {
		const entries = performance
			.getEntriesByType('resource')
			.filter(
				(entry): entry is PerformanceResourceTiming =>
					entry instanceof PerformanceResourceTiming &&
					(entry.initiatorType === 'link' || entry.initiatorType === 'css') &&
					entry.name.includes('.css')
			);
		return {
			cssBytes: entries.reduce(
				(sum, entry) => sum + (entry.transferSize || entry.encodedBodySize),
				0
			),
			cssRequestCount: entries.length,
		};
	});
	const performanceObserverInfo = (await page.evaluate(
		benchPerfMetricsExpression
	)) as BenchPerfMetrics;
	const bannerCount = await page
		.locator(`[data-testid="${bannerRootTestId}"]`)
		.count();

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...cssEntry,
		...performanceObserverInfo,
		bannerCount,
		// Element Timing only; the probe's own reading is not a fallback.
		bannerPaintMs: performanceObserverInfo.bannerPaintMs,
	};
};

type ReactBrowserSample = Omit<
	Awaited<ReturnType<typeof collectPageMetrics>>,
	'scenario'
> & {
	interactionLatencyMs?: number;
};

type BrowserStorageState = Awaited<
	ReturnType<PlaywrightTypes.BrowserContext['storageState']>
>;

const newMeasuredPage = async function newMeasuredPage(
	browser: PlaywrightTypes.Browser,
	storageState?: BrowserStorageState
) {
	const context = await browser.newContext({
		baseURL: BASE_URL,
		storageState,
	});
	const page = await context.newPage();
	await applyPageProfile(context, page);
	return { context, page };
};

/**
 * Unmeasured fresh visit that records the choice, then returns the
 * context's cookies and localStorage for the saved-consent visit.
 */
const recordChoice = async function recordChoice(
	browser: PlaywrightTypes.Browser,
	visit: SavedConsentVisitDefinition
): Promise<BrowserStorageState> {
	const context = await browser.newContext({ baseURL: BASE_URL });
	try {
		const page = await context.newPage();
		await page.goto(savedConsentPath);
		await page.waitForFunction(
			() => typeof window.__c15tReactBench?.bannerReadyMs === 'number',
			undefined,
			{ timeout: 30_000 }
		);
		await page.click(`[data-testid="${visit.buttonTestId}"]`);
		await waitForChoiceRecorded(page, 0);
		// Persistence writes are debounced behind the save.
		await page.waitForFunction(
			() =>
				document.cookie
					.split(';')
					.some((entry) => entry.trim().startsWith('c15t=')),
			undefined,
			{ timeout: 10_000 }
		);
		return await context.storageState();
	} finally {
		await context.close();
	}
};

const assertSampleBannerState = function assertSampleBannerState(
	sample: ReactBrowserSample,
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

interface ScenarioResultInput {
	scenario: string;
	visit: BenchVisitKind;
	coldState: BenchColdState;
	samples: ReactBrowserSample[];
	serverHtml: ServerHtmlStreamAnalysis[];
	browserVersion: string;
}

const writeScenarioResult = function writeScenarioResult(
	input: ScenarioResultInput
) {
	const { samples, serverHtml } = input;
	const outputScenario = resultScenarioName(input.scenario);
	const result: BenchmarkResult = {
		baseSha: safeBaseSha(),
		budgetDefinitions: reactBrowserBudgetsForScenario(input.scenario),
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
		framework: 'react',
		metadata: {
			...serverHtmlMetadata(serverHtml),
			bannerPaintMs: nullableMedian(
				samples.map((sample) => sample.bannerPaintMs)
			),
			cls: Number(median(samples.map((sample) => sample.cls ?? 0)).toFixed(4)),
			...coldStateMetadata(input.coldState),
			gitDirty: safeGitDirty(),
			initLatencyMs,
			profile: throttleProfile,
			visit: input.visit,
		},
		metrics: [
			summarizeNullableMetric(
				'bannerReadyMs',
				'ms',
				samples.map((sample) => sample.bannerReadyMs ?? null)
			),
			summarizeNullableMetric(
				'bannerVisibleMs',
				'ms',
				samples.map((sample) => sample.bannerVisibleMs ?? null)
			),
			summarizeNullableMetric(
				'bannerPaintMs',
				'ms',
				samples.map((sample) => sample.bannerPaintMs ?? null)
			),
			...summarizeVisitTimingMetrics(samples),
			...summarizeServerHtmlMetrics(serverHtml),
			summarizeNullableMetric(
				'promptSettledMs',
				'ms',
				samples.map((sample) => sample.promptSettledMs ?? null)
			),
			summarizeMetric(
				'promptShownCount',
				'count',
				samples.map((sample) => (sample.bannerCount > 0 ? 1 : 0))
			),
			summarizeMetric(
				'hydratedChoicePresent',
				'count',
				samples.map((sample) => (sample.hasStoredChoice ? 1 : 0))
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
				'cssBytes',
				'bytes',
				samples.map((sample) => sample.cssBytes ?? 0)
			),
			summarizeMetric(
				'cssRequestCount',
				'count',
				samples.map((sample) => sample.cssRequestCount ?? 0)
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
				'interactionLatencyMs',
				'ms',
				samples.map((sample) => sample.interactionLatencyMs ?? 0)
			),
		],
		notes: [
			'React browser bench runs with local deterministic init and subject endpoints.',
			`Visit: ${input.visit}. Cold state: ${input.coldState.setup}.`,
			...visitMetricGlossary,
		],
		package: '@c15t/react-browser-bench',
		runtime: 'playwright',
		scenario: outputScenario,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'browser-runtime',
		timestamp: new Date().toISOString(),
	};

	writeJson(join(outputDir, resultFileName(input.scenario)), result);
};

const freshColdState = describeColdState({
	freshBrowserContext: true,
	note: 'hosted client init; no server consent resolution',
	usesManifestCache: false,
});

const runFreshScenario = async function runFreshScenario(
	browser: PlaywrightTypes.Browser,
	scenario: (typeof allScenarios)[number]
) {
	const samples: ReactBrowserSample[] = [];
	for (let index = 0; index < warmupIterations + iterations; index += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const { context, page } = await newMeasuredPage(browser);
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await page.goto(scenario.path);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectPageMetrics(page, scenario.name);
			if (scenario.name !== 'baseline') {
				assertSampleBannerState(metrics, scenario.name, 'fresh');
			}
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const interactionLatencyMs = await measureInteractionLatency(
				page,
				scenario.name
			);
			if (index >= warmupIterations) {
				samples.push({ ...metrics, interactionLatencyMs });
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await context.close();
		}
	}

	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: freshColdState,
		samples,
		scenario: scenario.name,
		serverHtml: await readServerHtml(scenario.path, undefined),
		visit: 'fresh',
	});
};

const runSavedConsentVisit = async function runSavedConsentVisit(
	browser: PlaywrightTypes.Browser,
	visit: SavedConsentVisitDefinition
) {
	const samples: ReactBrowserSample[] = [];
	let lastStorage: BrowserStorageState | undefined;
	for (let index = 0; index < warmupIterations + iterations; index += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const storageState = await recordChoice(browser, visit);
		lastStorage = storageState;
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const { context, page } = await newMeasuredPage(browser, storageState);
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await page.goto(savedConsentPath);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectPageMetrics(
				page,
				savedConsentProbeScenario,
				'settled'
			);
			assertSampleBannerState(metrics, visit.name, visit.visit);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const interactionLatencyMs = await measureInteractionLatency(
				page,
				visit.name
			);
			if (index >= warmupIterations) {
				samples.push({ ...metrics, interactionLatencyMs });
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await context.close();
		}
	}

	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'cookies and localStorage carried over from the recording visit',
			usesManifestCache: false,
		}),
		samples,
		scenario: visit.name,
		serverHtml: await readServerHtml(
			savedConsentPath,
			toCookieHeader(lastStorage?.cookies ?? [])
		),
		visit: visit.visit,
	});
};

const run = async function run() {
	await ensureBuild();

	const server = spawn(
		'bun',
		['run', 'start', '--', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: appDir,
			env: {
				...process.env,
				C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
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
			// oxlint-disable-next-line no-await-in-loop -- Scenarios run sequentially.
			await runFreshScenario(browser, scenario);
		}
		for (const visit of selectedSavedVisits) {
			// oxlint-disable-next-line no-await-in-loop -- Scenarios run sequentially.
			await runSavedConsentVisit(browser, visit);
		}

		await runPolicyScenarios(browser, selectedPolicyScenarios, {
			baseUrl: BASE_URL,
			initLatencyMs,
			iterations,
			outputDir,
			resultFileName,
			resultScenarioName,
			throttleProfile,
			warmupIterations,
		});

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
				`${logs || 'React browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode === null ||
			(server.exitCode === undefined &&
				server.signalCode !== null &&
				server.signalCode !== undefined &&
				!expectedServerShutdownSignals.has(server.signalCode))
		) {
			serverFailure = new Error(
				`${logs || 'React browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
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
