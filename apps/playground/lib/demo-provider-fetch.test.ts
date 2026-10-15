import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchDemoProviders } from './demo-provider-fetch';

describe('fetchDemoProviders', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('gives up on a stalled Google list when the caller aborts', async () => {
		// Google's CSV never answers until the request is aborted.
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, init?: RequestInit) =>
					new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener('abort', () =>
							reject(init.signal?.reason)
						);
					})
			)
		);
		const controller = new AbortController();
		const response = fetchDemoProviders(
			'/api/additional-consent?providerIds=89',
			{ signal: controller.signal }
		);
		controller.abort();
		expect((await response).status).toBe(502);
	});
});
