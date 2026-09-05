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
import { reactBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
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

import { policyScenarios, runPolicyScenarios } from './policy-scenarios';

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
const PORT = 4311;
const BASE_URL = `http://${HOST}:${PORT}`;
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

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;
const selectedPolicyScenarios = scenarioFilter
	? policyScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: policyScenarios;

if (
	scenarioFilter &&
	scenarios.length === 0 &&
	selectedPolicyScenarios.length === 0
) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ${[
			...allScenarios.map((scenario) => scenario.name),
			...policyScenarios.map((scenario) => scenario.name),
		].join(', ')}.`
	);
}

const measureInteractionLatency = async function measureInteractionLatency(
	page: PlaywrightTypes.Page,
	scenario: (typeof allScenarios)[number]['name'] | 'repeat-visitor'
) {
	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (scenario) {
		case 'baseline': {
			// Zero-consent arm: measure a trivial interaction as the floor.
			const startedAt = performance.now();
			await page.click('#baseline-noop');
			return performance.now() - startedAt;
		}
		case 'full-ui': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onChoiceRecordedCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('[data-testid="consent-banner-accept-button"]');
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
			return performance.now() - startedAt;
		}
		case 'banner-css':
		case 'css-banner-modules': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onChoiceRecordedCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('[data-testid="consent-banner-accept-button"]');
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
			return performance.now() - startedAt;
		}
		case 'headless': {
			const before = await page.evaluate(
				() => window.__c15tReactBench?.onChoiceRecordedCount ?? 0
			);
			const startedAt = performance.now();
			await page.click('#headless-accept');
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

const getBannerInFirstHtml = async function getBannerInFirstHtml(
	path: string
): Promise<boolean> {
	const response = await fetch(`${BASE_URL}${path}`);
	const html = await response.text();
	return (
		html.includes(`data-testid="${bannerRootTestId}"`) ||
		html.includes(`data-testid='${bannerRootTestId}'`)
	);
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

const collectPageMetrics = async function collectPageMetrics(
	page: PlaywrightTypes.Page,
	scenario: string,
	bannerInFirstHtml: boolean
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

	return {
		...state,
		...navEntry,
		...scriptEntry,
		...cssEntry,
		...performanceObserverInfo,
		bannerInFirstHtml,
		bannerPaintMs:
			performanceObserverInfo.bannerPaintMs ?? state?.bannerPaintMs ?? null,
	};
};

type ReactBrowserSample = Awaited<ReturnType<typeof collectPageMetrics>> & {
	interactionLatencyMs?: number;
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

		await Array.from(scenarios).reduce<Promise<void>>(
			async (previousScenario, scenario) => {
				await previousScenario;
				const samples: ReactBrowserSample[] = [];
				const bannerInFirstHtml = await getBannerInFirstHtml(scenario.path);
				const iterationIndexes = Array.from(
					{ length: warmupIterations + iterations },
					(_, index) => index
				);
				await iterationIndexes.reduce<Promise<void>>(
					async (previousIteration, index) => {
						await previousIteration;
						const context = await browser.newContext({ baseURL: BASE_URL });
						const page = await context.newPage();
						await applyPageProfile(context, page);
						await page.goto(scenario.path);
						const metrics = await collectPageMetrics(
							page,
							scenario.name,
							bannerInFirstHtml
						);
						const interactionLatencyMs = await measureInteractionLatency(
							page,
							scenario.name
						);

						if (scenario.name === 'full-ui' && index >= warmupIterations) {
							const repeatContext = await browser.newContext({
								baseURL: BASE_URL,
							});
							const repeatPage = await repeatContext.newPage();
							await applyPageProfile(repeatContext, repeatPage);
							await repeatPage.goto(scenario.path);
							const repeatMetrics = await collectPageMetrics(
								repeatPage,
								scenario.name,
								bannerInFirstHtml
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

						if (index >= warmupIterations) {
							samples.push({
								...metrics,
								interactionLatencyMs,
							});
						}
						await context.close();
					},
					Promise.resolve()
				);

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
						budgetDefinitions: reactBrowserBudgetsForScenario(groupScenario),
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
						framework: 'react',
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
								'cssBytes',
								'bytes',
								groupedSamples.map((sample) => sample.cssBytes ?? 0)
							),
							summarizeMetric(
								'cssRequestCount',
								'count',
								groupedSamples.map((sample) => sample.cssRequestCount ?? 0)
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
						notes: [
							'React browser bench runs with local deterministic init and subject endpoints.',
						],
						package: '@c15t/react-browser-bench',
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
