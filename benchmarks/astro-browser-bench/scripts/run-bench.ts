#!/usr/bin/env node
/**
 * Astro browser benchmark runner.
 *
 * Same shape as `benchmarks/nuxt-browser-bench/scripts/run-bench.ts` and the
 * SvelteKit runner: same scenario names where they apply, same metrics, same
 * throttle profiles, same `BENCH_OUTPUT_DIR` convention and the same result
 * schema, so the gate report can put every suite in one table.
 *
 * Astro serializes the integration's options at build time, so a transport
 * cannot be picked per route. The runner therefore builds three variants of
 * one app — `manifest`, `hosted` and a zero-consent `baseline` with no c15t
 * integration at all — and serves each scenario from the variant it belongs
 * to. The baseline is the floor `consentTax = bannerVisible − floor`
 * subtracts.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
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

import type { BenchConsentFixtureCounts } from '../src/lib/fixture';
// Side-effect import: brings in the probe's `Window` augmentation so the
// page-context callbacks below are typed against the same shape.
import '../src/lib/bench-state';

type AstroBenchScenario =
	| 'baseline'
	| 'ssr'
	| 'ssr-manifest'
	| 'ssr-deferred'
	| 'repeat-visitor';

type AstroBenchBuild = 'baseline' | 'hosted' | 'manifest';

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
// Baked into every build as `C15T_BENCH_ORIGIN`: the fixture URLs the
// integration is configured with have to be absolute, because the shared
// URL resolver assumes https for a relative URL with no forwarded proto.
const PORT = 4353;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/astro';
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

const buildOutDirs: Record<AstroBenchBuild, string> = {
	baseline: 'dist-baseline',
	hosted: 'dist-hosted',
	manifest: 'dist',
};

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
	{ build: 'baseline', name: 'baseline', path: '/baseline' },
	{ build: 'hosted', name: 'ssr', path: '/ssr' },
	{ build: 'manifest', name: 'ssr-manifest', path: '/ssr-manifest' },
	{ build: 'manifest', name: 'ssr-deferred', path: '/ssr-deferred' },
	{ build: 'manifest', name: 'repeat-visitor', path: '/repeat-visitor' },
] as const satisfies readonly {
	build: AstroBenchBuild;
	name: AstroBenchScenario;
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
	scenario: AstroBenchScenario
) {
	if (scenario === 'baseline') {
		// Zero-consent arm: a trivial interaction is the floor.
		const startedAt = performance.now();
		await page.click('#baseline-noop');
		return performance.now() - startedAt;
	}

	if (scenario === 'repeat-visitor') {
		// No banner for a returning visitor, so the preference-centre island
		// is the only surface left — and it downloads on first open, which is
		// exactly the cost worth measuring.
		const startedAt = performance.now();
		await page.click('[data-testid="consent-dialog-trigger"]');
		await page.waitForFunction(
			() => window.__c15tAstroBench?.activeUI === 'dialog',
			undefined,
			{ timeout: 30_000 }
		);
		return performance.now() - startedAt;
	}

	const before = await page.evaluate(
		() => window.__c15tAstroBench?.onConsentSetCount ?? 0
	);
	const startedAt = performance.now();
	await page.click(`[data-testid="${bannerAcceptButtonTestId}"]`);
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tAstroBench;
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

	throw new Error('Timed out waiting for astro browser bench server');
};

const runBuild = async function runBuild(build: AstroBenchBuild) {
	return await createVoidDeferredPromise((resolvePromise, rejectPromise) => {
		const command = spawn('bun', ['run', 'build'], {
			cwd: appDir,
			env: {
				...process.env,
				C15T_BENCH_ASTRO_MODE: build,
				C15T_BENCH_ORIGIN: BASE_URL,
				C15T_BENCH_OUT_DIR: `./${buildOutDirs[build]}`,
			},
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
			rejectPromise(new Error(logs || `astro ${build} benchmark build failed`));
		});
		command.on('error', rejectPromise);
	});
};

const ensureBuild = async function ensureBuild(build: AstroBenchBuild) {
	if (existsSync(join(appDir, buildOutDirs[build], 'server', 'entry.mjs'))) {
		return;
	}
	await runBuild(build);
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
	scenario: AstroBenchScenario,
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
			const state = window.__c15tAstroBench;
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

	const state = await page.evaluate(() => window.__c15tAstroBench);
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

type AstroBrowserSample = Omit<
	Awaited<ReturnType<typeof collectScenarioMetrics>>,
	'scenario'
> & {
	scenario?: string;
	interactionLatencyMs?: number;
};

const budgetsForScenario = function budgetsForScenario(
	scenario: AstroBenchScenario
): MetricBudget[] {
	const shared = browserBudgets.filter((budget) =>
		[
			'bannerReadyMs',
			'lastAppScriptEndMs',
			'interactionLatencyMs',
			'longTaskTotalMs',
		].includes(budget.metric)
	);

	if (scenario === 'baseline') {
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

	// Every Astro arm is server-rendered and boots from the inlined config,
	// so none of them should ever put an init request on the browser.
	return [
		...shared,
		{
			comparator: 'count-eq',
			description:
				'Astro pages inline the resolved config, so the browser never calls init.',
			metric: 'initRequestsAfterLoad',
			threshold: 0,
		},
	];
};

const resetFixtureCounts = async function resetFixtureCounts(): Promise<void> {
	await fetch(`${BASE_URL}/api/bench-consent/stats`, {
		cache: 'no-store',
		method: 'POST',
	}).catch(() => undefined);
};

const readFixtureCounts =
	async function readFixtureCounts(): Promise<BenchConsentFixtureCounts> {
		try {
			const response = await fetch(`${BASE_URL}/api/bench-consent/stats`, {
				cache: 'no-store',
			});
			return (await response.json()) as BenchConsentFixtureCounts;
		} catch {
			return { init: 0, manifest: 0, subjects: 0 };
		}
	};

const startServer = function startServer(build: AstroBenchBuild) {
	const server = spawn(
		'node',
		[join(buildOutDirs[build], 'server', 'entry.mjs')],
		{
			cwd: appDir,
			env: {
				...process.env,
				C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
				HOST,
				PORT: `${PORT}`,
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

	return { readLogs: () => logs, server };
};

type ServerExit = [number | null, NodeJS.Signals | null];

const SIGKILL_GRACE_MS = 500;

/**
 * Terminates the child and waits for it to actually exit.
 *
 * `killed` only says SIGTERM was delivered, and `exitCode` stays `null`
 * until the process is gone — so reading either straight after the signal
 * both skips the SIGKILL escalation and reports a still-running server as a
 * failed one. This waits for the `exit` event instead, and classifies on
 * `signalCode` when there is no exit code, which is what a signalled
 * shutdown looks like.
 */
const awaitServerExit = async function awaitServerExit(
	child: ChildProcess
): Promise<ServerExit> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return [child.exitCode, child.signalCode];
	}
	const exited = once(child, 'exit') as Promise<ServerExit>;
	child.kill('SIGTERM');
	const graceful = await Promise.race([
		exited,
		sleep(SIGKILL_GRACE_MS).then(() => null),
	]);
	if (graceful) {
		return graceful;
	}
	child.kill('SIGKILL');
	return await exited;
};

const stopServer = async function stopServer(
	server: ReturnType<typeof startServer>
): Promise<Error | null> {
	const [exitCode, signalCode] = await awaitServerExit(server.server);
	if (exitCode !== null && !expectedServerShutdownCodes.has(exitCode)) {
		return new Error(
			`${server.readLogs() || 'Astro browser bench server failed'}\nUnexpected server exit code: ${exitCode}`
		);
	}
	if (
		exitCode === null &&
		signalCode !== null &&
		!expectedServerShutdownSignals.has(signalCode)
	) {
		return new Error(
			`${server.readLogs() || 'Astro browser bench server failed'}\nUnexpected server signal: ${signalCode}`
		);
	}
	return null;
};

const measureScenario = async function measureScenario(
	browser: PlaywrightTypes.Browser,
	scenario: (typeof allScenarios)[number]
): Promise<void> {
	const samples: AstroBrowserSample[] = [];
	await resetFixtureCounts();
	const iterationIndexes = Array.from(
		{ length: warmupIterations + iterations },
		(_, index) => index
	);
	await iterationIndexes.reduce<Promise<void>>(
		async (previousIteration, index) => {
			await previousIteration;
			// The counts ship as measured metadata, so they have to cover the
			// measured iterations only — otherwise changing `--warmup` alone
			// changes the reported request counts.
			if (index === warmupIterations) {
				await resetFixtureCounts();
			}
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
	if (iterations <= 0) {
		// No measured iteration ran, so the boundary reset above never
		// happened and the counts would be the warmup's.
		await resetFixtureCounts();
	}
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
		framework: 'astro',
		metadata: {
			bannerInFirstHtml: samples.every((sample) => sample.bannerInFirstHtml),
			bannerPaintMs: nullableMedian(
				samples.map((sample) => sample.bannerPaintMs)
			),
			build: scenario.build,
			cls: Number(median(samples.map((sample) => sample.cls ?? 0)).toFixed(4)),
			fixtureInitExecutions: fixtureCounts.init,
			fixtureManifestExecutions: fixtureCounts.manifest,
			fixtureSubjectExecutions: fixtureCounts.subjects,
			initLatencyMs,
			profile: throttleProfile,
			zeroConsentBaseline: scenario.name === 'baseline',
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
				samples.map((sample) => sample.sameOriginInitRequestsAfterLoad ?? 0)
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
			'Astro browser bench covers the server-rendered banner in manifest and hosted modes, the server:defer banner island, a pre-seeded repeat visitor, and a zero-consent baseline floor built without the c15t integration.',
			'The banner ships no framework JavaScript, so bannerPaintMs is the honest first-pixel measure; bannerVisibleMs is anchored on the probe module, which runs after HTML parse.',
		],
		package: '@c15t/astro-browser-bench',
		runtime: 'playwright',
		scenario: outputScenario,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'browser-runtime',
		timestamp: new Date().toISOString(),
	};

	writeJson(join(outputDir, resultFileName(scenario.name)), result);
};

const run = async function run() {
	const builds = [
		...new Set(scenarios.map((scenario) => scenario.build)),
	] as AstroBenchBuild[];
	await builds.reduce<Promise<void>>(async (previous, build) => {
		await previous;
		await ensureBuild(build);
	}, Promise.resolve());

	const browser = await chromium.launch({
		executablePath: chromiumExecutablePath,
		headless: true,
	});
	let failure: Error | null = null;

	try {
		// One server per build variant: only one of them can hold the port the
		// fixture URLs were baked against.
		await builds.reduce<Promise<void>>(async (previousBuild, build) => {
			await previousBuild;
			const server = startServer(build);
			try {
				await waitForServer();
				await scenarios
					.filter((scenario) => scenario.build === build)
					.reduce<Promise<void>>(async (previousScenario, scenario) => {
						await previousScenario;
						await measureScenario(browser, scenario);
					}, Promise.resolve());
			} finally {
				const stopFailure = await stopServer(server);
				failure ??= stopFailure;
			}
		}, Promise.resolve());
	} finally {
		await browser.close();
	}

	if (failure) {
		throw failure;
	}
};

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
