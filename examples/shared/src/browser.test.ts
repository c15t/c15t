import { chromium } from 'playwright';
import { expect, it } from 'vitest';

import { openBrowserContext } from './browser';

it('stubs PostHog domains and aborts lookalike hosts', async () => {
	const browser = await chromium.launch();
	try {
		const { page, requests } = await openBrowserContext(
			browser,
			'http://127.0.0.1:3000',
			'http://127.0.0.1:3001'
		);
		await page.goto('https://posthog.com/array.js');
		await page.goto('https://us-assets.i.posthog.com/array.js');
		expect(requests.posthog).toBe(2);
		await expect(
			page.goto('https://evilposthog.com/array.js')
		).rejects.toThrow();
		await expect(
			page.goto('https://posthog.com.evil.example/array.js')
		).rejects.toThrow();
		expect(requests.posthog).toBe(2);
		expect(requests.unexpected).toEqual([
			'https://evilposthog.com/array.js',
			'https://posthog.com.evil.example/array.js',
		]);
	} finally {
		await browser.close();
	}
});
