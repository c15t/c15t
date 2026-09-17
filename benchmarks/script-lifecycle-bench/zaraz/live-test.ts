import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';

import { chromium } from 'playwright';

import type { ZarazConsentApi } from '../../../packages/scripts/src/vendors/tag-managers/cloudflare-zaraz';

declare global {
	interface Window {
		c15tLab: {
			apiReadyAtMount: boolean;
			events: string[];
			save: (measurement: boolean, marketing: boolean) => Promise<unknown>;
		};
		zaraz: {
			consent: ZarazConsentApi;
			track: (event: string) => Promise<void>;
		};
		__zarazMeasurementRuns?: number;
	}
}

const url = process.env.ZARAZ_TEST_URL ?? 'https://zaraz-lab.c15t.cloud';
const browser = await chromium.launch();
const checks: string[] = [];
const errors: string[] = [];
try {
	const page = await browser.newPage();
	page.on('pageerror', (error) => errors.push(error.message));
	await page.route('**/cdn-cgi/zaraz/i.js', async (route) => {
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});
		await route.continue();
	});
	await page.goto(url);
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	assert.equal(
		await page.evaluate(() => window.c15tLab.apiReadyAtMount),
		false
	);
	await page.unroute('**/cdn-cgi/zaraz/i.js');
	const state = () =>
		page.evaluate(() => ({
			permissions: window.zaraz.consent.getAll(),
			runs: window.__zarazMeasurementRuns ?? 0,
		}));
	assert.deepEqual(await state(), { permissions: { feGw: false }, runs: 0 });
	checks.push(
		'Fresh visit denies the measurement purpose and executes no probe'
	);
	await page.evaluate(() => window.zaraz.track('Pageview'));
	await page.waitForTimeout(500);
	assert.equal((await state()).runs, 0);
	checks.push('Pageview queued while measurement is denied');
	await page.evaluate(() => window.c15tLab.save(true, false));
	await page.waitForFunction(() => window.__zarazMeasurementRuns === 1);
	assert.equal((await state()).permissions.feGw, true);
	checks.push(
		'Grant replays the queued pageview and executes the actual Zaraz tool once'
	);
	await page.evaluate(() => window.c15tLab.save(false, true));
	await page.evaluate(() => window.zaraz.track('Pageview'));
	await page.waitForTimeout(500);
	assert.deepEqual(await state(), { permissions: { feGw: false }, runs: 1 });
	checks.push(
		'Marketing-only consent revokes measurement; subsequent pageview does not execute its tool'
	);
	await page.evaluate(() => window.zaraz.consent.set({ feGw: true }));
	await page.reload();
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	await page.waitForTimeout(500);
	assert.deepEqual(await state(), { permissions: { feGw: false }, runs: 0 });
	checks.push(
		'Stale granted Zaraz cookie is denied on reload before any probe executes'
	);
	const resources = await page.evaluate(() =>
		performance.getEntriesByType('resource').map((entry) => {
			const resource = entry as PerformanceResourceTiming;
			return {
				decodedBodySize: resource.decodedBodySize,
				path: new URL(resource.name).pathname,
				transferSize: resource.transferSize,
			};
		})
	);
	await page.route('**/bridge.js', (route) =>
		route.fulfill({ body: '', contentType: 'text/javascript' })
	);
	await page.evaluate(() => window.zaraz.consent.set({ feGw: true }));
	await page.reload();
	await page.waitForFunction(() => window.zaraz?.consent?.APIReady);
	assert.equal((await state()).runs, 0);
	await page.unroute('**/bridge.js');
	await page.addScriptTag({ type: 'module', url: `${url}/bridge.js?late=1` });
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	assert.deepEqual(await state(), { permissions: { feGw: false }, runs: 0 });
	assert.equal(await page.evaluate(() => window.c15tLab.apiReadyAtMount), true);
	checks.push('Already-ready Zaraz API synchronizes when c15t loads later');
	await page.locator('#banner').click();
	await page.getByTestId('consent-banner-card').waitFor({ state: 'visible' });
	await page.waitForFunction(
		() =>
			document.getElementById('connection')?.textContent ===
			'Connected to live Zaraz'
	);
	await page.screenshot({
		animations: 'disabled',
		fullPage: true,
		path: '.benchmarks/current/zaraz/banner-desktop.png',
	});
	await page
		.getByRole('button', { exact: true, name: 'Send pageview' })
		.click();
	await page.getByTestId('consent-banner-accept-button').click();
	await page.waitForFunction(() => (window.__zarazMeasurementRuns ?? 0) > 0);
	await page.waitForFunction(
		() => document.getElementById('c15t-state')?.textContent === 'Allowed'
	);
	await page.reload();
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	assert.equal((await state()).permissions.feGw, true);
	await page.waitForFunction(
		() => document.getElementById('c15t-state')?.textContent === 'Allowed'
	);
	await page.getByTestId('consent-banner-card').waitFor({ state: 'hidden' });
	checks.push(
		'Accepted measurement persists after refresh without reopening the banner'
	);
	await page.locator('#send').click();
	await page.waitForFunction(() => (window.__zarazMeasurementRuns ?? 0) > 0);
	const acceptedRuns = (await state()).runs;
	await page.locator('#banner').click();
	await page.getByTestId('consent-banner-reject-button').click();
	await page.locator('#send').click();
	await page.waitForTimeout(700);
	assert.equal((await state()).runs, acceptedRuns);
	assert.equal((await state()).permissions.feGw, false);
	checks.push(
		'Real c15t banner acceptance releases the queued tool; rejection blocks subsequent execution'
	);
	await page.reload();
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	assert.equal((await state()).permissions.feGw, false);
	await page.getByTestId('consent-banner-card').waitFor({ state: 'hidden' });
	await page.locator('#send').click();
	await page.waitForTimeout(700);
	assert.equal((await state()).runs, 0);
	checks.push(
		'Rejected measurement persists after refresh and keeps the tool blocked'
	);
	await page.locator('#demo').click();
	await page.waitForFunction(
		() =>
			document
				.getElementById('result')
				?.textContent?.startsWith('All 3 checks passed'),
		undefined,
		{ timeout: 20000 }
	);
	checks.push('Visible guided demo completes all three live consent checks');
	await page.locator('#preferences').click();
	await page.getByTestId('consent-dialog-card').waitFor({ state: 'visible' });
	checks.push('Cookie preferences opens the real c15t preference dialog');
	await page.setViewportSize({ height: 844, width: 390 });
	await page.reload();
	await page.waitForFunction(() => window.c15tLab?.events.includes('ready'));
	await page.locator('#banner').click();
	await page.getByTestId('consent-banner-card').waitFor({ state: 'visible' });
	assert.equal(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth
		),
		true
	);
	await page.waitForFunction(
		() =>
			document.getElementById('connection')?.textContent ===
			'Connected to live Zaraz'
	);
	await page.screenshot({
		animations: 'disabled',
		fullPage: true,
		path: '.benchmarks/current/zaraz/banner-mobile.png',
	});
	assert.deepEqual(errors, []);
	const report = {
		browser: browser.version(),
		checks,
		date: new Date().toISOString(),
		errors,
		limitation:
			'One Custom HTML measurement probe on the live Zaraz service. Marketing category isolation is tested against that probe; two-tool mapping is covered by local integration tests. No third-party analytics destination or vendor speedup is measured.',
		resources,
		url,
	};
	const output = resolvePath('.benchmarks/current/zaraz/live-results.json');
	await mkdir(resolvePath(output, '..'), { recursive: true });
	await writeFile(output, JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
} finally {
	await browser.close();
}
