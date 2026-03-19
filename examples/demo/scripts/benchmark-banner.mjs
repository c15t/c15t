import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4301;
const BASE_URL = `http://${HOST}:${PORT}`;
const BENCHMARK_INIT_REQUEST_PREFIX = `${BASE_URL}/api/pigeon/init`;
const ITERATIONS = (() => {
	const raw = process.env.BENCH_ITERATIONS ?? '5';
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
		throw new Error(
			`Invalid BENCH_ITERATIONS: ${raw}. Expected a positive integer.`
		);
	}
	return parsed;
})();
const STARTUP_TIMEOUT_MS = 120_000;
const NEXT_MODE = process.env.BENCH_NEXT_MODE ?? 'dev';
const BENCH_HEADED =
	process.env.BENCH_HEADED === '1' || process.env.BENCH_HEADED === 'true';
const BENCH_ANIMATION_MODE = process.env.BENCH_ANIMATION_MODE ?? 'default';

const ROUTES = [
	{ name: 'client', path: '/benchmark/client' },
	{ name: 'ssr', path: '/benchmark/ssr' },
	{ name: 'prefetch', path: '/benchmark/prefetch' },
];

function average(values) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function percentile(values, p) {
	const sorted = [...values].sort((a, b) => a - b);
	const rank = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
}

function summarizeMs(values) {
	return {
		avg: Number(average(values).toFixed(1)),
		median: Number(median(values).toFixed(1)),
		p95: Number(percentile(values, 95).toFixed(1)),
	};
}

function averageDefined(values) {
	const numbers = values.filter((value) => Number.isFinite(value));
	if (numbers.length === 0) {
		return null;
	}

	return Number(average(numbers).toFixed(1));
}

function formatMaybeMs(value) {
	return Number.isFinite(value) ? `${value.toFixed(1)}ms` : 'n/a';
}

function runCommand(cmd, args, cwd, envOverrides = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd,
			env: {
				...process.env,
				...envOverrides,
			},
			stdio: 'inherit',
		});

		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (${code})`));
		});
	});
}

async function waitForServerReady(baseURL) {
	const deadline = Date.now() + STARTUP_TIMEOUT_MS;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${baseURL}/benchmark`);
			if (response.ok) {
				return;
			}
		} catch {
			// Server not ready yet.
		}

		await sleep(500);
	}

	throw new Error(`Timed out waiting for Next.js server at ${baseURL}`);
}

async function runIteration(browser, route) {
	const context = await browser.newContext({
		baseURL: BASE_URL,
	});
	const page = await context.newPage();

	let initRequests = 0;
	page.on('request', (request) => {
		if (request.url().startsWith(BENCHMARK_INIT_REQUEST_PREFIX)) {
			initRequests += 1;
		}
	});

	await page.goto(route.path, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(
		() =>
			window.__c15tBench &&
			(typeof window.__c15tBench.bannerVisibleMs === 'number' ||
				window.__c15tBench.onErrorCount > 0),
		undefined,
		{
			timeout: 60_000,
		}
	);

	const initial = await page.evaluate(() => window.__c15tBench);
	if (typeof initial.bannerVisibleMs !== 'number' && initial.onErrorCount > 0) {
		throw new Error(
			`[${route.name}] c15t init failed before banner was visible (onErrorCount=${initial.onErrorCount}).`
		);
	}
	const initRequestsAfterLoad = initRequests;
	const initTiming = await page.evaluate(() => {
		const entries = performance
			.getEntriesByType('resource')
			.filter((entry) => entry.name.includes('/api/pigeon/init'));
		if (entries.length === 0) {
			return null;
		}

		const latest = entries[entries.length - 1];
		return {
			startTime: latest.startTime,
			responseEnd: latest.responseEnd,
			duration: latest.duration,
		};
	});

	const navTiming = await page.evaluate(() => {
		const nav = performance.getEntriesByType('navigation')[0];
		if (!nav) {
			return null;
		}

		return {
			responseEnd: nav.responseEnd,
			domContentLoaded: nav.domContentLoadedEventEnd,
			loadEvent: nav.loadEventEnd,
		};
	});

	const scriptTiming = await page.evaluate(() => {
		const scripts = performance
			.getEntriesByType('resource')
			.filter((entry) => entry.initiatorType === 'script');
		if (scripts.length === 0) {
			return null;
		}

		const sorted = [...scripts].sort((a, b) => a.startTime - b.startTime);
		const first = sorted[0];
		const last = sorted[sorted.length - 1];

		return {
			firstScriptStartMs: first.startTime,
			firstScriptEndMs: first.responseEnd,
			lastScriptEndMs: last.responseEnd,
			scriptCount: scripts.length,
		};
	});

	const beforeNavUrl = page.url();
	await page.click('#soft-nav-link');
	await page.waitForURL((url) => url.toString() !== beforeNavUrl);
	await page.waitForTimeout(250);

	const afterSoftNav = await page.evaluate(() => window.__c15tBench);
	const initRequestsAfterSoftNav = initRequests;

	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForFunction(
		() =>
			window.__c15tBench &&
			(typeof window.__c15tBench.bannerVisibleMs === 'number' ||
				window.__c15tBench.onErrorCount > 0),
		undefined,
		{
			timeout: 60_000,
		}
	);

	const afterReload = await page.evaluate(() => window.__c15tBench);
	if (
		typeof afterReload.bannerVisibleMs !== 'number' &&
		afterReload.onErrorCount > 0
	) {
		throw new Error(
			`[${route.name}] c15t init failed after reload (onErrorCount=${afterReload.onErrorCount}).`
		);
	}
	const initRequestsAfterReload = initRequests;

	await context.close();

	return {
		bannerVisibleMs: initial.bannerVisibleMs,
		onBannerFetchedMs: initial.onBannerFetchedMs,
		htmlResponseEndMs: navTiming?.responseEnd ?? null,
		firstScriptStartMs: scriptTiming?.firstScriptStartMs ?? null,
		firstScriptEndMs: scriptTiming?.firstScriptEndMs ?? null,
		lastScriptEndMs: scriptTiming?.lastScriptEndMs ?? null,
		scriptCount: scriptTiming?.scriptCount ?? 0,
		initFetchStartMs: initTiming?.startTime ?? null,
		initFetchMs: initTiming?.duration ?? null,
		initFetchEndMs: initTiming?.responseEnd ?? null,
		domContentLoadedMs: navTiming?.domContentLoaded ?? null,
		loadEventMs: navTiming?.loadEvent ?? null,
		fetchedToVisibleMs:
			Number.isFinite(initial.onBannerFetchedMs) &&
			Number.isFinite(initial.bannerVisibleMs)
				? initial.bannerVisibleMs - initial.onBannerFetchedMs
				: null,
		initEndToFetchedMs:
			Number.isFinite(initTiming?.responseEnd) &&
			Number.isFinite(initial.onBannerFetchedMs)
				? initial.onBannerFetchedMs - initTiming.responseEnd
				: null,
		onBannerFetchedInitial: initial.onBannerFetchedCount,
		softNavBannerFetchedDelta:
			afterSoftNav.onBannerFetchedCount - initial.onBannerFetchedCount,
		softNavMountDelta: afterSoftNav.mountCount - initial.mountCount,
		onBannerFetchedAfterReload: afterReload.onBannerFetchedCount,
		initRequestsAfterLoad,
		initRequestsAfterSoftNav,
		initRequestsAfterReload,
	};
}

async function runBenchmarks() {
	console.log(`Benchmark mode: ${NEXT_MODE}`);
	console.log(
		`Browser mode: ${BENCH_HEADED ? 'headed' : 'headless'}, animation mode: ${BENCH_ANIMATION_MODE}`
	);
	if (NEXT_MODE === 'prod') {
		console.log('Building Next.js app for production benchmark...');
		await runCommand(
			'bun',
			['run', 'next', 'build'],
			new URL('..', import.meta.url).pathname,
			{
				NODE_ENV: 'production',
				NEXT_PUBLIC_BENCH_ANIMATION_MODE: BENCH_ANIMATION_MODE,
			}
		);
	}

	console.log(`Starting benchmark server at ${BASE_URL} ...`);

	const serverCommand =
		NEXT_MODE === 'prod'
			? ['run', 'next', 'start', '-H', HOST, '-p', String(PORT)]
			: ['run', 'next', 'dev', '-H', HOST, '-p', String(PORT)];
	const server = spawn('bun', serverCommand, {
		cwd: new URL('..', import.meta.url).pathname,
		env: {
			...process.env,
			NODE_ENV: NEXT_MODE === 'prod' ? 'production' : 'development',
			NEXT_PUBLIC_BENCH_ANIMATION_MODE: BENCH_ANIMATION_MODE,
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	let serverLogs = '';
	server.stdout.on('data', (data) => {
		serverLogs += String(data);
	});
	server.stderr.on('data', (data) => {
		serverLogs += String(data);
	});

	try {
		await waitForServerReady(BASE_URL);

		const browser = await chromium.launch({ headless: !BENCH_HEADED });
		const perRoute = [];

		for (const route of ROUTES) {
			const samples = [];
			for (let i = 0; i < ITERATIONS; i += 1) {
				const sample = await runIteration(browser, route);
				samples.push(sample);
				process.stdout.write(
					`[${route.name}] iteration ${i + 1}/${ITERATIONS}: banner=${sample.bannerVisibleMs.toFixed(1)}ms, html=${formatMaybeMs(sample.htmlResponseEndMs)}, scripts=${formatMaybeMs(sample.firstScriptStartMs)}-${formatMaybeMs(sample.lastScriptEndMs)} (${sample.scriptCount}), initStart=${formatMaybeMs(sample.initFetchStartMs)}, initFetch=${formatMaybeMs(sample.initFetchMs)}, fetched->visible=${formatMaybeMs(sample.fetchedToVisibleMs)}\n`
				);
			}

			const bannerValues = samples.map((sample) => sample.bannerVisibleMs);
			const onBannerFetchedMsValues = samples.map(
				(sample) => sample.onBannerFetchedMs
			);
			const htmlResponseEndValues = samples.map(
				(sample) => sample.htmlResponseEndMs
			);
			const firstScriptStartValues = samples.map(
				(sample) => sample.firstScriptStartMs
			);
			const lastScriptEndValues = samples.map(
				(sample) => sample.lastScriptEndMs
			);
			const initFetchStartMsValues = samples.map(
				(sample) => sample.initFetchStartMs
			);
			const initFetchMsValues = samples.map((sample) => sample.initFetchMs);
			const domContentLoadedValues = samples.map(
				(sample) => sample.domContentLoadedMs
			);
			const loadEventValues = samples.map((sample) => sample.loadEventMs);
			const fetchedToVisibleValues = samples.map(
				(sample) => sample.fetchedToVisibleMs
			);
			const initEndToFetchedValues = samples.map(
				(sample) => sample.initEndToFetchedMs
			);
			const softNavMountDelta = samples.map(
				(sample) => sample.softNavMountDelta
			);
			const softNavBannerDelta = samples.map(
				(sample) => sample.softNavBannerFetchedDelta
			);
			const onBannerFetchedInitial = samples.map(
				(sample) => sample.onBannerFetchedInitial
			);
			const onBannerFetchedAfterReload = samples.map(
				(sample) => sample.onBannerFetchedAfterReload
			);
			const initLoad = samples.map((sample) => sample.initRequestsAfterLoad);
			const initSoft = samples.map((sample) => sample.initRequestsAfterSoftNav);
			const initReload = samples.map(
				(sample) => sample.initRequestsAfterReload
			);

			perRoute.push({
				route: route.name,
				iterations: samples.length,
				banner: summarizeMs(bannerValues),
				avgHtmlResponseEndMs: averageDefined(htmlResponseEndValues),
				avgFirstScriptStartMs: averageDefined(firstScriptStartValues),
				avgLastScriptEndMs: averageDefined(lastScriptEndValues),
				avgOnBannerFetchedMs: averageDefined(onBannerFetchedMsValues),
				avgInitFetchStartMs: averageDefined(initFetchStartMsValues),
				avgInitFetchMs: averageDefined(initFetchMsValues),
				avgDomContentLoadedMs: averageDefined(domContentLoadedValues),
				avgLoadEventMs: averageDefined(loadEventValues),
				avgFetchedToVisibleMs: averageDefined(fetchedToVisibleValues),
				avgInitEndToFetchedMs: averageDefined(initEndToFetchedValues),
				avgOnBannerFetchedInitial: Number(
					average(onBannerFetchedInitial).toFixed(2)
				),
				avgOnBannerFetchedAfterReload: Number(
					average(onBannerFetchedAfterReload).toFixed(2)
				),
				avgSoftNavMountDelta: Number(average(softNavMountDelta).toFixed(2)),
				avgSoftNavBannerDelta: Number(average(softNavBannerDelta).toFixed(2)),
				avgInitReqOnLoad: Number(average(initLoad).toFixed(2)),
				avgInitReqAfterSoftNav: Number(average(initSoft).toFixed(2)),
				avgInitReqAfterReload: Number(average(initReload).toFixed(2)),
			});
		}

		await browser.close();

		const baseline = perRoute.find((entry) => entry.route === 'client');
		const summaryRows = perRoute.map((entry) => {
			const medianDiffVsClient =
				baseline && baseline.banner.median > 0
					? Number(
							(
								((entry.banner.median - baseline.banner.median) /
									baseline.banner.median) *
								100
							).toFixed(1)
						)
					: 0;

			return {
				route: entry.route,
				iterations: entry.iterations,
				avgBannerMs: entry.banner.avg,
				medianBannerMs: entry.banner.median,
				p95BannerMs: entry.banner.p95,
				medianDiffVsClientPct: medianDiffVsClient,
				avgHtmlResponseEndMs: entry.avgHtmlResponseEndMs,
				avgFirstScriptStartMs: entry.avgFirstScriptStartMs,
				avgLastScriptEndMs: entry.avgLastScriptEndMs,
				avgInitFetchStartMs: entry.avgInitFetchStartMs,
				avgInitFetchMs: entry.avgInitFetchMs,
				avgDomContentLoadedMs: entry.avgDomContentLoadedMs,
				avgLoadEventMs: entry.avgLoadEventMs,
				avgOnBannerFetchedMs: entry.avgOnBannerFetchedMs,
				avgInitEndToFetchedMs: entry.avgInitEndToFetchedMs,
				avgFetchedToVisibleMs: entry.avgFetchedToVisibleMs,
				avgOnBannerFetchedInitial: entry.avgOnBannerFetchedInitial,
				avgOnBannerFetchedAfterReload: entry.avgOnBannerFetchedAfterReload,
				avgSoftNavMountDelta: entry.avgSoftNavMountDelta,
				avgSoftNavBannerDelta: entry.avgSoftNavBannerDelta,
				avgInitReqOnLoad: entry.avgInitReqOnLoad,
				avgInitReqAfterSoftNav: entry.avgInitReqAfterSoftNav,
				avgInitReqAfterReload: entry.avgInitReqAfterReload,
			};
		});

		console.log('\n=== Banner Benchmark Summary ===');
		console.table(summaryRows);
		console.log(
			'\nNotes: init request counts above are browser-observed requests to /api/pigeon/init.'
		);
		console.log(
			'SSR server-side fetches are not visible to browser request listeners in this script.'
		);
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}

		if (server.exitCode && server.exitCode !== 0) {
			console.error(serverLogs);
			process.exit(server.exitCode);
		}
	}
}

runBenchmarks().catch((error) => {
	console.error(error);
	process.exit(1);
});
