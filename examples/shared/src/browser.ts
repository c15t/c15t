import type { Browser, BrowserContext, Page } from 'playwright';
import { expect } from 'vitest';

export interface Requests {
	posthog: number;
	xPixel: number;
	youtube: number;
	initFailures: number;
	unexpected: string[];
}

const posthogStub = `
window.posthog = {
  __loaded: true,
  init() {}, capture() {}, identify() {}, reset() {},
  opt_in_capturing() { window.__examplePosthogConsent = 'granted'; },
  opt_out_capturing() { window.__examplePosthogConsent = 'denied'; },
  get_explicit_consent_status() { return window.__examplePosthogConsent; }
};`;

export const openBrowserContext = async function openBrowserContext(
	browser: Browser,
	baseURL: string,
	backendURL: string,
	failInit = false
): Promise<{ context: BrowserContext; page: Page; requests: Requests }> {
	const context = await browser.newContext({
		baseURL,
		extraHTTPHeaders: { 'x-vercel-ip-country': 'DE' },
	});
	context.setDefaultTimeout(10_000);
	await context.tracing.start({
		screenshots: true,
		snapshots: true,
		sources: true,
	});
	const requests: Requests = {
		initFailures: 0,
		posthog: 0,
		unexpected: [],
		xPixel: 0,
		youtube: 0,
	};
	const localOrigins = new Set([
		new URL(baseURL).origin,
		new URL(backendURL).origin,
	]);
	await context.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (failInit && /\/(?:init|manifest)$/u.test(url.pathname)) {
			requests.initFailures += 1;
			await route.fulfill({
				body: '{"error":"Fixture unavailable"}',
				contentType: 'application/json',
				status: 503,
			});
			return;
		}
		if (localOrigins.has(url.origin)) {
			await route.continue();
			return;
		}
		if (url.hostname.endsWith('posthog.com')) {
			if (url.pathname.endsWith('/array.js')) {
				requests.posthog += 1;
			}
			await route.fulfill({
				body: posthogStub,
				contentType: 'application/javascript',
			});
			return;
		}
		if (url.hostname === 'static.ads-twitter.com') {
			requests.xPixel += 1;
			await route.fulfill({
				body: 'window.twq = window.twq || function() {};',
				contentType: 'application/javascript',
			});
			return;
		}
		if (url.hostname === 'www.youtube-nocookie.com') {
			requests.youtube += 1;
			await route.fulfill({
				body: '<!doctype html><title>Local video fixture</title><p>Video fixture</p>',
				contentType: 'text/html',
			});
			return;
		}
		// No vendor collection endpoint or remote font escapes the harness.
		requests.unexpected.push(url.toString());
		await route.abort();
	});
	return { context, page: await context.newPage(), requests };
};

export const acceptButton = (page: Page) =>
	page.getByRole('button', { name: /^accept all$/iu }).first();
export const rejectButton = (page: Page) =>
	page
		.getByRole('button', { name: /^(?:reject all|reject optional)$/iu })
		.first();
export const saveButton = (page: Page) =>
	page
		.getByRole('button', { name: /^(?:save|save preferences|save choices)$/iu })
		.first();
export const video = (page: Page) =>
	page.locator('iframe[title="YouTube video"]');

export const openPreferences = async function openPreferences(
	page: Page
): Promise<void> {
	await page
		.getByRole('button', { name: /^privacy settings$/iu })
		.or(page.getByRole('link', { name: /^privacy settings$/iu }))
		.first()
		.click();
	await expect.poll(() => saveButton(page).isVisible()).toBe(true);
};

export const categoryControl = (page: Page, category: string) => {
	const name = new RegExp(category, 'iu');
	return page
		.getByRole('checkbox', { name })
		.or(page.getByRole('switch', { name }))
		.first();
};

export const setCategory = async function setCategory(
	page: Page,
	category: string,
	checked: boolean
): Promise<void> {
	const control = categoryControl(page, category);
	await expect.poll(() => control.isVisible()).toBe(true);
	if ((await control.isChecked()) !== checked) {
		await control.click();
	}
	await expect.poll(() => control.isChecked()).toBe(checked);
};

export const expectNoTracking = async function expectNoTracking(
	page: Page,
	requests: Requests
): Promise<void> {
	// Observe a short settled interval as well as the DOM. A visible banner alone
	// cannot detect an SDK inserted unconditionally by an example's bootstrap.
	await page.waitForTimeout(300);
	expect(requests.posthog).toBe(0);
	expect(requests.xPixel).toBe(0);
	expect(requests.youtube).toBe(0);
	expect(await video(page).count()).toBe(0);
	expect(requests.unexpected).toEqual([]);
};
