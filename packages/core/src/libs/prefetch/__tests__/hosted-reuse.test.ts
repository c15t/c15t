/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { corsPreflightReasons } from '../../../__tests__/fixtures/cors-safelist';
import { createHostedTransport } from '../../../transports/hosted';
import type { KernelJourney } from '../../../types';
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
	delete (window as Window & { __c15tExperiment?: unknown }).__c15tExperiment;
	delete (window as JourneyWindow).__c15tJourney;
	localStorage.clear();
	Object.defineProperty(navigator, 'globalPrivacyControl', {
		configurable: true,
		value: false,
	});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
type JourneyWindow = Window & { __c15tJourney?: KernelJourney };
// The runtime's init carries the journey the early request claimed.
const context = {
	get journey() {
		return (window as JourneyWindow).__c15tJourney;
	},
	overrides: {},
	user: null,
};
const withoutJourney = { overrides: {}, user: null };

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
		const [url, init] = fetch.mock.calls[0] ?? [];
		expect(new URL(url).searchParams.get('contract')).toBe('1');
		// A cross-origin backend answers this without a CORS preflight.
		expect(corsPreflightReasons(init)).toEqual([]);
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

	it('sends the request within init() when nothing was prefetched', async () => {
		const fetch = vi.fn().mockResolvedValue(response());
		vi.stubGlobal('fetch', fetch);
		const sent = createHostedTransport({ backendURL: '/api/c15t' }).init?.(
			context
		);
		// A provider sends init from its first render; the request has to be
		// out by the time the call returns, not a microtask later.
		expect(fetch).toHaveBeenCalledTimes(1);
		expect((await sent)?.policyResolution).toEqual(payload.policyResolution);
	});

	it('the inline script accepts exactly boolean true for GPC', async () => {
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: '1',
		});
		const fetch = vi.fn().mockResolvedValue(response());
		vi.stubGlobal('fetch', fetch);
		window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
		const entries = Object.values(
			(
				window as Window & {
					__c15tInitialDataPromises?: Record<
						string,
						{ requestContext: { gpc: boolean } }
					>;
				}
			).__c15tInitialDataPromises ?? {}
		);
		expect(entries.map((entry) => entry.requestContext.gpc)).toEqual([false]);
		// Detected GPC is never sent: browsers drop a script's `Sec-GPC`.
		expect(fetch.mock.calls[0]?.[1].headers).toEqual({});
		await Promise.resolve();
	});

	describe('journey', () => {
		it('sends its own /init without a journey when the early request sent one', async () => {
			const fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(response()));
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			await createHostedTransport({ backendURL: '/api/c15t' }).init(
				withoutJourney
			);
			expect(fetch).toHaveBeenCalledTimes(2);
			const [url] = fetch.mock.calls[1] ?? [];
			expect(new URL(url, location.origin).searchParams.has('journey')).toBe(
				false
			);
		});

		it('reuses an early request built with journey: false', async () => {
			const fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(response()));
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({ backendURL: '/api/c15t', journey: false })
			);
			await createHostedTransport({ backendURL: '/api/c15t' }).init(
				withoutJourney
			);
			expect(fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('banner experiment arm', () => {
		const experiment = {
			arms: { bar: {}, floating: {} },
			id: 'banner-shape',
		};
		const running = (arm: string) => ({
			...context,
			experiment: { arm, id: 'banner-shape' },
		});
		const prefetchBar = () => {
			const fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(response()));
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({
					backendURL: '/api/c15t',
					experiment: { ...experiment, arm: 'bar' },
				})
			);
			return fetch;
		};

		it('reuses an early request that sent the arm this init runs', async () => {
			const fetch = prefetchBar();
			await createHostedTransport({ backendURL: '/api/c15t' }).init(
				running('bar')
			);
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it.each([
			['another arm', running('floating')],
			['no arm', context],
		])(
			'sends its own /init when the early request sent %s',
			async (_label, ctx) => {
				const fetch = prefetchBar();
				await createHostedTransport({ backendURL: '/api/c15t' }).init(ctx);
				expect(fetch).toHaveBeenCalledTimes(2);
			}
		);

		it('sends its own /init for an arm the early request did not send', async () => {
			const fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(response()));
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			await createHostedTransport({ backendURL: '/api/c15t' }).init(
				running('bar')
			);
			expect(fetch).toHaveBeenCalledTimes(2);
		});

		it('reuses initial data that does not say which arm it carried', async () => {
			const fetch = vi.fn();
			vi.stubGlobal('fetch', fetch);
			const transport = createHostedTransport({
				backendURL: '/api/c15t',
				initialData: Promise.resolve({
					init: await response().json(),
					producerPolicyContract: '1',
				}),
			});
			await transport.init(running('bar'));
			expect(fetch).not.toHaveBeenCalled();
		});
	});
});
