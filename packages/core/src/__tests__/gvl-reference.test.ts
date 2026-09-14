import type { GlobalVendorList } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import {
	createGvlReferenceURL,
	serveGvlReference,
} from '../transports/gvl-reference';

const gvl = {
	purposes: {},
	vendorListVersion: 42,
	vendors: {},
} as GlobalVendorList;

describe('versioned public vendor list route', () => {
	test('returns only the list with cache headers and explicit language', async () => {
		const load = vi.fn().mockResolvedValue(gvl);
		const url = createGvlReferenceURL('/privacy/init', gvl, 'de');
		const response = await serveGvlReference(
			new Request(`https://app.test${url}`),
			load
		);
		expect(await response?.json()).toEqual(gvl);
		expect(load).toHaveBeenCalledWith('de');
		expect(response?.headers.get('cache-control')).toBe(
			'public, max-age=86400'
		);
	});
	test.each(['?c15t-gvl=wrong', '?c15t-gvl=42&language=../en'])(
		'rejects invalid parameters %s',
		async (query) => {
			const load = vi.fn();
			expect(
				(
					await serveGvlReference(
						new Request(`https://app.test/init${query}`),
						load
					)
				)?.status
			).toBe(400);
			expect(load).not.toHaveBeenCalled();
		}
	);
	test('never caches a different version under the requested version', async () => {
		const response = await serveGvlReference(
			new Request('https://app.test/init?c15t-gvl=41'),
			() => Promise.resolve(gvl)
		);
		expect(response?.status).toBe(409);
		expect(response?.headers.get('cache-control')).toBe('no-store');
	});
	test('does not handle an ordinary init request', async () => {
		const load = vi.fn();
		expect(
			await serveGvlReference(new Request('https://app.test/init'), load)
		).toBeNull();
		expect(load).not.toHaveBeenCalled();
	});
});
