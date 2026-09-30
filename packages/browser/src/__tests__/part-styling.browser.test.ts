/**
 * Which outside styles reach a stock UI part, in each mount mode.
 *
 * Class names from CSS Modules, vanilla-extract, StyleX, Emotion or
 * Tailwind all end up as a class on the element plus a rule in a
 * stylesheet. These tests check where that rule has to live for the class
 * to win over the part's own `@layer components` styles.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { css as emotionCss, flush } from '@emotion/css';
import { afterEach, describe, expect, it } from 'vitest';

import { init } from '../index';
import type { ConsentClient, ConsentUIOptions } from '../types';

/** A colour the stock card never uses. */
const BRAND = 'rgb(10, 102, 255)';

let client: ConsentClient | undefined;
const cleanups: (() => void)[] = [];

const addPageCSS = function addPageCSS(css: string): void {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.append(style);
	cleanups.push(() => style.remove());
};

const cssURL = function cssURL(css: string): string {
	const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
	cleanups.push(() => URL.revokeObjectURL(url));
	return url;
};

const mountCard = async function mountCard(
	ui: ConsentUIOptions
): Promise<HTMLElement> {
	client = init({
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { colorScheme: 'light', disableAnimation: true, ...ui },
	});
	await client.ready();
	const card = client.ui?.root.querySelector<HTMLElement>(
		'[data-testid="consent-banner-card"]'
	);
	if (!card) {
		throw new Error('The banner card did not render');
	}
	return card;
};

const borderColor = (card: HTMLElement): string =>
	getComputedStyle(card).borderTopColor;

afterEach(() => {
	client?.dispose();
	client = undefined;
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	flush();
	clearBrowserConsentStorage();
});

describe('styling stock UI parts from outside', () => {
	it('applies a page class to a slot in light DOM, over the stock card styles', async () => {
		addPageCSS(`.brand-card { border-top-color: ${BRAND}; }`);

		const card = await mountCard({
			shadow: false,
			theme: { slots: { consentBannerCard: 'brand-card' } },
		});

		expect(card.classList).toContain('brand-card');
		await expect.poll(() => borderColor(card)).toBe(BRAND);
	});

	it('does not let a page class reach a slot inside the shadow root', async () => {
		addPageCSS(`.brand-card { border-top-color: ${BRAND}; }`);

		const card = await mountCard({
			theme: { slots: { consentBannerCard: 'brand-card' } },
		});

		expect(card.getRootNode()).toBeInstanceOf(ShadowRoot);
		expect(card.classList).toContain('brand-card');
		expect(borderColor(card)).not.toBe(BRAND);
	});

	it('lets page CSS style a shadow part through ::part() with the slot name', async () => {
		addPageCSS(
			`[data-c15t-ui]::part(consentBannerCard) { border-top-color: ${BRAND}; }`
		);

		const card = await mountCard({});

		expect(card.getRootNode()).toBeInstanceOf(ShadowRoot);
		await expect.poll(() => borderColor(card)).toBe(BRAND);
	});

	it('applies a slot class from a stylesheet linked into the shadow root', async () => {
		const card = await mountCard({
			stylesheetURLs: [cssURL(`.brand-card { border-top-color: ${BRAND}; }`)],
			theme: { slots: { consentBannerCard: 'brand-card' } },
		});

		expect(card.getRootNode()).toBeInstanceOf(ShadowRoot);
		await expect.poll(() => borderColor(card)).toBe(BRAND);
	});

	it('lets a Tailwind 4 style utilities layer beat the stock components layer', async () => {
		// Tailwind 4 declares the same layer order the stock sheet declares
		// first, so its utilities outrank c15t's components layer.
		const card = await mountCard({
			stylesheetURLs: [
				cssURL(
					'@layer theme, base, components, utilities;\n' +
						`@layer utilities { .border-t-brand { border-top-color: ${BRAND}; } }`
				),
			],
			theme: { slots: { consentBannerCard: 'border-t-brand' } },
		});

		await expect.poll(() => borderColor(card)).toBe(BRAND);
	});

	// Emotion's `css()` returns a class and inserts its rule into a <style>
	// in the document head. The docs tell script tag and `init()` users to
	// set `shadow: false` for that reason.
	it('does not let an Emotion class reach a slot inside the shadow root', async () => {
		const brandCard = emotionCss({ borderTopColor: BRAND });

		const card = await mountCard({
			theme: { slots: { consentBannerCard: brandCard } },
		});

		expect(card.getRootNode()).toBeInstanceOf(ShadowRoot);
		expect(card.classList).toContain(brandCard);
		expect(
			[...document.styleSheets].some((sheet) =>
				[...sheet.cssRules].some((rule) =>
					rule.cssText.includes(`.${brandCard}`)
				)
			)
		).toBe(true);
		expect(borderColor(card)).not.toBe(BRAND);
	});

	it('applies an Emotion class to a slot with shadow: false', async () => {
		const brandCard = emotionCss({ borderTopColor: BRAND });

		const card = await mountCard({
			shadow: false,
			theme: { slots: { consentBannerCard: brandCard } },
		});

		expect(card.getRootNode()).toBe(document);
		await expect.poll(() => borderColor(card)).toBe(BRAND);
	});
});
