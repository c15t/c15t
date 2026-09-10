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
		'https://gvl.inth.com/',
		expect.any(Object)
	);
});
