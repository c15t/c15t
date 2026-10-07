import type {
	Browser,
	BrowserContext,
	BrowserContextOptions,
	Page,
} from 'playwright';
import { expect } from 'vitest';

export interface Requests {
	posthog: number;
	xPixel: number;
	youtube: number;
	initFailures: number;
	unexpected: string[];
}

// Retain the SDK call record across the reload triggered by consent revocation.
const posthogStub = `
window.posthog = {
  __loaded: true,
  init() {}, capture() {}, identify() {}, reset() {},
  opt_in_capturing() { sessionStorage.setItem('__examplePosthogConsent', 'granted'); },
  opt_out_capturing() { sessionStorage.setItem('__examplePosthogConsent', 'denied'); },
  get_explicit_consent_status() { return sessionStorage.getItem('__examplePosthogConsent'); }
};`;

export const openBrowserContext = async function openBrowserContext(
	browser: Browser,
	baseURL: string,
	backendURL: string,
	failInit = false,
	options: BrowserContextOptions = {}
): Promise<{ context: BrowserContext; page: Page; requests: Requests }> {
	const context = await browser.newContext({
		...options,
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
		if (
			url.hostname === 'posthog.com' ||
			(!url.hostname.startsWith('.') && url.hostname.endsWith('.posthog.com'))
		) {
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
// An iframe that has a `src`. Plain HTML keeps the element in the page and
// gives it a `src` only once the category is allowed.
export const video = (page: Page) =>
	page.locator('iframe[title="YouTube video"][src]');

/** The persistent control that reopens the preference dialog. */
export const privacySettings = (page: Page) =>
	page
		.getByRole('button', { name: /^privacy settings$/iu })
		.or(page.getByRole('link', { name: /^privacy settings$/iu }))
		.first();

export const openPreferences = async function openPreferences(
	page: Page
): Promise<void> {
	await privacySettings(page).click();
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

/** One vendor's switch under a category in the preference dialog. */
export const vendorSwitch = (page: Page, category: string, vendor: string) =>
	page.getByTestId(`consent-widget-vendor-switch-${category}-${vendor}`);

/**
 * Open one category's row in the preference dialog, where its vendor
 * switches sit.
 */
export const expandCategory = async function expandCategory(
	page: Page,
	category: string
): Promise<void> {
	const trigger = page.getByTestId(
		`consent-widget-accordion-trigger-${category}`
	);
	await expect.poll(() => trigger.isVisible()).toBe(true);
	if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
		await trigger.click();
	}
	await expect
		.poll(() =>
			page.getByTestId(`consent-widget-vendor-list-${category}`).isVisible()
		)
		.toBe(true);
};

/** Turn one vendor on or off in the preference dialog's draft. */
export const setVendor = async function setVendor(
	page: Page,
	category: string,
	vendor: string,
	checked: boolean
): Promise<void> {
	await expandCategory(page, category);
	const control = vendorSwitch(page, category, vendor);
	await expect.poll(() => control.isEnabled()).toBe(true);
	if ((await control.getAttribute('aria-checked')) !== String(checked)) {
		await control.click();
	}
	await expect
		.poll(() => control.getAttribute('aria-checked'))
		.toBe(String(checked));
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

/**
 * Page init script: record every transition and animation that runs on the
 * consent banner or dialog, including inside a shadow root.
 *
 * Runs in the page, so it takes nothing from this module's scope.
 */
export const recordConsentMotion = function recordConsentMotion(): void {
	const parts =
		'[data-testid^="consent-banner"], [data-testid^="consent-dialog"]:not([data-testid^="consent-dialog-trigger"])';
	const record: string[] = [];
	const seen = new WeakSet<Animation>();
	Object.assign(window, { __c15tMotion: record });
	const scan = () => {
		for (const animation of document.getAnimations()) {
			if (seen.has(animation)) {
				continue;
			}
			seen.add(animation);
			const target =
				animation.effect instanceof KeyframeEffect
					? animation.effect.target
					: null;
			if (!(target && (target.closest(parts) ?? target.querySelector(parts)))) {
				continue;
			}
			const name =
				'transitionProperty' in animation
					? String(animation.transitionProperty)
					: String((animation as CSSAnimation).animationName);
			const part =
				target.closest('[data-testid]')?.getAttribute('data-testid') ??
				target.className.toString();
			record.push(`${part}: ${name}`);
		}
		requestAnimationFrame(scan);
	};
	requestAnimationFrame(scan);
};

/** What {@link recordConsentMotion} recorded so far. */
export const readConsentMotion = (page: Page): Promise<string[]> =>
	page.evaluate(
		() => (window as unknown as { __c15tMotion?: string[] }).__c15tMotion ?? []
	);
