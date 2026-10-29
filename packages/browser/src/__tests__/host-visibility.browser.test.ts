/**
 * Page CSS that hides empty elements must not hide the UI.
 *
 * Shadow content is not a child, so the shadow host matches `:empty`.
 * Shopify's Dawn theme ships `div:empty { display: none; }`, which hid the
 * banner while the client reported it as shown.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, describe, expect, it } from 'vitest';

import type { ConsentClient } from '../types';
import { init } from './fixtures/factory-init';

let client: ConsentClient | undefined;
const cleanups: (() => void)[] = [];

const addPageCSS = function addPageCSS(css: string): void {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.append(style);
	cleanups.push(() => style.remove());
};

afterEach(() => {
	client?.dispose();
	client = undefined;
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	clearBrowserConsentStorage();
});

describe('UI host under page CSS that hides empty elements', () => {
	it.each([
		'div:empty { display: none; }',
		'div:empty { display: none !important; }',
	])('keeps the banner visible with `%s`', async (rule) => {
		addPageCSS(rule);
		client = init({
			mode: 'offline',
			overrides: { country: 'DE' },
			ui: { disableAnimation: true },
		});
		await client.ready();

		const host = client.ui?.host;
		const card = client.ui?.root.querySelector<HTMLElement>(
			'[data-testid="consent-banner-card"]'
		);
		if (!(host && card)) {
			throw new Error('The banner did not render');
		}

		expect(client.getSnapshot().activeUI).toBe('banner');
		expect(host.matches(':empty')).toBe(true);
		expect(getComputedStyle(host).display).toBe('block');
		expect(card.getBoundingClientRect().height).toBeGreaterThan(0);
	});
});
