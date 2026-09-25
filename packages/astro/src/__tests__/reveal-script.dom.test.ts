import { beforeEach, describe, expect, it } from 'vitest';

import { buildBannerRevealScript } from '../server';

/**
 * The inline script that shows a prerendered banner at first paint for a
 * visitor with nothing stored.
 */

const clearStorage = function clearStorage(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
	localStorage.clear();
};

const renderHiddenBanner = function renderHiddenBanner(testId: string): void {
	document.body.innerHTML = `
		<div data-testid="${testId}-overlay" hidden></div>
		<div data-testid="${testId}-root" data-c15t-visible="false" hidden></div>
	`;
};

const run = function run(script: string): void {
	// oxlint-disable-next-line no-new-func -- runs the inline script as the page would.
	new Function(script)();
};

const root = (testId = 'consent-banner') =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}-root"]`);
const overlay = (testId = 'consent-banner') =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}-overlay"]`);

beforeEach(() => {
	clearStorage();
	renderHiddenBanner('consent-banner');
});

describe('buildBannerRevealScript', () => {
	it('shows the banner and its overlay when nothing is stored', () => {
		run(buildBannerRevealScript(undefined, 'consent-banner'));
		expect(root()?.hidden).toBe(false);
		expect(root()?.dataset.c15tVisible).toBe('true');
		expect(overlay()?.hidden).toBe(false);
	});

	it.each([
		['a consent cookie', () => (document.cookie = 'c15t=v=3; path=/')],
		[
			'a notice dismissal in localStorage',
			() => localStorage.setItem('c15t-notice', '{}'),
		],
		[
			'a legacy record in localStorage',
			() => localStorage.setItem('privacy-consent-storage', '{}'),
		],
	])('leaves it to the runtime with %s', (_name, store) => {
		store();
		run(buildBannerRevealScript(undefined, 'consent-banner'));
		expect(root()?.hidden).toBe(true);
		expect(overlay()?.hidden).toBe(true);
	});

	it('reads a custom storage key', () => {
		document.cookie = 'site-consent=v=3; path=/';
		run(
			buildBannerRevealScript({ storageKey: 'site-consent' }, 'consent-banner')
		);
		expect(root()?.hidden).toBe(true);
	});

	it('targets the IAB banner by its own test ids', () => {
		renderHiddenBanner('iab-consent-banner');
		run(buildBannerRevealScript(undefined, 'iab-consent-banner'));
		expect(root('iab-consent-banner')?.hidden).toBe(false);
	});
});
