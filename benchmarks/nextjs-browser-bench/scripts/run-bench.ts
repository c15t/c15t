#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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
	BENCH_BACKEND_LATENCY_ENV,
	benchScenarioKey,
	resolveBenchBackendLatencyMs,
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
import type {
	BenchmarkResult,
	MetricSampleSet,
} from '@c15t/benchmarking/schema';
import type { BenchScriptTiming } from '@c15t/benchmarking/script-timing';
import {
	benchScriptTimingExpression,
	scriptTimingGlossary,
	summarizeBenchScripts,
	summarizeIdlePreloadMetrics,
} from '@c15t/benchmarking/script-timing';
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
	serverHtmlForSampleGroup,
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
const backendLatencyMs = resolveBenchBackendLatencyMs(readCliFlag, process.env);
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

/**
 * The quickstart install with three consent-gated vendors through
 * `@c15t/integrations`. One selection runs its first visit plus the two
 * returning visits that follow it.
 */
const typicalInstallScenario = {
	name: 'typical-install',
	path: '/typical-install',
} as const;

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;
const selectedSavedVisits = scenarioFilter
	? savedConsentVisits.filter((visit) => visit.name === scenarioFilter)
	: savedConsentVisits;
const runTypicalInstall =
	!scenarioFilter || scenarioFilter === typicalInstallScenario.name;

if (
	scenarioFilter &&
	scenarios.length === 0 &&
	selectedSavedVisits.length === 0 &&
	!runTypicalInstall
) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ${[
			...allScenarios.map((scenario) => scenario.name),
			typicalInstallScenario.name,
			...savedConsentVisits.map((visit) => visit.name),
		].join(', ')}.`
	);
}

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario:
		| FreshScenario['name']
		| typeof typicalInstallScenario.name
		| 'saved-consent'
		| 'ssr-repeat'
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
	return benchScenarioKey(scenario, {
		backendLatencyMs,
		profile: throttleProfile,
	});
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
	const scriptEntry = summarizeBenchScripts(
		(await page.evaluate(benchScriptTimingExpression)) as BenchScriptTiming,
		'script-or-module-url'
	);
	const performanceObserverInfo = (await page.evaluate(
		benchPerfMetricsExpression
	)) as BenchPerfMetrics;
	const bannerCount = await page
		.locator(`[data-testid="${bannerRootTestId}"]`)
		.count();
	const bannerPosition = await page.evaluate((testId) => {
		const root = document.querySelector(`[data-testid="${testId}"]`);
		return root ? getComputedStyle(root).position : null;
	}, bannerRootTestId);

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
		bannerPosition,
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
	/** Vendor script and JS-weight metrics of the typical-install visits. */
	typicalInstall?: Record<string, number | null>;
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
		bannerPosition: sample.bannerPosition,
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
			note: 'first measured visit to this route since the server started with a new manifest token (includes loading the route module); earlier scenarios in the same process may have fetched the manifest through /api/c15t/manifest; server HTML reads are omitted because they run after the samples, with a warm cache',
			usesManifestCache,
		});
	}
	return describeColdState({
		freshBrowserContext: true,
		usesManifestCache,
	});
};

/** The stand-in vendor scripts the typical-install arm registers. */
const typicalVendors = [
	{ key: 'gtag', metric: 'gtag', path: '/bench-vendor/gtag.js' },
	{ key: 'meta-pixel', metric: 'metaPixel', path: '/bench-vendor/fbevents.js' },
	{
		key: 'tiktok-pixel',
		metric: 'tiktokPixel',
		path: '/bench-vendor/tiktok-events.js',
	},
] as const;

/** Vendors that wait for marketing consent; gtag loads on every visit. */
const consentGatedVendors = typicalVendors.filter(
	(vendor) => vendor.key !== 'gtag'
);

const typicalInstallGlossary = [
	'typical-install: the Next.js quickstart (ConsentRoot with config, streamed resolveConsent over the cached manifest, stock banner and dialog) plus gtag, Meta Pixel and TikTok Pixel from @c15t/integrations, each pointed at a local stand-in script.',
	'<vendor>StartMs / <vendor>ExecutedMs: navigation start to the stand-in request starting (resource timing) and to it running. consentTo<Vendor>StartMs / ExecutedMs: from the accept click instead.',
	'scriptsStartedMs / scriptsExecutedMs: the last vendor to start or run (consentToScripts* on the first visit covers the two marketing vendors). firstPartyJs*ByIdle: scripts other than the stand-ins once no script request started for 1 s after load (idle preloads included); firstPartyJs*AtLoad: those that started before the load event.',
	'typical-install-repeat reloads in the context that accepted (warm HTTP cache); typical-install-returning opens a new context with its cookies and localStorage (cold HTTP cache).',
] as const;

const typicalInstallMetricNames = function typicalInstallMetricNames(
	samples: readonly NextjsBrowserSample[]
): string[] {
	return [
		...new Set(
			samples.flatMap((sample) => Object.keys(sample.typicalInstall ?? {}))
		),
	].sort();
};

const typicalInstallMetricUnit = function typicalInstallMetricUnit(
	name: string
): MetricSampleSet['unit'] {
	if (name.endsWith('Bytes')) {
		return 'bytes';
	}
	return name.endsWith('Files') ? 'count' : 'ms';
};

interface TypicalVendorRead {
	acceptClickMs: number | null;
	loadEventStartMs: number | null;
	vendors: Record<
		string,
		{ startMs: number | null; executedMs: number | null }
	>;
	firstParty: { startMs: number; bytes: number }[];
}

/**
 * Page-context read of the stand-in vendors and first-party scripts. A
 * string, like `benchScriptTimingExpression`, so the transpiler cannot wrap
 * it.
 */
const typicalVendorReadExpression = `(() => {
	const vendorPaths = ${JSON.stringify(Object.fromEntries(typicalVendors.map((vendor) => [vendor.key, vendor.path])))};
	const pathOf = (name) => { try { return new URL(name).pathname; } catch { return ''; } };
	const entries = performance.getEntriesByType('resource');
	const ran = window.__c15tBenchVendors || {};
	const vendors = {};
	for (const [key, path] of Object.entries(vendorPaths)) {
		const entry = entries.find((candidate) => pathOf(candidate.name) === path);
		vendors[key] = {
			startMs: entry ? entry.startTime : null,
			executedMs: typeof ran[key] === 'number' ? ran[key] : null,
		};
	}
	const firstParty = entries
		.filter((entry) => entry.initiatorType === 'script' || /\\.m?js$/u.test(pathOf(entry.name)))
		.filter((entry) => !pathOf(entry.name).startsWith('/bench-vendor/'))
		.map((entry) => ({ startMs: entry.startTime, bytes: entry.transferSize || entry.encodedBodySize }));
	const nav = performance.getEntriesByType('navigation')[0];
	return {
		acceptClickMs: typeof window.__c15tBenchAcceptClickMs === 'number' ? window.__c15tBenchAcceptClickMs : null,
		loadEventStartMs: nav && nav.loadEventStart > 0 ? nav.loadEventStart : null,
		vendors,
		firstParty,
	};
})()`;

/** Records when the accept button was pressed, before any handler runs. */
const acceptClickRecorderScript = `document.addEventListener('click', (event) => {
	if (event.target instanceof Element && event.target.closest('[data-testid="consent-banner-accept-button"]')) {
		window.__c15tBenchAcceptClickMs ??= performance.now();
	}
}, true);`;

/** Resolves once no script request started for `quietMs`, up to 10 s. */
const scriptQuietExpression = (quietMs: number) => `new Promise((resolve) => {
	const count = () => performance.getEntriesByType('resource').length;
	let last = count();
	let quietSince = performance.now();
	const startedAt = performance.now();
	const tick = () => {
		const now = performance.now();
		const current = count();
		if (current !== last) { last = current; quietSince = now; }
		if (now - quietSince >= ${quietMs} || now - startedAt >= 10000) { resolve(true); return; }
		requestIdleCallback(() => setTimeout(tick, 50), { timeout: 250 });
	};
	tick();
})`;

const readTypicalVendors = async function readTypicalVendors(
	page: PlaywrightTypes.Page
): Promise<TypicalVendorRead> {
	return (await page.evaluate(
		typicalVendorReadExpression
	)) as TypicalVendorRead;
};

const waitForVendors = async function waitForVendors(
	page: PlaywrightTypes.Page,
	keys: readonly string[]
) {
	await page.waitForFunction(
		(names) =>
			names.every(
				(name) =>
					typeof (
						window as unknown as {
							__c15tBenchVendors?: Record<string, number>;
						}
					).__c15tBenchVendors?.[name] === 'number'
			),
		keys,
		{ timeout: 30_000 }
	);
};

const maxOf = function maxOf(values: (number | null)[]): number | null {
	return values.some((value) => value === null)
		? null
		: Math.max(...(values as number[]));
};

/** Returning visit: every vendor timed from navigation start. */
const returningVendorMetrics = function returningVendorMetrics(
	read: TypicalVendorRead
): Record<string, number | null> {
	const metrics: Record<string, number | null> = {};
	for (const vendor of typicalVendors) {
		const timing = read.vendors[vendor.key];
		metrics[`${vendor.metric}StartMs`] = timing?.startMs ?? null;
		metrics[`${vendor.metric}ExecutedMs`] = timing?.executedMs ?? null;
	}
	metrics.scriptsStartedMs = maxOf(
		typicalVendors.map((vendor) => read.vendors[vendor.key]?.startMs ?? null)
	);
	metrics.scriptsExecutedMs = maxOf(
		typicalVendors.map((vendor) => read.vendors[vendor.key]?.executedMs ?? null)
	);
	return metrics;
};

const capitalize = (value: string) =>
	`${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * First visit: gtag from navigation start, the marketing vendors from the
 * accept click, and the first-party JS the page downloaded by idle.
 */
const firstVisitVendorMetrics = function firstVisitVendorMetrics(
	beforeAccept: TypicalVendorRead,
	afterAccept: TypicalVendorRead
): Record<string, number | null> {
	const click = afterAccept.acceptClickMs;
	const sinceClick = (value: number | null | undefined) =>
		value === null || value === undefined || click === null
			? null
			: value - click;
	const metrics: Record<string, number | null> = {
		gtagExecutedMs: afterAccept.vendors.gtag?.executedMs ?? null,
		gtagStartMs: afterAccept.vendors.gtag?.startMs ?? null,
	};
	for (const vendor of consentGatedVendors) {
		const timing = afterAccept.vendors[vendor.key];
		metrics[`consentTo${capitalize(vendor.metric)}StartMs`] = sinceClick(
			timing?.startMs
		);
		metrics[`consentTo${capitalize(vendor.metric)}ExecutedMs`] = sinceClick(
			timing?.executedMs
		);
	}
	metrics.consentToScriptsStartedMs = maxOf(
		consentGatedVendors.map((vendor) =>
			sinceClick(afterAccept.vendors[vendor.key]?.startMs)
		)
	);
	metrics.consentToScriptsExecutedMs = maxOf(
		consentGatedVendors.map((vendor) =>
			sinceClick(afterAccept.vendors[vendor.key]?.executedMs)
		)
	);
	const loadAt = beforeAccept.loadEventStartMs;
	const atLoad = beforeAccept.firstParty.filter(
		(entry) => loadAt !== null && entry.startMs <= loadAt
	);
	metrics.firstPartyJsFilesAtLoad = atLoad.length;
	metrics.firstPartyJsBytesAtLoad = atLoad.reduce(
		(sum, entry) => sum + entry.bytes,
		0
	);
	metrics.firstPartyJsFilesByIdle = beforeAccept.firstParty.length;
	metrics.firstPartyJsBytesByIdle = beforeAccept.firstParty.reduce(
		(sum, entry) => sum + entry.bytes,
		0
	);
	return metrics;
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
			backendLatencyMs,
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
			...summarizeIdlePreloadMetrics(groupedSamples),
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
			...typicalInstallMetricNames(groupedSamples).map((name) =>
				summarizeNullableMetric(
					name,
					typicalInstallMetricUnit(name),
					groupedSamples.map((sample) => sample.typicalInstall?.[name] ?? null)
				)
			),
		],
		notes: [
			'Next.js browser bench covers client, manifest, SSR, persisted ssr-repeat, saved-consent (accept and reject) and typical-install paths.',
			...(input.scenario.startsWith(typicalInstallScenario.name)
				? typicalInstallGlossary
				: []),
			'consoleErrorCount counts console errors and page errors captured until the prompt settled; consoleWarningCount counts warnings; hydrationWarningCount is the subset of either matching React hydration messages.',
			`Visit: ${input.visit}. Cold state: ${input.coldState.setup}.`,
			...visitMetricGlossary,
			...scriptTimingGlossary,
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
			serverHtml: serverHtmlForSampleGroup(freshServerHtml, sampleLabel),
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

/**
 * Typical install. Each iteration is a first visit (banner, gtag, idle JS
 * weight, then accept-all and the two marketing vendors), a reload in the
 * same context (warm cache) and a new context with the stored choice
 * (cold cache). The returning visits wait for all three vendors to run.
 */
const runTypicalInstallScenario = async function runTypicalInstallScenario(
	browser: PlaywrightTypes.Browser
) {
	const { name, path } = typicalInstallScenario;
	const fresh: NextjsBrowserSample[] = [];
	const repeat: NextjsBrowserSample[] = [];
	const returning: NextjsBrowserSample[] = [];
	let lastCookie: string | undefined;
	const allVendorKeys = typicalVendors.map((vendor) => vendor.key);
	await resetFixtureCounts();
	for (let index = 0; index < warmupIterations + iterations; index += 1) {
		const measured = index >= warmupIterations;
		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const context = await browser.newContext({ baseURL: BASE_URL });
		let storageState: Awaited<ReturnType<typeof context.storageState>>;
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const page = await context.newPage();
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await applyPageProfile(context, page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await page.addInitScript(acceptClickRecorderScript);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectScenarioMetrics(page, name, path);
			assertSampleBannerState(metrics, name, 'fresh');
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await waitForVendors(page, ['gtag']);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await page.evaluate(scriptQuietExpression(1000));
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const beforeAccept = await readTypicalVendors(page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const interactionLatencyMs = await measureInteractionLatency(page, name);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await waitForVendors(page, allVendorKeys);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const afterAccept = await readTypicalVendors(page);
			if (measured) {
				fresh.push({
					...metrics,
					interactionLatencyMs,
					scenario: name,
					typicalInstall: firstVisitVendorMetrics(beforeAccept, afterAccept),
				});
			}

			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await waitForConsentCookie(page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			storageState = await context.storageState();
			lastCookie = toCookieHeader(storageState.cookies);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const repeatMetrics = await collectScenarioMetrics(
				page,
				name,
				path,
				'settled'
			);
			assertSampleBannerState(repeatMetrics, `${name}-repeat`, 'saved-accept');
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await waitForVendors(page, allVendorKeys);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const repeatRead = await readTypicalVendors(page);
			if (measured) {
				repeat.push({
					...repeatMetrics,
					scenario: `${name}-repeat`,
					typicalInstall: returningVendorMetrics(repeatRead),
				});
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await context.close();
		}

		// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
		const returningContext = await browser.newContext({
			baseURL: BASE_URL,
			storageState,
		});
		try {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const page = await returningContext.newPage();
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await applyPageProfile(returningContext, page);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const metrics = await collectScenarioMetrics(page, name, path, 'settled');
			assertSampleBannerState(metrics, `${name}-returning`, 'saved-accept');
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await waitForVendors(page, allVendorKeys);
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			const read = await readTypicalVendors(page);
			if (measured) {
				returning.push({
					...metrics,
					scenario: `${name}-returning`,
					typicalInstall: returningVendorMetrics(read),
				});
			}
		} finally {
			// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially.
			await returningContext.close();
		}
	}
	const fixtureCounts = await readFixtureCounts();
	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: describeColdState({
			freshBrowserContext: true,
			usesManifestCache: true,
		}),
		fixtureCounts,
		samples: fresh,
		scenario: name,
		serverHtml: await readServerHtml(path, undefined),
		visit: 'fresh',
	});
	const returningServerHtml = await readServerHtml(path, lastCookie);
	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: describeColdState({
			freshBrowserContext: false,
			note: 'reload in the context that accepted, so the stored choice and the HTTP cache both carry over',
			usesManifestCache: true,
		}),
		fixtureCounts,
		samples: repeat,
		scenario: `${name}-repeat`,
		serverHtml: returningServerHtml,
		visit: 'saved-accept',
	});
	writeScenarioResult({
		browserVersion: browser.version(),
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'cookies and localStorage carried over from the accepting visit; cold HTTP cache',
			usesManifestCache: true,
		}),
		fixtureCounts,
		samples: returning,
		scenario: `${name}-returning`,
		serverHtml: returningServerHtml,
		visit: 'saved-accept',
	});
};

const run = async function run() {
	await ensureBuild();

	const env: NodeJS.ProcessEnv = {
		...process.env,
		[BENCH_BACKEND_LATENCY_ENV]: `${backendLatencyMs}`,
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
		if (runTypicalInstall) {
			await runTypicalInstallScenario(browser);
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
