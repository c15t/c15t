// Consent enforcement check on the /embed route (ConsentGate iframe under
// marketing + a measurement-gated script via the provider's `scripts`).
// Asserts on network requests seen by the browser, not on the DOM.
//
// Usage: node enforce.mjs --out out.json --samples 3 a=https://127.0.0.1:4221 ...
// Cases (manifest source x stored consent):
//   warm | cold | fail500 | hang   x   fresh | saved-accept | saved-reject
// The `bench-manifest` cookie selects a per-sample upstream manifest URL for
// both the server resolution and the browser init route, so a failing case
// fails both paths.
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
const outPath = opt('out', 'enforce.json');
const samples = Number(opt('samples', '3'));
const sources = opt('sources', 'warm,cold,fail500,hang').split(',');
const visits = opt('visits', 'fresh,saved-accept,saved-reject').split(',');
const arms = args
	.filter((a) => /^[a-z0-9]+=/u.test(a))
	.map((a) => {
		const [label, url] = a.split('=');
		return { label, url };
	});

const load = () => execSync('uptime').toString().trim();

const context = async (browser, storageState, cookies) => {
	const ctx = await browser.newContext({
		ignoreHTTPSErrors: true,
		storageState,
		viewport: { height: 720, width: 1280 },
	});
	await ctx.addCookies(
		Object.entries(cookies).map(([name, value]) => ({
			domain: '127.0.0.1',
			name,
			path: '/',
			value,
		}))
	);
	return ctx;
};

const captureSaved = async (browser, arm, choice) => {
	const ctx = await context(browser, undefined, {});
	const page = await ctx.newPage();
	await page.goto(`${arm.url}/embed`, { waitUntil: 'load' });
	const button = page.locator(
		`[data-testid="consent-banner-${choice}-button"]`
	);
	await button.waitFor({ state: 'visible', timeout: 30_000 });
	await page.waitForFunction(() => window.__c15tConsumerBench !== undefined);
	await button.click();
	await page.waitForFunction(
		() => (window.__c15tConsumerBench?.onChoiceRecordedCount ?? 0) > 0
	);
	await page.waitForTimeout(300);
	const state = await ctx.storageState();
	await ctx.close();
	return {
		cookies: state.cookies.filter((c) => !c.name.startsWith('bench-')),
		origins: state.origins,
	};
};

const run = async (browser, arm, source, visit, saved) => {
	const cookies = {};
	if (source !== 'warm') {
		cookies['bench-manifest'] =
			`${source === 'cold' ? 'cold' : source}-${randomUUID()}`;
	}
	const ctx = await context(
		browser,
		visit === 'fresh' ? undefined : saved[arm.label][visit],
		cookies
	);
	const page = await ctx.newPage();
	const t0 = Date.now();
	const requests = [];
	page.on('request', (r) => {
		const u = new URL(r.url());
		if (
			['/tracker.js', '/embed-frame.html', '/api/c15t/init'].includes(
				u.pathname
			)
		) {
			requests.push({ at: Date.now() - t0, path: u.pathname });
		}
	});
	page.on('requestfailed', (r) => {
		const u = new URL(r.url());
		if (u.pathname === '/api/c15t/init') {
			requests.push({ at: Date.now() - t0, path: 'init-failed' });
		}
	});
	page.on('response', (r) => {
		const u = new URL(r.url());
		if (u.pathname === '/api/c15t/init') {
			requests.push({ at: Date.now() - t0, path: `init-${r.status()}` });
		}
	});
	const timeline = [];
	await page.goto(`${arm.url}/embed`, { timeout: 60_000, waitUntil: 'commit' });
	const watchMs = source === 'hang' ? 14_000 : 3_000;
	const until = Date.now() + watchMs;
	let last = '';
	while (Date.now() < until) {
		const previous = last;
		// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
		const s = await page
			.evaluate(() => {
				const p = window.__c15tConsumerBench;
				const fcp =
					performance.getEntriesByName('first-contentful-paint')[0]
						?.startTime ?? null;
				const content = document.querySelector('[data-bench-content]');
				return JSON.stringify({
					banner: Boolean(
						document.querySelector('[data-testid="consent-banner-root"]')
					),
					content: Boolean(content && !content.closest('[hidden]')),
					fcp: fcp !== null,
					iframe: Boolean(
						document.querySelector('iframe[src="/embed-frame.html"]')
					),
					placeholder: Boolean(
						document.querySelector('[data-testid="frame-placeholder"]')
					),
					settled: typeof p?.promptSettledMs === 'number',
					ui: p?.activeUI ?? null,
				});
			})
			.catch(() => previous);
		if (s !== last) {
			timeline.push({ at: Date.now() - t0, ...JSON.parse(s) });
			last = s;
		}
		// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
		await page.waitForTimeout(25);
	}
	const final = await page.evaluate(() => ({
		activeUI: window.__c15tConsumerBench?.activeUI ?? null,
		fcp:
			performance.getEntriesByName('first-contentful-paint')[0]?.startTime ??
			null,
		promptSettledMs: window.__c15tConsumerBench?.promptSettledMs ?? null,
		timeOrigin: performance.timeOrigin,
	}));
	// Positive control on fresh visits: accepting loads both.
	let afterAccept = null;
	if (visit === 'fresh' && timeline.some((t) => t.banner)) {
		const n = requests.length;
		await page.locator('[data-testid="consent-banner-accept-button"]').click();
		await page.waitForTimeout(1500);
		afterAccept = requests.slice(n).map((r) => r.path);
	}
	await ctx.close();
	const settledAt =
		final.promptSettledMs === null
			? null
			: final.timeOrigin + final.promptSettledMs - t0;
	const tracker = requests.filter((r) => r.path === '/tracker.js');
	const embed = requests.filter((r) => r.path === '/embed-frame.html');
	return {
		activeUI: final.activeUI,
		afterAccept,
		arm: arm.label,
		contentVisibleAt: timeline.find((t) => t.content)?.at ?? null,
		embedBeforeSettle: embed.filter(
			(r) => settledAt === null || r.at < settledAt
		).length,
		embedRequests: embed.map((r) => r.at),
		fcpMs: final.fcp,
		initRequests: requests.filter(
			(r) => r.path.startsWith('init') || r.path === '/api/c15t/init'
		),
		settledAt,
		source,
		timeline,
		trackerBeforeSettle: tracker.filter(
			(r) => settledAt === null || r.at < settledAt
		).length,
		trackerRequests: tracker.map((r) => r.at),
		visit,
		watchMs,
	};
};

const result = { rows: [], startLoad: load() };
const browser = await chromium.launch();
try {
	const saved = {};
	for (const arm of arms) {
		saved[arm.label] = {
			// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
			'saved-accept': await captureSaved(browser, arm, 'accept'),
			// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
			'saved-reject': await captureSaved(browser, arm, 'reject'),
		};
	}
	for (const source of sources) {
		for (const visit of visits) {
			for (let i = 0; i < samples; i += 1) {
				for (const arm of arms) {
					// oxlint-disable-next-line no-await-in-loop -- Samples run one at a time so they do not compete.
					const row = await run(browser, arm, source, visit, saved);
					result.rows.push({ i, ...row });
					console.log(
						`${arm.label} ${source} ${visit} #${i}: settled=${row.settledAt?.toFixed?.(0)} ui=${row.activeUI} contentVisible=${row.contentVisibleAt} fcp=${row.fcpMs?.toFixed?.(0)} tracker=${JSON.stringify(row.trackerRequests)} embed=${JSON.stringify(row.embedRequests)} beforeSettle=${row.trackerBeforeSettle}/${row.embedBeforeSettle} init=${JSON.stringify(row.initRequests.map((r) => `${r.path}@${r.at}`))} afterAccept=${JSON.stringify(row.afterAccept)}`
					);
				}
			}
		}
		writeFileSync(outPath, JSON.stringify(result, null, 2));
	}
} finally {
	await browser.close();
}
result.endLoad = load();
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(result.startLoad);
console.log(result.endLoad);
