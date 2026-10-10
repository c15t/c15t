/**
 * A deferred IAB vendor list must point at the catch-all's `init` path,
 * which is the only path that serves it, as the Next.js and TanStack Start
 * adapters do.
 */
import type { ResolveRequestConsentOptions } from '@c15t/core/server';
import { describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import { manifest } from '../index';
import { loadConsent } from '../load-consent';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const calls: ResolveRequestConsentOptions[] = [];

vi.mock('@c15t/core/server', async (importOriginal) => {
	const original = await importOriginal<typeof import('@c15t/core/server')>();
	return {
		...original,
		resolveRequestConsent: (options: ResolveRequestConsentOptions) => {
			calls.push(options);
			return original.resolveRequestConsent(options);
		},
	};
});

describe('loadConsent gvlRoute', () => {
	test('points a deferred vendor list at `${routePrefix}/init`', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const event = createEvent({ fetch, headers: { 'x-c15t-country': 'DE' } });
		await c15tHandle({
			backendURL: 'https://consent.example.com',
			mode: manifest({ snapshot: MANIFEST_FIXTURE }),
			routePrefix: '/api/c15t',
		})({ event, resolve: () => Promise.resolve(new Response()) });
		await loadConsent(event, { fetch, reportSessions: false });
		expect(calls.at(-1)?.gvlRoute).toBe('/api/c15t/init');
	});
});
