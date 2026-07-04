#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
	applyBenchThrottleProfile,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
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

type NuxtBenchScenario = 'ssr' | 'ssr-manifest' | 'client' | 'repeat-visitor';

interface NuxtBrowserBenchState {
	scenario: NuxtBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	onBannerFetchedMs?: number;
	cls?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
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
const serverEntryPath = join(appDir, '.output', 'server', 'index.mjs');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/browser-runtime/nuxt';
const expectedServerShutdownCodes = new Set([0, 137, 143]);
const expectedServerShutdownSignals = new Set(['SIGTERM', 'SIGKILL']);
const bannerRootTestId = 'consent-banner-root';
const bannerAcceptButtonTestId = 'consent-actions-accept-button';
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

const allScenarios = [
	{ name: 'ssr', path: '/ssr' },
	{ name: 'ssr-manifest', path: '/ssr-manifest' },
	{ name: 'client', path: '/client' },
	{ name: 'repeat-visitor', path: '/repeat-visitor' },
] as const satisfies ReadonlyArray<{
	name: NuxtBenchScenario;
	path: string;
}>;

const scenarios = scenarioFilter
	? allScenarios.filter((scenario) => scenario.name === scenarioFilter)
	: allScenarios;

if (scenarioFilter && scenarios.length === 0) {
	throw new Error(
		`Unsupported scenario "${scenarioFilter}". Expected ssr, ssr-manifest, client, or repeat-visitor.`
	);
}

async function measureInteractionLatency(
	page: import('playwright').Page,
	scenario: NuxtBenchScenario
) {
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
		() => window.__c15tNuxtBench?.onConsentSetCount ?? 0
	);
	const startedAt = performance.now();
	await page.click(`[data-testid="${bannerAcceptButtonTestId}"]`);
	await page.waitForFunction(
		(expected) => {
			const state = window.__c15tNuxtBench;
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

	throw new Error('Timed out waiting for nuxt browser bench server');
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
	if (existsSync(serverEntryPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'nuxt browser benchmark build');
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

async function seedRepeatVisitorCookie(
	context: import('playwright').BrowserContext
) {
	await context.addCookies([
		{
			name: 'c15t',
			value: repeatVisitorCookieValue,
			domain: HOST,
			path: '/',
			httpOnly: false,
			secure: false,
			sameSite: 'Lax',
			expires: Math.floor(Date.now() / 1000) + 60 * 60,
		},
	]);
}

async function getBannerInFirstHtml(path: string): Promise<boolean> {
	const response = await fetch(`${BASE_URL}${path}`);
	const html = await response.text();
	return (
		html.includes(`data-testid="${bannerRootTestId}"`) ||
		html.includes(`data-testid='${bannerRootTestId}'`)
	);
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
	scenario: NuxtBenchScenario,
	path: string,
	bannerInFirstHtml: boolean
) {
	let initRequests = 0;
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname.endsWith('/init')) {
			initRequests += 1;
		}
	});

	await page.goto(path);
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

	const state = await page.evaluate(() => window.__c15tNuxtBench);
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
	const performanceObserverInfo = await page.evaluate(() => {
		const metrics = window.__c15tBenchPerfMetrics;
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
	};
}

type NuxtBrowserSample = Awaited<ReturnType<typeof collectScenarioMetrics>> & {
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

	if (
		scenario === 'ssr' ||
		scenario === 'ssr-manifest' ||
		scenario === 'repeat-visitor'
	) {
		return [
			...shared,
			{
				metric: 'initRequestsAfterLoad',
				comparator: 'count-eq',
				threshold: 0,
				description:
					'SSR and repeat-visitor routes should not trigger browser-observed init requests.',
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
				'Client SPA flow should make exactly one init request on cold load.',
		},
	];
}

async function run() {
	await ensureBuild();

	const server = spawn('node', ['.output/server/index.mjs'], {
		cwd: appDir,
		env: {
			...process.env,
			C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
			HOST,
			PORT: `${PORT}`,
			NITRO_HOST: HOST,
			NITRO_PORT: `${PORT}`,
		},
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

		for (const scenario of scenarios) {
			const samples: NuxtBrowserSample[] = [];
			const bannerInFirstHtml = await getBannerInFirstHtml(scenario.path);
			for (let index = 0; index < warmupIterations + iterations; index += 1) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				if (scenario.name === 'repeat-visitor') {
					await seedRepeatVisitorCookie(context);
				}
				const page = await context.newPage();
				await applyPageProfile(context, page);
				const metrics = await collectScenarioMetrics(
					page,
					scenario.name,
					scenario.path,
					bannerInFirstHtml
				);
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
				await context.close();
			}

			const outputScenario = resultScenarioName(scenario.name);
			const result: BenchmarkResult = {
				schemaVersion: BENCHMARK_SCHEMA_VERSION,
				suite: 'browser-runtime',
				package: '@c15t/vue',
				framework: 'vue',
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
					bannerInFirstHtml: samples.every(
						(sample) => sample.bannerInFirstHtml
					),
					bannerPaintMs: nullableMedian(
						samples.map((sample) => sample.bannerPaintMs)
					),
					cls: Number(
						median(samples.map((sample) => sample.cls ?? 0)).toFixed(4)
					),
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
				budgetDefinitions: budgetsForScenario(scenario.name),
				budgets: [],
				notes: [
					'Nuxt browser bench covers SSR, client SPA, and pre-seeded repeat-visitor paths with local deterministic Nitro endpoints.',
				],
			};

			writeJson(join(outputDir, resultFileName(scenario.name)), result);
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
				`${logs || 'Nuxt browser bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode == null &&
			server.signalCode != null &&
			!expectedServerShutdownSignals.has(server.signalCode)
		) {
			serverFailure = new Error(
				`${logs || 'Nuxt browser bench server failed'}\nUnexpected server signal: ${server.signalCode}`
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
