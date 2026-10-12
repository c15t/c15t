import type { ProviderTransportContext } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import {
	hosted as hostedMode,
	manifest as manifestMode,
	offline as offlineMode,
} from '../mode';
import { hostedTransport, lazyTransport, offlineTransport } from '../transport';
import { testRule } from './policy-fixture';

const context: ProviderTransportContext = {
	consentCategories: ['necessary', 'measurement'],
	prefetch: {},
	translations: { language: 'en', translations: {} as never },
};

const BACKEND = 'https://consent.example.com';

describe('modes', () => {
	it('are plain serializable objects', () => {
		expect(
			JSON.parse(JSON.stringify(hostedMode({ backendURL: '/api/c15t' })))
		).toEqual({ backendURL: '/api/c15t', type: 'hosted' });
		expect(offlineMode()).toEqual({ type: 'offline' });
		expect(manifestMode({ source: 'runtime' })).toEqual({
			source: 'runtime',
			type: 'manifest',
		});
	});
});

describe('the page transports', () => {
	it('reports the transport kind for window.c15t', () => {
		expect(lazyTransport({ mode: hostedMode({ backendURL: '/x' }) }).kind).toBe(
			'hosted'
		);
		expect(
			hostedTransport({ mode: hostedMode({ backendURL: '/x' }) }).kind
		).toBe('hosted');
		expect(offlineTransport({ mode: offlineMode() }).kind).toBe('offline');
		expect(
			lazyTransport({ backendURL: BACKEND, mode: manifestMode() }).kind
		).toBe('manifest');
	});

	it('resolves an offline policy with no network at all', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const transport = offlineTransport({
			mode: offlineMode({ policyRules: [testRule] }),
		})(context);
		const response = await transport.init?.({ overrides: {}, user: null });
		expect(response?.policyResolution).toMatchObject({
			policy: { prompt: 'choice' },
			status: 'matched',
		});
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it.each([
		['the injected route', '/api/c15t', '/api/c15t/init'],
		['the backend without a route', undefined, `${BACKEND}/init`],
	])(
		're-inits manifest mode through %s',
		async (_name, routePrefix, expected) => {
			// The transport captures `globalThis.fetch` when it is built, so the
			// stub has to be in place before the factory runs.
			const fetchImpl = vi.fn(() =>
				Promise.resolve(
					Response.json({
						location: { countryCode: 'DE', regionCode: null },
						policy: { id: 'p', model: 'opt-in', ui: { mode: 'banner' } },
						translations: { language: 'en', translations: {} },
					})
				)
			);
			const restore = globalThis.fetch;
			globalThis.fetch = fetchImpl as unknown as typeof globalThis.fetch;
			try {
				const transport = lazyTransport({
					backendURL: BACKEND,
					mode: manifestMode(),
					routePrefix,
				})(context);
				await transport.init?.({ overrides: {}, user: null });
			} finally {
				globalThis.fetch = restore;
			}
			expect(fetchImpl).toHaveBeenCalledOnce();
			const [url] = fetchImpl.mock.calls[0] as unknown as [string | URL];
			expect(String(url).split('?')[0]).toBe(expected);
		}
	);

	it('asks hosted mode for its own backend URL first', () => {
		expect(() => lazyTransport({ mode: hostedMode() })).toThrowError(
			/hosted\(\) needs a backend URL/u
		);
		expect(
			lazyTransport({ backendURL: BACKEND, mode: hostedMode() }).kind
		).toBe('hosted');
	});
});
