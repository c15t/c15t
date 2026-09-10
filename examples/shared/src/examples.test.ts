// oxlint-disable no-loop-func -- Each sequential suite owns its browser context and mutable request counters.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import {
	acceptButton,
	categoryControl,
	expectNoTracking,
	openBrowserContext,
	openPreferences,
	rejectButton,
	saveButton,
	setCategory,
	video,
} from './browser';
import type { Requests } from './browser';
import { startExample } from './server';
import { selectedTargets } from './targets';

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

		const visit = async function visit(path: string, failInit = false) {
			({ context, page, requests } = await openBrowserContext(
				browser,
				server.baseURL,
				server.backendURL,
				failInit
			));
			await page.goto(path);
			await expect
				.poll(() =>
					page
						.getByRole('heading', { exact: true, name: 'Consent example' })
						.isVisible()
				)
				.toBe(true);
		};

		for (const route of target.routes) {
			test(`${route}: rejection survives reload and preferences reopen`, async () => {
				await visit(route);
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				await expectNoTracking(page, requests);
				await rejectButton(page).click();
				await expect.poll(() => rejectButton(page).isVisible()).toBe(false);
				await page.reload();
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
				await expect
					.poll(() =>
						page.evaluate(
							() =>
								(window as Window & { __examplePosthogConsent?: string })
									.__examplePosthogConsent
						)
					)
					.toBe('granted');
				await expect.poll(() => video(page).count()).toBe(1);
				expect(requests.xPixel).toBe(0);
				await openPreferences(page);
				await setCategory(page, 'Marketing', true);
				await saveButton(page).click();
				await expect.poll(() => requests.xPixel).toBe(1);
				await openPreferences(page);
				await setCategory(page, 'Measurement', false);
				await setCategory(page, 'Marketing', false);
				await saveButton(page).click();
				await expect.poll(() => video(page).count()).toBe(0);
				await expect
					.poll(() =>
						page.evaluate(
							() =>
								(window as Window & { __examplePosthogConsent?: string })
									.__examplePosthogConsent
						)
					)
					.toBe('denied');
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

		if (target.id === 'javascript') {
			test('a persisted pagehide keeps preferences and consent gating active', async () => {
				await visit('/');
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
			test('reset clears the recorded grant and Custom keeps consent controls', async () => {
				await visit('/app-router');
				await expect.poll(() => acceptButton(page).isVisible()).toBe(true);
				await acceptButton(page).click();
				await expect.poll(() => requests.posthog).toBe(1);
				await expect.poll(() => requests.xPixel).toBe(1);
				await expect.poll(() => video(page).count()).toBe(1);
				await page
					.getByRole('button', { exact: true, name: 'Reset demo' })
					.click();
				await expect.poll(() => rejectButton(page).isVisible()).toBe(true);
				expect(await video(page).count()).toBe(0);
				await page.getByRole('button', { exact: true, name: 'Custom' }).click();
				await rejectButton(page).click();
				await openPreferences(page);
				await setCategory(page, 'Measurement', false);
				await setCategory(page, 'Marketing', false);
				await saveButton(page).click();
				await page.waitForTimeout(300);
				expect(requests.posthog).toBe(1);
				expect(requests.xPixel).toBe(1);
				expect(requests.unexpected).toEqual([]);
			});
		}

		if (target.failureRoute) {
			test('failed browser initialization leaves vendors and iframe blocked', async () => {
				server.setFailure(true);
				// Restart before an SSR outage so prior requests cannot satisfy
				// prefetch from an in-process manifest cache.
				if (['nuxt', 'tanstack-start', 'astro'].includes(target.id)) {
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
