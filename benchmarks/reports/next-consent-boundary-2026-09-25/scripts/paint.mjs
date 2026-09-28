// Interleaved paint timeline per arm: shell arrival, server consent
// resolution, content chunk arrival, reveal, CSS completion, FCP, LCP.
//
// Usage:
//   node paint.mjs --condition native|B --samples 7 --route /docs \
//     --scenarios fresh,cold,saved-accept,saved-reject --out out.json \
//     a=https://127.0.0.1:4221@4211 b=https://127.0.0.1:4222@4212 ...
// `<label>=<browserURL>@<upstreamHttpPort>`: the browser goes through the
// HTTP/2 proxy; server timings are read from the upstream port directly.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// Resolve Playwright/Lighthouse from the directory the script runs in
// (see the report README for the tools install).
const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : fallback;
};
const condition = opt('condition', 'native');
const samples = Number(opt('samples', '7'));
const route = opt('route', '/docs');
const scenarios = opt(
	'scenarios',
	'fresh,cold,saved-accept,saved-reject'
).split(',');
const outPath = opt('out', `paint-${condition}.json`);
const arms = args
	.filter((a) => /^[a-z0-9]+=/u.test(a))
	.map((a) => {
		const [label, rest] = a.split('=');
		const [url, port] = rest.split('@');
		return { label, port: Number(port), url };
	});

// Profile B from the site investigation, and the 4x CPU profile of its
// stream-reveal measurement (unthrottled network).
const CONDITIONS = {
	B: { cpu: 4, down: 1_125_000, latency: 170, up: 187_500 },
	cpu4: { cpu: 4 },
	native: null,
};
// `--http-cache warm`: load the route once in the same context first, so
// static assets come from the HTTP cache (a returning visitor).
const httpCache = opt('http-cache', 'cold');

const instrument = () => {
	const m = {
		bannerInDomAt: null,
		bannerVisibleDomAt: null,
		contentInDomAt: null,
		contentVisibleAt: null,
		fcp: null,
		hydratedAt: null,
		lcp: null,
		lcpEl: null,
		longTasks: [],
		reveals: [],
		rtFirst: null,
	};
	window.__m = m;
	for (const name of ['$RC', '$RV', '$RS']) {
		let wrapped;
		Object.defineProperty(window, name, {
			configurable: true,
			get() {
				return wrapped;
			},
			set(original) {
				wrapped = (...a) => {
					m.reveals.push({ name, rt: window.$RT, t: performance.now() });
					return original(...a);
				};
			},
		});
	}
	let rt;
	Object.defineProperty(window, '$RT', {
		configurable: true,
		get() {
			return rt;
		},
		set(v) {
			rt = v;
			if (m.rtFirst === null) {
				m.rtFirst = v;
			}
		},
	});
	let probe;
	Object.defineProperty(window, '__c15tConsumerBench', {
		configurable: true,
		get() {
			return probe;
		},
		set(v) {
			probe = v;
			if (m.hydratedAt === null) {
				m.hydratedAt = performance.now();
			}
		},
	});
	const hidden = (el) => Boolean(el.closest('[hidden]'));
	const scan = () => {
		const now = performance.now();
		const content = document.querySelector('[data-bench-content]');
		if (content) {
			m.contentInDomAt ??= now;
			if (m.contentVisibleAt === null && !hidden(content)) {
				m.contentVisibleAt = now;
			}
		}
		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		if (banner) {
			m.bannerInDomAt ??= now;
			if (m.bannerVisibleDomAt === null && !hidden(banner)) {
				m.bannerVisibleDomAt = now;
			}
		}
	};
	new MutationObserver(scan).observe(document, {
		childList: true,
		subtree: true,
	});
	new PerformanceObserver((list) => {
		for (const e of list.getEntries()) {
			if (e.name === 'first-contentful-paint') {
				m.fcp = e.startTime;
			}
		}
	}).observe({ buffered: true, type: 'paint' });
	new PerformanceObserver((list) => {
		for (const e of list.getEntries()) {
			m.lcp = e.startTime;
			m.lcpEl = e.element
				? e.element.tagName + (e.element.id ? `#${e.element.id}` : '')
				: null;
		}
	}).observe({ buffered: true, type: 'largest-contentful-paint' });
	try {
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) {
				m.longTasks.push([e.startTime, e.duration]);
			}
		}).observe({ buffered: true, type: 'longtask' });
	} catch {
		// Long task timing is optional.
	}
};

const load = () => execSync('uptime').toString().trim();

const newContext = async (browser, arm, storageState, cookies) => {
	const context = await browser.newContext({
		ignoreHTTPSErrors: true,
		storageState,
		viewport: { height: 720, width: 1280 },
	});
	await context.addCookies(
		Object.entries(cookies).map(([name, value]) => ({
			domain: '127.0.0.1',
			name,
			path: '/',
			value,
		}))
	);
	return context;
};

const captureSaved = async (browser, arm, choice) => {
	const context = await newContext(browser, arm, undefined, {});
	const page = await context.newPage();
	await page.goto(`${arm.url}${route}`, { waitUntil: 'load' });
	const button = page.locator(
		`[data-testid="consent-banner-${choice}-button"]`
	);
	await button.waitFor({ state: 'visible', timeout: 30_000 });
	await page.waitForFunction(
		() => window.__c15tConsumerBench !== undefined,
		null,
		{ timeout: 30_000 }
	);
	await button.click();
	await page.waitForFunction(
		() => (window.__c15tConsumerBench?.onChoiceRecordedCount ?? 0) > 0,
		null,
		{ timeout: 30_000 }
	);
	await page.waitForTimeout(300);
	const state = await context.storageState();
	await context.close();
	// Keep only the consent cookie and this origin's storage.
	return {
		cookies: state.cookies.filter((c) => !c.name.startsWith('bench-')),
		origins: state.origins,
	};
};

const measure = async (browser, arm, scenario, saved) => {
	const sample = randomUUID();
	const cookies = { 'bench-sample': sample };
	if (scenario === 'cold') {
		cookies['bench-manifest'] = `cold-${randomUUID()}`;
	}
	const storageState = scenario.startsWith('saved-')
		? saved[arm.label][scenario]
		: undefined;
	const context = await newContext(browser, arm, storageState, cookies);
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	await cdp.send('Network.setCacheDisabled', {
		cacheDisabled: httpCache !== 'warm',
	});
	if (httpCache === 'warm') {
		const primer = await context.newPage();
		await primer.goto(`${arm.url}${route}`, {
			timeout: 60_000,
			waitUntil: 'load',
		});
		await primer.waitForTimeout(300);
		await primer.close();
	}
	const c = CONDITIONS[condition];
	if (c?.latency) {
		await cdp.send('Network.emulateNetworkConditions', {
			downloadThroughput: c.down,
			latency: c.latency,
			offline: false,
			uploadThroughput: c.up,
		});
	}
	if (c?.cpu) {
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.cpu });
	}
	const requests = [];
	page.on('request', (r) => {
		const u = new URL(r.url());
		if (
			u.pathname === '/tracker.js' ||
			u.pathname === '/embed-frame.html' ||
			u.pathname.startsWith('/api/')
		) {
			requests.push({ at: Date.now(), path: u.pathname });
		}
	});
	await page.addInitScript(instrument);
	const navStart = Date.now();
	await page.goto(`${arm.url}${route}`, { timeout: 60_000, waitUntil: 'load' });
	if (scenario === 'fresh' || scenario === 'cold') {
		await page
			.locator('[data-testid="consent-banner-accept-button"]')
			.waitFor({ state: 'visible', timeout: 30_000 });
	}
	await page.waitForFunction(
		() => window.__c15tConsumerBench?.promptSettledMs !== undefined,
		null,
		{ timeout: 30_000 }
	);
	await page.waitForTimeout(600);
	const metrics = await page.evaluate(() => {
		const m = window.__m;
		const [nav] = performance.getEntriesByType('navigation');
		const res = performance.getEntriesByType('resource');
		const css = res.filter(
			(e) => e.initiatorType === 'link' && e.name.includes('.css')
		);
		const js = res.filter((e) => e.initiatorType === 'script');
		const probe = window.__c15tConsumerBench ?? {};
		const bannerEl = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		const tracker = res.find((e) => e.name.includes('/tracker.js'));
		return {
			activeUI: probe.activeUI ?? null,
			bannerInDomAt: m.bannerInDomAt,
			bannerPresent: Boolean(bannerEl),
			bannerReadyMs: probe.bannerReadyMs ?? null,
			bannerVisibleDomAt: m.bannerVisibleDomAt,
			contentInDomAt: m.contentInDomAt,
			contentVisibleAt: m.contentVisibleAt,
			cssCount: css.length,
			cssDoneAt: css.length ? Math.max(...css.map((e) => e.responseEnd)) : null,
			cssTransfer: css.reduce((s, e) => s + e.transferSize, 0),
			domContentLoaded: nav.domContentLoadedEventEnd,
			fcp: m.fcp,
			hasStoredChoice: probe.hasStoredChoice ?? null,
			htmlEnd: nav.responseEnd,
			hydratedAt: m.hydratedAt,
			jsCount: js.length,
			jsDoneAt: js.length ? Math.max(...js.map((e) => e.responseEnd)) : null,
			jsTransfer: js.reduce((s, e) => s + e.transferSize, 0),
			lcp: m.lcp,
			lcpEl: m.lcpEl,
			load: nav.loadEventEnd,
			longTaskMsBeforeFcp: m.longTasks
				.filter(([s]) => m.fcp === null || s < m.fcp)
				.reduce((s, [, d]) => s + d, 0),
			promptSettledMs: probe.promptSettledMs ?? null,
			protocol: nav.nextHopProtocol,
			reveals: m.reveals,
			rtFirst: m.rtFirst,
			timeOrigin: performance.timeOrigin,
			trackerLoadedAt: window.__benchTrackerLoadedAt ?? null,
			trackerStart: tracker ? tracker.startTime : null,
			ttfb: nav.responseStart,
		};
	});
	await context.close();
	let server = null;
	try {
		const r = await fetch(
			`http://127.0.0.1:${arm.port}/api/bench-consent/timings?sample=${sample}`
		);
		server = await r.json();
	} catch {
		// Browser-init arms record no server timing.
	}
	if (server) {
		server.startedRel = server.startedAt - metrics.timeOrigin;
		server.resolvedRel = server.resolvedAt - metrics.timeOrigin;
		server.durationMs = server.resolvedAt - server.startedAt;
	}
	const firstRV = metrics.reveals.find((r) => r.name === '$RV');
	return {
		...metrics,
		rcAt: metrics.reveals.find((r) => r.name === '$RC')?.t ?? null,
		requests: requests.map((r) => ({ ...r, at: r.at - navStart })),
		revealAt: firstRV ? firstRV.t : null,
		server,
	};
};

const result = {
	arms,
	condition,
	conditionDetail: CONDITIONS[condition],
	httpCache,
	route,
	rows: [],
	samples,
	startLoad: load(),
};
const browser = await chromium.launch();
try {
	const saved = {};
	for (const arm of arms) {
		saved[arm.label] = {};
		if (scenarios.includes('saved-accept')) {
			// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
			saved[arm.label]['saved-accept'] = await captureSaved(
				browser,
				arm,
				'accept'
			);
		}
		if (scenarios.includes('saved-reject')) {
			// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
			saved[arm.label]['saved-reject'] = await captureSaved(
				browser,
				arm,
				'reject'
			);
		}
	}
	for (const scenario of scenarios) {
		result.loadAt ??= {};
		result.loadAt[scenario] = { start: load() };
		// One warm-up per arm and scenario.
		for (const arm of arms) {
			// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
			await measure(browser, arm, scenario, saved);
		}
		for (let i = 0; i < samples; i += 1) {
			// Rotate the order each round so no arm always runs first.
			const order = arms.map((_, k) => arms[(k + i) % arms.length]);
			for (const arm of order) {
				let row;
				try {
					// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
					row = await measure(browser, arm, scenario, saved);
				} catch (error) {
					row = { error: String(error) };
				}
				result.rows.push({ arm: arm.label, i, scenario, ...row });
				console.log(
					condition,
					scenario,
					arm.label,
					i,
					`fcp=${row.fcp?.toFixed?.(0)} lcp=${row.lcp?.toFixed?.(0)} ttfb=${row.ttfb?.toFixed?.(0)} content=${row.contentInDomAt?.toFixed?.(0)} reveal=${row.revealAt?.toFixed?.(0)} rt=${row.rtFirst?.toFixed?.(0)} css=${row.cssDoneAt?.toFixed?.(0)} srv=${row.server?.durationMs?.toFixed?.(1)} bannerDom=${row.bannerVisibleDomAt?.toFixed?.(0)} ready=${row.bannerReadyMs?.toFixed?.(0)} ui=${row.activeUI} ${row.error ?? ''}`
				);
			}
		}
		result.loadAt[scenario].end = load();
		writeFileSync(outPath, JSON.stringify(result, null, 2));
	}
} finally {
	await browser.close();
}
result.endLoad = load();
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(result.startLoad);
console.log(result.endLoad);
