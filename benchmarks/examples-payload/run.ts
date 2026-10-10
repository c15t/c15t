#!/usr/bin/env node
/**
 * Examples payload: builds every starter in `examples/` against a fixture
 * consent backend, starts it, and measures what a first visit downloads in
 * Chromium. Base and head each measure their own examples, so this compares
 * the quickstarts users copy, not a fixture app.
 *
 * Phases follow `benchmarks/bundle-test-app/client-payload/run.ts`, each in a
 * fresh browser context:
 * - initial: until network idle after load, then until the banner shows
 * - dialog: after clicking Customize on the banner, until network idle
 * - accept: in a second context, after clicking Accept, until the banner
 *   hides, the save request answers and the network is idle
 *
 * Usage (from the repo root; build the checkout's packages first with
 * `bun run build:libs`):
 *   bunx tsx benchmarks/examples-payload/run.ts [--root <checkout>] \
 *     [--out <dir>] [--examples nextjs,react] [--skip-build] \
 *     [--backend-port 4590] [--banner-samples 5] [--backend-latency-ms 0] \
 *     [--debug]
 *
 * `--root` measures another checkout (for example a base worktree) with
 * this harness. `--out` receives one gate result per example
 * (`<example>.json`), the full detail (`examples-payload.json`) and a
 * Markdown table (`examples-payload.md`).
 */
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { resolveBenchBackendLatencyMs } from '@c15t/benchmarking/browser';
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Response } from 'playwright';

import { backendEnv, exampleRuntimes, isFixtureHost } from './src/examples';
import type { ExampleRuntime } from './src/examples';
import {
	PUBLIC_ORIGIN_HEADER,
	startFixtureBackend,
} from './src/fixture-backend';
import type { FixtureBackend } from './src/fixture-backend';
import { findBoundaries, markerTableFor } from './src/markers';
import type { MarkerTable } from './src/markers';
import { sizesOf, summarize, toBenchmarkResult } from './src/metrics';
import type {
	CollectedAsset,
	CollectedRequest,
	ExampleMeasurement,
	Phase,
} from './src/metrics';
import { renderReport } from './src/report';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const harnessRoot = resolvePath(scriptDir, '../..');

const readFlag = function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index !== -1) {
		return process.argv[index + 1];
	}
	return process.argv
		.find((arg) => arg.startsWith(`${name}=`))
		?.slice(name.length + 1);
};

const root = resolvePath(readFlag('--root') ?? harnessRoot);
const outputDir = resolvePath(
	readFlag('--out') ?? join(harnessRoot, '.benchmarks/current/examples-payload')
);
const selected = readFlag('--examples')
	?.split(',')
	.map((name) => name.trim())
	.filter(Boolean);
const skipBuild = process.argv.includes('--skip-build');
// Print page console messages and errors, to see why a banner didn't show.
const debug = process.argv.includes('--debug');
const backendPort = Number(readFlag('--backend-port') ?? '4590');
const bannerSamples = Number(readFlag('--banner-samples') ?? '5');
// Bytes don't depend on latency; bannerVisibleMs does. Off unless asked for,
// so the run stays fast; `scripts/benchmark-run.ts` passes its 200 ms.
const latencyMs = process.env.C15T_BENCH_BACKEND_LATENCY_MS
	? resolveBenchBackendLatencyMs(readFlag, process.env)
	: Number(readFlag('--backend-latency-ms') ?? '0');

const BANNER = '[data-testid="consent-banner-root"]';
const TIMEOUT_MS = 15_000;

const examples = exampleRuntimes.filter(
	(example) => !selected || selected.includes(example.name)
);
for (const name of selected ?? []) {
	if (!exampleRuntimes.some((example) => example.name === name)) {
		throw new Error(`Unknown example "${name}"`);
	}
}

/** HEAD of the measured checkout, suffixed `-dirty` for local edits. */
const gitSha = function gitSha(): string {
	const head = spawnSync('git', ['rev-parse', 'HEAD'], {
		cwd: root,
		encoding: 'utf8',
	});
	if (head.status !== 0) {
		return 'unknown';
	}
	const status = spawnSync(
		'git',
		['status', '--porcelain', '--', 'examples', 'packages'],
		{ cwd: root, encoding: 'utf8' }
	);
	return `${head.stdout.trim()}${status.stdout.trim() ? '-dirty' : ''}`;
};

const exampleEnv = function exampleEnv(
	backend: FixtureBackend
): NodeJS.ProcessEnv {
	return {
		...process.env,
		...backendEnv(backend.url),
		ASTRO_TELEMETRY_DISABLED: '1',
		// A failed snapshot fetch must fail the build rather than measure a
		// runtime fallback. Revisions without the build policy ignore it.
		C15T_ON_BUILD_ERROR: 'fail',
		NEXT_TELEMETRY_DISABLED: '1',
		NODE_ENV: 'production',
		NUXT_TELEMETRY_DISABLED: '1',
	};
};

/**
 * Run the example's build. Asynchronous on purpose: the fixture backend
 * shares this process and has to answer the build's manifest fetch.
 */
const build = async function build(
	example: ExampleRuntime,
	backend: FixtureBackend
): Promise<Record<string, number>> {
	backend.reset();
	let logs = '';
	const child = spawn('bun', ['run', 'build'], {
		cwd: join(root, 'examples', example.name),
		env: exampleEnv(backend),
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	child.stdout?.on('data', (chunk) => {
		logs += String(chunk);
	});
	child.stderr?.on('data', (chunk) => {
		logs += String(chunk);
	});
	const timer = setTimeout(() => child.kill('SIGKILL'), 600_000);
	let code: number | null;
	try {
		code = await new Promise<number | null>((resolve, reject) => {
			child.once('error', reject);
			child.once('exit', (exitCode) => resolve(exitCode));
		});
	} finally {
		clearTimeout(timer);
	}
	if (code !== 0) {
		throw new Error(`build failed (exit ${code}):\n${logs.slice(-4000)}`);
	}
	return backend.counts();
};

/** Whether a promise settles successfully, without throwing. */
const succeeds = async function succeeds(promise: Promise<unknown>) {
	try {
		await promise;
		return true;
	} catch {
		return false;
	}
};

const portAnswers = async function portAnswers(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
		return response.status < 500;
	} catch {
		return false;
	}
};

const stop = async function stop(child: ChildProcess) {
	if (child.exitCode !== null || !child.pid) {
		return;
	}
	const exited = new Promise<'exited'>((resolve) => {
		child.once('exit', () => resolve('exited'));
	});
	const timeout = async () => {
		await sleep(5000);
		return 'timeout' as const;
	};
	try {
		// `bun run` starts the server as a child; signal the whole group.
		process.kill(-child.pid, 'SIGTERM');
	} catch {
		child.kill('SIGTERM');
	}
	if ((await Promise.race([exited, timeout()])) === 'timeout') {
		try {
			process.kill(-child.pid, 'SIGKILL');
		} catch {
			child.kill('SIGKILL');
		}
	}
};

const start = async function start(
	example: ExampleRuntime,
	backend: FixtureBackend
): Promise<{ child: ChildProcess; url: string }> {
	const url = `http://127.0.0.1:${example.port}/`;
	if (await portAnswers(url)) {
		throw new Error(`port ${example.port} is already in use`);
	}
	let logs = '';
	const child = spawn('bun', ['run', 'start', ...example.startArgs], {
		cwd: join(root, 'examples', example.name),
		detached: true,
		env: { ...exampleEnv(backend), ...example.startEnv },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	child.stdout?.on('data', (chunk) => {
		logs += String(chunk);
	});
	child.stderr?.on('data', (chunk) => {
		logs += String(chunk);
	});
	for (let attempt = 0; attempt < 240; attempt += 1) {
		if (child.exitCode !== null) {
			break;
		}
		// oxlint-disable-next-line no-await-in-loop -- Polling: each attempt waits for the previous one.
		if (await portAnswers(url)) {
			return { child, url };
		}
		// oxlint-disable-next-line no-await-in-loop -- Polling interval.
		await sleep(250);
	}
	await stop(child);
	throw new Error(`start did not answer on ${url}:\n${logs.slice(-4000)}`);
};

const emittedClientJsGzip = function emittedClientJsGzip(
	example: ExampleRuntime
): number | null {
	if (example.clientDirs.length === 0) {
		return null;
	}
	let total = 0;
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const path = join(dir, entry);
			if (statSync(path).isDirectory()) {
				walk(path);
			} else if (/\.m?js$/u.test(entry)) {
				total += gzipSync(readFileSync(path)).byteLength;
			}
		}
	};
	for (const dir of example.clientDirs) {
		const path = join(root, 'examples', example.name, dir);
		if (existsSync(path)) {
			walk(path);
		}
	}
	return total;
};

/** Record when the banner first becomes visible, in page time. */
const BANNER_TIMING_SCRIPT = `(() => {
	const check = () => {
		if (window.__c15tBannerVisibleAt !== undefined) return true;
		const element = document.querySelector('${BANNER}');
		if (element && element.checkVisibility && element.checkVisibility({ visibilityProperty: true })) {
			window.__c15tBannerVisibleAt = performance.now();
			return true;
		}
		return false;
	};
	const observer = new MutationObserver(() => {
		if (check()) observer.disconnect();
	});
	observer.observe(document, { attributes: true, childList: true, subtree: true });
})();`;

const newContext = async function newContext(
	browser: Browser,
	backend: FixtureBackend,
	blocked: string[]
): Promise<BrowserContext> {
	const context = await browser.newContext({
		locale: 'en-US',
		viewport: { height: 720, width: 1280 },
	});
	// Local servers pass through. Hard-coded backend hosts go to the
	// fixture; anything else on the internet is blocked and recorded.
	await context.route(
		(url) => url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
		async (route) => {
			const target = new URL(route.request().url());
			if (isFixtureHost(target.hostname)) {
				const response = await route.fetch({
					headers: {
						...route.request().headers(),
						[PUBLIC_ORIGIN_HEADER]: target.origin,
					},
					url: `${backend.url}${target.pathname}${target.search}`,
				});
				await route.fulfill({ response });
				return;
			}
			blocked.push(target.href);
			await route.abort('blockedbyclient');
		}
	);
	return context;
};

const clickBannerButton = async function clickBannerButton(
	page: Page,
	testId: string,
	name: RegExp
): Promise<string | null> {
	const byTestId = page.locator(`[data-testid="${testId}"]`).first();
	if (await byTestId.isVisible()) {
		await byTestId.click();
		return null;
	}
	const byRole = page
		.locator(BANNER)
		.first()
		.getByRole('button', { name })
		.first();
	if (await byRole.isVisible()) {
		await byRole.click();
		return null;
	}
	return `no visible ${testId}`;
};

const assetTypeOf = function assetTypeOf(
	resourceType: string,
	contentType: string
): CollectedAsset['type'] | null {
	if (resourceType === 'stylesheet') {
		return 'css';
	}
	if (resourceType === 'script' || /javascript/u.test(contentType)) {
		return 'js';
	}
	return null;
};

interface VisitResult {
	assets: CollectedAsset[];
	requests: CollectedRequest[];
	document: ExampleMeasurement['document'];
	bannerVisible: boolean;
	interaction: { measured: boolean; reason?: string; saved?: boolean };
}

const visit = async function visit(
	browser: Browser,
	backend: FixtureBackend,
	markers: MarkerTable,
	url: string,
	interaction: 'dialog' | 'accept',
	blocked: string[]
): Promise<VisitResult> {
	const context = await newContext(browser, backend, blocked);
	const page = await context.newPage();
	const { origin } = new URL(url);
	const seen = new Set<string>();
	const pending: Promise<void>[] = [];
	const assets: CollectedAsset[] = [];
	const requests: CollectedRequest[] = [];
	let phase: Phase = 'initial';
	if (debug) {
		page.on('console', (message) => {
			console.log(`  [console.${message.type()}] ${message.text()}`);
		});
		page.on('pageerror', (error) => {
			console.log(`  [pageerror] ${error.message}`);
		});
		page.on('requestfailed', (request) => {
			console.log(
				`  [requestfailed] ${request.url()} ${request.failure()?.errorText}`
			);
		});
	}

	page.on('request', (request) => {
		if (phase !== 'initial') {
			return;
		}
		requests.push({
			crossOrigin: new URL(request.url()).origin !== origin,
			method: request.method(),
			phase,
			url: request.url(),
		});
	});
	const record = async function record(
		response: Response,
		type: CollectedAsset['type'],
		assetPhase: Phase
	) {
		let body: Buffer;
		try {
			body = await response.body();
		} catch {
			// The body is gone after a navigation; nothing to measure.
			return;
		}
		assets.push({
			...sizesOf(body),
			boundaries:
				type === 'js' ? findBoundaries(body.toString('utf8'), markers) : [],
			phase: assetPhase,
			type,
			url: response.url(),
		});
	};
	page.on('response', (response) => {
		const type = assetTypeOf(
			response.request().resourceType(),
			response.headers()['content-type'] ?? ''
		);
		if (!type || seen.has(response.url()) || response.status() >= 300) {
			return;
		}
		seen.add(response.url());
		pending.push(record(response, type, phase));
	});

	const navigation = await page.goto(url, { waitUntil: 'load' });
	await page.waitForLoadState('networkidle');
	const banner = page.locator(BANNER).first();
	const bannerVisible = await succeeds(
		banner.waitFor({ state: 'visible', timeout: TIMEOUT_MS })
	);
	await page.waitForLoadState('networkidle');
	const html = navigation ? await navigation.body() : null;
	const document = html
		? {
				...sizesOf(html),
				boundaries: findBoundaries(html.toString('utf8'), markers),
			}
		: null;

	let outcome: VisitResult['interaction'] = { measured: false };
	if (!bannerVisible) {
		outcome = { measured: false, reason: 'banner not visible' };
	} else if (interaction === 'dialog') {
		phase = 'dialog';
		const missing = await clickBannerButton(
			page,
			'consent-banner-customize-button',
			/customi[sz]e|preferences|settings/iu
		);
		if (missing) {
			outcome = { measured: false, reason: missing };
		} else {
			const opened = await succeeds(
				page
					.locator(
						'[data-testid="consent-dialog-card"], [data-testid="consent-dialog-root"]'
					)
					.first()
					.waitFor({ state: 'visible', timeout: TIMEOUT_MS })
			);
			await page.waitForLoadState('networkidle');
			outcome = opened
				? { measured: true }
				: { measured: false, reason: 'dialog did not open' };
		}
	} else {
		phase = 'accept';
		const saved = succeeds(
			page.waitForResponse(
				(response) =>
					response.request().method() !== 'GET' &&
					new URL(response.url()).pathname.includes('/subjects'),
				{ timeout: TIMEOUT_MS }
			)
		);
		const missing = await clickBannerButton(
			page,
			'consent-banner-accept-button',
			/accept/iu
		);
		if (missing) {
			outcome = { measured: false, reason: missing };
		} else {
			await succeeds(banner.waitFor({ state: 'hidden', timeout: TIMEOUT_MS }));
			const didSave = await saved;
			await page.waitForLoadState('networkidle');
			outcome = { measured: true, saved: didSave };
		}
	}
	await Promise.all(pending);
	await context.close();
	return { assets, bannerVisible, document, interaction: outcome, requests };
};

const bannerTimings = async function bannerTimings(
	browser: Browser,
	backend: FixtureBackend,
	url: string,
	blocked: string[]
): Promise<number[]> {
	const samples: number[] = [];
	for (let sample = 0; sample < bannerSamples; sample += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		const context = await newContext(browser, backend, blocked);
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		await context.addInitScript(BANNER_TIMING_SCRIPT);
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		const page = await context.newPage();
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		await page.goto(url, { waitUntil: 'commit' });
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		const visible = await succeeds(
			page
				.locator(BANNER)
				.first()
				.waitFor({ state: 'visible', timeout: TIMEOUT_MS })
		);
		if (visible) {
			// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
			const at = await page.evaluate(
				() =>
					(window as { __c15tBannerVisibleAt?: number })
						.__c15tBannerVisibleAt ?? performance.now()
			);
			samples.push(Math.round(at));
		}
		// oxlint-disable-next-line no-await-in-loop -- Samples must not overlap.
		await context.close();
	}
	return samples;
};

const measure = async function measure(
	browser: Browser,
	backend: FixtureBackend,
	markers: MarkerTable,
	example: ExampleRuntime,
	url: string,
	buildBackendRequests: Record<string, number>
): Promise<ExampleMeasurement> {
	const blocked: string[] = [];
	const first = await visit(browser, backend, markers, url, 'dialog', blocked);
	const second = await visit(browser, backend, markers, url, 'accept', blocked);
	const notes: string[] = [];
	if (!first.bannerVisible) {
		notes.push('The banner did not become visible on a first visit.');
	}
	if (first.interaction.reason) {
		notes.push(`dialog: ${first.interaction.reason}`);
	}
	if (second.interaction.reason) {
		notes.push(`accept: ${second.interaction.reason}`);
	}
	if (second.interaction.measured && !second.interaction.saved) {
		notes.push('accept: no save request answered within the timeout.');
	}
	if (blocked.length > 0) {
		notes.push(
			`Blocked internet requests: ${[...new Set(blocked)].join(', ')}`
		);
	}
	return {
		accept: second.interaction,
		assets: [
			...first.assets.filter((asset) => asset.phase !== 'accept'),
			...second.assets.filter((asset) => asset.phase === 'accept'),
		],
		bannerVisible: first.bannerVisible,
		bannerVisibleMs: await bannerTimings(browser, backend, url, blocked),
		buildBackendRequests,
		dialog: first.interaction,
		document: first.document,
		emittedClientJsGzip: emittedClientJsGzip(example),
		example: example.name,
		framework: example.framework,
		kind: example.kind,
		notes,
		requests: first.requests,
		url,
	};
};

const main = async function main() {
	mkdirSync(outputDir, { recursive: true });
	const commitSha = gitSha();
	const backend = await startFixtureBackend({
		latencyMs,
		port: backendPort,
		root,
	});
	const markers = markerTableFor(backend.manifest, backend.init);
	const browser = await chromium.launch({ headless: true });
	const measurements: ExampleMeasurement[] = [];
	const failures: { example: string; error: string }[] = [];
	try {
		for (const example of examples) {
			let server: ChildProcess | null = null;
			try {
				console.log(
					`[${example.name}] ${skipBuild ? 'skipping build' : 'building'}`
				);
				// oxlint-disable-next-line no-await-in-loop -- One example at a time.
				const buildRequests = skipBuild ? {} : await build(example, backend);
				// oxlint-disable-next-line no-await-in-loop -- One example at a time.
				const started = await start(example, backend);
				server = started.child;
				backend.reset();
				// oxlint-disable-next-line no-await-in-loop -- One example at a time.
				const measurement = await measure(
					browser,
					backend,
					markers,
					example,
					started.url,
					buildRequests
				);
				measurements.push(measurement);
				const values = summarize(measurement);
				console.log(
					`[${example.name}] initialJsGzip=${values.initialJsGzip} requests=${values.initialJsRequests} banner=${measurement.bannerVisible}`
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				failures.push({ error: message, example: example.name });
				console.error(`[${example.name}] failed: ${message}`);
			} finally {
				if (server) {
					// oxlint-disable-next-line no-await-in-loop -- Free the port before the next example.
					await stop(server);
				}
			}
		}
	} finally {
		await browser.close();
		await backend.close();
	}

	const timestamp = new Date().toISOString();
	const environment = {
		arch: arch(),
		browserVersion: browser.version(),
		bunVersion: process.versions.bun,
		ci: process.env.CI === 'true',
		nodeVersion: process.version,
		os: platform(),
	};
	for (const measurement of measurements) {
		writeFileSync(
			join(outputDir, `${measurement.example}.json`),
			`${JSON.stringify(
				toBenchmarkResult(measurement, {
					backendLatencyMs: latencyMs,
					commitSha,
					environment,
					timestamp,
				}),
				null,
				'\t'
			)}\n`
		);
	}
	const detail = {
		backendLatencyMs: latencyMs,
		commitSha,
		failures,
		generatedAt: timestamp,
		markers,
		measurements: measurements.map((measurement) => ({
			...measurement,
			metrics: summarize(measurement),
		})),
		method:
			'Each example is built with its own build script against the fixture backend (all four *_C15T_BACKEND_URL variables set, *.inth.app routed to the fixture, other internet hosts blocked) and started with its own start script. Assets are the scripts and stylesheets Chromium received, each phase in a fresh context. Sizes are the response bodies; gzip and brotli use Node zlib defaults per asset. Boundary bytes are the gzip sizes of first-load JS assets that contain a boundary marker string.',
		// Relative to the harness checkout, so reports don't carry home paths.
		root: relative(harnessRoot, root) || '.',
	};
	writeFileSync(
		join(outputDir, 'examples-payload.json'),
		`${JSON.stringify(detail, null, '\t')}\n`
	);
	const markdown = renderReport(detail);
	writeFileSync(join(outputDir, 'examples-payload.md'), markdown);
	console.log(markdown);
	if (failures.length > 0) {
		process.exitCode = 1;
	}
};

await main();
