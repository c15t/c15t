import { offline } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { mount, unmount } from 'svelte';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';

import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { policyFixture } from './policy-fixture';

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

/** The page first painted at 0; the clock reads `now`. */
const setClock = function setClock(now: number) {
	vi.spyOn(performance, 'getEntriesByType').mockImplementation((type) =>
		type === 'paint'
			? [{ name: 'first-contentful-paint', startTime: 0 } as PerformanceEntry]
			: []
	);
	vi.spyOn(performance, 'now').mockReturnValue(now);
};

const banner = () =>
	document.querySelector<HTMLElement>('[data-testid="consent-banner-root"]');

const mountBanner = async function mountBanner(disableAnimation: boolean) {
	let kernel: ConsentKernel | undefined;
	const target = document.createElement('div');
	document.body.append(target);
	const app = mount(ConformanceFixture, {
		props: {
			component: 'consent-banner',
			onKernel: (value) => {
				kernel = value;
			},
			options: {
				disableAnimation,
				mode: offline(),
				prefetch: policyFixture({}),
			},
		},
		target,
	});
	onTestFinished(async () => {
		await unmount(app);
		target.remove();
	});
	await vi.waitFor(() => expect(kernel).toBeDefined());
	return kernel as ConsentKernel;
};

test('shows a banner that mounts with the page at once', async () => {
	setClock(5000);
	await mountBanner(false);
	await vi.waitFor(() => expect(banner()).not.toBeNull());
	expect(banner()?.dataset.entry).toBeUndefined();
});

test.each([
	{ disableAnimation: false, entry: 'late' },
	{ disableAnimation: true, entry: undefined },
])(
	'marks a banner that shows again after the page painted: $entry with disableAnimation $disableAnimation',
	async ({ disableAnimation, entry }) => {
		setClock(50);
		const kernel = await mountBanner(disableAnimation);
		await vi.waitFor(() => expect(banner()).not.toBeNull());
		kernel.set.activeUI('none');
		await vi.waitFor(() => expect(banner()).toBeNull());

		setClock(5000);
		kernel.set.activeUI('banner');
		await vi.waitFor(() => expect(banner()).not.toBeNull());
		expect(banner()?.dataset.entry).toBe(entry);
	}
);
