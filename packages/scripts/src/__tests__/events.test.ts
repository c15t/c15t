import { createConsentKernel } from '@c15t/core';
import { expect, test, vi } from 'vitest';

import { createEventDispatcher } from '../events';
import { matomoAnalytics } from '../vendors/analytics/matomo-analytics';
import { rybbitAnalytics } from '../vendors/analytics/rybbit-analytics';
import { umamiAnalytics } from '../vendors/analytics/umami-analytics';
import { googleTagManager } from '../vendors/tag-managers/google-tag-manager';

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

test('dispatches events to built-in Umami, Rybbit and Matomo integrations', () => {
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const track = vi.fn();
	const event = vi.fn();
	const queue: unknown[] = [];
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: { _paq: queue, rybbit: { event }, umami: { track } },
		scripts: [
			umamiAnalytics({ websiteId: 'site' }),
			rybbitAnalytics({ siteId: 'site' }),
			matomoAnalytics({
				matomoUrl: 'https://analytics.example.com',
				siteId: '1',
			}),
		],
	});
	dispatcher.track('search', { length: 4 });
	expect(track).toHaveBeenCalledExactlyOnceWith('search', { length: 4 });
	expect(event).toHaveBeenCalledExactlyOnceWith('search', { length: 4 });
	expect(queue).toEqual([['trackEvent', 'custom', 'search']]);
	kernel.dispose();
});

test('dispatches GTM events to the exact configured global property', () => {
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const queue: unknown[] = [];
	const nested: unknown[] = [];
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: { app: { layer: nested }, 'app.layer': queue },
		scripts: [googleTagManager({ dataLayer: 'app.layer', id: 'GTM-TEST' })],
	});
	dispatcher.track('search');
	expect(queue).toEqual([{ event: 'search' }]);
	expect(nested).toEqual([]);
	kernel.dispose();
});
