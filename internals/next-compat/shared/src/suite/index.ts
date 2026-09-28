import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	inject,
	it,
} from 'vitest';

import type { CompatProbeState } from '../probe';
import { readRenderingMode } from './manifest';
import type { RenderingMode } from './manifest';
import './provided-context';

export type { RenderingMode } from './manifest';

/**
 * How the init data is expected to reach the store for a scenario.
 *
 * - `client`: the browser runtime calls `/init` after hydration
 * - `ssr`: the server called `/init` and streamed the promise into the provider
 * - `manifest`: the browser resolves init from the same-origin manifest route
 * - `manifest-ssr`: the server resolved init from the manifest route
 * - `static-manifest`: the browser resolves init from a manifest module
 *   generated at build time (`@c15t/nextjs/static`); nothing is fetched
 */
export type InitPath =
	| 'client'
	| 'ssr'
	| 'manifest'
	| 'manifest-ssr'
	| 'manifest-geo'
	| 'ssr-stream'
	| 'static-manifest';

export interface CompatScenario {
	name: string;
	path: string;
	initPath: InitPath;
	rendering: RenderingMode;
	/**
	 * Country the store should report. Defaults to the forwarded test header;
	 * `null` for paths that resolve without any geo input.
	 */
	country?: string | null;
	/**
	 * The page renders `GatedEmbed` (a marketing `ConsentGate` around the
	 * stub's counted embed) in its prerendered shell. Adds a test that the
	 * placeholder is in the first HTML and that the embed document is
	 * requested only after consent, exactly once per page load.
	 */
	gatedEmbed?: boolean;
}

export interface CompatSuiteOptions {
	title: string;
	scenarios: CompatScenario[];
}

const TEST_COUNTRY = 'FR';
const BANNER_MARKER = 'consent-banner-root';
const GATE_PLACEHOLDER_MARKER = 'data-testid="frame-placeholder"';
const GATED_EMBED_PATH = '/api/c15t/__compat/embed';

const fetchHTML = async function fetchHTML(
	baseURL: string,
	path: string
): Promise<string> {
	const response = await fetch(`${baseURL}${path}`, {
		headers: { 'x-vercel-ip-country': TEST_COUNTRY },
	});
	expect(response.status).toBe(200);
	return response.text();
};

interface RecordedInitRequest {
	headers: Record<string, string>;
	countryCode: string;
}

const readProbe = function readProbe(
	page: Page
): Promise<CompatProbeState | undefined> {
	return page.evaluate(() => window.__c15tCompat);
};

/**
 * Waits until the kernel holds an authoritative policy. In v3 the banner
 * is withheld while the policy is provisional, so this is the moment the
 * init path (server config, manifest, or browser fetch) has resolved.
 */
const waitForInit = async function waitForInit(
	page: Page
): Promise<CompatProbeState> {
	await page.waitForFunction(
		() => {
			const state = window.__c15tCompat;
			return !!state && state.hasPolicy && !state.policyProvisional;
		},
		undefined,
		{ timeout: 30_000 }
	);
	const state = await readProbe(page);
	if (!state) {
		throw new Error('probe state missing after init');
	}
	return state;
};

const fetchInitRequests = async function fetchInitRequests(
	baseURL: string
): Promise<RecordedInitRequest[]> {
	const response = await fetch(`${baseURL}/api/c15t/__compat/requests`);
	const body = (await response.json()) as {
		initRequests: RecordedInitRequest[];
	};
	return body.initRequests;
};

const fetchManifestRequests = async function fetchManifestRequests(
	baseURL: string
): Promise<RecordedInitRequest[]> {
	const response = await fetch(`${baseURL}/api/c15t/__compat/requests`);
	const body = (await response.json()) as {
		manifestRequests: RecordedInitRequest[];
	};
	return body.manifestRequests;
};

/**
 * Counts the browser's requests for the gated embed document in a context,
 * including a load the browser starts and then cancels.
 */
const watchEmbedRequests = function watchEmbedRequests(
	target: BrowserContext
): { count: () => number; reset: () => void } {
	let requests = 0;
	target.on('request', (request) => {
		if (new URL(request.url()).pathname === GATED_EMBED_PATH) {
			requests += 1;
		}
	});
	return {
		count: () => requests,
		reset: () => {
			requests = 0;
		},
	};
};

const clearInitRequests = async function clearInitRequests(baseURL: string) {
	await fetch(`${baseURL}/api/c15t/__compat/requests`, { method: 'DELETE' });
};

/**
 * Browsers attach `sec-fetch-site` to every request; Node's `fetch` sends
 * `sec-fetch-mode` but never `sec-fetch-site`. That header separates the
 * server-side `/init` call from the one the runtime makes after hydration,
 * whatever bundler built the app.
 */
const isBrowserRequest = function isBrowserRequest(
	request: RecordedInitRequest
): boolean {
	return request.headers['sec-fetch-site'] !== undefined;
};

/**
 * Registers the compatibility suite for one fixture app.
 *
 * @remarks
 * Every scenario runs the same checks: the banner renders, the init data
 * arrived through the documented path, forwarded geo headers reached the
 * backend, consent persists across a reload, the build rendered the route the
 * way the docs promise, and the browser console stayed clean.
 */
export const defineCompatSuite = function defineCompatSuite({
	title,
	scenarios,
}: CompatSuiteOptions) {
	describe(title, () => {
		const baseURL = inject('compatBaseURL');
		const appDir = inject('compatAppDir');
		// The stub is mounted inside the app unless the cell runs it on its own
		// port (static export), in which case the diagnostics live there.
		const stubURL = inject('compatBackendURL') ?? baseURL;
		let browser: Browser;
		let context: BrowserContext;
		let page: Page;
		let consoleErrors: string[];
		let pageErrors: string[];

		beforeAll(async () => {
			browser = await chromium.launch();
		});

		afterAll(async () => {
			await browser?.close();
		});

		beforeEach(async () => {
			await clearInitRequests(stubURL);
			context = await browser.newContext({
				extraHTTPHeaders: { 'x-vercel-ip-country': TEST_COUNTRY },
			});
			page = await context.newPage();
			consoleErrors = [];
			pageErrors = [];
			page.on('console', (message) => {
				if (message.type() === 'error' || message.type() === 'warning') {
					consoleErrors.push(`[${message.type()}] ${message.text()}`);
				}
			});
			page.on('pageerror', (error) => {
				pageErrors.push(error.message);
			});
		});

		afterEach(async () => {
			await context?.close();
		});

		const registerScenario = function registerScenario(
			scenario: CompatScenario
		) {
			describe(scenario.name, () => {
				it('renders the route the way the docs promise', () => {
					expect(readRenderingMode(appDir, scenario.path)).toEqual(
						scenario.rendering
					);
				});

				it('shows the banner and reports the expected init path', async () => {
					const initialHTML = await fetchHTML(baseURL, scenario.path);
					await clearInitRequests(stubURL);
					await page.goto(`${baseURL}${scenario.path}`, {
						waitUntil: 'domcontentloaded',
					});
					const state = await waitForInit(page);

					expect(state.scenario).toBe(scenario.name);
					expect(state.onErrorCount).toBe(0);
					expect(state.countryCode).toBe(
						scenario.country === undefined ? TEST_COUNTRY : scenario.country
					);
					expect(state.activeUI).toBe('banner');
					await page
						.locator('[data-testid="consent-banner-accept-button"]')
						.waitFor({ state: 'visible', timeout: 30_000 });

					const initRequests = await fetchInitRequests(stubURL);
					const manifestRequests = await fetchManifestRequests(stubURL);
					const serverSide = initRequests.filter(
						(request) => !isBrowserRequest(request)
					);
					const browserSide = initRequests.filter(isBrowserRequest);

					switch (scenario.initPath) {
						case 'ssr': {
							// The server called /init with the forwarded country and the
							// resulting policy reached the first HTML, so the banner is
							// already in the document before hydration.
							expect(serverSide.length).toBeGreaterThanOrEqual(1);
							expect(serverSide[0]?.headers['x-c15t-country']).toBe(
								TEST_COUNTRY
							);
							// The client's IP and user agent travel with the server call,
							// so the backend can geolocate and record them as it would
							// for a browser-initiated /init.
							expect(serverSide[0]?.headers['x-forwarded-for']).toBeDefined();
							expect(serverSide[0]?.headers['user-agent']).toContain(
								'HeadlessChrome'
							);
							expect(initialHTML).toContain(BANNER_MARKER);
							break;
						}
						case 'ssr-stream': {
							// The layout handed the root the pending promise. The
							// server still called /init with the forwarded country, the
							// browser did not, and the banner is not in the first HTML:
							// it appears once the promise resolves.
							expect(serverSide.length).toBeGreaterThanOrEqual(1);
							expect(serverSide[0]?.headers['x-c15t-country']).toBe(
								TEST_COUNTRY
							);
							expect(browserSide).toHaveLength(0);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							break;
						}
						case 'manifest-geo': {
							// The browser called the same-origin init route, which
							// resolved from the cached manifest with the request's geo,
							// so the backend saw no /init and the store knows the country.
							expect(initRequests).toHaveLength(0);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							break;
						}
						case 'client': {
							expect(serverSide).toHaveLength(0);
							expect(browserSide).toHaveLength(1);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							break;
						}
						case 'manifest': {
							// The browser resolved init from the same-origin manifest
							// route; the backend never saw an /init call, only the
							// route handler's single manifest fetch.
							expect(initRequests).toHaveLength(0);
							expect(manifestRequests).toHaveLength(1);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							await page.goto(`${baseURL}${scenario.path}`, {
								waitUntil: 'domcontentloaded',
							});
							await waitForInit(page);
							// The route handler caches the manifest across requests.
							expect(await fetchManifestRequests(stubURL)).toHaveLength(1);
							break;
						}
						case 'manifest-ssr': {
							// The server resolved init from the manifest route and the
							// policy reached the first HTML; no /init anywhere. Whether
							// the backend saw a manifest fetch depends on the route's
							// cache state, which the `manifest` scenario asserts.
							expect(initRequests).toHaveLength(0);
							expect(initialHTML).toContain(BANNER_MARKER);
							break;
						}
						case 'static-manifest': {
							// The manifest was baked into the bundle at build time, so the
							// browser resolved init locally: no /init, no /manifest, and
							// no banner in the exported HTML.
							expect(initRequests).toHaveLength(0);
							expect(manifestRequests).toHaveLength(0);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							break;
						}
						default: {
							throw new Error(`unknown initPath ${scenario.initPath}`);
						}
					}

					expect(pageErrors).toEqual([]);
					expect(consoleErrors).toEqual([]);
				});

				if (scenario.gatedEmbed) {
					it('prerenders the gate placeholder and loads the embed once, only after consent', async () => {
						const initialHTML = await fetchHTML(baseURL, scenario.path);
						expect(initialHTML).toContain(GATE_PLACEHOLDER_MARKER);
						expect(initialHTML).not.toContain(`src="${GATED_EMBED_PATH}"`);

						// New visitor: nothing reaches the embed before a choice.
						const embed = watchEmbedRequests(context);
						await page.goto(`${baseURL}${scenario.path}`, {
							waitUntil: 'load',
						});
						await waitForInit(page);
						await page.waitForTimeout(500);
						expect(embed.count()).toBe(0);

						// Accept: the embed loads once.
						await page.click('[data-testid="consent-banner-accept-button"]');
						await page
							.locator('[data-testid="compat-gated-embed"]')
							.waitFor({ state: 'attached', timeout: 30_000 });
						await expect.poll(embed.count, { timeout: 10_000 }).toBe(1);
						await page.waitForFunction(
							() => document.cookie.includes('c15t='),
							undefined,
							{ timeout: 10_000 }
						);
						await page.waitForTimeout(500);
						expect(embed.count()).toBe(1);

						// Returning visitor with the grant: once per page load.
						embed.reset();
						await page.reload({ waitUntil: 'load' });
						await waitForInit(page);
						await page
							.locator('[data-testid="compat-gated-embed"]')
							.waitFor({ state: 'attached', timeout: 30_000 });
						await page.waitForTimeout(500);
						expect(embed.count()).toBe(1);

						// Returning visitor who declined: never.
						const declined = await browser.newContext({
							extraHTTPHeaders: { 'x-vercel-ip-country': TEST_COUNTRY },
						});
						const declinedEmbed = watchEmbedRequests(declined);
						try {
							const other = await declined.newPage();
							await other.goto(`${baseURL}${scenario.path}`, {
								waitUntil: 'load',
							});
							await waitForInit(other);
							await other.click('[data-testid="consent-banner-reject-button"]');
							await other.waitForFunction(
								() => document.cookie.includes('c15t='),
								undefined,
								{ timeout: 10_000 }
							);
							await other.reload({ waitUntil: 'load' });
							await waitForInit(other);
							await other.waitForTimeout(500);
						} finally {
							await declined.close();
						}
						expect(declinedEmbed.count()).toBe(0);

						expect(pageErrors).toEqual([]);
						expect(consoleErrors).toEqual([]);
					});
				}

				it('persists consent across a reload', async () => {
					await page.goto(`${baseURL}${scenario.path}`, {
						waitUntil: 'domcontentloaded',
					});
					await waitForInit(page);
					await page.click('[data-testid="consent-banner-accept-button"]');
					await page.waitForFunction(
						() =>
							window.__c15tCompat?.hasConsented === true &&
							window.__c15tCompat?.activeUI === 'none',
						undefined,
						{ timeout: 30_000 }
					);

					// The persistence module batches its cookie write on a timer, so
					// wait for the cookie itself before reloading; otherwise a slow
					// runner reloads before the consent is persisted.
					await page.waitForFunction(
						() => document.cookie.includes('c15t='),
						undefined,
						{ timeout: 10_000 }
					);

					await page.reload({ waitUntil: 'domcontentloaded' });
					await waitForInit(page);
					// Persisted consent hydrates from the cookie alongside init; in
					// manifest mode init resolves locally and can land first, so
					// give hydration the same grace the click above gets.
					await page.waitForFunction(
						() =>
							window.__c15tCompat?.hasConsented === true &&
							window.__c15tCompat?.activeUI === 'none',
						undefined,
						{ timeout: 10_000 }
					);
					const state = await waitForInit(page);
					expect(state.hasConsented).toBe(true);
					expect(state.activeUI).toBe('none');
					expect(
						await page
							.locator('[data-testid="consent-banner-accept-button"]')
							.count()
					).toBe(0);
					expect(pageErrors).toEqual([]);
					expect(consoleErrors).toEqual([]);
				});
			});
		};

		for (const scenario of scenarios) {
			registerScenario(scenario);
		}
	});
};
