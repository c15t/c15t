/// <reference types="node" />
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { policyDefaults } from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';
import { build } from 'esbuild';
import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { InitResponse } from '../../client/client-interface';
import type {} from './hosted-storage.fixture';

let browser: Browser;
let server: Server;
let origin: string;
let unavailable = false;
let model: 'opt-in' | 'opt-out' | 'none' = 'opt-out';
let changedPolicy = false;
let initRequests = 0;

beforeAll(async () => {
	const bundle = await build({
		entryPoints: [resolve('src/runtime/__tests__/hosted-storage.fixture.ts')],
		bundle: true,
		format: 'iife',
		platform: 'browser',
		define: { 'process.env.NODE_ENV': '"test"' },
		write: false,
	});
	const code = bundle.outputFiles[0]?.text;
	if (!code) throw new Error('Missing browser bundle');
	server = createServer((req, res) => {
		if (req.url === '/bundle.js') {
			res.setHeader('content-type', 'text/javascript');
			res.end(code);
			return;
		}
		if (req.url?.startsWith('/api/c15t/')) {
			res.setHeader('content-type', 'application/json');
			if (req.url === '/api/c15t/init') {
				initRequests++;
				const policy = policyDefaults.offlineOptInBanner();
				const data: InitResponse = {
					branding: 'c15t',
					jurisdiction: 'CCPA',
					location: { countryCode: 'US', regionCode: 'CA' },
					translations: { language: 'en', translations: enTranslations },
					policy: {
						...policy,
						id: 'hosted-policy',
						model,
						consent: {
							...policy.consent,
							gpc: false,
							categories: changedPolicy
								? ['necessary', 'measurement', 'marketing']
								: ['necessary', 'measurement'],
						},
						ui: { ...policy.ui, mode: model === 'none' ? 'none' : 'banner' },
					},
				};
				res.statusCode = unavailable ? 503 : 200;
				res.end(JSON.stringify(unavailable ? {} : data));
				return;
			}
			res.statusCode = unavailable ? 503 : 200;
			res.end(JSON.stringify({ success: !unavailable }));
			return;
		}
		res.setHeader('content-type', 'text/html');
		res.end('<!doctype html><script src="/bundle.js"></script>');
	});
	await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Missing port');
	origin = `http://127.0.0.1:${address.port}`;
	browser = await chromium.launch();
}, 30_000);

afterAll(async () => {
	await browser?.close();
	await new Promise<void>((done) => server?.close(() => done()));
});

async function start(page: Page) {
	await page.evaluate(() => {
		window.hostedStorageTest = window.createHostedStorageTest();
	});
	await page.waitForFunction(() => !window.hostedStorageTest.state().loading);
	return page.evaluate(() => window.hostedStorageTest.state());
}

async function reload(page: Page) {
	await page.reload();
	return start(page);
}

describe.sequential('hosted storage and recovery', () => {
	test('keeps an explicit rejection across init retries and recovery', async () => {
		unavailable = false;
		model = 'opt-out';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			expect((await start(page)).measurement).toBe(true);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			const rejected = await page.evaluate(() =>
				window.hostedStorageTest.state()
			);
			expect(rejected.stored?.consents.measurement).toBe(false);
			expect(rejected.stored?.consentInfo?.materialPolicyFingerprint).toMatch(
				/^[a-f0-9]{64}$/
			);
			unavailable = true;
			const requestsBefore = initRequests;
			const outage = await reload(page);
			expect(initRequests - requestsBefore).toBe(4);
			expect(outage.source).toBe('offline-fallback');
			unavailable = false;
			const recovered = await reload(page);
			// Check recovery first so the original regression reaches the silent grant.
			expect(recovered.measurement).toBe(false);
			expect(outage.stored).toEqual(rejected.stored);
			expect(outage.cookie).toBe(rejected.cookie);
			expect(outage.consentInfo).toEqual(rejected.stored?.consentInfo);
			expect(recovered.stored).toEqual(rejected.stored);
		} finally {
			await page.close();
		}
	});

	test('starts and saves with a throwing Window localStorage getter', async () => {
		unavailable = true;
		const page = await browser.newPage();
		try {
			await page.addInitScript(() => {
				Object.defineProperty(window, 'localStorage', {
					configurable: true,
					get() {
						throw new DOMException('Storage access blocked', 'SecurityError');
					},
				});
			});
			await page.goto(origin);
			expect((await start(page)).measurement).toBe(false);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			expect(
				(await page.evaluate(() => window.hostedStorageTest.state()))
					.measurement
			).toBe(false);
			expect((await reload(page)).stored?.consents.measurement).toBe(false);
		} finally {
			await page.close();
		}
	});

	test.each([
		'opt-out',
		'none',
	] as const)('preserves rejection through repeated outages and %s recovery', async (recoveredModel) => {
		unavailable = false;
		model = 'opt-out';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			for (let cycle = 0; cycle < 2; cycle++) {
				unavailable = true;
				expect((await reload(page)).measurement).toBe(false);
				unavailable = false;
				model = recoveredModel;
				const recovered = await reload(page);
				expect(recovered.measurement).toBe(false);
				expect(recovered.stored?.consents.measurement).toBe(false);
				expect(recovered.consentInfo).not.toBeNull();
			}
		} finally {
			await page.close();
		}
	});

	test.each([
		'opt-out',
		'none',
	] as const)('retains a rejection first saved during fallback on %s recovery', async (recoveredModel) => {
		unavailable = true;
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			expect((await start(page)).source).toBe('offline-fallback');
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			const saved = await page.evaluate(() => window.hostedStorageTest.state());
			expect(saved.stored?.consents.measurement).toBe(false);
			expect(saved.stored?.consentInfo?.materialPolicyFingerprint).toBeFalsy();
			for (let cycle = 0; cycle < 2; cycle++) {
				unavailable = false;
				model = recoveredModel;
				const recovered = await reload(page);
				expect(recovered.measurement).toBe(false);
				expect(recovered.consentInfo?.requiresReconsent).toBe(true);
				unavailable = true;
				expect((await reload(page)).measurement).toBe(false);
			}
		} finally {
			await page.close();
		}
	});

	test('retains the last authoritative fingerprint when replacing a grant with a fallback rejection', async () => {
		unavailable = false;
		model = 'opt-out';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			const granted = await page.evaluate(() =>
				window.hostedStorageTest.state()
			);
			unavailable = true;
			await reload(page);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			const rejected = await page.evaluate(() =>
				window.hostedStorageTest.state()
			);
			expect(rejected.stored?.consentInfo?.materialPolicyFingerprint).toBe(
				granted.stored?.consentInfo?.materialPolicyFingerprint
			);
			unavailable = false;
			expect((await reload(page)).measurement).toBe(false);
		} finally {
			await page.close();
		}
	});

	test('suspends valid grants during fallback and restores them only for the original policy', async () => {
		unavailable = false;
		model = 'opt-in';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			const granted = await page.evaluate(() =>
				window.hostedStorageTest.state()
			);
			unavailable = true;
			const outage = await reload(page);
			expect(outage.measurement).toBe(false);
			expect(outage.stored).toEqual(granted.stored);
			unavailable = false;
			expect((await reload(page)).measurement).toBe(true);
			changedPolicy = true;
			const changed = await reload(page);
			expect(changed.measurement).toBe(false);
			expect(changed.activeUI).toBe('banner');
			expect(changed.consentInfo?.requiresReconsent).toBe(true);
			changedPolicy = false;
			expect((await reload(page)).measurement).toBe(false);
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			expect((await reload(page)).measurement).toBe(true);
		} finally {
			await page.close();
		}
	});

	test.each([
		'opt-in',
		'opt-out',
		'none',
	] as const)('invalidates old grants without forgetting denials for a changed %s policy', async (nextModel) => {
		for (const choice of ['necessary', 'all'] as const) {
			unavailable = false;
			model = 'opt-out';
			changedPolicy = false;
			const page = await browser.newPage();
			try {
				await page.goto(origin);
				await start(page);
				await page.evaluate(
					(type) => window.hostedStorageTest.save(type),
					choice
				);
				changedPolicy = true;
				model = nextModel;
				const changed = await reload(page);
				expect(changed.measurement).toBe(false);
				expect(changed.consentInfo?.requiresReconsent).toBe(true);
				expect(changed.activeUI).toBe(nextModel === 'none' ? 'none' : 'banner');
				expect((await reload(page)).measurement).toBe(false);
			} finally {
				await page.close();
			}
		}
	});

	test('requires fresh confirmation of a positive choice saved during fallback', async () => {
		unavailable = true;
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			unavailable = false;
			model = 'opt-out';
			const recovered = await reload(page);
			expect(recovered.measurement).toBe(false);
			expect(recovered.activeUI).toBe('banner');
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			expect((await reload(page)).measurement).toBe(true);
		} finally {
			await page.close();
		}
	});

	test.each([
		'getItem',
		'setItem',
		'removeItem',
	] as const)('starts, hydrates cookies and saves with throwing %s', async (method) => {
		unavailable = false;
		model = 'opt-out';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			await page.reload();
			await page.evaluate((blockedMethod) => {
				Storage.prototype[blockedMethod] = () => {
					throw new DOMException('Storage blocked', 'SecurityError');
				};
			}, method);
			expect((await start(page)).measurement).toBe(false);
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			expect((await reload(page)).measurement).toBe(false);
		} finally {
			await page.close();
		}
	});

	test('keeps a revocation in memory if storage and cookie access throw', async () => {
		unavailable = false;
		model = 'opt-out';
		changedPolicy = false;
		const page = await browser.newPage();
		try {
			await page.goto(origin);
			await start(page);
			await page.evaluate(() => window.hostedStorageTest.save('all'));
			await page.evaluate(() => {
				Object.defineProperty(window, 'localStorage', {
					configurable: true,
					get() {
						throw new DOMException('Storage blocked', 'SecurityError');
					},
				});
				Object.defineProperty(document, 'cookie', {
					configurable: true,
					get() {
						throw new DOMException('Cookies blocked', 'SecurityError');
					},
					set() {
						throw new DOMException('Cookies blocked', 'SecurityError');
					},
				});
			});
			await page.evaluate(() => window.hostedStorageTest.save('necessary'));
			// Avoid the fixture's cookie snapshot while the cookie getter is blocked.
			expect(
				await page.evaluate(() => {
					Reflect.deleteProperty(document, 'cookie');
					return window.hostedStorageTest.state().measurement;
				})
			).toBe(false);
		} finally {
			await page.close();
		}
	});
});
