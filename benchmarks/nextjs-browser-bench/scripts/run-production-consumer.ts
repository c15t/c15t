#!/usr/bin/env node
/**
 * Production-consumer bench: a Next.js App Router site built from packed or
 * published c15t artifacts, outside the workspace.
 *
 * Each arm installs one c15t build into its own consumer directory, builds
 * it with `next build` (Turbopack), and serves it with `next start`. Arms
 * are measured interleaved (ABBA) on the same routes and scenarios. The
 * consumer uses the documented aggregate stylesheet, a custom theme,
 * server-resolved consent from the cached manifest under a Suspense
 * boundary, and the deferred preference dialog, so duplicate stylesheets,
 * late banner chunks, and deferred-UI costs show up in the output.
 *
 * Usage (from benchmarks/nextjs-browser-bench):
 *   bunx tsx scripts/run-production-consumer.ts \
 *     --arm base=root:/path/to/c15t-base --arm head=workspace \
 *     --iterations 7 --warmup 1 --profile mobile --init-latency-ms 200
 */
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type {
	BenchPerfMetrics,
	BenchScriptResourceMetrics,
	BenchStylesheetResource,
	readBenchNavigationTiming,
} from '@c15t/benchmarking/browser';
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	benchPerfMetricsExpression,
	benchScriptResourceExpression,
	benchStylesheetResourcesExpression,
	installBenchPerformanceObservers,
	parseBenchInitLatencyMs,
	parseBenchThrottleProfile,
} from '@c15t/benchmarking/browser';
import {
	analyzeServerHtmlStream,
	bannerMarkupMarkers,
	readServerHtmlStream,
	toCookieHeader,
} from '@c15t/benchmarking/html-stream';
import type { ServerHtmlStreamAnalysis } from '@c15t/benchmarking/html-stream';
import {
	buildBrowserBenchManifest,
	loadBrowserBenchInit,
} from '@c15t/benchmarking/policy-fixtures';
import {
	consumerPackageJson,
	consumerScenarios,
	interleaveArms,
	packedTarballName,
	parseConsumerArm,
	workspaceDependencyClosure,
} from '@c15t/benchmarking/production-consumer';
import type {
	ConsumerArm,
	ConsumerScenarioDefinition,
	WorkspacePackageInfo,
} from '@c15t/benchmarking/production-consumer';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type {
	BenchmarkResult,
	MetricSampleSet,
} from '@c15t/benchmarking/schema';
import { findStylesheetOverlap } from '@c15t/benchmarking/stylesheet-overlap';
import type { StylesheetOverlap } from '@c15t/benchmarking/stylesheet-overlap';
import {
	getEnvironment,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import {
	assertVisitBannerState,
	coldStateMetadata,
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
const benchDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(benchDir, '../..');
const templateDir = join(benchDir, 'production-consumer', 'template');
const bannerRootTestId = 'consent-banner-root';
const bannerElementTimingName = 'c15t-consent-banner';
const manifestTokenHeader = 'x-c15t-bench-manifest-token';

const readCliFlags = function readCliFlags(name: string): string[] {
	const values: string[] = [];
	for (const [index, arg] of process.argv.entries()) {
		if (arg === name && process.argv[index + 1] !== undefined) {
			values.push(process.argv[index + 1] as string);
		} else if (arg.startsWith(`${name}=`)) {
			values.push(arg.slice(name.length + 1));
		}
	}
	return values;
};
const readCliFlag = (name: string): string | undefined =>
	readCliFlags(name).at(-1);
const hasCliFlag = (name: string): boolean => process.argv.includes(name);

const arms: ConsumerArm[] = (
	readCliFlags('--arm').length > 0 ? readCliFlags('--arm') : ['head=workspace']
).map((spec) => parseConsumerArm(spec));
if (new Set(arms.map((arm) => arm.label)).size !== arms.length) {
	throw new Error('Arm labels must be unique.');
}
const workRoot = resolve(
	readCliFlag('--work-dir') ?? join(tmpdir(), 'c15t-production-consumer')
);
const outputDir = resolve(
	readCliFlag('--output-dir') ??
		process.env.BENCH_OUTPUT_DIR ??
		join(repoRoot, '.benchmarks/current/production-consumer')
);
const iterations = Number(readCliFlag('--iterations') ?? '7');
const warmupIterations = Number(readCliFlag('--warmup') ?? '1');
const throttleProfile = parseBenchThrottleProfile(
	readCliFlag('--profile') ?? process.env.C15T_BENCH_PROFILE
);
const initLatencyMs = parseBenchInitLatencyMs(
	readCliFlag('--init-latency-ms') ?? process.env.C15T_BENCH_INIT_LATENCY_MS
);
const portBase = Number(readCliFlag('--port-base') ?? '4620');
const routes = (readCliFlag('--routes') ?? '/,/docs')
	.split(',')
	.map((route) => route.trim())
	.filter(Boolean);
const scenarioFilter = readCliFlag('--scenarios')
	?.split(',')
	.map((name) => name.trim());
const selectedScenarios = scenarioFilter
	? consumerScenarios.filter((scenario) =>
			scenarioFilter.includes(scenario.name)
		)
	: consumerScenarios;
if (scenarioFilter && selectedScenarios.length !== scenarioFilter.length) {
	throw new Error(
		`Unknown scenario in --scenarios. Expected any of ${consumerScenarios
			.map((scenario) => scenario.name)
			.join(', ')}.`
	);
}
const prepareOnly = hasCliFlag('--prepare-only');
const skipPrepare = hasCliFlag('--skip-prepare');
const nextVersion = readCliFlag('--next-version') ?? '16.2.10';
const reactVersion = readCliFlag('--react-version') ?? '19.2.7';

// ---------------------------------------------------------------------------
// Preparing a consumer
// ---------------------------------------------------------------------------

const run = function run(
	command: string,
	args: string[],
	cwd: string,
	logPath?: string
): void {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
		maxBuffer: 64 * 1024 * 1024,
	});
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	if (logPath) {
		writeFileSync(logPath, output);
	}
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed in ${cwd} (exit ${result.status}).\n${output.slice(-4000)}`
		);
	}
};

const readWorkspacePackages = function readWorkspacePackages(
	root: string
): Map<string, WorkspacePackageInfo> {
	const packagesDir = join(root, 'packages');
	const packages = new Map<string, WorkspacePackageInfo>();
	for (const entry of readdirSync(packagesDir)) {
		const manifestPath = join(packagesDir, entry, 'package.json');
		if (!existsSync(manifestPath)) {
			continue;
		}
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Omit<
			WorkspacePackageInfo,
			'dir'
		>;
		packages.set(manifest.name, {
			...manifest,
			dir: join(packagesDir, entry),
		});
	}
	return packages;
};

/** Pack `c15t` and its workspace dependencies from a built checkout. */
const packCheckout = function packCheckout(
	root: string,
	destination: string
): Map<string, string> {
	const closure = workspaceDependencyClosure(
		readWorkspacePackages(root),
		'c15t'
	);
	const missingBuilds = closure.filter(
		(info) => !existsSync(join(info.dir, 'dist'))
	);
	if (missingBuilds.length > 0) {
		throw new Error(
			`Build ${root} first (bun turbo run build --filter=c15t...). Missing dist/ in: ${missingBuilds
				.map((info) => info.name)
				.join(', ')}`
		);
	}
	mkdirSync(destination, { recursive: true });
	const tarballs = new Map<string, string>();
	for (const info of closure) {
		run(
			'bun',
			['pm', 'pack', '--destination', destination, '--quiet'],
			info.dir
		);
		const file = join(destination, packedTarballName(info.name, info.version));
		if (!existsSync(file)) {
			throw new Error(`bun pm pack did not produce ${file}`);
		}
		tarballs.set(info.name, file);
	}
	return tarballs;
};

/** Map pre-packed tarballs to package names by reading their manifests. */
const readTarballDir = function readTarballDir(
	dir: string
): Map<string, string> {
	const tarballs = new Map<string, string>();
	for (const entry of readdirSync(dir).filter((name) =>
		name.endsWith('.tgz')
	)) {
		const file = resolve(dir, entry);
		const result = spawnSync('tar', ['-xOzf', file, 'package/package.json'], {
			encoding: 'utf8',
		});
		if (result.status !== 0) {
			throw new Error(`Could not read package.json from ${file}`);
		}
		const { name } = JSON.parse(result.stdout) as { name: string };
		tarballs.set(name, file);
	}
	return tarballs;
};

const sha256 = (file: string): string =>
	createHash('sha256').update(readFileSync(file)).digest('hex');

const consumerDir = (arm: ConsumerArm): string => join(workRoot, arm.label);

interface ArmProvenance {
	label: string;
	source: string;
	installedC15tVersion: string;
	nextVersion: string;
	tarballs: string[];
	buildMs: number;
}

const describeSource = function describeSource(arm: ConsumerArm): string {
	switch (arm.source.kind) {
		case 'workspace': {
			return `workspace ${repoRoot} @ ${safeCommitSha()}${safeGitDirty() ? ' (dirty)' : ''}`;
		}
		case 'root': {
			return `checkout ${resolve(arm.source.path)}`;
		}
		case 'tarballs': {
			return `tarballs ${resolve(arm.source.dir)}`;
		}
		case 'npm': {
			return `npm c15t@${arm.source.version}`;
		}
		default: {
			return 'unknown';
		}
	}
};

const prepareArm = async function prepareArm(
	arm: ConsumerArm
): Promise<ArmProvenance> {
	const dir = consumerDir(arm);
	const provenancePath = join(dir, 'provenance.json');
	if (skipPrepare) {
		if (!existsSync(provenancePath)) {
			throw new Error(
				`--skip-prepare: ${dir} has no prepared consumer. Run without it first.`
			);
		}
		return JSON.parse(readFileSync(provenancePath, 'utf8')) as ArmProvenance;
	}

	rmSync(dir, { force: true, recursive: true });
	mkdirSync(dir, { recursive: true });
	cpSync(templateDir, dir, { recursive: true });

	let tarballs: Map<string, string> | undefined;
	const tarballDir = join(dir, 'tarballs');
	if (arm.source.kind === 'workspace') {
		tarballs = packCheckout(repoRoot, tarballDir);
	} else if (arm.source.kind === 'root') {
		tarballs = packCheckout(resolve(arm.source.path), tarballDir);
	} else if (arm.source.kind === 'tarballs') {
		tarballs = readTarballDir(resolve(arm.source.dir));
	}

	const manifest = await buildBrowserBenchManifest();
	mkdirSync(join(dir, 'fixture'), { recursive: true });
	writeFileSync(
		join(dir, 'fixture', 'manifest.json'),
		JSON.stringify(manifest)
	);
	writeFileSync(
		join(dir, 'fixture', 'init.json'),
		JSON.stringify(await loadBrowserBenchInit(Promise.resolve(manifest)))
	);
	writeFileSync(
		join(dir, 'package.json'),
		`${JSON.stringify(
			consumerPackageJson({
				c15tVersion: arm.source.kind === 'npm' ? arm.source.version : undefined,
				nextVersion,
				reactVersion,
				tarballs,
				typesNodeVersion: '22.19.11',
				typesReactDomVersion: '19.2.3',
				typesReactVersion: '19.2.17',
				typescriptVersion: '6.0.3',
			}),
			null,
			'\t'
		)}\n`
	);

	console.log(`[${arm.label}] installing into ${dir}`);
	run('bun', ['install'], dir, join(dir, 'install.log'));
	console.log(`[${arm.label}] building`);
	const buildStartedAt = performance.now();
	run('bun', ['run', 'build'], dir, join(dir, 'build.log'));
	const buildMs = Math.round(performance.now() - buildStartedAt);

	const installed = JSON.parse(
		readFileSync(join(dir, 'node_modules', 'c15t', 'package.json'), 'utf8')
	) as { version: string };
	const provenance: ArmProvenance = {
		buildMs,
		installedC15tVersion: installed.version,
		label: arm.label,
		nextVersion,
		source: describeSource(arm),
		tarballs: [...(tarballs ?? new Map<string, string>()).entries()].map(
			([name, file]) => `${name} ${sha256(file)}`
		),
	};
	writeFileSync(provenancePath, `${JSON.stringify(provenance, null, '\t')}\n`);
	return provenance;
};

// ---------------------------------------------------------------------------
// Serving
// ---------------------------------------------------------------------------

interface ArmServer {
	arm: ConsumerArm;
	port: number;
	baseUrl: string;
	process: ChildProcess | null;
	logs: string;
}

const waitForReady = async function waitForReady(
	server: ArmServer
): Promise<void> {
	for (let attempt = 0; attempt < 240; attempt += 1) {
		try {
			// Poll the fixture API, not a page, so no page request warms the
			// SDK manifest cache or the page route before a cold-process sample.
			// oxlint-disable-next-line no-await-in-loop -- Polling.
			const response = await fetch(
				`${server.baseUrl}/api/bench-consent/stats`,
				{ cache: 'no-store' }
			);
			if (response.ok) {
				return;
			}
		} catch {
			// Server still starting.
		}
		// oxlint-disable-next-line no-await-in-loop -- Polling.
		await sleep(100);
	}
	throw new Error(
		`[${server.arm.label}] server did not become ready.\n${server.logs.slice(-4000)}`
	);
};

const startServer = async function startServer(
	server: ArmServer
): Promise<void> {
	const dir = consumerDir(server.arm);
	server.logs = '';
	const child = spawn(
		'node',
		[
			join(dir, 'node_modules', 'next', 'dist', 'bin', 'next'),
			'start',
			'-H',
			HOST,
			'-p',
			`${server.port}`,
		],
		{
			cwd: dir,
			env: {
				...process.env,
				C15T_BENCH_INIT_LATENCY_MS: `${initLatencyMs}`,
				NEXT_TELEMETRY_DISABLED: '1',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);
	child.stdout?.on('data', (chunk) => {
		server.logs += String(chunk);
	});
	child.stderr?.on('data', (chunk) => {
		server.logs += String(chunk);
	});
	server.process = child;
	await waitForReady(server);
};

/**
 * Request every route once without a browser, so the page routes are loaded
 * and the SDK manifest cache is filled before a warm-process sample.
 */
const warmServer = async function warmServer(server: ArmServer): Promise<void> {
	for (const route of routes) {
		// oxlint-disable-next-line no-await-in-loop -- One route at a time.
		const response = await fetch(`${server.baseUrl}${route}`, {
			cache: 'no-store',
		});
		// oxlint-disable-next-line no-await-in-loop -- Drain the stream.
		await response.text();
		if (!response.ok) {
			throw new Error(
				`[${server.arm.label}] warming ${route} returned ${response.status}`
			);
		}
	}
};

const stopServer = async function stopServer(server: ArmServer): Promise<void> {
	const child = server.process;
	server.process = null;
	if (!child || child.exitCode !== null || child.signalCode !== null) {
		return;
	}
	child.kill('SIGTERM');
	try {
		await once(child, 'exit', { signal: AbortSignal.timeout(2000) });
	} catch {
		child.kill('SIGKILL');
	}
};

interface FixtureCounts {
	init: number;
	manifest: number;
	subjects: number;
	sessions: number;
}

const readFixtureCounts = async function readFixtureCounts(
	server: ArmServer
): Promise<FixtureCounts> {
	const response = await fetch(`${server.baseUrl}/api/bench-consent/stats`, {
		cache: 'no-store',
	});
	return (await response.json()) as FixtureCounts;
};

// ---------------------------------------------------------------------------
// Measuring one visit
// ---------------------------------------------------------------------------

/** Mirrors `ConsumerProbeState` in the template's `app/probe.tsx`. */
interface ProbeState {
	activeUI: string;
	hasStoredChoice: boolean;
	bannerReadyMs?: number;
	promptSettledMs?: number;
	onChoiceRecordedCount: number;
}

declare global {
	interface Window {
		__c15tConsumerBench?: ProbeState;
	}
}

interface VisitSample {
	activeUI: string;
	hasStoredChoice: boolean;
	bannerCount: number;
	bannerReadyMs: number | null;
	promptSettledMs: number | null;
	perf: BenchPerfMetrics;
	nav: Awaited<ReturnType<typeof readBenchNavigationTiming>>;
	scripts: BenchScriptResourceMetrics | null;
	stylesheets: BenchStylesheetResource[];
	dialogOpenMs: number | null;
	stylesheetsAfterDialog: BenchStylesheetResource[] | null;
	serverManifestFetches: number;
	serverInitCalls: number;
	browserInitRequests: number;
	browserManifestRequests: number;
	consoleErrors: string[];
}

type StorageState = Awaited<
	ReturnType<PlaywrightTypes.BrowserContext['storageState']>
>;

const newProfiledPage = async function newProfiledPage(
	context: PlaywrightTypes.BrowserContext
): Promise<PlaywrightTypes.Page> {
	const page = await context.newPage();
	const session = await context.newCDPSession(page);
	await applyBenchThrottleProfile(session, throttleProfile);
	await installBenchPerformanceObservers(page, {
		bannerElementTimingName,
		bannerRootTestId,
	});
	return page;
};

const waitForProbe = async function waitForProbe(
	page: PlaywrightTypes.Page,
	mode: 'banner' | 'settled'
) {
	await page.waitForFunction(
		(target) => {
			const state = window.__c15tConsumerBench;
			if (!state) {
				return false;
			}
			return target === 'banner'
				? typeof state.bannerReadyMs === 'number'
				: typeof state.promptSettledMs === 'number';
		},
		mode,
		{ timeout: 60_000 }
	);
};

/** Open the deferred dialog and time input to a visible dialog root. */
const openDialog = async function openDialog(
	page: PlaywrightTypes.Page,
	trigger: string
): Promise<number> {
	const startedAt = performance.now();
	await page.click(trigger);
	await page.waitForFunction(
		() => {
			const root = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			if (!(root instanceof HTMLElement)) {
				return false;
			}
			const rect = root.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		},
		undefined,
		{ timeout: 30_000 }
	);
	return performance.now() - startedAt;
};

const measureVisit = async function measureVisit(
	server: ArmServer,
	page: PlaywrightTypes.Page,
	route: string,
	scenario: ConsumerScenarioDefinition
): Promise<VisitSample> {
	let browserInitRequests = 0;
	let browserManifestRequests = 0;
	const consoleErrors: string[] = [];
	page.on('request', (request) => {
		const { pathname } = new URL(request.url());
		if (pathname.endsWith('/init')) {
			browserInitRequests += 1;
		}
		if (pathname.endsWith('/manifest')) {
			browserManifestRequests += 1;
		}
	});
	page.on('console', (message) => {
		if (message.type() === 'error') {
			consoleErrors.push(message.text());
		}
	});
	page.on('pageerror', (error) => consoleErrors.push(error.message));

	const before = await readFixtureCounts(server);
	await page.goto(`${server.baseUrl}${route}`);
	await waitForProbe(page, scenario.visit === 'fresh' ? 'banner' : 'settled');
	await page.waitForLoadState('load');
	await page.waitForTimeout(250);
	const after = await readFixtureCounts(server);

	const state = (await page.evaluate(
		() => window.__c15tConsumerBench
	)) as ProbeState;
	const bannerCount = await page
		.locator(`[data-testid="${bannerRootTestId}"]`)
		.count();
	assertVisitBannerState({
		activeUI: state.activeUI,
		bannerCount,
		hasStoredChoice:
			scenario.visit === 'fresh' ? undefined : state.hasStoredChoice,
		scenario: `${server.arm.label} ${route} ${scenario.name}`,
		visit: scenario.visit,
	});

	const sample: VisitSample = {
		activeUI: state.activeUI,
		bannerCount,
		bannerReadyMs: state.bannerReadyMs ?? null,
		browserInitRequests,
		browserManifestRequests,
		consoleErrors,
		dialogOpenMs: null,
		hasStoredChoice: state.hasStoredChoice,
		nav: (await page.evaluate(benchNavigationTimingExpression)) as Awaited<
			ReturnType<typeof readBenchNavigationTiming>
		>,
		perf: (await page.evaluate(benchPerfMetricsExpression)) as BenchPerfMetrics,
		promptSettledMs: state.promptSettledMs ?? null,
		scripts: (await page.evaluate(
			benchScriptResourceExpression
		)) as BenchScriptResourceMetrics | null,
		serverInitCalls: after.init - before.init,
		serverManifestFetches: after.manifest - before.manifest,
		stylesheets: (await page.evaluate(
			benchStylesheetResourcesExpression
		)) as BenchStylesheetResource[],
		stylesheetsAfterDialog: null,
	};

	if (scenario.opensDialog) {
		sample.dialogOpenMs = await openDialog(
			page,
			scenario.visit === 'fresh'
				? '[data-testid="consent-banner-customize-button"]'
				: '#open-preferences'
		);
		await page.waitForTimeout(250);
		sample.stylesheetsAfterDialog = (await page.evaluate(
			benchStylesheetResourcesExpression
		)) as BenchStylesheetResource[];
	}
	return sample;
};

/** Unmeasured visit that records a choice and returns the storage. */
const recordChoice = async function recordChoice(
	browser: PlaywrightTypes.Browser,
	server: ArmServer,
	route: string,
	action: 'accept' | 'reject'
): Promise<StorageState> {
	const context = await browser.newContext();
	try {
		const page = await context.newPage();
		await page.goto(`${server.baseUrl}${route}`);
		await waitForProbe(page, 'banner');
		await page.click(`[data-testid="consent-banner-${action}-button"]`);
		await page.waitForFunction(
			() => {
				const state = window.__c15tConsumerBench;
				return (
					!!state &&
					state.onChoiceRecordedCount > 0 &&
					state.activeUI === 'none'
				);
			},
			undefined,
			{ timeout: 30_000 }
		);
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

let manifestTokenCounter = 0;
const nextManifestToken = (): string => {
	manifestTokenCounter += 1;
	return `${Date.now()}-${manifestTokenCounter}`;
};

/** Run one sample of a scenario on a route and return it. */
const takeSample = async function takeSample(
	browser: PlaywrightTypes.Browser,
	server: ArmServer,
	route: string,
	scenario: ConsumerScenarioDefinition,
	savedCookies: Map<string, string | undefined>
): Promise<VisitSample> {
	switch (scenario.name) {
		case 'fresh-warm-browser-cache': {
			const context = await browser.newContext();
			try {
				const warmPage = await context.newPage();
				await warmPage.goto(`${server.baseUrl}${route}`);
				await waitForProbe(warmPage, 'banner');
				await warmPage.evaluate(() => localStorage.clear());
				await context.clearCookies();
				await warmPage.close();
				const page = await newProfiledPage(context);
				return await measureVisit(server, page, route, scenario);
			} finally {
				await context.close();
			}
		}
		case 'fresh-cold-sdk-manifest': {
			const context = await browser.newContext({
				extraHTTPHeaders: { [manifestTokenHeader]: nextManifestToken() },
			});
			try {
				const page = await newProfiledPage(context);
				return await measureVisit(server, page, route, scenario);
			} finally {
				await context.close();
			}
		}
		case 'fresh-cold-process': {
			await stopServer(server);
			await startServer(server);
			const context = await browser.newContext();
			try {
				const page = await newProfiledPage(context);
				return await measureVisit(server, page, route, scenario);
			} finally {
				await context.close();
				// Later scenarios are labelled warm-process.
				await warmServer(server);
			}
		}
		case 'saved-consent-accept':
		case 'saved-consent-reject': {
			const storageState = await recordChoice(
				browser,
				server,
				route,
				scenario.name === 'saved-consent-accept' ? 'accept' : 'reject'
			);
			savedCookies.set(
				`${route} ${scenario.name}`,
				toCookieHeader(storageState.cookies)
			);
			const context = await browser.newContext({ storageState });
			try {
				const page = await newProfiledPage(context);
				return await measureVisit(server, page, route, scenario);
			} finally {
				await context.close();
			}
		}
		default: {
			const context = await browser.newContext();
			try {
				const page = await newProfiledPage(context);
				return await measureVisit(server, page, route, scenario);
			} finally {
				await context.close();
			}
		}
	}
};

// ---------------------------------------------------------------------------
// Server HTML and stylesheet analysis
// ---------------------------------------------------------------------------

const readServerHtml = async function readServerHtml(
	server: ArmServer,
	route: string,
	scenario: ConsumerScenarioDefinition,
	cookie: string | undefined
): Promise<ServerHtmlStreamAnalysis[]> {
	const reads: ServerHtmlStreamAnalysis[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const headers: Record<string, string> =
			scenario.name === 'fresh-cold-sdk-manifest'
				? { [manifestTokenHeader]: nextManifestToken() }
				: {};
		// oxlint-disable-next-line no-await-in-loop -- Sequential reads keep timings independent.
		const capture = await readServerHtmlStream(`${server.baseUrl}${route}`, {
			cookie,
			headers,
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

const stylesheetOverlap = async function stylesheetOverlap(
	stylesheets: BenchStylesheetResource[]
): Promise<StylesheetOverlap> {
	const unique = [...new Set(stylesheets.map((sheet) => sheet.url))];
	const texts = await Promise.all(
		unique.map(async (url) => ({
			text: await (await fetch(url)).text(),
			url,
		}))
	);
	return findStylesheetOverlap(texts);
};

/**
 * Server HTML reads and stylesheet overlap for one arm, route, and scenario,
 * run after sampling so they cannot warm anything a sample measures.
 */
const analyzeScenario = async function analyzeScenario(
	server: ArmServer,
	route: string,
	scenario: ConsumerScenarioDefinition,
	last: VisitSample | undefined,
	cookie: string | undefined
): Promise<{
	serverHtml: ServerHtmlStreamAnalysis[];
	overlap: StylesheetOverlap | null;
	overlapAfterDialog: StylesheetOverlap | null;
}> {
	const serverHtml = scenario.readsServerHtml
		? await readServerHtml(server, route, scenario, cookie)
		: [];
	const overlap = last ? await stylesheetOverlap(last.stylesheets) : null;
	const overlapAfterDialog = last?.stylesheetsAfterDialog
		? await stylesheetOverlap(last.stylesheetsAfterDialog)
		: null;
	return { overlap, overlapAfterDialog, serverHtml };
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const cssBytes = (
	sheets: BenchStylesheetResource[] | null,
	field: keyof BenchStylesheetResource
) =>
	sheets
		? sheets.reduce((sum, sheet) => sum + Number(sheet[field] || 0), 0)
		: null;

const routeSlug = (route: string): string =>
	route === '/' ? 'home' : route.replace(/^\//u, '').replaceAll('/', '-');

const summarizeSamples = function summarizeSamples(
	samples: VisitSample[]
): MetricSampleSet[] {
	return [
		summarizeNullableMetric(
			'ttfbMs',
			'ms',
			samples.map((sample) => sample.nav?.ttfbMs ?? null)
		),
		summarizeNullableMetric(
			'domContentLoadedMs',
			'ms',
			samples.map((sample) => sample.nav?.domContentLoadedMs ?? null)
		),
		...summarizeVisitTimingMetrics(samples.map((sample) => sample.perf)),
		summarizeNullableMetric(
			'bannerPaintMs',
			'ms',
			samples.map((sample) => sample.perf.bannerPaintMs)
		),
		summarizeNullableMetric(
			'bannerReadyMs',
			'ms',
			samples.map((sample) => sample.bannerReadyMs)
		),
		summarizeNullableMetric(
			'promptSettledMs',
			'ms',
			samples.map((sample) => sample.promptSettledMs)
		),
		summarizeMetric(
			'cls',
			'ratio',
			samples.map((sample) => sample.perf.cls)
		),
		summarizeMetric(
			'longTaskTotalMs',
			'ms',
			samples.map((sample) => sample.perf.longTaskTotalMs)
		),
		summarizeMetric(
			'cssAssetCount',
			'count',
			samples.map((sample) => sample.stylesheets.length)
		),
		summarizeMetric(
			'cssEncodedBytes',
			'bytes',
			samples.map(
				(sample) => cssBytes(sample.stylesheets, 'encodedBodySize') ?? 0
			)
		),
		summarizeMetric(
			'cssDecodedBytes',
			'bytes',
			samples.map(
				(sample) => cssBytes(sample.stylesheets, 'decodedBodySize') ?? 0
			)
		),
		summarizeMetric(
			'cssTransferBytes',
			'bytes',
			samples.map((sample) => cssBytes(sample.stylesheets, 'transferSize') ?? 0)
		),
		summarizeMetric(
			'jsAssetCount',
			'count',
			samples.map((sample) => sample.scripts?.appScriptCount ?? 0)
		),
		summarizeMetric(
			'jsTransferBytes',
			'bytes',
			samples.map((sample) => sample.scripts?.jsBytes ?? 0)
		),
		summarizeNullableMetric(
			'dialogOpenMs',
			'ms',
			samples.map((sample) => sample.dialogOpenMs)
		),
		summarizeNullableMetric(
			'cssAssetCountAfterDialog',
			'count',
			samples.map((sample) => sample.stylesheetsAfterDialog?.length ?? null)
		),
		summarizeNullableMetric(
			'cssEncodedBytesAfterDialog',
			'bytes',
			samples.map((sample) =>
				cssBytes(sample.stylesheetsAfterDialog, 'encodedBodySize')
			)
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
			'serverManifestFetches',
			'count',
			samples.map((sample) => sample.serverManifestFetches)
		),
		summarizeMetric(
			'serverInitCalls',
			'count',
			samples.map((sample) => sample.serverInitCalls)
		),
		summarizeMetric(
			'browserInitRequests',
			'count',
			samples.map((sample) => sample.browserInitRequests)
		),
		summarizeMetric(
			'browserManifestRequests',
			'count',
			samples.map((sample) => sample.browserManifestRequests)
		),
		summarizeMetric(
			'consoleErrorCount',
			'count',
			samples.map((sample) => sample.consoleErrors.length)
		),
	];
};

const describeStylesheets = function describeStylesheets(
	sheets: BenchStylesheetResource[] | null | undefined,
	overlap: StylesheetOverlap | null
): string[] {
	if (!sheets) {
		return [];
	}
	return sheets.map((sheet) => {
		const shared = overlap?.assets.find((asset) => asset.url === sheet.url);
		const path = new URL(sheet.url).pathname;
		return `${path} encoded=${sheet.encodedBodySize} decoded=${sheet.decodedBodySize}${shared ? ` classes=${shared.classCount} sharedClasses=${shared.sharedClassCount}` : ''}`;
	});
};

interface ScenarioOutput {
	arm: string;
	route: string;
	scenario: ConsumerScenarioDefinition;
	result: BenchmarkResult;
}

const buildResult = function buildResult(input: {
	provenance: ArmProvenance;
	route: string;
	scenario: ConsumerScenarioDefinition;
	samples: VisitSample[];
	serverHtml: ServerHtmlStreamAnalysis[];
	overlap: StylesheetOverlap | null;
	overlapAfterDialog: StylesheetOverlap | null;
	browserVersion: string;
}): BenchmarkResult {
	const last = input.samples.at(-1);
	const scenarioName = `production-consumer:${routeSlug(input.route)}:${input.scenario.name}`;
	return {
		budgetDefinitions: [],
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(input.browserVersion),
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: scenarioName,
			scriptCount: 0,
			themeComplexity: 'complex',
		},
		framework: 'nextjs',
		metadata: {
			...coldStateMetadata(input.scenario.coldState),
			...serverHtmlMetadata(input.serverHtml),
			arm: input.provenance.label,
			armSource: input.provenance.source,
			consoleErrors: input.samples.flatMap((sample) => sample.consoleErrors),
			cssSharedClassCount: input.overlap?.sharedClassCount ?? null,
			cssSharedClassCountAfterDialog:
				input.overlapAfterDialog?.sharedClassCount ?? null,
			cssSharedClassSample: input.overlap?.sharedClassSample ?? [],
			gitDirty: safeGitDirty(),
			initLatencyMs,
			installedC15tVersion: input.provenance.installedC15tVersion,
			nextVersion: input.provenance.nextVersion,
			profile: throttleProfile,
			route: input.route,
			stylesheets: describeStylesheets(last?.stylesheets, input.overlap),
			stylesheetsAfterDialog: describeStylesheets(
				last?.stylesheetsAfterDialog,
				input.overlapAfterDialog
			),
			tarballs: input.provenance.tarballs,
			visit: input.scenario.visit,
		},
		metrics: [
			...summarizeSamples(input.samples),
			...summarizeServerHtmlMetrics(input.serverHtml),
		],
		notes: [
			'Next.js App Router consumer installed from packed or published c15t artifacts outside the workspace: aggregate stylesheet, custom theme, server consent from the cached manifest inside a Suspense boundary, deferred preference dialog.',
			`Visit: ${input.scenario.visit}. Cold state: ${input.scenario.coldState.setup}.`,
			'cssEncodedBytes sums Resource Timing encodedBodySize (compressed body) over every stylesheet; cssAssetCount counts them. cssSharedClassCount counts class selectors defined by more than one loaded stylesheet.',
			'serverManifestFetches counts fixture-origin /manifest requests during the visit, so a warm SDK manifest cache reads 0.',
			...visitMetricGlossary,
		],
		package: '@c15t/nextjs-production-consumer-bench',
		runtime: 'playwright',
		scenario: scenarioName,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'browser-runtime',
		timestamp: new Date().toISOString(),
	};
};

const formatMedian = (metric: MetricSampleSet | undefined): string => {
	if (!metric || metric.median === null || metric.median === undefined) {
		return 'n/a';
	}
	const numbers = metric.samples.filter(
		(value): value is number => typeof value === 'number'
	);
	const low = Math.min(...numbers);
	const high = Math.max(...numbers);
	const round = (value: number) =>
		Number.isInteger(value) ? String(value) : value.toFixed(1);
	return low === high
		? round(metric.median)
		: `${round(metric.median)} (${round(low)}–${round(high)})`;
};

const summaryColumns = [
	'ttfbMs',
	'fcpMs',
	'lcpMs',
	'bannerDomMs',
	'bannerPaintMs',
	'bannerReadyMs',
	'bannerInFirstChunk',
	'bannerInServerHtml',
	'cssAssetCount',
	'cssEncodedBytes',
	'dialogOpenMs',
	'serverManifestFetches',
] as const;

const toMarkdown = function toMarkdown(
	outputs: ScenarioOutput[],
	provenance: ArmProvenance[]
): string {
	const lines = [
		'# Production consumer bench',
		'',
		`Profile ${throttleProfile}, injected consent-origin latency ${initLatencyMs} ms, ${iterations} measured samples plus ${warmupIterations} warm-up per arm, arms interleaved. Medians with (min–max).`,
		'',
		'| Arm | Source | c15t | Next |',
		'| --- | --- | --- | --- |',
		...provenance.map(
			(arm) =>
				`| ${arm.label} | ${arm.source} | ${arm.installedC15tVersion} | ${arm.nextVersion} |`
		),
		'',
		`| Route | Scenario | Arm | ${summaryColumns.join(' | ')} | Cold state |`,
		`| --- | --- | --- | ${summaryColumns.map(() => '---:').join(' | ')} | --- |`,
	];
	for (const output of outputs) {
		const metrics = new Map(
			output.result.metrics.map((metric) => [metric.name, metric])
		);
		lines.push(
			`| ${output.route} | ${output.scenario.name} | ${output.arm} | ${summaryColumns
				.map((column) => formatMedian(metrics.get(column)))
				.join(' | ')} | ${String(output.result.metadata?.cacheState ?? '')} |`
		);
	}
	lines.push('', '## Stylesheets per route (last fresh sample)', '');
	for (const output of outputs.filter(
		(entry) => entry.scenario.name === 'fresh'
	)) {
		const metadata = output.result.metadata ?? {};
		const initial = (metadata.stylesheets as string[] | undefined) ?? [];
		const afterDialog =
			(metadata.stylesheetsAfterDialog as string[] | undefined) ?? [];
		lines.push(
			`### ${output.arm} ${output.route}`,
			'',
			`Class selectors defined by more than one stylesheet: ${String(metadata.cssSharedClassCount ?? 'n/a')}; after opening the dialog: ${String(metadata.cssSharedClassCountAfterDialog ?? 'n/a')}.`,
			'',
			`Initial load (${initial.length}):`,
			...initial.map((line) => `- ${line}`),
			'',
			`After opening the dialog (${afterDialog.length}):`,
			...afterDialog.map((line) => `- ${line}`),
			''
		);
	}
	return `${lines.join('\n')}\n`;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async function main() {
	mkdirSync(workRoot, { recursive: true });
	const provenance: ArmProvenance[] = [];
	for (const arm of arms) {
		// oxlint-disable-next-line no-await-in-loop -- Installs and builds run one at a time.
		provenance.push(await prepareArm(arm));
	}
	if (prepareOnly) {
		for (const arm of provenance) {
			console.log(
				`[${arm.label}] prepared ${consumerDir(arms.find((entry) => entry.label === arm.label) as ConsumerArm)} (${arm.source}, c15t ${arm.installedC15tVersion})`
			);
		}
		return;
	}

	const servers: ArmServer[] = arms.map((arm, index) => ({
		arm,
		baseUrl: `http://${HOST}:${portBase + index}`,
		logs: '',
		port: portBase + index,
		process: null,
	}));
	const browser = await chromium.launch({ headless: true });
	const outputs: ScenarioOutput[] = [];
	try {
		await Promise.all(servers.map((server) => startServer(server)));
		await Promise.all(servers.map((server) => warmServer(server)));
		const samples = new Map<string, VisitSample[]>();
		const savedCookies = new Map<string, Map<string, string | undefined>>(
			servers.map((server) => [server.arm.label, new Map()])
		);
		const key = (arm: string, route: string, scenario: string) =>
			`${arm} ${route} ${scenario}`;

		for (let index = 0; index < warmupIterations + iterations; index += 1) {
			for (const route of routes) {
				for (const scenario of selectedScenarios) {
					for (const server of interleaveArms(servers, index)) {
						// oxlint-disable-next-line no-await-in-loop -- Samples run sequentially to avoid contention.
						const sample = await takeSample(
							browser,
							server,
							route,
							scenario,
							savedCookies.get(server.arm.label) as Map<
								string,
								string | undefined
							>
						);
						if (index >= warmupIterations) {
							const entry = key(server.arm.label, route, scenario.name);
							samples.set(entry, [...(samples.get(entry) ?? []), sample]);
						}
					}
				}
			}
			console.log(
				`iteration ${index + 1}/${warmupIterations + iterations} done${index < warmupIterations ? ' (warm-up)' : ''}`
			);
		}

		for (const server of servers) {
			const armProvenance = provenance.find(
				(entry) => entry.label === server.arm.label
			) as ArmProvenance;
			for (const route of routes) {
				for (const scenario of selectedScenarios) {
					const scenarioSamples =
						samples.get(key(server.arm.label, route, scenario.name)) ?? [];
					const cookie = savedCookies
						.get(server.arm.label)
						?.get(`${route} ${scenario.name}`);
					const { serverHtml, overlap, overlapAfterDialog } =
						// oxlint-disable-next-line no-await-in-loop -- Reads run after sampling, one at a time.
						await analyzeScenario(
							server,
							route,
							scenario,
							scenarioSamples.at(-1),
							cookie
						);
					const result = buildResult({
						browserVersion: browser.version(),
						overlap,
						overlapAfterDialog,
						provenance: armProvenance,
						route,
						samples: scenarioSamples,
						scenario,
						serverHtml,
					});
					writeJson(
						join(
							outputDir,
							server.arm.label,
							`${routeSlug(route)}-${scenario.name}.json`
						),
						result
					);
					outputs.push({ arm: server.arm.label, result, route, scenario });
				}
			}
		}
	} finally {
		await browser.close();
		await Promise.all(servers.map((server) => stopServer(server)));
	}

	outputs.sort(
		(a, b) =>
			a.route.localeCompare(b.route) ||
			selectedScenarios.indexOf(a.scenario) -
				selectedScenarios.indexOf(b.scenario) ||
			a.arm.localeCompare(b.arm)
	);
	const markdown = toMarkdown(outputs, provenance);
	mkdirSync(outputDir, { recursive: true });
	writeFileSync(join(outputDir, 'summary.md'), markdown);
	writeFileSync(
		join(outputDir, 'provenance.json'),
		`${JSON.stringify(provenance, null, '\t')}\n`
	);
	console.log(markdown);
	console.log(`Results: ${outputDir}`);
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
