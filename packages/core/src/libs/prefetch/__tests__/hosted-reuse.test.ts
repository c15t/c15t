/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHostedTransport } from '../../../transports/hosted';
import { buildPrefetchScript, primePrefetchedInitialData } from '../prefetch';

const legacyPolicy = { id: 'legacy', model: 'opt-in', ui: { mode: 'banner' } };
const payload = {
	policyResolution: { policy: null, status: 'no-match', version: 1 },
};
const response = (
	body: Record<string, unknown> = payload,
	contract: string | null = '1'
) =>
	new Response(
		JSON.stringify({
			branding: 'c15t',
			location: { countryCode: null, regionCode: null },
			translations: { language: 'en', translations: {} },
			...body,
		}),
		{ headers: contract === null ? {} : { 'x-c15t-policy-contract': contract } }
	);
beforeEach(() => {
	delete (window as Window & { __c15tInitialDataPromises?: unknown })
		.__c15tInitialDataPromises;
	Object.defineProperty(navigator, 'globalPrivacyControl', {
		configurable: true,
		value: false,
	});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
const context = { overrides: {}, user: null };

describe('hosted browser prefetch consumption', () => {
	it.each([{ country: 'DE' }, { region: 'CA' }, { language: 'fr' }])(
		'does not treat omitted runtime inputs as matching %j',
		async (overrides) => {
			const fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(response()));
			vi.stubGlobal('fetch', fetch);
			await primePrefetchedInitialData({ backendURL: '/api/c15t', overrides });
			await createHostedTransport({ backendURL: '/api/c15t' }).init(context);
			expect(fetch).toHaveBeenCalledTimes(2);
		}
	);

	it('consumes the generated script response once and preserves protocol negotiation', async () => {
		const fetch = vi.fn().mockImplementation(() => Promise.resolve(response()));
		vi.stubGlobal('fetch', fetch);
		// Execute the actual beforeInteractive script, including its window registry.
		window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
		const transport = createHostedTransport({ backendURL: '/api/c15t' });
		expect(fetch).toHaveBeenCalledTimes(1);
		const first = await transport.init?.(context);
		expect(first?.policyResolution).toEqual(payload.policyResolution);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch.mock.calls[0]?.[1].headers).toMatchObject({
			'x-c15t-policy-contract': '1',
		});
		await transport.init?.(context);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it.each([
		['1', 'invalid-payload'],
		['99', 'unsupported-contract'],
	])(
		'keeps a producer %s declaration when its early response is consumed',
		async (contract, reason) => {
			const fetch = vi
				.fn()
				.mockResolvedValue(response({ policy: legacyPolicy }, contract));
			vi.stubGlobal('fetch', fetch);
			await primePrefetchedInitialData({ backendURL: '/api/c15t' });
			const result = await createHostedTransport({
				backendURL: '/api/c15t',
			}).init?.(context);
			expect(result?.policyResolution).toMatchObject({
				reason,
				status: 'failed',
			});
			expect(fetch).toHaveBeenCalledTimes(1);
		}
	);

	it('rejects cached responses that predate the policy contract', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(response({ policy: legacyPolicy }, null))
		);
		await primePrefetchedInitialData({ backendURL: '/api/c15t' });
		const result = await createHostedTransport({
			backendURL: '/api/c15t',
		}).init?.(context);
		expect(result?.policyResolution).toMatchObject({
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});

	it('retries once after a failed early request', async () => {
		const fetch = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue(response());
		vi.stubGlobal('fetch', fetch);
		await primePrefetchedInitialData({ backendURL: '/api/c15t' });
		await createHostedTransport({ backendURL: '/api/c15t' }).init?.(context);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('does not reuse a request for different geo or a custom init route', async () => {
		const fetch = vi.fn().mockImplementation(() => Promise.resolve(response()));
		vi.stubGlobal('fetch', fetch);
		await primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { country: 'DE' },
		});
		await createHostedTransport({ backendURL: '/api/c15t' }).init?.({
			...context,
			overrides: { country: 'FR' },
		});
		expect(fetch).toHaveBeenCalledTimes(2);
		await createHostedTransport({
			backendURL: '/api/c15t',
			initURL: '/other/init',
		}).init?.(context);
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	it('the inline script accepts exactly boolean true for GPC', async () => {
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: '1',
		});
		const fetch = vi.fn().mockResolvedValue(response());
		vi.stubGlobal('fetch', fetch);
		window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
		expect(fetch.mock.calls[0]?.[1].headers['sec-gpc']).toBe('0');
		await Promise.resolve();
	});
});
