/** @vitest-environment node */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Route } from 'playwright';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	expect,
	test,
	vi,
} from 'vitest';

import type { RuntimeOptions } from './__tests__/default-com-runtime-page';

vi.setConfig({ testTimeout: 20_000 });

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceRoot = process.env.C15T_DEFAULT_RUNTIME_SOURCE_ROOT ?? repository;
const artifacts = process.env.C15T_DEFAULT_RUNTIME_ARTIFACTS;
const fixtures = new URL('./__tests__/fixtures/default-com/', import.meta.url);
const keyA = '00000000-0000-4000-8000-000000000001';
const keyB = '00000000-0000-4000-8000-000000000002';
const denied = { analytics: false, marketing: false };
const granted = { analytics: true, marketing: true };

let browser: Browser;
let context: BrowserContext;
let page: Page;
let bundle: string;
let sdkBytes: Buffer;
let pixelBytes: Buffer;
let held: Route[];
let holdScripts: boolean;
let schedulerResponse: boolean;
let messages: string[];
let requests: { url: string; method: string; body: string | null }[];
let loaderRequests: number;

const initialized = () =>
	messages.filter((line) => line.includes('SDK initialized'));
const reconfigured = () =>
	messages.filter((line) => line.includes('SDK reconfigured'));
const submitted = () =>
	requests.filter(({ url }) => url.includes('/form-submission'));
const seedIdentity = () =>
	context.addCookies([
		{
			name: '_dflt_aid',
			url: 'https://c15t-runtime.test/',
			value: 'runtime-seeded-anonymous-id',
		},
	]);
const cookie = () =>
	page.evaluate(() => window.__defaultComRuntime.consentCookie());
const waitInitialized = () =>
	expect.poll(() => initialized().length).toBeGreaterThan(0);
const start = async (options: Partial<RuntimeOptions> = {}) => {
	await page.evaluate((config) => window.__defaultComRuntime.start(config), {
		publicKey: keyA,
		...options,
	});
	await waitInitialized();
};
const complete = async () => {
	await expect.poll(() => held.length).toBeGreaterThan(0);
	const route = held.shift();
	if (!route) {
		throw new Error('Expected a pending SDK request.');
	}
	await route.fulfill({
		body: sdkBytes,
		contentType: 'application/javascript',
	});
};

beforeAll(async () => {
	sdkBytes = await readFile(new URL('sdk.js.txt', fixtures));
	pixelBytes = await readFile(new URL('index.js.txt', fixtures));
	expect(createHash('sha256').update(sdkBytes).digest('hex')).toBe(
		'0c4a524f78412015ade3fd066a4020d6e2d425de25baf441f01ec09a93f89e2a'
	);
	expect(createHash('sha256').update(pixelBytes).digest('hex')).toBe(
		'250750410f07067ca57f43f1f493f7ba7c174baad264bde7904bdea6d360c434'
	);
	const result = await build({
		alias: {
			'#inline-start': resolve(
				sourceRoot,
				'packages/integrations/src/engine/inline-start-browser.ts'
			),
			'@c15t/core': resolve(sourceRoot, 'packages/core/src/index.ts'),
			'@c15t/core/modules/script-loader': resolve(
				sourceRoot,
				'packages/core/src/modules/script-loader/index.ts'
			),
		},
		bundle: true,
		define: { 'process.env.NODE_ENV': '"production"' },
		entryPoints: [
			resolve(
				sourceRoot,
				'packages/integrations/src/__tests__/default-com-runtime-page.ts'
			),
		],
		format: 'iife',
		metafile: true,
		nodePaths: [
			resolve(repository, 'packages/core/node_modules'),
			resolve(repository, 'packages/integrations/node_modules'),
			resolve(repository, 'node_modules'),
		],
		platform: 'browser',
		write: false,
	});
	const [output] = result.outputFiles;
	if (!output) {
		throw new Error('Expected a browser bundle of the production runtime.');
	}
	bundle = output.text;
	browser = await chromium.launch();
	if (artifacts) {
		await mkdir(artifacts, { recursive: true });
		await writeFile(resolve(artifacts, 'browser-bundle.js'), bundle);
		const inputs = await Promise.all(
			Object.keys(result.metafile.inputs).map(async (path) => ({
				path,
				sha256: createHash('sha256')
					.update(await readFile(resolve(path)))
					.digest('hex'),
			}))
		);
		await writeFile(
			resolve(artifacts, 'build-provenance.json'),
			JSON.stringify(
				{
					browserVersion: browser.version(),
					bundleSha256: createHash('sha256').update(bundle).digest('hex'),
					inputs,
					nodeVersion: process.version,
					sourceRoot,
				},
				null,
				2
			)
		);
	}
}, 30_000);

beforeEach(async () => {
	context = await browser.newContext({ serviceWorkers: 'block' });
	requests = [];
	messages = [];
	held = [];
	holdScripts = false;
	schedulerResponse = false;
	loaderRequests = 0;
	await context.routeWebSocket('**/*', (socket) => socket.close());
	await context.route('**/*', async (route) => {
		const request = route.request();
		const url = request.url();
		requests.push({ body: request.postData(), method: request.method(), url });
		if (
			request.resourceType() === 'script' &&
			/\/(?:sdk|index)\.js$/u.test(url)
		) {
			loaderRequests += 1;
			if (holdScripts) {
				held.push(route);
				return;
			}
			await route.fulfill({
				body: url.endsWith('/index.js') ? pixelBytes : sdkBytes,
				contentType: 'application/javascript',
			});
			return;
		}
		if (url === 'https://c15t-runtime.test/') {
			await route.fulfill({
				body: '<!doctype html><html><head></head><body><div id="one"></div><div id="two"></div></body></html>',
				contentType: 'text/html',
			});
			return;
		}
		await route.fulfill({
			body: JSON.stringify(
				schedulerResponse && url.includes('/form-submission')
					? {
							workflow: {
								handoff: {
									schedulerUrl:
										'https://book.default.com/book/test-org/test-booking',
									type: 'display_scheduler',
								},
							},
						}
					: {}
			),
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			status: 200,
		});
	});
	page = await context.newPage();
	page.on('console', (message) => messages.push(message.text()));
	await page.addInitScript(() => {
		window.__defaultPixel__logging__verbose = true;
	});
	await page.goto('https://c15t-runtime.test/');
	await page.addScriptTag({ content: bundle });
});

afterEach(async ({ task }) => {
	if (artifacts) {
		await writeFile(
			resolve(artifacts, `${task.name.replace(/[^a-z0-9]+/giu, '-')}.json`),
			JSON.stringify({ loaderRequests, messages, requests }, null, 2)
		);
	}
	await context?.close();
});
afterAll(async () => {
	await browser?.close();
});

test('denies the initialized SDK when its registration is removed', async () => {
	await start();
	expect(await cookie()).toMatchObject(granted);
	await page.evaluate(() => window.__defaultComRuntime.remove());
	expect(await cookie()).toMatchObject(denied);
	expect(initialized()).toHaveLength(1);
	expect(
		messages.some((line) =>
			line.includes('Consent updated: {"analytics":false,"marketing":false')
		)
	).toBe(true);
});

test('denies the retained SDK and rejects a changed-URL replacement', async () => {
	await start();
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				publicKey,
				scriptUrl: 'https://proxy.test/sdk.js',
			}),
		keyA
	);
	// sdk.js stays loaded for the page, so a new URL is not downloaded.
	await expect
		.poll(() => messages)
		.toContain(
			'defaultComFormsSdk: Reload the page to change the Forms SDK URL.'
		);
	expect(
		await page
			.locator('script[src]')
			.evaluateAll((elements) =>
				elements.map((element) => element.getAttribute('src'))
			)
	).toEqual(['https://handshake.default.com/sdk.js']);
	expect(await cookie()).toMatchObject(denied);
	expect(loaderRequests).toBe(1);
	expect(initialized()).toHaveLength(1);
});

test('forwards denial after the owned element is detached externally', async () => {
	await start();
	await page.evaluate(async () => {
		document.querySelector('script[src]')?.remove();
		await window.__defaultComRuntime.consent(false);
	});
	expect(await cookie()).toMatchObject(denied);
	expect(initialized()).toHaveLength(1);
});

test.each(['remove', 'dispose'] as const)(
	'preserves a shared survivor and denies only the final owner on %s',
	async (action) => {
		await start();
		await page.evaluate(
			(publicKey) => window.__defaultComRuntime.addOwner({ publicKey }),
			keyA
		);
		await page.waitForTimeout(0);
		await page.evaluate(
			(method) => window.__defaultComRuntime[method](0),
			action
		);
		expect(await cookie()).toMatchObject(granted);
		expect(await page.locator('script[src]').count()).toBe(1);
		await page.evaluate(
			(method) => window.__defaultComRuntime[method](1),
			action
		);
		expect(await cookie()).toMatchObject(denied);
		// The final owner leaves the loaded SDK in the page for a later remount.
		expect(await page.locator('script[src]').count()).toBe(1);
		await page.evaluate(
			(publicKey) => window.__defaultComRuntime.addOwner({ publicKey }),
			keyA
		);
		await expect.poll(cookie).toMatchObject(granted);
		expect(await page.locator('script[src]').count()).toBe(1);
		expect(loaderRequests).toBe(1);
		expect(initialized()).toHaveLength(1);
		expect(reconfigured()).toHaveLength(0);
	}
);

test.each(['remove', 'dispose'] as const)(
	'never initializes a late SDK after pending %s',
	async (action) => {
		holdScripts = true;
		await page.evaluate(
			(publicKey) => window.__defaultComRuntime.start({ publicKey }),
			keyA
		);
		await expect.poll(() => held.length).toBe(1);
		await page.evaluate(
			(method) => window.__defaultComRuntime[method](),
			action
		);
		await complete();
		await page.waitForFunction(() => window.DefaultPixelSDK !== undefined);
		expect(await page.evaluate(() => window.__dft_sdk_loaded)).toBeUndefined();
		expect(await cookie()).toBeNull();
		expect(initialized()).toHaveLength(0);
		expect(
			messages.filter((line) => line.includes('Consent updated:'))
		).toHaveLength(0);
	}
);

test('equal recreated configuration retains its element without another SDK call', async () => {
	await start({
		autoDisplayScheduler: { loader: false, target: '#one' },
		endpoint: ' https://proxy.test ',
		schedulerOrigins: ['https://schedule.test'],
	});
	const element = await page.locator('script[src]').elementHandle();
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				autoDisplayScheduler: { loader: false, target: '#one' },
				endpoint: 'https://proxy.test',
				publicKey,
				schedulerOrigins: ['https://schedule.test'],
			}),
		` ${keyA} `
	);
	expect(await element?.evaluate((node) => node.isConnected)).toBe(true);
	expect(loaderRequests).toBe(1);
	expect(initialized()).toHaveLength(1);
	expect(reconfigured()).toHaveLength(0);
});

test('removal denies the retained actual client without acquiring a changed global', async () => {
	await seedIdentity();
	await start();
	await page.evaluate(() => window.__defaultComRuntime.submit());
	const previous = JSON.parse(submitted().at(-1)?.body ?? 'null');
	await page.evaluate(() => window.__defaultComRuntime.retainSdk());
	await page.addScriptTag({ content: sdkBytes.toString() });
	await page.evaluate(() => window.__defaultComRuntime.remove());
	expect(await cookie()).toMatchObject(denied);
	expect(
		await page.evaluate(() => window.__defaultComRuntime.submit())
	).toMatchObject({
		error: expect.stringContaining('not initialized'),
		success: false,
	});
	expect(
		await page.evaluate(() => window.__defaultComRuntime.submitRetained())
	).toMatchObject({ success: true });
	const afterDenial = JSON.parse(submitted().at(-1)?.body ?? 'null');
	expect(afterDenial.anonymousId).not.toBe(previous.anonymousId);
	expect(afterDenial.sessionId).not.toBe(previous.sessionId);
	expect(initialized()).toHaveLength(1);
	expect(
		await page.evaluate(
			() =>
				typeof Object.getOwnPropertyDescriptor(window.DefaultPixelSDK, 'init')
					?.get
		)
	).toBe('function');
});

test('applies changed normalized endpoint and key to real submission requests', async () => {
	await seedIdentity();
	await start({ endpoint: 'https://old-proxy.test' });
	await page.evaluate(() => window.__defaultComRuntime.submit());
	const previous = JSON.parse(submitted().at(-1)?.body ?? 'null');
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				endpoint: ' https://new-proxy.test ',
				publicKey,
			}),
		` ${keyB} `
	);
	await page.evaluate(() => window.__defaultComRuntime.submit());
	const request = submitted().at(-1);
	expect(request?.url).toBe('https://new-proxy.test/api/form-submission');
	expect(JSON.parse(request?.body ?? 'null')).toMatchObject({
		anonymousId: previous.anonymousId,
		publicKey: keyB,
		sessionId: previous.sessionId,
	});
	expect(initialized()).toHaveLength(1);
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
	expect(
		requests.filter(({ url }) => url.includes('/scheduler-style'))
	).toHaveLength(1);
});

test('connected denial targets the owned client after the SDK global changes', async () => {
	await seedIdentity();
	await start();
	await page.evaluate(() => window.__defaultComRuntime.submit());
	const previous = JSON.parse(submitted().at(-1)?.body ?? 'null');
	await page.evaluate(() => window.__defaultComRuntime.retainSdk());
	await page.addScriptTag({ content: sdkBytes.toString() });
	await page.evaluate(() => window.__defaultComRuntime.vendor(false));
	expect(await cookie()).toMatchObject(denied);
	expect(
		await page.evaluate(() => window.__defaultComRuntime.submit())
	).toMatchObject({
		error: expect.stringContaining('not initialized'),
		success: false,
	});
	expect(initialized()).toHaveLength(1);
	expect(reconfigured()).toHaveLength(0);
	expect(
		await page.evaluate(() => window.__defaultComRuntime.submitRetained())
	).toMatchObject({ success: true });
	const afterDenial = JSON.parse(submitted().at(-1)?.body ?? 'null');
	expect(afterDenial.anonymousId).not.toBe(previous.anonymousId);
	expect(afterDenial.sessionId).not.toBe(previous.sessionId);
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				endpoint: 'https://changed-global.test',
				publicKey,
			}),
		keyB
	);
	expect(reconfigured()).toHaveLength(0);
	await page.evaluate(() => window.__defaultComRuntime.vendor(true));
	expect(
		await page.evaluate(() => window.__defaultComRuntime.submit())
	).toMatchObject({ success: true });
	expect(submitted().at(-1)?.url).toBe(
		'https://changed-global.test/api/form-submission'
	);
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});

test('equal omitted and explicit default configuration avoids reconfiguration', async () => {
	await start();
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				autoDisplayScheduler: true,
				endpoint: 'https://api.default.com',
				publicKey,
			}),
		keyA
	);
	expect(reconfigured()).toHaveLength(0);
	expect(initialized()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});

test.each(['pixel-first', 'sdk-first'] as const)(
	'blocks the alternative against an actual loaded runtime for %s',
	async (order) => {
		await page.evaluate(
			({ publicKey, pixelFirst }) =>
				window.__defaultComRuntime.start({ publicKey }, pixelFirst),
			{ pixelFirst: order === 'pixel-first', publicKey: keyA }
		);
		await page.waitForFunction(
			(pixelFirst) =>
				pixelFirst
					? window.DefaultPixel !== undefined
					: window.__dft_sdk_loaded === true,
			order === 'pixel-first'
		);
		await page.evaluate(
			({ publicKey, pixelFirst }) =>
				window.__defaultComRuntime.addOwner({ publicKey }, !pixelFirst),
			{ pixelFirst: order === 'pixel-first', publicKey: keyA }
		);
		expect(
			await page
				.locator('script[type="application/x-c15t-default-conflict"]')
				.count()
		).toBe(1);
		expect(
			messages.filter((line) =>
				line.includes('conflicting Default installation')
			)
		).toHaveLength(1);
		await page.evaluate(() => window.__defaultComRuntime.consent(false));
		expect(await cookie()).toMatchObject(denied);
		await page.evaluate(() => window.__defaultComRuntime.consent(true));
		expect(await cookie()).toMatchObject(granted);
		expect(loaderRequests).toBe(1);
		expect(initialized()).toHaveLength(order === 'sdk-first' ? 1 : 0);
	}
);

test('updates real scheduler origin filtering', async () => {
	await start({ schedulerOrigins: ['https://old-scheduler.test'] });
	await page.evaluate(() => {
		window.__defaultComRuntime.observeMeetings();
		window.__defaultComRuntime.message(
			'https://old-scheduler.test',
			'old-before'
		);
		window.__defaultComRuntime.message(
			'https://new-scheduler.test',
			'new-before'
		);
	});
	expect(
		await page.evaluate(() => window.__defaultComRuntime.meetings)
	).toEqual(['old-before']);
	await page.evaluate((publicKey) => {
		window.__defaultComRuntime.replace({
			publicKey,
			schedulerOrigins: ['https://new-scheduler.test'],
		});
		window.__defaultComRuntime.message(
			'https://old-scheduler.test',
			'old-after'
		);
		window.__defaultComRuntime.message(
			'https://new-scheduler.test',
			'new-after'
		);
	}, keyA);
	expect(
		await page.evaluate(() => window.__defaultComRuntime.meetings)
	).toEqual(['old-before', 'new-after']);
	expect(loaderRequests).toBe(1);
});

test('changes scheduler display target and loader through the real SDK', async () => {
	const schedulerUrl = 'https://book.default.com/embed/**';
	const schedulerDocuments: Route[] = [];
	const completeScheduler = async () => {
		const [route] = schedulerDocuments;
		if (!route) {
			throw new Error('Expected a pending scheduler document.');
		}
		await route.fulfill({ body: '{}', contentType: 'application/json' });
		schedulerDocuments.shift();
	};
	await page.route(schedulerUrl, (route) => {
		schedulerDocuments.push(route);
	});
	try {
		schedulerResponse = true;
		await start({ autoDisplayScheduler: { loader: false, target: '#one' } });
		await page.evaluate(() => window.__defaultComRuntime.submit(true));
		await expect.poll(() => schedulerDocuments.length).toBe(1);
		await expect.poll(() => page.locator('#one iframe').count()).toBe(1);
		expect(
			await page.locator('#one .dftDefaultLoadingModal--contained').count()
		).toBe(0);
		await completeScheduler();
		await page.evaluate((publicKey) => {
			document.querySelector('#one')?.replaceChildren();
			window.__defaultComRuntime.replace({
				autoDisplayScheduler: { loader: true, target: '#two' },
				publicKey,
			});
		}, keyA);
		await page.evaluate(() => window.__defaultComRuntime.submit(true));
		await expect.poll(() => schedulerDocuments.length).toBe(1);
		await expect.poll(() => page.locator('#two iframe').count()).toBe(1);
		expect(await page.locator('#one iframe').count()).toBe(0);
		expect(
			await page.locator('#two .dftDefaultLoadingModal--contained').count()
		).toBe(1);
		await page.locator('#two iframe').evaluate((iframe) => {
			iframe.addEventListener(
				'load',
				() => iframe.setAttribute('data-loaded', 'true'),
				{ once: true }
			);
		});
		await completeScheduler();
		await expect
			.poll(() => page.locator('#two iframe').getAttribute('data-loaded'))
			.toBe('true');
		await expect
			.poll(() =>
				page.locator('#two .dftDefaultLoadingModal--contained').count()
			)
			.toBe(0);
		expect(await page.locator('#two iframe').count()).toBe(1);
		expect(reconfigured()).toHaveLength(1);
		expect(loaderRequests).toBe(1);
	} finally {
		await page.unroute(schedulerUrl);
		await Promise.all(schedulerDocuments.map((route) => route.abort()));
	}
});

test('omitted options restore endpoint origins and automatic display defaults', async () => {
	schedulerResponse = true;
	await start({
		autoDisplayScheduler: false,
		endpoint: 'https://custom-proxy.test',
		schedulerOrigins: ['https://custom-scheduler.test'],
	});
	await page.evaluate(() => window.__defaultComRuntime.submit(true));
	expect(await page.locator('iframe[src*="book.default.com"]').count()).toBe(0);
	await page.evaluate((publicKey) => {
		window.__defaultComRuntime.replace({ publicKey });
		window.__defaultComRuntime.observeMeetings();
		window.__defaultComRuntime.message(
			'https://custom-scheduler.test',
			'custom'
		);
		window.__defaultComRuntime.message('https://api.default.com', 'default');
	}, keyA);
	await page.evaluate(() => window.__defaultComRuntime.submit(true));
	expect(submitted().at(-1)?.url).toBe(
		'https://api.default.com/api/form-submission'
	);
	expect(
		await page.evaluate(() => window.__defaultComRuntime.meetings)
	).toEqual(['default']);
	await expect
		.poll(() => page.locator('#__default_scheduler_modal__ iframe').count())
		.toBe(1);
	expect(loaderRequests).toBe(1);
});

test('snapshots caller-owned arrays and objects before in-place mutations', async () => {
	schedulerResponse = true;
	await page.evaluate(async (publicKey) => {
		const origins = ['https://old-scheduler.test'];
		const display = { loader: false, target: '#one' };
		await window.__defaultComRuntime.start({
			autoDisplayScheduler: display,
			publicKey,
			schedulerOrigins: origins,
		});
		window.__runtimeOptions = {
			autoDisplayScheduler: display,
			publicKey,
			schedulerOrigins: origins,
		};
	}, keyA);
	await waitInitialized();
	await page.evaluate(() => {
		const options = window.__runtimeOptions;
		if (
			!options?.schedulerOrigins ||
			typeof options.autoDisplayScheduler !== 'object'
		) {
			throw new Error('Expected mutable caller options');
		}
		options.schedulerOrigins[0] = 'https://new-scheduler.test';
		options.autoDisplayScheduler.target = '#two';
		options.autoDisplayScheduler.loader = true;
		window.__defaultComRuntime.replace(options);
		window.__defaultComRuntime.observeMeetings();
		window.__defaultComRuntime.message('https://old-scheduler.test', 'old');
		window.__defaultComRuntime.message('https://new-scheduler.test', 'new');
	});
	expect(
		await page.evaluate(() => window.__defaultComRuntime.meetings)
	).toEqual(['new']);
	await page.evaluate(() => window.__defaultComRuntime.submit(true));
	await expect.poll(() => page.locator('#two iframe').count()).toBe(1);
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});

test('compares distinct HTMLElement scheduler targets by identity', async () => {
	schedulerResponse = true;
	await page.evaluate(async (publicKey) => {
		const target = document.getElementById('one');
		if (!target) {
			throw new Error('Expected first target');
		}
		await window.__defaultComRuntime.start({
			autoDisplayScheduler: { loader: false, target },
			publicKey,
		});
	}, keyA);
	await waitInitialized();
	await page.evaluate(() => window.__defaultComRuntime.submit(true));
	await expect.poll(() => page.locator('#one iframe').count()).toBe(1);
	await page.evaluate((publicKey) => {
		document.getElementById('one')?.replaceChildren();
		const target = document.getElementById('two');
		if (!target) {
			throw new Error('Expected second target');
		}
		window.__defaultComRuntime.replace({
			autoDisplayScheduler: { loader: false, target },
			publicKey,
		});
	}, keyA);
	await page.evaluate(() => window.__defaultComRuntime.submit(true));
	await expect.poll(() => page.locator('#two iframe').count()).toBe(1);
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});

test('defers changed configuration while denied and applies it on grant', async () => {
	await start({ endpoint: 'https://old-proxy.test' });
	await page.evaluate(async (publicKey) => {
		await window.__defaultComRuntime.vendor(false);
		window.__defaultComRuntime.replace({
			endpoint: 'https://new-proxy.test',
			publicKey,
		});
	}, keyB);
	expect(await cookie()).toMatchObject(denied);
	expect(reconfigured()).toHaveLength(0);
	await page.evaluate(() => window.__defaultComRuntime.submit());
	expect(submitted().at(-1)?.url).toBe(
		'https://old-proxy.test/api/form-submission'
	);
	await page.evaluate(() => window.__defaultComRuntime.vendor(true));
	await page.evaluate(() => window.__defaultComRuntime.submit());
	expect(submitted().at(-1)?.url).toBe(
		'https://new-proxy.test/api/form-submission'
	);
	expect(JSON.parse(submitted().at(-1)?.body ?? 'null')).toMatchObject({
		publicKey: keyB,
	});
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});

test('initializes a new actual SDK identity through a live completed registration', async () => {
	await start();
	await page.addScriptTag({ content: sdkBytes.toString() });
	await page.evaluate(
		(publicKey) =>
			window.__defaultComRuntime.replace({
				endpoint: 'https://new-identity.test',
				publicKey,
			}),
		keyB
	);
	await page.evaluate(() => window.__defaultComRuntime.submit());
	expect(submitted().at(-1)?.url).toBe(
		'https://new-identity.test/api/form-submission'
	);
	expect(JSON.parse(submitted().at(-1)?.body ?? 'null')).toMatchObject({
		publicKey: keyB,
	});
	expect(reconfigured()).toHaveLength(1);
	expect(loaderRequests).toBe(1);
});
