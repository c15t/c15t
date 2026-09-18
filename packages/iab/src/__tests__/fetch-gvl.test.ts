import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { clearGVLCache, fetchGVL } from '../tcf/fetch-gvl';

beforeEach(() => {
	clearGVLCache();
});

afterEach(() => {
	clearGVLCache();
	vi.unstubAllGlobals();
});

test('fetches the default vendor list from Inth', async () => {
	const fetchMock = vi
		.fn<typeof fetch>()
		.mockResolvedValue(new Response(null, { status: 204 }));
	vi.stubGlobal('fetch', fetchMock);

	await expect(fetchGVL()).resolves.toBeNull();

	expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
		'https://gvl.inth.app/',
		expect.any(Object)
	);
});

/** A vendor list minimal enough to pass the response validation. */
const gvlPayload = function gvlPayload(
	overrides: Record<string, unknown> = {}
): Response {
	return new Response(
		JSON.stringify({
			features: {},
			gvlSpecificationVersion: 3,
			lastUpdated: '2026-09-17T16:00:19Z',
			purposes: { '1': { id: 1, name: 'Store access' } },
			specialFeatures: {},
			specialPurposes: {},
			stacks: {},
			tcfPolicyVersion: 5,
			vendorListVersion: 177,
			vendors: { '755': { id: 755, name: 'Google' } },
			...overrides,
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } }
	);
};

test('filters the vendor list server-side within the query budget', async () => {
	const fetchMock = vi
		.fn<typeof fetch>()
		.mockResolvedValue(gvlPayload({ vendors: {} }));
	vi.stubGlobal('fetch', fetchMock);

	await fetchGVL([755, 1, 9]);

	const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
	expect(url.searchParams.get('vendorIds')).toBe('1,9,755');
});

test('drops the query filter rather than sending an oversized vendor list', async () => {
	const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(gvlPayload());
	vi.stubGlobal('fetch', fetchMock);

	await fetchGVL(Array.from({ length: 501 }, (_, index) => index + 1));

	const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
	expect(url.searchParams.has('vendorIds')).toBe(false);
});

test('keeps a filtered list when the scope sits exactly on the cap', async () => {
	const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(gvlPayload());
	vi.stubGlobal('fetch', fetchMock);

	await fetchGVL(Array.from({ length: 500 }, (_, index) => index + 1));

	const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
	expect(url.searchParams.get('vendorIds')?.split(',')).toHaveLength(500);
});

test('rejects a vendor list with no usable policy version', async () => {
	for (const policyVersion of [undefined, null, 0, -1, 1.5, Number.NaN]) {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(gvlPayload({ tcfPolicyVersion: policyVersion }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(fetchGVL()).rejects.toThrow(/missing required fields/u);
		clearGVLCache();
	}
});
