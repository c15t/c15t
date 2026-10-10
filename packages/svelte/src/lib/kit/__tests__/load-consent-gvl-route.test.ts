/**
 * A deferred IAB vendor list must point at the catch-all's `init` path,
 * which is the only path that serves it, as the Next.js and TanStack Start
 * adapters do.
 */
import { clearManifestCache } from '@c15t/core/server';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import { manifest } from '../index';
import { loadConsent } from '../load-consent';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const IAB_MANIFEST = {
	...MANIFEST_FIXTURE,
	cmpId: 28,
	iab: { enabled: true, gvl: { url: 'https://gvl.example/vendor-list.json' } },
	policyPacks: [
		createConsentManifestPolicyPack({
			id: 'iab',
			match: { fallback: true, isDefault: true },
			model: 'iab',
			prompt: 'choice',
		}),
	],
} as unknown as ConsentManifest;

const GVL = {
	purposes: { '1': { id: 1, name: 'Store and/or access information' } },
	vendorListVersion: 42,
	vendors: { '1': { id: 1, name: 'Vendor', purposes: [1] } },
};

afterEach(() => {
	vi.unstubAllGlobals();
	clearManifestCache();
});

describe('loadConsent', () => {
	test('points a deferred vendor list at the route init path', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof globalThis.fetch>(() => Promise.resolve(Response.json(GVL)))
		);
		const event = createEvent({ headers: { 'x-c15t-country': 'DE' } });
		await c15tHandle({
			backendURL: 'https://consent.example.com',
			mode: manifest({ snapshot: IAB_MANIFEST }),
			routePrefix: '/api/c15t',
		})({ event, resolve: () => Promise.resolve(new Response()) });
		const { consent } = await loadConsent(event, { reportSessions: false });
		expect(consent.prefetch.initialIab?.gvlReference?.url).toMatch(
			/^\/api\/c15t\/init\?c15t-gvl=42/u
		);
	});
});
