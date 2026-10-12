// Interleaved Lighthouse 13.5.0 mobile runs (default simulated throttling)
// over the HTTP/2 proxies. One warm-up per arm and route, then N runs with a
// rotating arm order. Fresh visitor, warm SDK manifest.
// Usage: node lh.mjs <runs> <out.json> <routes comma> <label>=<url> ...
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Lighthouse 13.5.0, chrome-launcher and Playwright resolve from the
// directory the script runs in (see the report README).
const require = createRequire(join(process.cwd(), 'package.json'));
const load = (id) => import(pathToFileURL(require.resolve(id)).href);
const { default: lighthouse } = await load('lighthouse');
const { launch } = await load('chrome-launcher');
const { chromium } = require('playwright');

const [runsArg, outPath, routesArg, ...armArgs] = process.argv.slice(2);
const runs = Number(runsArg);
const routes = routesArg.split(',');
const arms = armArgs.map((arg) => {
	const [label, url] = arg.split('=');
	return { label, url };
});
const chrome = await launch({
	chromeFlags: [
		'--headless',
		'--disable-dev-shm-usage',
		'--no-first-run',
		'--ignore-certificate-errors',
	],
	chromePath: chromium.executablePath(),
	logLevel: 'error',
});
const rows = [];
const startLoad = execSync('uptime').toString().trim();
// oxlint-disable-next-line complexity -- One flat mapping of Lighthouse audits.
const run = async (arm, route, index) => {
	const result = await lighthouse(`${arm.url}${route}`, {
		logLevel: 'error',
		onlyCategories: ['performance'],
		output: 'json',
		port: chrome.port,
	});
	const { lhr } = result;
	const value = (id) => lhr.audits[id]?.numericValue ?? null;
	const reqs = lhr.audits['network-requests']?.details?.items ?? [];
	const css = reqs.filter((item) => item.resourceType === 'Stylesheet');
	return {
		arm: arm.label,
		cssCount: css.length,
		cssTransfer: css.reduce((sum, item) => sum + (item.transferSize ?? 0), 0),
		fcp: value('first-contentful-paint'),
		index,
		lcp: value('largest-contentful-paint'),
		lcpElement:
			lhr.audits['largest-contentful-paint-element']?.details?.items?.[0]
				?.items?.[0]?.node?.selector ?? null,
		observedFcp:
			lhr.audits.metrics?.details?.items?.[0]?.observedFirstContentfulPaint ??
			null,
		protocol: reqs[0]?.protocol ?? null,
		route,
		runtimeError: lhr.runtimeError?.code ?? null,
		score: lhr.categories.performance.score * 100,
		speedIndex: value('speed-index'),
		tbt: value('total-blocking-time'),
	};
};
try {
	for (const route of routes) {
		for (const arm of arms) {
			// oxlint-disable-next-line no-await-in-loop -- Runs are sequential so they do not compete.
			await run(arm, route, -1);
		}
		for (let i = 0; i < runs; i += 1) {
			const order = arms.map((_, k) => arms[(k + i) % arms.length]);
			for (const arm of order) {
				// oxlint-disable-next-line no-await-in-loop -- Runs are sequential so they do not compete.
				const row = await run(arm, route, i);
				rows.push(row);
				console.log(JSON.stringify(row));
			}
		}
	}
} finally {
	await chrome.kill();
}
const endLoad = execSync('uptime').toString().trim();
const med = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const summary = {};
for (const route of routes) {
	for (const arm of arms) {
		const sel = rows.filter((r) => r.arm === arm.label && r.route === route);
		summary[`${arm.label} ${route}`] = {
			fcp: [
				med(sel.map((r) => r.fcp)),
				Math.min(...sel.map((r) => r.fcp)),
				Math.max(...sel.map((r) => r.fcp)),
			],
			lcp: med(sel.map((r) => r.lcp)),
			n: sel.length,
			observedFcp: [
				med(sel.map((r) => r.observedFcp)),
				Math.min(...sel.map((r) => r.observedFcp)),
				Math.max(...sel.map((r) => r.observedFcp)),
			],
			protocol: sel[0]?.protocol,
			score: med(sel.map((r) => r.score)),
		};
	}
}
writeFileSync(
	outPath,
	JSON.stringify({ endLoad, rows, startLoad, summary }, null, 2)
);
console.log(startLoad);
console.log(endLoad);
console.log(JSON.stringify(summary, null, 2));
