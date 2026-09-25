/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
// Cold-start decomposition harness.
//
// Measures five server and cache states of a packed-artifact Next.js consumer
// that resolves consent on the server through a same-origin manifest proxy
// route, for two route configurations and two network conditions:
//
//   config D  documented default: the manifest route writes the Next Data
//             Cache (manifestRevalidateSeconds unset, so 300 s) as well as
//             the SDK's in-process cache.
//   config S  site-like: C15T_MANIFEST_REVALIDATE_SECONDS=0, as the docs site
//             sets, so only the SDK's in-process cache holds the manifest.
//
//   a  warm process, warm SDK manifest cache
//   b  warm process, cold SDK manifest cache (a new upstream URL per sample,
//      which also misses the Data Cache)
//   c  new process, .next/cache kept (Data Cache on disk warm for D)
//   d  new process, .next/cache deleted (fully cold)
//   e  new process, .next/cache deleted, backend answers with no delay
//
//   condition B  4x CPU, 170 ms, 1,125,000/187,500 B/s, +200 ms backend
//   condition L  no browser throttling, +200 ms backend
//
// Usage: node run.mjs --rounds 9 [--out <file>]
import { spawn } from 'node:child_process';
import { mkdir, open, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

const ROOT = process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start';
const BACKEND = 'http://127.0.0.1:4790';
const { values: argv } = parseArgs({
	options: {
		conditions: { default: 'B,L', type: 'string' },
		configs: { default: 'D,S', type: 'string' },
		out: { default: `${ROOT}/results/main.json`, type: 'string' },
		rounds: { default: '9', type: 'string' },
		states: { default: 'a,b,d,c,e', type: 'string' },
	},
	// Other scripts import this module with their own arguments.
	strict: false,
});
const ROUNDS = Number(argv.rounds);
const CONFIG_NAMES = argv.configs.split(',');
const CONDITION_NAMES = argv.conditions.split(',');
const STATE_NAMES = argv.states.split(',');

export const CONFIGS = {
	D: { coldPort: 4731, env: {}, warmPort: 4721 },
	S: {
		coldPort: 4732,
		env: { C15T_MANIFEST_REVALIDATE_SECONDS: '0' },
		warmPort: 4722,
	},
};
const CONDITIONS = {
	B: { backendDelay: 200, throttle: true },
	L: { backendDelay: 200, throttle: false },
};
const STATE_LABELS = {
	a: 'browser:cold sdk-manifest:warm data-cache:warm process:warm cdn:not-measured',
	b: 'browser:cold sdk-manifest:cold data-cache:cold process:warm cdn:not-measured',
	c: 'browser:cold sdk-manifest:cold data-cache:warm-on-disk process:cold cdn:not-measured',
	d: 'browser:cold sdk-manifest:cold data-cache:cold process:cold cdn:not-measured',
	e: 'browser:cold sdk-manifest:cold data-cache:cold process:cold backend:instant cdn:not-measured',
};
const BANNER_MARKER = 'data-testid="consent-banner-root"';

const getJSON = async (url, init) => {
	const response = await fetch(url, init);
	return response.json();
};

export const backendControl = (params) =>
	getJSON(`${BACKEND}/__control?${new URLSearchParams(params)}`);

/**
 * Start `next start` for a built consumer and resolve once it prints
 * "Ready in". The caller owns the child and stops it with `stopServer`.
 */
export const startServer = async function startServer(
	dir,
	port,
	env,
	extraNodeArgs = []
) {
	await mkdir(`${ROOT}/logs`, { recursive: true });
	await mkdir(`${ROOT}/results`, { recursive: true });
	const log = await open(`${ROOT}/logs/server-${port}.log`, 'a');
	const spawnedAt = Date.now();
	const child = spawn(
		process.execPath,
		[
			...extraNodeArgs,
			`${dir}/node_modules/next/dist/bin/next`,
			'start',
			'-H',
			'127.0.0.1',
			'-p',
			String(port),
		],
		{
			cwd: dir,
			env: {
				...process.env,
				NEXT_TELEMETRY_DISABLED: '1',
				NODE_ENV: 'production',
				...env,
			},
			stdio: ['ignore', 'pipe', log.fd],
		}
	);
	const readyAt = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('start timeout'));
		}, 30_000);
		child.stdout.on('data', (buffer) => {
			if (String(buffer).includes('Ready in')) {
				clearTimeout(timer);
				resolve(Date.now());
			}
		});
		child.once('exit', (code) => {
			clearTimeout(timer);
			reject(new Error(`server exited ${code}`));
		});
	});
	child.stdout.resume();
	return { child, log, readyAt, spawnedAt };
};

/** Stop the exact child `startServer` spawned and wait for it to exit. */
export const stopServer = async function stopServer(server) {
	if (!server) {
		return;
	}
	await new Promise((resolve) => {
		const timer = setTimeout(() => {
			server.child.kill('SIGKILL');
		}, 5000);
		server.child.once('exit', () => {
			clearTimeout(timer);
			resolve();
		});
		server.child.kill('SIGTERM');
	});
	await server.log.close();
};

/**
 * GET a page over raw HTTP (no compression) and time the headers, each body
 * chunk, the chunk that completes the banner markup, and the end.
 * `hrStartUs` is on the `process.hrtime` clock for profile alignment.
 */
export const readHtmlStream = function readHtmlStream(url, extraHeaders = {}) {
	return new Promise((resolve, reject) => {
		const hrStart = process.hrtime.bigint();
		const startedAt = Date.now();
		const t0 = performance.now();
		const elapsed = () => Number((performance.now() - t0).toFixed(2));
		const chunks = [];
		const req = request(
			url,
			{
				agent: false,
				headers: {
					accept: 'text/html',
					'accept-encoding': 'identity',
					...extraHeaders,
				},
			},
			(res) => {
				const headersMs = elapsed();
				let text = '';
				let bannerMs = null;
				res.on('data', (buffer) => {
					text += buffer.toString('utf8');
					chunks.push([elapsed(), buffer.length]);
					if (bannerMs === null && text.includes(BANNER_MARKER)) {
						bannerMs = elapsed();
					}
				});
				res.on('end', () => {
					resolve({
						bannerMs,
						bytes: Buffer.byteLength(text),
						chunkCount: chunks.length,
						chunks,
						doneMs: elapsed(),
						firstChunkMs: chunks[0]?.[0] ?? null,
						headersMs,
						hrStartUs: Number(hrStart / 1000n),
						startedAt,
						status: res.statusCode,
					});
				});
				res.on('error', reject);
			}
		);
		req.setTimeout(30_000, () => {
			req.destroy(new Error('timeout'));
		});
		req.on('error', reject);
		req.end();
	});
};

const fetchCacheInfo = async function fetchCacheInfo(dir) {
	const path = `${dir}/.next/cache/fetch-cache`;
	try {
		const files = (await readdir(path)).filter((f) => !f.startsWith('.'));
		let newest = 0;
		for (const file of files) {
			const info = await stat(`${path}/${file}`);
			newest = Math.max(newest, info.mtimeMs);
		}
		return {
			files: files.length,
			newestAgeS: newest ? (Date.now() - newest) / 1000 : null,
		};
	} catch {
		return { files: 0, newestAgeS: null };
	}
};

/**
 * Load one page in a new browser context and return navigation, paint,
 * stream, and consent milestones. `token` gives the request its own upstream
 * manifest URL; `source: 'direct'` points resolveConsent at the backend.
 */
export const measurePage = async function measurePage(
	browser,
	{ port, token, throttle, path = '/', source }
) {
	const headers = {};
	if (token) {
		headers['x-c15t-bench-manifest-token'] = token;
	}
	if (source) {
		headers['x-c15t-bench-manifest-source'] = source;
	}
	const context = await browser.newContext({
		extraHTTPHeaders: headers,
		viewport: { height: 720, width: 1280 },
	});
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	if (throttle) {
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
		await cdp.send('Network.emulateNetworkConditions', {
			downloadThroughput: 1_125_000,
			latency: 170,
			offline: false,
			uploadThroughput: 187_500,
		});
	}
	const url = `http://127.0.0.1:${port}${path}`;
	const doc = {
		chunks: [],
		headersAt: null,
		id: null,
		start: null,
		streamError: null,
		wall: null,
	};
	cdp.on('Network.requestWillBeSent', (event) => {
		if (
			doc.id ||
			event.type !== 'Document' ||
			!event.request.url.startsWith(url)
		) {
			return;
		}
		doc.id = event.requestId;
		doc.start = event.timestamp;
		doc.wall = event.wallTime * 1000;
	});
	cdp.on('Network.responseReceived', (event) => {
		if (event.requestId === doc.id) {
			doc.headersAt = event.timestamp;
		}
	});
	cdp.on('Network.dataReceived', (event) => {
		if (event.requestId === doc.id) {
			doc.chunks.push({ bytes: event.dataLength, t: event.timestamp });
		}
	});
	await page.addInitScript(() => {
		window.__cold = { bannerInDomMs: null, lcp: null };
		new MutationObserver(() => {
			if (
				window.__cold.bannerInDomMs === null &&
				document.querySelector('[data-testid="consent-banner-root"]')
			) {
				window.__cold.bannerInDomMs = performance.now();
			}
		}).observe(document, { childList: true, subtree: true });
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				window.__cold.lcp = entry.startTime;
			}
		}).observe({ buffered: true, type: 'largest-contentful-paint' });
	});
	const failures = [];
	page.on('pageerror', (error) => failures.push(error.message));
	const navigatedAt = Date.now();
	const response = await page.goto(url, { timeout: 60_000, waitUntil: 'load' });
	let bannerReadyTimedOut = false;
	try {
		await page.waitForFunction(
			() => window.__c15tConsumerBench?.bannerReadyMs !== undefined,
			{},
			{ timeout: 20_000 }
		);
	} catch {
		bannerReadyTimedOut = true;
	}
	await sleep(500);
	const metrics = await page.evaluate(() => {
		const [nav] = performance.getEntriesByType('navigation');
		return {
			activeUI: window.__c15tConsumerBench?.activeUI ?? null,
			bannerInDom: Boolean(
				document.querySelector('[data-testid="consent-banner-root"]')
			),
			bannerInDomMs: window.__cold.bannerInDomMs,
			bannerReadyMs: window.__c15tConsumerBench?.bannerReadyMs ?? null,
			domContentLoadedMs: nav.domContentLoadedEventEnd,
			fcpMs:
				performance.getEntriesByName('first-contentful-paint')[0]?.startTime ??
				null,
			htmlDoneMs: nav.responseEnd,
			lcpMs: window.__cold.lcp,
			loadMs: nav.loadEventEnd,
			promptSettledMs: window.__c15tConsumerBench?.promptSettledMs ?? null,
			sameOriginConsent: performance
				.getEntriesByType('resource')
				.filter((r) => /\/c15t\/|tracker\.js/u.test(r.name))
				.map((r) => ({ ms: r.duration, startMs: r.startTime, url: r.name })),
			timeOrigin: performance.timeOrigin,
			trackerLoaded: window.__benchTrackerLoaded ?? 0,
			ttfbMs: nav.responseStart,
		};
	});
	// Map the banner marker's byte offset in the finished document onto the
	// decoded byte counts of each `dataReceived` event: the chunk that brings
	// the running total past the end of the marker delivered the banner.
	let bodyBytes = null;
	let markerEnd = null;
	try {
		const body = await cdp.send('Network.getResponseBody', {
			requestId: doc.id,
		});
		const text = body.base64Encoded
			? Buffer.from(body.body, 'base64').toString('utf8')
			: body.body;
		bodyBytes = Buffer.byteLength(text);
		const index = text.indexOf(BANNER_MARKER);
		if (index >= 0) {
			markerEnd = Buffer.byteLength(
				text.slice(0, index + BANNER_MARKER.length)
			);
		}
	} catch (error) {
		doc.streamError = String(error);
	}
	await context.close();

	const offset = doc.wall === null ? 0 : doc.wall - metrics.timeOrigin;
	const rel = (t) => Number((offset + (t - doc.start) * 1000).toFixed(1));
	let cumulative = 0;
	let bannerChunk = null;
	for (const [index, chunk] of doc.chunks.entries()) {
		cumulative += chunk.bytes;
		if (bannerChunk === null && markerEnd !== null && cumulative >= markerEnd) {
			bannerChunk = index;
		}
	}
	return {
		...metrics,
		bannerInFirstChunk: bannerChunk === 0,
		bannerInHtmlMs:
			bannerChunk === null ? null : rel(doc.chunks[bannerChunk].t),
		bannerReadyTimedOut,
		bodyBytes,
		chunkCount: doc.chunks.length,
		chunkTimes: doc.chunks.map((c) => [rel(c.t), c.bytes]),
		docOffsetMs: Number(offset.toFixed(1)),
		failures,
		firstChunkMs: doc.chunks[0] ? rel(doc.chunks[0].t) : null,
		headersMs: doc.headersAt === null ? null : rel(doc.headersAt),
		navigatedAt,
		receivedBytes: cumulative,
		status: response?.status() ?? null,
		streamError: doc.streamError,
		url,
	};
};

/** Interleaved cell order for a round: alternate conditions and configs, rotate states. */
const nextOrder = function nextOrder(round) {
	const rotate = (list, n) => list.map((_, i) => list[(i + n) % list.length]);
	const conditions =
		round % 2 ? [...CONDITION_NAMES].reverse() : CONDITION_NAMES;
	const configs = round % 2 ? [...CONFIG_NAMES].reverse() : CONFIG_NAMES;
	const states = rotate(STATE_NAMES, round % STATE_NAMES.length);
	const cells = [];
	for (const condition of conditions) {
		for (const config of configs) {
			for (const state of states) {
				cells.push({ condition, config, state });
			}
		}
	}
	return cells;
};

const countPath = (events, path, status) =>
	events.filter(
		(e) => e.path === path && (status === undefined || e.status === status)
	).length;

const main = async function main() {
	const browser = await chromium.launch({ headless: true });
	const warm = {};
	const rows = [];
	const loadStart = os.loadavg();
	try {
		for (const name of CONFIG_NAMES) {
			const cfg = CONFIGS[name];
			warm[name] = await startServer(
				`${ROOT}/builds/${name}-warm`,
				cfg.warmPort,
				cfg.env
			);
			await backendControl({ delay: 0, mode: 'ok' });
			for (let i = 0; i < 3; i += 1) {
				await (await fetch(`http://127.0.0.1:${cfg.warmPort}/`)).text();
				await (await fetch(`http://127.0.0.1:${cfg.warmPort}/docs`)).text();
			}
		}
		for (let round = 0; round <= ROUNDS; round += 1) {
			for (const cell of nextOrder(round)) {
				const cfg = CONFIGS[cell.config];
				const cond = CONDITIONS[cell.condition];
				const delay = cell.state === 'e' ? 0 : cond.backendDelay;
				await backendControl({ delay, mode: 'ok' });
				let server = null;
				let port = cfg.warmPort;
				let token = null;
				let dataCache = null;
				const coldDir = `${ROOT}/builds/${cell.config}-cold`;
				if (cell.state === 'b') {
					token = `r${round}-${cell.config}${cell.condition}-${Date.now()}`;
				}
				if (['c', 'd', 'e'].includes(cell.state)) {
					if (cell.state !== 'c') {
						await rm(`${coldDir}/.next/cache`, {
							force: true,
							recursive: true,
						});
					}
					dataCache = await fetchCacheInfo(coldDir);
					server = await startServer(coldDir, cfg.coldPort, cfg.env);
					port = cfg.coldPort;
				} else {
					// Drain marks left by earlier samples on the warm server.
					await fetch(`http://127.0.0.1:${port}/api/bench-timing`);
				}
				await fetch(`${BACKEND}/__reset`);
				const load = os.loadavg();
				let result;
				try {
					result = await measurePage(browser, {
						port,
						throttle: cond.throttle,
						token,
					});
					result.serverMarks = await getJSON(
						`http://127.0.0.1:${port}/api/bench-timing`
					);
					result.backendEvents = await getJSON(`${BACKEND}/__metrics`);
				} finally {
					await stopServer(server);
				}
				const origin = result.backendEvents;
				const row = {
					...cell,
					...result,
					backendDelayMs: delay,
					coldState: STATE_LABELS[cell.state],
					dataCacheBeforeStart: dataCache,
					loadavg: load,
					originInit: countPath(origin, '/init'),
					originManifest: countPath(origin, '/manifest'),
					originManifest304: countPath(origin, '/manifest', 304),
					originSessions: countPath(origin, '/sessions'),
					readyAt: server?.readyAt ?? null,
					round,
					spawnedAt: server?.spawnedAt ?? null,
					token,
					warmup: round === 0,
				};
				rows.push(row);
				await writeFile(argv.out, JSON.stringify({ loadStart, rows }, null, 1));
				console.log(
					JSON.stringify({
						...cell,
						bannerHtml: row.bannerInHtmlMs,
						chunk1: row.firstChunkMs,
						fcp: row.fcpMs,
						init: row.originInit,
						load: load[0].toFixed(1),
						man: row.originManifest,
						r: round,
						ready: row.bannerReadyMs && Math.round(row.bannerReadyMs),
						ttfb: Math.round(row.ttfbMs),
					})
				);
			}
		}
	} finally {
		for (const server of Object.values(warm)) {
			await stopServer(server);
		}
		await browser.close();
		const loadEnd = os.loadavg();
		await writeFile(
			argv.out,
			JSON.stringify({ loadEnd, loadStart, rows }, null, 1)
		);
		console.log('load start', loadStart, 'end', loadEnd);
	}
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
	await main();
}
