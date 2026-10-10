/**
 * `resolveConsent` from `@c15t/svelte/server` takes the build snapshot as
 * `snapshot`, as every other server helper does.
 */
import { describe, expect, test, vi } from 'vitest';

import { MANIFEST_FIXTURE } from '../kit/__tests__/manifest-fixture';
import { resolveConsent } from '../server';

describe('resolveConsent', () => {
	test('resolves a snapshot locally, without a backend request', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const state = await resolveConsent({
			fetch,
			headers: new Headers({ 'x-vercel-ip-country': 'DE' }),
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		expect(JSON.stringify(state)).toContain('eu-opt-in');
		expect(fetch).not.toHaveBeenCalled();
	});
});
