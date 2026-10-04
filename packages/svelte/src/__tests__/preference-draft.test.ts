/**
 * Svelte's wrapper around `@c15t/core/preference-draft`: one draft per
 * provider, read through the state API. The draft rules are pinned by the
 * core suite; this covers the runes wiring and the provider's contract.
 */
import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test } from 'vitest';

import type { ConsentManagerState } from '../lib/context.svelte';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { policyFixture } from './policy-fixture';

const mountProvider = function mountProvider() {
	const captured: { kernel?: ConsentKernel; manager?: ConsentManagerState } =
		{};
	const result = render(ConformanceFixture, {
		component: 'consent-banner',
		onKernel: (kernel) => {
			captured.kernel = kernel;
		},
		onManager: (manager) => {
			captured.manager = manager;
		},
		options: {
			consentCategories: ['necessary', 'marketing', 'measurement'],
			disableAnimation: true,
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture({}, { categories: ['marketing', 'measurement'] }),
		},
	});
	const { kernel, manager } = captured;
	if (!kernel || !manager) {
		throw new Error('Provider context was not captured');
	}
	return { kernel, manager, unmount: () => result.unmount() };
};

test('the state API stages into the provider draft and follows a newer record', async () => {
	const { kernel, manager, unmount } = mountProvider();
	try {
		manager.setSelectedConsent('marketing', true);
		await tick();
		expect(manager.selectedConsents.marketing).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		// Another surface records measurement: the untouched switch follows it.
		await kernel.commands.save({ measurement: true });
		await tick();
		expect(manager.selectedConsents).toMatchObject({
			marketing: true,
			measurement: true,
		});
		expect(manager.consentCategories).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
	} finally {
		unmount();
	}
});

test('a custom save records the draft and leaves it clean', async () => {
	const { kernel, manager, unmount } = mountProvider();
	try {
		manager.setSelectedConsent('marketing', true);
		await manager.saveConsents('custom');
		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(true);
		expect(manager.draft.isStale).toBe(false);
		expect(manager.selectedConsents.marketing).toBe(true);
	} finally {
		unmount();
	}
});
