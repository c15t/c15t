import { createConsentKernel } from '@c15t/core';
import { expect, test, vi } from 'vitest';

import { createEventDispatcher } from '../events';

test('delivers only configured and consented events, isolates failures, and stops immediately on revocation', () => {
	const kernel = createConsentKernel({ initialExternalPermissions: {} });
	const capture = vi.fn();
	const track = vi.fn(() => {
		throw new Error('broken SDK');
	});
	const unconfigured = vi.fn();
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: {
			amplitude: { track: unconfigured },
			mixpanel: { track },
			posthog: { capture },
		},
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'mixpanel',
				vendor: 'mixpanel',
			},
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'posthog',
				vendor: 'posthog',
			},
		],
	});
	dispatcher.track('search', { length: 4 });
	expect(capture).not.toHaveBeenCalled();
	kernel.set.externalPermissions({ measurement: true });
	dispatcher.track('search', { length: 4 });
	expect(capture).toHaveBeenCalledExactlyOnceWith('search', { length: 4 });
	expect(unconfigured).not.toHaveBeenCalled();
	kernel.set.externalPermissions({});
	dispatcher.track('search', { length: 8 });
	expect(capture).toHaveBeenCalledTimes(1);
	kernel.dispose();
});

test('navigation is deduplicated and denied pageviews are not replayed', () => {
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const page = vi.fn();
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: { analytics: { page } },
		pageviews: ['segment'],
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'segment',
				vendor: 'segment',
			},
		],
	});
	dispatcher.pageview('/first');
	dispatcher.pageview('/second');
	dispatcher.pageview('/second#heading');
	expect(page).toHaveBeenCalledTimes(1);
	kernel.set.externalPermissions({});
	dispatcher.pageview('/third');
	kernel.set.externalPermissions({ measurement: true });
	dispatcher.pageview('/third');
	expect(page).toHaveBeenCalledTimes(1);
	kernel.dispose();
});
