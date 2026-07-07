import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const bannerSelector = '[data-testid="consent-banner-root"]';
const acceptSelector = '[data-testid="consent-banner-accept-button"]';

const apps = [
	{
		label: 'Next.js manifest SSR',
		dir: 'benchmarks/nextjs-browser-bench',
		port: 4312,
		path: '/v3-manifest-ssr',
		probeName: '__c15tNextBench',
		buildOutput: 'benchmarks/nextjs-browser-bench/.next/BUILD_ID',
		startCommand: ['./node_modules/.bin/next', ['start', '--port', '4312']],
		env: { C15T_BENCH_COLD_MANIFEST_TOKEN: String(Date.now()) },
	},
	{
		label: 'Nuxt manifest SSR',
		dir: 'benchmarks/nuxt-browser-bench',
		port: 4313,
		path: '/ssr-manifest',
		probeName: '__c15tNuxtBench',
		buildOutput: 'benchmarks/nuxt-browser-bench/.output/server/index.mjs',
		startCommand: ['node', ['.output/server/index.mjs']],
		env: { PORT: '4313' },
		prebuild: [
			{ command: 'bun', args: ['run', 'build'], cwd: 'packages/core' },
			{ command: 'bun', args: ['run', 'build'], cwd: 'packages/vue' },
		],
	},
];

function appUrl(app) {
	return `http://127.0.0.1:${app.port}${app.path}`;
}

function countBannerRoots(html) {
	return (html.match(/data-testid=["']consent-banner-root["']/g) ?? []).length;
}

function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message}: expected ${expected}, received ${actual}`);
	}
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function spawnProcess(command, args, options = {}) {
	return spawn(command, args, {
		...options,
		stdio: ['ignore', 'pipe', 'pipe'],
	});
}

async function runCommand(command, args, options = {}) {
	const child = spawnProcess(command, args, options);
	const output = [];
	child.stdout.on('data', (chunk) => output.push(chunk.toString()));
	child.stderr.on('data', (chunk) => output.push(chunk.toString()));
	const code = await new Promise((resolve) => child.once('exit', resolve));
	if (code !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed with exit ${code}\n${output.join('')}`
		);
	}
}

async function ensureBuilt(app) {
	if (!existsSync(app.buildOutput)) {
		console.log(`Building ${app.label} because ${app.buildOutput} is missing`);
	} else {
		console.log(`Building ${app.label}`);
	}
	for (const step of app.prebuild ?? []) {
		await runCommand(step.command, step.args, { cwd: step.cwd });
	}
	await runCommand('bun', ['run', 'build'], { cwd: app.dir });
}

async function waitForServer(url, timeoutMs = 30_000) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {}
		await delay(250);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer(server) {
	if (server.exitCode != null) {
		return;
	}
	server.kill('SIGTERM');
	await new Promise((resolve) => server.once('exit', resolve));
}

async function startServer(app) {
	const [command, args] = app.startCommand;
	const server = spawnProcess(command, args, {
		cwd: app.dir,
		env: { ...process.env, ...(app.env ?? {}) },
	});
	const stderr = [];
	server.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
	await waitForServer(`http://127.0.0.1:${app.port}`);
	return { server, stderr };
}

async function newPage(browser, app, headers = {}) {
	const context = await browser.newContext({
		extraHTTPHeaders: headers,
		viewport: { width: 1280, height: 900 },
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
			observer.observe({ type: 'layout-shift', buffered: true });
		} catch {}
	});
	const page = await context.newPage();
	return { context, page, url: appUrl(app) };
}

async function fetchHtml(context, url, headers = {}) {
	const response = await context.request.get(url, { headers });
	assert(response.ok(), `${url} returned ${response.status()}`);
	return response.text();
}

async function gotoSettled(page, url) {
	await page.goto(url, { waitUntil: 'networkidle' });
}

async function readProbe(page, app) {
	await page.waitForFunction(
		(name) => {
			const probe = window[name];
			return Boolean(probe && typeof probe === 'object');
		},
		app.probeName,
		{ timeout: 10_000 }
	);
	return page.evaluate((name) => window[name], app.probeName);
}

async function verifyFreshVisit(browser, app) {
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
}

async function verifyOverrideHeaders(browser, app) {
	const { context, page, url } = await newPage(browser, app, {
		'x-c15t-country': 'FR',
		'cf-ipcountry': 'US',
		'x-vercel-ip-country': 'US',
		'x-c15t-region': 'BRE',
		'cf-region-code': 'TX',
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
}

async function verifyGpc(browser, app) {
	const { context, page, url } = await newPage(browser, app, {
		'sec-gpc': '1',
	});
	try {
		await gotoSettled(page, url);
		const probe = await readProbe(page, app);
		assertEqual(probe.overrides?.gpc, true, `${app.label}: GPC override`);
		console.log(`✓ ${app.label}: GPC header reaches the kernel`);
	} finally {
		await context.close();
	}
}

async function verifyLanguage(browser, app) {
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
}

function cookieHeader(cookies) {
	return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

async function verifyNoZombie(browser, app) {
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
		assertEqual(probe.hasConsented, true, `${app.label}: probe hasConsented`);
		console.log(`✓ ${app.label}: no re-prompt / no zombie`);
	} finally {
		await context.close();
	}
}

async function verifyApp(browser, app) {
	await ensureBuilt(app);
	const { server, stderr } = await startServer(app);
	try {
		await verifyFreshVisit(browser, app);
		await verifyOverrideHeaders(browser, app);
		await verifyGpc(browser, app);
		await verifyLanguage(browser, app);
		await verifyNoZombie(browser, app);
	} catch (error) {
		if (stderr.length > 0) {
			console.error(stderr.join(''));
		}
		throw error;
	} finally {
		await stopServer(server);
	}
}

async function main() {
	const browser = await chromium.launch({ headless: true });
	try {
		for (const app of apps) {
			await verifyApp(browser, app);
		}
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
