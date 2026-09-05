import { describe, expect, it } from 'vitest';

import { createDemoScripts } from '../examples/sveltekit-demo/src/lib/consent-manager/demo-scripts';

describe('Svelte demo script configuration', () => {
	it('never points default vendor configurations at real accounts', () => {
		const scripts = createDemoScripts();
		expect(scripts).toHaveLength(10);
		expect(new Set(scripts.map((script) => script.id)).size).toBe(
			scripts.length
		);
		for (const script of scripts) {
			if (script.src) {
				expect(script.src).toMatch(/^\/api\/devtools-scripts\//u);
			}
		}
	});

	it('uses live vendor URLs only when a test account is configured', () => {
		const scripts = createDemoScripts({
			clarity: 'test-clarity',
			googleTag: 'G-TEST',
			metaPixel: 'test-meta',
			tiktokPixel: 'test-tiktok',
		});
		expect(scripts.slice(0, 4).map((script) => script.src)).toEqual([
			'https://connect.facebook.net/en_US/fbevents.js',
			'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=test-tiktok&lib=ttq',
			'https://www.googletagmanager.com/gtag/js?id=G-TEST',
			'https://www.clarity.ms/tag/test-clarity',
		]);
	});

	it('keeps real helper callbacks and distinct lifecycle cases', () => {
		const scripts = createDemoScripts();
		for (const script of scripts.slice(0, 4)) {
			expect(script.onBeforeLoad).toEqual(expect.any(Function));
			expect(script.onConsentChange).toEqual(expect.any(Function));
		}
		expect(
			scripts.find((script) => script.id === 'callback-only-marketing')
				?.callbackOnly
		).toBe(true);
		expect(
			scripts.find((script) => script.id === 'inline-necessary')?.textContent
		).toBeTruthy();
		expect(
			scripts.find((script) => script.id === 'iab-vendor-fixture')?.vendorId
		).toBe(1);
		expect(
			scripts.find((script) => script.id === 'iab-custom-vendor-fixture')
				?.vendorId
		).toBe('internal-analytics');
	});
});
