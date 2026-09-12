// oxlint-disable no-await-in-loop -- Close each context and finish its failure artifacts before the next test.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { beforeAll, afterAll, afterEach, describe, expect, test } from 'vitest';

import {
	runCommand,
	startProcess,
	stopProcess,
	waitForServer,
} from '../../../scripts/browser-process';

const repository = fileURLToPath(new URL('../../../', import.meta.url));

const bannerSelector = '[data-testid="consent-banner-root"]';
const acceptSelector = '[data-testid="consent-banner-accept-button"]';

const apps = [
	{
		buildOutput: 'benchmarks/nextjs-browser-bench/.next/BUILD_ID',
		dir: 'benchmarks/nextjs-browser-bench',
		env: { C15T_BENCH_COLD_MANIFEST_TOKEN: String(Date.now()) },
		label: 'Next.js manifest SSR',
		path: '/manifest-ssr',
		port: 4312,
		probeName: '__c15tNextBench',
		startCommand: ['./node_modules/.bin/next', ['start', '--port', '4312']],
	},
	{
		buildOutput: 'benchmarks/nuxt-browser-bench/.output/server/index.mjs',
		dir: 'benchmarks/nuxt-browser-bench',
		env: { PORT: '4313' },
		extraChecks: [(app) => verifyNuxtNitroRoutes(app)],
		label: 'Nuxt manifest SSR',
		path: '/ssr-manifest',
		port: 4313,
		probeName: '__c15tNuxtBench',
		startCommand: ['node', ['.output/server/index.mjs']],
	},
	{
		buildOutput: 'benchmarks/sveltekit-browser-bench/build/index.js',
		dir: 'benchmarks/sveltekit-browser-bench',
		// `adapter-node` reads its public origin from ORIGIN and otherwise
		// assumes `https`, which would send the bench's same-origin manifest
		// fetch at a TLS handshake this plain-HTTP server cannot answer.
		// `scripts/run-bench.ts` sets it for the same reason.
		env: { ORIGIN: 'http://127.0.0.1:4314', PORT: '4314' },
		label: 'SvelteKit manifest SSR',
		path: '/ssr-manifest',
		port: 4314,
		probeName: '__c15tSvelteBench',
		startCommand: ['node', ['build/index.js']],
	},
].map((app) => ({ ...app, dir: join(repository, app.dir) }));

/**
 * Optional app filter for local runs: a comma-separated list matched against
 * each app directory name or label, for example `C15T_E2E_APPS=sveltekit`.
 */
const selectedApps = (process.env.C15T_E2E_APPS ?? '')
	.split(',')
	.map((entry) => entry.trim().toLowerCase())
	.filter(Boolean);

const isSelectedApp = function isSelectedApp(app) {
	return (
		selectedApps.length === 0 ||
		selectedApps.some(
			(entry) =>
				app.dir.toLowerCase().includes(entry) ||
				app.label.toLowerCase().includes(entry)
		)
	);
};

const appUrl = function appUrl(app) {
	return `http://127.0.0.1:${app.port}${app.path}`;
};

const countBannerRoots = function countBannerRoots(html) {
	return (html.match(/data-testid=["']consent-banner-root["']/gu) ?? []).length;
};

const assertEqual = function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message}: expected ${expected}, received ${actual}`);
	}
};

const assert = function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
};

const ensureBuilt = (app) =>
	runCommand(
		[
			'bun',
			'turbo',
			'run',
			'build',
			`--filter=@c15t/${app.dir.split('/').at(-1)}`,
		],
		{ cwd: repository }
	);

const startServer = async (app) => {
	const [command, args] = app.startCommand;
	const server = startProcess([command, ...args], {
		cwd: app.dir,
		env: { ...process.env, ...(app.env ?? {}) },
	});
	try {
		await waitForServer(`http://127.0.0.1:${app.port}`, server);
		return server;
	} catch (error) {
		await stopProcess(server.child);
		throw error;
	}
};

const newPage = async function newPage(browser, app, headers = {}) {
	const context = await browser.newContext({
		extraHTTPHeaders: headers,
		viewport: { height: 900, width: 1280 },
	});
	await context.addInitScript(() => {
		window.__c15tLayoutShiftScore = 0;
		try {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (!entry.hadRecentInput) {
						window.__c15tLayoutShiftScore += entry.value ?? 0;
					}
				}
			});
			observer.observe({ buffered: true, type: 'layout-shift' });
		} catch {
			// PerformanceObserver is optional in test browsers.
		}
	});
	await context.tracing.start({ screenshots: true, snapshots: true });
	const page = await context.newPage();
	return { context, page, url: appUrl(app) };
};

const fetchHtml = async function fetchHtml(context, url, headers = {}) {
	const response = await context.request.get(url, { headers });
	assert(response.ok(), `${url} returned ${response.status()}`);
	return response.text();
};

const gotoSettled = async function gotoSettled(page, url) {
	await page.goto(url, { waitUntil: 'networkidle' });
};

const readProbe = async function readProbe(page, app) {
	await page.waitForFunction(
		(name) => {
			const probe = window[name];
			return Boolean(probe && typeof probe === 'object');
		},
		app.probeName,
		{ timeout: 10_000 }
	);
	return page.evaluate((name) => window[name], app.probeName);
};

const verifyFreshVisit = async function verifyFreshVisit(browser, app) {
	const { context, page, url } = await newPage(browser, app);
	try {
		const html = await fetchHtml(context, url);
		assert(
			countBannerRoots(html) > 0,
			`${app.label}: response HTML did not contain ${bannerSelector}`
		);
		await gotoSettled(page, url);
		await page.locator(bannerSelector).first().waitFor({ state: 'visible' });
		const cls = await page.evaluate(() => window.__c15tLayoutShiftScore ?? 0);
		assertEqual(cls, 0, `${app.label}: layout shift score`);
		console.log(`✓ ${app.label}: fresh visit renders the banner server-side`);
	} finally {
		await context.close();
	}
};

const verifyOverrideHeaders = async function verifyOverrideHeaders(
	browser,
	app
) {
	const { context, page, url } = await newPage(browser, app, {
		'cf-ipcountry': 'US',
		'cf-region-code': 'TX',
		'x-c15t-country': 'FR',
		'x-c15t-region': 'BRE',
		'x-vercel-ip-country': 'US',
	});
	try {
		await gotoSettled(page, url);
		const probe = await readProbe(page, app);
		assertEqual(
			probe.overrides?.country,
			'FR',
			`${app.label}: override country`
		);
		assertEqual(
			probe.overrides?.region,
			'BRE',
			`${app.label}: override region`
		);
		console.log(`✓ ${app.label}: x-c15t override beats infra headers`);
	} finally {
		await context.close();
	}
};

const verifyGpc = async function verifyGpc(browser, app) {
	const { context, page, url } = await newPage(browser, app, {
		'sec-gpc': '1',
	});
	try {
		await gotoSettled(page, url);
		const probe = await readProbe(page, app);
		assertEqual(
			probe.privacySignals?.gpc?.detected,
			true,
			`${app.label}: detected GPC`
		);
		assertEqual(
			probe.privacySignals?.gpc?.active,
			true,
			`${app.label}: active GPC`
		);
		assertEqual(
			probe.privacySignals?.gpc?.override,
			undefined,
			`${app.label}: GPC remains a detected signal`
		);
		console.log(`✓ ${app.label}: GPC header reaches the kernel`);
	} finally {
		await context.close();
	}
};

const verifyLanguage = async function verifyLanguage(browser, app) {
	const { context, page, url } = await newPage(browser, app, {
		'accept-language': 'en;q=0.2, de-DE;q=0.9',
	});
	try {
		await gotoSettled(page, url);
		const probe = await readProbe(page, app);
		assertEqual(
			probe.overrides?.language,
			'de',
			`${app.label}: negotiated language`
		);
		console.log(`✓ ${app.label}: language negotiation is q-aware`);
	} finally {
		await context.close();
	}
};

const cookieHeader = function cookieHeader(cookies) {
	return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
};

const verifyNoZombie = async function verifyNoZombie(browser, app) {
	const { context, page, url } = await newPage(browser, app);
	try {
		await gotoSettled(page, url);
		await page.locator(acceptSelector).first().waitFor({ state: 'visible' });
		await page.locator(acceptSelector).first().click();
		await page.waitForFunction(() => document.cookie.includes('c15t='));

		const cookies = await context.cookies(url);
		assert(
			cookies.some((cookie) => cookie.name === 'c15t'),
			`${app.label}: c15t cookie was not set`
		);

		const html = await fetchHtml(context, url, {
			cookie: cookieHeader(cookies),
		});
		assertEqual(
			countBannerRoots(html),
			0,
			`${app.label}: stored-consent response banner count`
		);

		await gotoSettled(page, url);
		await page.waitForLoadState('networkidle');
		assertEqual(
			await page.locator(bannerSelector).count(),
			0,
			`${app.label}: stored-consent DOM banner count`
		);
		const probe = await readProbe(page, app);
		assertEqual(
			probe.hasStoredChoice,
			true,
			`${app.label}: probe hasStoredChoice`
		);
		console.log(`✓ ${app.label}: no re-prompt / no zombie`);
	} finally {
		await context.close();
	}
};

const readC15tVersion = function readC15tVersion() {
	const packageJson = JSON.parse(
		readFileSync(
			new URL('../../../packages/core/package.json', import.meta.url)
		)
	);
	return packageJson.version;
};

const fetchJsonResponse = async function fetchJsonResponse(
	app,
	url,
	headers = {}
) {
	const response = await fetch(url, { headers });
	assertEqual(response.status, 200, `${app.label}: ${url} status`);
	const contentType = response.headers.get('content-type') ?? '';
	assert(
		contentType.includes('application/json'),
		`${app.label}: ${url} content-type was ${contentType || '<empty>'}`
	);
	return { body: await response.json(), response };
};

const hasInitTranslation = function hasInitTranslation(init) {
	return Boolean(init.translations?.translations?.cookieBanner?.title);
};

const hasInitJurisdiction = function hasInitJurisdiction(init) {
	return typeof init.jurisdiction === 'string' && init.jurisdiction.length > 0;
};

const hasMarketingCategory = function hasMarketingCategory(init) {
	return (
		Array.isArray(init.policyResolution?.policy?.scope) &&
		init.policyResolution.policy.scope.includes('marketing')
	);
};

/**
 * Direct HTTP assertions against the Nitro server routes the @c15t/vue
 * Nuxt module registers (packages/vue/src/module.ts →
 * runtime/server/{init,manifest}.get.ts). Runs against the already-booted
 * Nuxt server — no browser involved.
 */
const verifyNuxtNitroRoutes = async function verifyNuxtNitroRoutes(app) {
	const base = `http://127.0.0.1:${app.port}`;

	// --- /api/c15t/manifest: cached proxy of the upstream manifest ---
	const { response: manifestResponse, body: manifest } =
		await fetchJsonResponse(app, `${base}/api/c15t/manifest`);
	assertEqual(
		manifest.schemaVersion,
		2,
		`${app.label}: nitro manifest schemaVersion`
	);
	assert(
		typeof manifest.revision === 'string' &&
			/^[a-f0-9]{64}$/u.test(manifest.revision),
		`${app.label}: nitro manifest SHA-256 revision`
	);
	assert(
		Array.isArray(manifest.policyPacks) && manifest.policyPacks.length === 2,
		`${app.label}: nitro manifest policyPacks`
	);
	// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
	const pack = manifest.policyPacks[0];
	assert(
		['choice', 'notice', 'policy'].every(
			(key) =>
				typeof pack.fingerprints?.[key] === 'string' &&
				/^[a-f0-9]{64}$/u.test(pack.fingerprints[key])
		),
		`${app.label}: nitro manifest policy fingerprints`
	);
	assertEqual(
		pack.rule?.model,
		'opt-in',
		`${app.label}: nitro manifest policy model`
	);
	assertEqual(
		pack.rule?.prompt,
		'choice',
		`${app.label}: nitro manifest choice prompt`
	);
	// Nitro's defineCachedEventHandler wrapper replaces the upstream
	// cache-control passthrough with its own maxAge directive, so only
	// assert a cache-control header is present — etag/304 below cover the
	// revalidation contract.
	assert(
		Boolean(manifestResponse.headers.get('cache-control')),
		`${app.label}: nitro manifest cache-control header missing`
	);
	const etag = manifestResponse.headers.get('etag');
	assertEqual(
		etag,
		'"nuxt-browser-bench-manifest"',
		`${app.label}: nitro manifest etag passthrough`
	);
	const conditional = await fetch(`${base}/api/c15t/manifest`, {
		headers: { 'if-none-match': etag },
	});
	assertEqual(
		conditional.status,
		304,
		`${app.label}: nitro manifest if-none-match status`
	);
	console.log(
		`✓ ${app.label}: Nitro /api/c15t/manifest proxies the manifest (schema fields, cache headers, 304)`
	);

	// --- /api/c15t/init: manifest-resolved init, geo/GPC/language aware ---
	const { body: init, response: initResponse } = await fetchJsonResponse(
		app,
		`${base}/api/c15t/init`,
		{
			'accept-language': 'en;q=0.2, de-DE;q=0.9',
			'cf-ipcountry': 'US',
			'sec-gpc': '1',
			'x-c15t-country': 'FR',
			'x-c15t-region': 'BRE',
		}
	);
	assertEqual(
		init.translations?.language,
		'de',
		`${app.label}: nitro init negotiated translations language`
	);
	assert(
		hasInitTranslation(init),
		`${app.label}: nitro init translations payload`
	);
	assertEqual(
		initResponse.headers.get('x-c15t-policy-contract'),
		'1',
		`${app.label}: nitro policy contract header`
	);
	assertEqual(
		init.policyResolution?.version,
		1,
		`${app.label}: nitro policy contract version`
	);
	assertEqual(
		init.policyResolution?.status,
		'matched',
		`${app.label}: nitro matched policy`
	);
	assertEqual(init.branding, 'c15t', `${app.label}: nitro init branding`);
	assert(hasInitJurisdiction(init), `${app.label}: nitro init jurisdiction`);
	assertEqual(
		init.location?.countryCode,
		'FR',
		`${app.label}: nitro init location country`
	);
	assertEqual(
		init.policyResolution?.policy?.prompt,
		'choice',
		`${app.label}: nitro init resolved policy prompt`
	);
	assert(
		hasMarketingCategory(init),
		`${app.label}: nitro init resolved policy categories`
	);
	assertEqual(
		init.policyResolution?.fingerprints?.choice,
		pack.fingerprints.choice,
		`${app.label}: nitro init choice fingerprint`
	);
	assertEqual(
		init.resolvedOverrides?.country,
		'FR',
		`${app.label}: nitro init override country (x-c15t beats cf-ipcountry)`
	);
	assertEqual(
		init.resolvedOverrides?.region,
		'BRE',
		`${app.label}: nitro init override region`
	);
	assertEqual(
		init.resolvedOverrides?.gpc,
		undefined,
		`${app.label}: nitro init preserves detected GPC provenance`
	);
	assertEqual(
		init.resolvedOverrides?.language,
		'de',
		`${app.label}: nitro init language override`
	);
	console.log(
		`✓ ${app.label}: Nitro /api/c15t/init resolves init from the manifest (geo/GPC/language aware)`
	);

	// --- x-c15t-version on the proxy's upstream manifest fetch ---
	// The Nitro handlers fetch the upstream manifest (the bench fixture)
	// with `c15tVersionHeaders`; the fixture records what it received.
	const { body: versionHeaders } = await fetchJsonResponse(
		app,
		`${base}/api/bench-consent/version-headers`
	);
	const expectedVersion = readC15tVersion();
	assertEqual(
		versionHeaders.manifest,
		expectedVersion,
		`${app.label}: upstream manifest fetch x-c15t-version`
	);
	console.log(
		`✓ ${app.label}: upstream manifest fetch carries x-c15t-version=${expectedVersion}`
	);
};

const selected = apps.filter(isSelectedApp);
if (!selected.length) {
	throw new Error('No SSR journey targets matched C15T_E2E_APPS.');
}

for (const app of selected) {
	describe(app.label, () => {
		let browser;
		let server;
		beforeAll(async () => {
			await ensureBuilt(app);
			server = await startServer(app);
			browser = await chromium.launch({ headless: true });
		});
		afterEach(async (result) => {
			for (const context of browser?.contexts() ?? []) {
				if (result.task.result?.state === 'fail') {
					const name = `${app.label}-${result.task.name}`.replaceAll(
						/[^a-z0-9]/giu,
						'-'
					);
					const directory = join(repository, '.ci-reports');
					mkdirSync(directory, { recursive: true });
					await context
						.pages()[0]
						?.screenshot({ path: join(directory, `${name}.png`) });
					await context.tracing.stop({ path: join(directory, `${name}.zip`) });
				}
				await context.close();
			}
		});
		afterAll(async () => {
			await browser?.close();
			if (server) {
				await stopProcess(server.child);
			}
		});
		test('first HTML, consent persistence and reload', () =>
			verifyFreshVisit(browser, app));
		test('forwarded jurisdiction headers', () =>
			verifyOverrideHeaders(browser, app));
		test('global privacy control', () => verifyGpc(browser, app));
		test('language resolution', () => verifyLanguage(browser, app));
		test('no banner returns after consent', () => verifyNoZombie(browser, app));
		if (app.probeName === '__c15tNextBench') {
			test.each([
				['/ssr', 1],
				['/manifest-ssr', 0],
			])(
				'%s submits one recorded choice with the expected init traffic',
				async (path, expectedInit) => {
					const base = `http://127.0.0.1:${app.port}`;
					await fetch(`${base}/api/bench-consent/stats`, { method: 'POST' });
					const { page } = await newPage(browser, app);
					const response = await page.goto(`${base}${path}`);
					expect(response?.ok(), `${path} must exist`).toBe(true);
					await page.getByTestId('consent-banner-accept-button').click();
					await expect
						.poll(async () => {
							const stats = await fetch(`${base}/api/bench-consent/stats`);
							return stats.json();
						})
						.toMatchObject({ init: expectedInit, subjects: 1 });
				}
			);
		}
		for (const check of app.extraChecks ?? []) {
			test('Nuxt manifest, init, caching and upstream version contract', () =>
				check(app));
		}
	});
}
