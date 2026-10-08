// oxlint-disable vitest/no-conditional-expect -- Only adapters that await consent on the server promise cookie-backed server HTML; the selected routes of those targets run these assertions.
// oxlint-disable no-loop-func -- Each sequential suite owns its browser context and mutable request counters.
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import {
	acceptButton,
	categoryControl,
	expandCategory,
	expectNoTracking,
	openBrowserContext,
	openPreferences,
	readConsentMotion,
	recordConsentMotion,
	rejectButton,
	saveButton,
	setCategory,
	setVendor,
	vendorSwitch,
	video,
} from './browser';
import type { Requests } from './browser';
import { startExample } from './server';
import { selectedTargets } from './targets';

/** The `--c15t-primary` each example's Branded design sets, where checked. */
const BRANDED_PRIMARY: Record<string, string> = {
	svelte: '#6943a3',
	sveltekit: '#6943a3',
};

for (const target of selectedTargets()) {
	describe(target.id, () => {
		let server: Awaited<ReturnType<typeof startExample>>;
		let browser: Browser;
		let context: BrowserContext | undefined;
		let page: Page;
		let requests: Requests;

		beforeAll(async () => {
			server = await startExample(target);
			browser = await chromium.launch({ headless: true });
		});
		afterAll(async () => {
			await browser?.close();
			await server?.close();
		});
		afterEach(async (result) => {
			server?.setFailure(false);
			if (!context) {
				return;
			}
			if (result.task.result?.state === 'fail') {
				const directory = join('artifacts', target.id);
				await mkdir(directory, { recursive: true });
				const filename = result.task.name.replace(/[^a-z0-9]+/giu, '-');
				await page.screenshot({
					fullPage: true,
					path: join(directory, `${filename}.png`),
				});
				await context.tracing.stop({
					path: join(directory, `${filename}.zip`),
				});
			} else {
				await context.tracing.stop();
			}
			await context.close();
			context = undefined;
		});

		const visit = async function visit(
			path: string,
			failInit = false,
			beforeLoad?: (page: Page) => Promise<void>
		) {
			({ context, page, requests } = await openBrowserContext(
				browser,
				server.baseURL,
				server.backendURL,
				failInit
			));
			await beforeLoad?.(page);
			await page.goto(path);
			await expect
				.poll(() =>
					page
						.getByRole('heading', { exact: true, name: 'Consent example' })
						.isVisible()
				)
				.toBe(true);
		};

		if (target.id === 'nextjs') {
			test('manifest initialization reuses the cache without init requests', async () => {
				const readRequests = async () => {
					const response = await fetch(
						`${server.backendURL}/__compat/requests`
					);
					return (await response.json()) as {
						initRequests: unknown[];
						manifestRequests: unknown[];
					};
				};
				// Readiness has already rendered App Router and warmed its manifest.
				// The Pages Router is compiled apart from the App Router and keeps
				// its own process cache, which its first render fills.
				await fetch(`${server.baseURL}/pages-router`);
				const before = await readRequests();
				expect(before.manifestRequests.length).toBeGreaterThan(0);
				expect(before.initRequests).toHaveLength(0);
				await visit('/app-router');
				let browserInitRequests = 0;
				page.on('request', (request) => {
					if (new URL(request.url()).pathname.endsWith('/init')) {
						browserInitRequests += 1;
					}
				});
				await page.reload();
				await page.goto('/pages-router');
				await page.goto('/client-init');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				const after = await readRequests();
				expect(after.initRequests).toHaveLength(0);
				expect(after.manifestRequests).toHaveLength(
					before.manifestRequests.length
				);
				expect(browserInitRequests).toBe(0);
			});

			test('ConsentGate is visible without completing an entrance animation', async () => {
				({ context, page, requests } = await openBrowserContext(
					browser,
					server.baseURL,
					server.backendURL
				));
				await page.addInitScript(() => {
					const style = document.createElement('style');
					style.textContent =
						'[data-testid="consent-gate-placeholder"] { animation-play-state: paused !important; }';
					document.documentElement.append(style);
				});
				await page.goto('/app-router');
				const placeholder = page.getByTestId('consent-gate-placeholder');
				await placeholder.waitFor();
				expect(
					await placeholder.evaluate(
						(element) => getComputedStyle(element).opacity
					)
				).toBe('1');
				await expectNoTracking(page, requests);
			});
		}

		test('a reduced-motion visitor gets the banner and dialog without motion', async () => {
			({ context, page, requests } = await openBrowserContext(
				browser,
				server.baseURL,
				server.backendURL
			));
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.addInitScript(recordConsentMotion);
			await page.goto(target.routes[0] ?? '/');
			await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
			// Longer than any stock entrance or exit, so a transition shows.
			await page.waitForTimeout(400);
			await rejectButton(page).click();
			await expect.poll(() => rejectButton(page).isVisible()).toBe(false);
			await openPreferences(page);
			await page.waitForTimeout(400);
			expect(await readConsentMotion(page)).toEqual([]);
		});

		for (const route of target.routes) {
			if (target.id === 'nextjs') {
				// The default App Router layout passes the pending consent state
				// without awaiting it, and the browser-init layout passes none, so
				// their banners mount after hydration. The awaited layout and the
				// Pages Router resolve consent first and render the banner on
				// the server.
				const bannerInHTML = ['/awaited', '/pages-router'].includes(route);
				test(`${route}: initial HTML renders the page with embeds blocked`, async () => {
					const response = await fetch(`${server.baseURL}${route}`);
					expect(response.ok).toBe(true);
					const html = await response.text();
					expect(html.includes('data-testid="consent-banner-root"')).toBe(
						bannerInHTML
					);
					expect(html).toContain('data-testid="consent-gate-placeholder"');
					expect(html).not.toContain('<iframe');
				});
			}
			if (target.directory === 'nuxt' && route !== '/consent-example') {
				// Prerendered and cached HTML is served to every visitor, so it
				// cannot hold anyone's policy or choice. The browser resolves
				// both after hydration; the journeys below check that it does.
				test(`${route}: shared HTML leaves the visitor to the browser`, async () => {
					const response = await fetch(`${server.baseURL}${route}`, {
						headers: { 'x-vercel-ip-country': 'DE' },
					});
					expect(response.ok).toBe(true);
					const html = await response.text();
					expect(html).toContain('Consent example');
					expect(html).not.toContain('data-testid="consent-banner-root"');
				});
			}
			test(`${route}: UI loads with component URL filters enabled`, async () => {
				({ context, page, requests } = await openBrowserContext(
					browser,
					server.baseURL,
					server.backendURL
				));
				const blocked: string[] = [];
				// Model URL blocking, including CSS requests and Vite's /@fs/
				// modules. Cosmetic rules are a separate extension behavior.
				await context.route('**/*', async (request) => {
					const { pathname } = new URL(request.request().url());
					if (
						/(?:consent[-_](?:banner|dialog|widget|manager)|cookie[-_]banner)/iu.test(
							pathname
						)
					) {
						blocked.push(pathname);
						await request.abort('blockedbyclient');
						return;
					}
					await request.fallback();
				});
				await page.goto(route);
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				await openPreferences(page);
				await expect.poll(() => saveButton(page).isVisible()).toBe(true);
				await saveButton(page).click();
				await expectNoTracking(page, requests);
				expect(blocked).toEqual([]);
			});

			test(`${route}: rejection survives reload and preferences reopen`, async () => {
				await visit(route);
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await expectNoTracking(page, requests);
				await rejectButton(page).click();
				await expect.poll(() => rejectButton(page).isVisible()).toBe(false);
				// Hiding the banner precedes the deferred persistence effect.
				// Let every adapter finish saving before destroying its runtime.
				await expect
					.poll(() => page.evaluate(() => localStorage.getItem('c15t')))
					.not.toBeNull();
				// These routes await consent on the server, so the reloaded HTML
				// reflects the stored rejection.
				const cookieBackedHTML = [
					'nextjs',
					'tanstack-start',
					'tanstack-start-same-origin',
				].includes(target.id);
				if (cookieBackedHTML) {
					// Receipt writes are deferred. Wait for the saved choice before
					// testing how the server renders that choice on the next request.
					await expect
						.poll(async () =>
							(await page.context().cookies()).some(
								(cookie) => cookie.name === 'c15t'
							)
						)
						.toBe(true);
				}
				const reloaded = await page.reload();
				if (cookieBackedHTML) {
					expect(reloaded).not.toBeNull();
					expect(await reloaded?.text()).not.toContain(
						'data-testid="consent-banner-root"'
					);
				}
				await expectNoTracking(page, requests);
				expect(await rejectButton(page).isVisible()).toBe(false);
				await openPreferences(page);
				expect(await categoryControl(page, 'Measurement').isChecked()).toBe(
					false
				);
				expect(await categoryControl(page, 'Marketing').isChecked()).toBe(
					false
				);
				await saveButton(page).click();
				await expectNoTracking(page, requests);
			});

			test(`${route}: partial grant gates vendors and revocation removes the iframe`, async () => {
				await visit(route);
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				await openPreferences(page);
				await setCategory(page, 'Measurement', true);
				await setCategory(page, 'Marketing', false);
				await saveButton(page).click();
				await expect.poll(() => requests.posthog).toBe(1);
				// Plain HTML loads PostHog's own snippet only after consent, so no
				// helper calls PostHog's opt-in API. The other examples use
				// `@c15t/integrations`, which does.
				if (target.id !== 'html') {
					await expect
						.poll(() =>
							page.evaluate(() =>
								sessionStorage.getItem('__examplePosthogConsent')
							)
						)
						.toBe('granted');
				}
				await expect.poll(() => video(page).count()).toBe(1);
				expect(requests.xPixel).toBe(0);
				await openPreferences(page);
				await setCategory(page, 'Marketing', true);
				await saveButton(page).click();
				await expect.poll(() => requests.xPixel).toBe(1);
				await openPreferences(page);
				await setCategory(page, 'Measurement', false);
				await setCategory(page, 'Marketing', false);
				// Every example reloads after revocation. Assert against the new page.
				await Promise.all([
					page.waitForEvent('load'),
					saveButton(page).click(),
				]);
				await expect.poll(() => video(page).count()).toBe(0);
				if (target.id !== 'html') {
					await expect
						.poll(() =>
							page.evaluate(() =>
								sessionStorage.getItem('__examplePosthogConsent')
							)
						)
						.toBe('denied');
				}
				await openPreferences(page);
				expect(await categoryControl(page, 'Measurement').isChecked()).toBe(
					false
				);
				expect(await categoryControl(page, 'Marketing').isChecked()).toBe(
					false
				);
				expect(requests.posthog).toBe(1);
				expect(requests.xPixel).toBe(1);
				expect(await video(page).count()).toBe(0);
				expect(requests.unexpected).toEqual([]);
			});

			test(`${route}: grant survives navigation and reload`, async () => {
				await visit(route);
				await expect.poll(() => acceptButton(page).isVisible()).toBe(true);
				await acceptButton(page).click();
				await expect.poll(() => requests.posthog).toBe(1);
				await expect.poll(() => requests.xPixel).toBe(1);
				await expect.poll(() => video(page).count()).toBe(1);
				const branded = page
					.getByRole('button', { name: /branded/iu })
					.or(page.getByRole('link', { name: /branded/iu }))
					.first();
				await branded.click();
				const brandedPrimary = BRANDED_PRIMARY[target.id];
				if (brandedPrimary) {
					// Branded must reach the tokens the consent UI reads. A provider
					// `theme` prop alone no longer produces CSS in the browser.
					await expect
						.poll(() =>
							page.evaluate(() =>
								getComputedStyle(document.documentElement)
									.getPropertyValue('--c15t-primary')
									.trim()
							)
						)
						.toBe(brandedPrimary);
				}
				await expect.poll(() => video(page).count()).toBe(1);
				// A query navigation keeps the example route while exercising persisted
				// entry in every router, including plain HTML examples.
				await page.goto(`${route}?example-navigation=1`);
				await expect.poll(() => video(page).count()).toBe(1);
				await page.reload();
				await expect.poll(() => video(page).count()).toBe(1);
				await openPreferences(page);
				expect(requests.unexpected).toEqual([]);
			});
		}

		// These examples declare PostHog and YouTube under measurement and
		// X Pixel under marketing, and name each vendor on its script or
		// iframe.
		if (['astro', 'astro-static', 'html'].includes(target.id)) {
			test('a vendor turned off stays blocked across reload until Accept all', async () => {
				const route = target.routes[0] ?? '/';
				await visit(route);
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				await openPreferences(page);
				await setCategory(page, 'Measurement', true);
				await setVendor(page, 'measurement', 'posthog', false);
				await saveButton(page).click();
				// YouTube shares the category and loads; PostHog stays blocked.
				await expect.poll(() => video(page).count()).toBe(1);
				await page.waitForTimeout(300);
				expect(requests.posthog).toBe(0);
				expect(requests.xPixel).toBe(0);

				await page.reload();
				await expect.poll(() => video(page).count()).toBe(1);
				await page.waitForTimeout(300);
				expect(requests.posthog).toBe(0);
				await openPreferences(page);
				await expandCategory(page, 'measurement');
				expect(
					await vendorSwitch(page, 'measurement', 'posthog').getAttribute(
						'aria-checked'
					)
				).toBe('false');
				expect(
					await vendorSwitch(page, 'measurement', 'youtube').getAttribute(
						'aria-checked'
					)
				).toBe('true');

				// Accept all clears the vendor denial.
				await page
					.getByTestId('consent-widget-footer-accept-all-button')
					.click();
				await expect.poll(() => requests.posthog).toBe(1);
				await expect.poll(() => requests.xPixel).toBe(1);
				await openPreferences(page);
				await expandCategory(page, 'measurement');
				expect(
					await vendorSwitch(page, 'measurement', 'posthog').getAttribute(
						'aria-checked'
					)
				).toBe('true');
				expect(requests.unexpected).toEqual([]);
			});
		}

		if (target.id === 'html') {
			test('Tailwind classes from theme.slots style the banner in its shadow root', async () => {
				await visit('/consent-example/tailwind');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				const card = page.getByTestId('consent-banner-card');
				expect(
					await card.evaluate(
						(element) => element.getRootNode() instanceof ShadowRoot
					)
				).toBe(true);
				expect(await card.getAttribute('class')).toContain('border-sky-600');
				// `border-sky-600` from the site's Tailwind build, linked into the
				// shadow root, wins over the stock card border.
				await expect
					.poll(() =>
						card.evaluate((element) => {
							const style = getComputedStyle(element);
							return [style.borderTopWidth, style.borderTopLeftRadius];
						})
					)
					.toEqual(['4px', '0px']);
				await expect
					.poll(() =>
						card.evaluate((element) => getComputedStyle(element).borderTopColor)
					)
					.toMatch(/^oklch\(0\.588 0\.158 241\.966\)$|^rgb\(0, 132, 209\)$/u);
				expect(requests.unexpected).toEqual([]);
			});

			test('Tailwind 4 utilities that rely on @property also need the page link', async () => {
				// The same page without its own <link> to the Tailwind build, so
				// the build loads only inside the shadow root. The observer sees
				// the document, not the shadow root, so c15t's link stays.
				await visit('/consent-example/tailwind', false, async (fresh) => {
					await fresh.addInitScript(() => {
						new MutationObserver((records) => {
							for (const record of records) {
								for (const node of record.addedNodes) {
									if (
										node instanceof HTMLLinkElement &&
										node.getAttribute('href') === '/tailwind.css'
									) {
										node.remove();
									}
								}
							}
						}).observe(document, { childList: true, subtree: true });
					});
				});
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				expect(
					await page.evaluate(() =>
						[...document.styleSheets].some((sheet) =>
							sheet.href?.endsWith('/tailwind.css')
						)
					)
				).toBe(false);
				const card = page.getByTestId('consent-banner-card');
				// `rounded-none` needs no registered property, so it proves the
				// build loaded inside the shadow root.
				await expect
					.poll(() =>
						card.evaluate(
							(element) => getComputedStyle(element).borderTopLeftRadius
						)
					)
					.toBe('0px');
				// `border-4` sets `border-style: var(--tw-border-style)`. Tailwind
				// gives that variable its `solid` default with @property, which a
				// shadow root's stylesheet cannot register, so the border has no
				// style and no width.
				expect(
					await card.evaluate((element) => {
						const style = getComputedStyle(element);
						return [style.borderTopStyle, style.borderTopWidth];
					})
				).toEqual(['none', '0px']);
				expect(requests.unexpected).toEqual([]);
			});
		}

		if (target.id.startsWith('tanstack-start')) {
			// Awaited server rendering puts the banner in the HTML, and a
			// streamed loader sends it in a later chunk of the same response.
			// Prerendered pages mount it after hydration.
			const bannerInHTML = [
				'tanstack-start',
				'tanstack-start-same-origin',
				'tanstack-start-streamed',
			].includes(target.id);
			// Only the same-origin variant sends consent traffic to the app.
			const sameOrigin = target.id === 'tanstack-start-same-origin';

			test('initial HTML matches the rendering variant', async () => {
				const response = await fetch(`${server.baseURL}/consent-example`, {
					headers: { 'x-vercel-ip-country': 'DE' },
				});
				expect(response.ok).toBe(true);
				const html = await response.text();
				expect(html.includes('data-testid="consent-banner-root"')).toBe(
					bannerInHTML
				);
				expect(html).not.toContain('<iframe');
			});

			test('consent saves reach the configured origin', async () => {
				await visit('/consent-example');
				const saves: string[] = [];
				page.on('request', (request) => {
					const url = new URL(request.url());
					if (
						request.method() === 'POST' &&
						url.pathname.endsWith('/subjects')
					) {
						saves.push(url.origin);
					}
				});
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				await expect.poll(() => saves.length).toBeGreaterThan(0);
				const expected = new URL(
					sameOrigin ? server.baseURL : server.backendURL
				).origin;
				expect(saves.every((origin) => origin === expected)).toBe(true);
			});
		}

		if (target.id === 'astro' || target.id === 'astro-static') {
			test('ClientRouter navigation keeps one runtime and the banner state', async () => {
				await visit('/consent-example');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await page.evaluate(() => {
					(window as unknown as { __runtimeMarker: unknown }).__runtimeMarker =
						(window as unknown as { __c15tAstro: unknown }).__c15tAstro;
				});
				const sameRuntime = () =>
					page.evaluate(
						() =>
							(window as unknown as { __runtimeMarker: unknown })
								.__runtimeMarker ===
							(window as unknown as { __c15tAstro: unknown }).__c15tAstro
					);

				// A swapped-in page still owes the banner until someone chooses.
				await page
					.getByRole('link', { exact: true, name: 'Second page' })
					.click();
				await page.waitForURL('**/second');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				expect(await sameRuntime()).toBe(true);

				await rejectButton(page).click();
				await expect.poll(() => rejectButton(page).isVisible()).toBe(false);
				await page
					.getByRole('link', { exact: true, name: 'Consent example' })
					.click();
				await page.waitForURL('**/consent-example');
				await expect
					.poll(() =>
						page
							.getByRole('heading', { exact: true, name: 'Consent example' })
							.isVisible()
					)
					.toBe(true);
				expect(await rejectButton(page).isVisible()).toBe(false);
				expect(await sameRuntime()).toBe(true);
				await expectNoTracking(page, requests);
			});

			test('the preference dialog stays styled and reopens after ClientRouter navigation', async () => {
				await visit('/consent-example');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();

				const card = page.getByTestId('consent-dialog-card');
				// The dialog's rules are not in the page stylesheet. Without them
				// the card has no background.
				const cardBackground = () =>
					card.evaluate((element) => getComputedStyle(element).backgroundColor);

				await openPreferences(page);
				expect(await cardBackground()).not.toBe('rgba(0, 0, 0, 0)');
				await saveButton(page).click();
				await expect.poll(() => card.isVisible()).toBe(false);

				await page
					.getByRole('link', { exact: true, name: 'Second page' })
					.click();
				await page.waitForURL('**/second');
				await page
					.getByRole('button', { exact: true, name: 'Cookie preferences' })
					.click();
				await expect.poll(() => card.isVisible()).toBe(true);
				expect(await cardBackground()).not.toBe('rgba(0, 0, 0, 0)');
				await expect.poll(() => saveButton(page).isVisible()).toBe(true);
			});
		}

		if (target.id === 'nuxt') {
			test('NUXT_PUBLIC_C15T_BACKEND_URL set at start moves the init route to that backend', async () => {
				// A second backend address: it records each request and forwards
				// it to the fixture. The build carries the fixture's own URL.
				const received: string[] = [];
				const relay = createHttpServer(async (request, response) => {
					received.push(`${request.method} ${request.url}`);
					const chunks: Buffer[] = [];
					for await (const chunk of request) {
						chunks.push(chunk as Buffer);
					}
					const upstream = await fetch(`${server.backendURL}${request.url}`, {
						body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
						headers: request.headers['content-type']
							? { 'content-type': request.headers['content-type'] }
							: {},
						method: request.method,
					});
					response.statusCode = upstream.status;
					response.setHeader(
						'content-type',
						upstream.headers.get('content-type') ?? 'text/plain'
					);
					response.end(Buffer.from(await upstream.arrayBuffer()));
				});
				relay.listen(0, '127.0.0.1');
				await once(relay, 'listening');
				const address = relay.address() as AddressInfo;
				try {
					await server.restart({
						NUXT_PUBLIC_C15T_BACKEND_URL: `http://127.0.0.1:${address.port}`,
					});
					const response = await fetch(`${server.baseURL}/api/c15t/init`, {
						headers: { 'x-vercel-ip-country': 'DE' },
					});
					expect(response.status).toBe(200);
					expect(received).toContain('GET /manifest');
				} finally {
					relay.closeAllConnections();
					relay.close();
					await server.restart();
				}
			});

			test('a system-dark visitor gets the dark tokens from the server HTML', async () => {
				const response = await fetch(`${server.baseURL}/consent-example`, {
					headers: { 'x-vercel-ip-country': 'DE' },
				});
				const html = await response.text();
				const head = html.slice(0, html.indexOf('</head>'));
				// The class is set in <head>, before the banner paints.
				expect(head).toContain('prefers-color-scheme:dark');
				expect(head).toContain('--c15t-primary: #7fd1a8;');

				({ context, page, requests } = await openBrowserContext(
					browser,
					server.baseURL,
					server.backendURL
				));
				await page.emulateMedia({ colorScheme: 'dark' });
				await page.goto('/consent-example');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				expect(
					await page.evaluate(() => ({
						dark: document.documentElement.classList.contains('c15t-dark'),
						primary: getComputedStyle(document.documentElement)
							.getPropertyValue('--c15t-primary')
							.trim(),
					}))
				).toEqual({ dark: true, primary: '#7fd1a8' });

				await page.emulateMedia({ colorScheme: 'light' });
				await expect
					.poll(() =>
						page.evaluate(() =>
							document.documentElement.classList.contains('c15t-dark')
						)
					)
					.toBe(false);
			});
		}

		if (['nextjs', 'react'].includes(target.id)) {
			const route = target.id === 'nextjs' ? '/experiment' : '/experiment.html';
			test('a host-resolved experiment arm reports the impression and the choice', async () => {
				const dataLayer = () =>
					page.evaluate(
						() =>
							(window as Window & { dataLayer?: Record<string, unknown>[] })
								.dataLayer ?? []
					);
				await visit(`${route}?experiment=1&arm=wall`);
				await expect.poll(() => acceptButton(page).isVisible()).toBe(true);
				await expect
					.poll(() => page.getByTestId('experiment-arm').textContent())
					.toBe('banner-shape · wall · host');
				await expect.poll(dataLayer).toContainEqual(
					expect.objectContaining({
						arm: 'wall',
						event: 'c15t_surface_shown',
						experiment_id: 'banner-shape',
						surface: 'banner',
					})
				);
				await acceptButton(page).click();
				await expect.poll(dataLayer).toContainEqual(
					expect.objectContaining({
						arm: 'wall',
						consent_action: 'all',
						event: 'c15t_choice_recorded',
						experiment_id: 'banner-shape',
					})
				);
				await expect
					.poll(() => page.getByTestId('experiment').textContent())
					.toContain('c15t_choice_recorded');
			});
		}

		if (target.id === 'sveltekit') {
			test('a theme rendered in svelte:head overrides the stylesheet defaults', async () => {
				await visit('/consent-example/branded');
				// SvelteKit writes `<svelte:head>` before its stylesheet links, so
				// the package defaults load after the theme and must still lose.
				const firstStyle = await page.evaluate(
					() =>
						document.querySelector('#c15t-theme, link[rel="stylesheet"]')?.id
				);
				expect(firstStyle).toBe('c15t-theme');
				const token = (name: string) =>
					page.evaluate(
						(property) =>
							getComputedStyle(document.documentElement)
								.getPropertyValue(property)
								.trim(),
						name
					);
				expect(await token('--c15t-primary')).toBe('#6943a3');
				expect(await token('--c15t-radius-lg')).toBe('18px');
				expect(requests.unexpected).toEqual([]);
			});
		}

		if (target.id === 'javascript') {
			test('a persisted pagehide keeps preferences and consent gating active', async () => {
				await visit('/headless/');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				// Dispatch the browser lifecycle signal deterministically: Chromium's
				// actual cache eligibility varies with routing and tracing enabled.
				await page.evaluate(() => {
					window.dispatchEvent(
						new PageTransitionEvent('pagehide', { persisted: true })
					);
					window.dispatchEvent(
						new PageTransitionEvent('pageshow', { persisted: true })
					);
				});
				await openPreferences(page);
				await setCategory(page, 'Measurement', true);
				await saveButton(page).click();
				await expect.poll(() => video(page).count()).toBe(1);
				await expect.poll(() => requests.posthog).toBe(1);
				expect(requests.xPixel).toBe(0);
				await openPreferences(page);
				await setCategory(page, 'Measurement', false);
				await saveButton(page).click();
				await expect.poll(() => video(page).count()).toBe(0);
			});
		}

		if (target.id === 'nextjs') {
			test('the branded route keeps the policy actions and the saved choice', async () => {
				await visit('/branded');
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await rejectButton(page).click();
				await openPreferences(page);
				await setCategory(page, 'Measurement', true);
				await saveButton(page).click();
				await expect.poll(() => requests.posthog).toBe(1);
				await page
					.getByRole('link', { exact: true, name: 'Default design' })
					.click();
				await page.waitForURL('**/app-router');
				await expect.poll(() => video(page).count()).toBe(1);
				expect(await rejectButton(page).isVisible()).toBe(false);
				expect(requests.xPixel).toBe(0);
				expect(requests.unexpected).toEqual([]);
			});
		}

		if (target.failureRoute) {
			test('failed browser initialization leaves vendors and iframe blocked', async () => {
				server.setFailure(true);
				// Restart before an SSR outage so prior requests cannot satisfy
				// prefetch from an in-process manifest cache.
				if (
					['nuxt', 'astro'].includes(target.id) ||
					target.id.startsWith('nuxt-vapor') ||
					target.id.startsWith('tanstack-start')
				) {
					await server.restart();
				}
				await visit(target.failureRoute ?? '/', true);
				await expect.poll(() => requests.initFailures).toBeGreaterThan(0);
				await expectNoTracking(page, requests);
				expect(await acceptButton(page).isVisible()).toBe(false);
			});
		}
	});
}
