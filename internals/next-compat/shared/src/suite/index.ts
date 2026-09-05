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
 * - `prefetch`: `C15tPrefetch` starts `/init` before hydration, the runtime adopts it
 * - `ssr`: the server called `/init` and streamed the promise into the provider
 */
export type InitPath =
	| 'client'
	| 'prefetch'
	| 'ssr'
	| 'manifest'
	| 'manifest-ssr';

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
}

export interface CompatSuiteOptions {
	title: string;
	scenarios: CompatScenario[];
}

const TEST_COUNTRY = 'FR';
const PREFETCH_SCRIPT_MARKER = '__c15tInitialDataPromises';
const BANNER_MARKER = 'consent-banner-root';

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
 * init path (server config, prefetch, or browser fetch) has resolved.
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
			await clearInitRequests(baseURL);
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
					await clearInitRequests(baseURL);
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

					const initRequests = await fetchInitRequests(baseURL);
					const manifestRequests = await fetchManifestRequests(baseURL);
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
							expect(initialHTML).toContain(BANNER_MARKER);
							break;
						}
						case 'prefetch': {
							// The inline script fired /init before hydration and the
							// runtime adopted that promise instead of fetching again.
							expect(serverSide).toHaveLength(0);
							expect(initialHTML).not.toContain(BANNER_MARKER);
							const prefetchEntries = await page.evaluate(
								() =>
									Object.keys(
										(
											window as unknown as Record<
												string,
												Record<string, unknown>
											>
										).__c15tInitialDataPromises ?? {}
									).length
							);
							expect(prefetchEntries).toBeGreaterThanOrEqual(1);
							expect(browserSide).toHaveLength(1);
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
							expect(await fetchManifestRequests(baseURL)).toHaveLength(1);
							break;
						}
						case 'manifest-ssr': {
							// The server resolved init from the manifest route and the
							// policy reached the first HTML; no /init anywhere. The
							// backend may see no manifest fetch at all here because the
							// route's Data Cache can already hold it from an earlier
							// scenario in the same server process.
							expect(initRequests).toHaveLength(0);
							expect(manifestRequests.length).toBeLessThanOrEqual(1);
							expect(initialHTML).toContain(BANNER_MARKER);
							break;
						}
						default: {
							throw new Error(`unknown initPath ${scenario.initPath}`);
						}
					}

					expect(pageErrors).toEqual([]);
					expect(consoleErrors).toEqual([]);
				});

				it('serves the prefetch script only when the scenario asks for it', async () => {
					const html = await fetchHTML(baseURL, scenario.path);
					const hasPrefetchScript = html.includes(PREFETCH_SCRIPT_MARKER);
					expect(hasPrefetchScript).toBe(scenario.initPath === 'prefetch');
				});

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

					await page.reload({ waitUntil: 'domcontentloaded' });
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
