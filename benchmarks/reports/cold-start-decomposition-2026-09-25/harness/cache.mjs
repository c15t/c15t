/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
// SDK manifest cache behaviour in a running process.
//
//   coalesce   5 concurrent page requests on a cold key, warm process and new
//              process, for S (in-process cache only) and D (plus Data Cache)
//   direct     resolveConsent pointed at the backend, not the proxy route
//   ttl        short s-maxage / stale-while-revalidate, request timeline
//   fail       cold cache, backend 503: page, banner, blocking, retries
//   hang       cold cache, backend never answers: time to page and banner
//   stalefail  stale entry, backend 503: stale served, retry floor
//   gate       control: tracker loads only after Accept
//
// Usage: node cache.mjs [--only coalesce,ttl,...] [--out <file>]
import { rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

import {
	backendControl,
	measurePage,
	startServer,
	stopServer,
} from './run.mjs';

const ROOT = process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start';
const BACKEND = 'http://127.0.0.1:4790';
const { values: argv } = parseArgs({
	options: {
		only: {
			default: 'gate,coalesce,direct,ttl,stalefail,fail,hang',
			type: 'string',
		},
		out: { default: `${ROOT}/results/cache.json`, type: 'string' },
	},
});
const CFG = {
	D: { dir: `${ROOT}/builds/D-cold`, env: {}, port: 4752 },
	S: {
		dir: `${ROOT}/builds/S-cold`,
		env: { C15T_MANIFEST_REVALIDATE_SECONDS: '0' },
		port: 4751,
	},
};
const DEFAULT_CC = 'public, s-maxage=300, stale-while-revalidate=86400';
const json = async (url) => {
	const response = await fetch(url);
	return response.json();
};
const results = { loadStart: os.loadavg(), tests: {} };
const save = () => writeFile(argv.out, JSON.stringify(results, null, 1));

const backendEvents = () => json(`${BACKEND}/__metrics`);
const resetBackend = () => fetch(`${BACKEND}/__reset`);
const summarize = (events) =>
	events
		.filter((e) => e.path === '/manifest' || e.path === '/init')
		.map(
			(e) =>
				`${e.path}${e.query} ${e.status ?? 'pending'}${e.ifNoneMatch ? ' (conditional)' : ''}`
		);

/** Start a new server for a config with `.next/cache` deleted. */
const fresh = async function fresh(name) {
	const cfg = CFG[name];
	await rm(`${cfg.dir}/.next/cache`, { force: true, recursive: true });
	const server = await startServer(cfg.dir, cfg.port, cfg.env);
	return { ...server, port: cfg.port };
};

/** GET `/` over HTTP and report whether the banner is in the server HTML. */
const page = async function page(port, { token, source } = {}) {
	const headers = {};
	if (token) {
		headers['x-c15t-bench-manifest-token'] = token;
	}
	if (source) {
		headers['x-c15t-bench-manifest-source'] = source;
	}
	const t0 = performance.now();
	const res = await fetch(`http://127.0.0.1:${port}/`, { headers });
	const html = await res.text();
	return {
		bannerInHtml: html.includes('data-testid="consent-banner-root"'),
		ms: Number((performance.now() - t0).toFixed(1)),
		status: res.status,
	};
};

const describeMark = (m) => {
	const ms = m.detail?.ms === undefined ? '' : ` ${m.detail.ms.toFixed(0)}ms`;
	const message = m.detail?.message ? ` ${m.detail.message.slice(0, 90)}` : '';
	return `${m.name}${ms}${message}`;
};

/** Drain the server's timing marks for consent resolution and the routes. */
const marks = async (port) => {
	const all = await json(`http://127.0.0.1:${port}/api/bench-timing`);
	return all
		.filter(
			(m) => m.name.startsWith('resolveConsent:') || m.name.startsWith('route:')
		)
		.map(describeMark);
};

const tests = {
	async coalesce() {
		await backendControl({ cc: DEFAULT_CC, delay: 200, mode: 'ok' });
		const out = {};
		for (const name of ['S', 'D']) {
			out[name] = { newProcess: [], warmProcessColdKey: [] };
			const server = await fresh(name);
			try {
				await page(server.port);
				await page(server.port);
				for (let rep = 0; rep < 3; rep += 1) {
					const token = `coalesce-${name}-${rep}-${Date.now()}`;
					await resetBackend();
					const pages = await Promise.all(
						Array.from({ length: 5 }, () => page(server.port, { token }))
					);
					await sleep(300);
					const events = await backendEvents();
					out[name].warmProcessColdKey.push({
						originManifest: events.filter((e) => e.path === '/manifest').length,
						pageMs: pages.map((p) => p.ms),
						pagesWithBanner: pages.filter((p) => p.bannerInHtml).length,
					});
				}
			} finally {
				await stopServer(server);
			}
			for (let rep = 0; rep < 3; rep += 1) {
				await resetBackend();
				const s = await fresh(name);
				try {
					const pages = await Promise.all(
						Array.from({ length: 5 }, () => page(s.port))
					);
					await sleep(300);
					const events = await backendEvents();
					out[name].newProcess.push({
						originManifest: events.filter((e) => e.path === '/manifest').length,
						pageMs: pages.map((p) => p.ms),
						pagesWithBanner: pages.filter((p) => p.bannerInHtml).length,
					});
				} finally {
					await stopServer(s);
				}
			}
		}
		return out;
	},

	async direct() {
		await backendControl({ cc: DEFAULT_CC, delay: 200, mode: 'ok' });
		const out = {};
		for (const name of ['S', 'D']) {
			const server = await fresh(name);
			try {
				await page(server.port, { source: 'direct' });
				const token = `direct-${name}-${Date.now()}`;
				await resetBackend();
				const concurrent = await Promise.all(
					Array.from({ length: 5 }, () =>
						page(server.port, { source: 'direct', token })
					)
				);
				await sleep(300);
				const afterConcurrent = (await backendEvents()).filter(
					(e) => e.path === '/manifest'
				).length;
				await resetBackend();
				const sequential = [];
				for (let i = 0; i < 5; i += 1) {
					sequential.push(await page(server.port, { source: 'direct', token }));
				}
				await sleep(300);
				const afterSequential = (await backendEvents()).filter(
					(e) => e.path === '/manifest'
				).length;
				out[name] = {
					concurrent5: {
						originManifest: afterConcurrent,
						pageMs: concurrent.map((p) => p.ms),
					},
					sequential5: {
						originManifest: afterSequential,
						pageMs: sequential.map((p) => p.ms),
					},
				};
			} finally {
				await stopServer(server);
			}
		}
		return out;
	},

	async fail(browser) {
		const out = {};
		for (const name of ['S', 'D']) {
			await backendControl({ cc: DEFAULT_CC, delay: 200, mode: 'fail' });
			await resetBackend();
			const server = await fresh(name);
			try {
				const visit = await measurePage(browser, {
					port: server.port,
					throttle: false,
				});
				const firstOrigin = summarize(await backendEvents());
				const firstServer = await marks(server.port);
				await resetBackend();
				const concurrent = await Promise.all(
					Array.from({ length: 5 }, () => page(server.port))
				);
				await sleep(300);
				const concurrentOrigin = (await backendEvents()).filter(
					(e) => e.path === '/manifest'
				).length;
				await resetBackend();
				const sequential = [];
				for (let i = 0; i < 3; i += 1) {
					sequential.push(await page(server.port));
				}
				await sleep(300);
				const sequentialOrigin = (await backendEvents()).filter(
					(e) => e.path === '/manifest'
				).length;
				await backendControl({ mode: 'ok' });
				await resetBackend();
				const recovered = await measurePage(browser, {
					port: server.port,
					throttle: false,
				});
				out[name] = {
					concurrent5: {
						bannerInHtml: concurrent.map((p) => p.bannerInHtml),
						originManifest: concurrentOrigin,
						statuses: concurrent.map((p) => p.status),
					},
					firstVisit: {
						activeUI: visit.activeUI,
						bannerInHtml: visit.bannerInHtmlMs !== null,
						bannerInHtmlMs: visit.bannerInHtmlMs,
						bannerReadyMs: visit.bannerReadyMs,
						bannerReadyTimedOut: visit.bannerReadyTimedOut,
						browserConsentRequests: visit.sameOriginConsent,
						failures: visit.failures,
						fcpMs: visit.fcpMs,
						origin: firstOrigin,
						server: firstServer,
						status: visit.status,
						trackerLoaded: visit.trackerLoaded,
					},
					recoveredVisit: {
						activeUI: recovered.activeUI,
						bannerInHtml: recovered.bannerInHtmlMs !== null,
						origin: summarize(await backendEvents()),
						trackerLoaded: recovered.trackerLoaded,
					},
					sequential3: { originManifest: sequentialOrigin },
				};
			} finally {
				await stopServer(server);
				await backendControl({ mode: 'ok' });
			}
		}
		return out;
	},

	async gate(browser) {
		await backendControl({ cc: DEFAULT_CC, delay: 0, mode: 'ok' });
		const server = await fresh('S');
		const out = {};
		try {
			for (const action of ['accept', 'reject']) {
				const context = await browser.newContext();
				const p = await context.newPage();
				await p.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'load' });
				await p.waitForFunction(
					() => window.__c15tConsumerBench?.bannerReadyMs !== undefined
				);
				const before = await p.evaluate(() => window.__benchTrackerLoaded ?? 0);
				await p.click(`[data-testid="consent-banner-${action}-button"]`);
				await sleep(1500);
				const after = await p.evaluate(() => window.__benchTrackerLoaded ?? 0);
				out[action] = {
					trackerAfterChoice: after,
					trackerBeforeChoice: before,
				};
				await context.close();
			}
		} finally {
			await stopServer(server);
		}
		return out;
	},

	async hang(browser) {
		const out = {};
		for (const name of ['S']) {
			await backendControl({ cc: DEFAULT_CC, delay: 0, mode: 'hang' });
			await resetBackend();
			const server = await fresh(name);
			try {
				const t0 = Date.now();
				const visit = await measurePage(browser, {
					port: server.port,
					throttle: false,
				});
				out[name] = {
					activeUI: visit.activeUI,
					bannerInHtmlMs: visit.bannerInHtmlMs,
					bannerReadyMs: visit.bannerReadyMs,
					browserConsentRequests: visit.sameOriginConsent,
					fcpMs: visit.fcpMs,
					firstChunkMs: visit.firstChunkMs,
					origin: summarize(await backendEvents()),
					server: await marks(server.port),
					status: visit.status,
					trackerLoaded: visit.trackerLoaded,
					ttfbMs: visit.ttfbMs,
					wallMs: Date.now() - t0,
				};
			} finally {
				await stopServer(server);
				await backendControl({ mode: 'ok' });
			}
		}
		return out;
	},

	async stalefail() {
		await backendControl({
			cc: 'public, s-maxage=2, stale-while-revalidate=60',
			delay: 200,
			mode: 'ok',
		});
		const server = await fresh('S');
		const timeline = [];
		try {
			const token = `stalefail-${Date.now()}`;
			const t0 = Date.now();
			await page(server.port, { token });
			await marks(server.port);
			await backendControl({ mode: 'fail' });
			for (const at of [3000, 3300, 9500, 9800]) {
				const wait = t0 + at - Date.now();
				if (wait > 0) {
					await sleep(wait);
				}
				await resetBackend();
				const p = await page(server.port, { token });
				await sleep(350);
				timeline.push({
					atS: at / 1000,
					bannerInHtml: p.bannerInHtml,
					origin: summarize(await backendEvents()),
					pageMs: p.ms,
					server: await marks(server.port),
				});
			}
		} finally {
			await stopServer(server);
			await backendControl({ cc: DEFAULT_CC, mode: 'ok' });
		}
		return {
			cacheControl: 'public, s-maxage=2, stale-while-revalidate=60',
			timeline,
		};
	},

	async ttl() {
		const out = {};
		for (const name of ['S', 'D']) {
			await backendControl({
				cc: 'public, s-maxage=2, stale-while-revalidate=10',
				delay: 200,
				mode: 'ok',
			});
			const server = await fresh(name);
			const timeline = [];
			try {
				await marks(server.port).catch(() => []);
				const token = `ttl-${name}-${Date.now()}`;
				const t0 = Date.now();
				for (const at of [0, 1000, 3000, 3300, 6500, 17_000, 17_300]) {
					const wait = t0 + at - Date.now();
					if (wait > 0) {
						await sleep(wait);
					}
					await resetBackend();
					const p = await page(server.port, { token });
					await sleep(350);
					timeline.push({
						atS: at / 1000,
						origin: summarize(await backendEvents()),
						pageMs: p.ms,
						server: await marks(server.port),
					});
				}
			} finally {
				await stopServer(server);
			}
			out[name] = {
				cacheControl: 'public, s-maxage=2, stale-while-revalidate=10',
				timeline,
			};
		}
		await backendControl({ cc: DEFAULT_CC });
		return out;
	},
};

const browser = await chromium.launch({ headless: true });
try {
	for (const name of argv.only.split(',')) {
		console.log(`--- ${name}`);
		results.tests[name] = await tests[name](browser);
		console.log(JSON.stringify(results.tests[name], null, 1));
		await save();
	}
} finally {
	await browser.close();
	results.loadEnd = os.loadavg();
	await save();
}
