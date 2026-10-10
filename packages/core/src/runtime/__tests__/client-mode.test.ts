/**
 * `clientMode()` turns mode data into the transport a server-framework root
 * uses. The init paths load on demand; these tests inject the loaders and
 * check what each mode sends, and when.
 */
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { optInRule } from '../../__tests__/fixtures/kernel-fixtures';
import { hosted, manifest, offline } from '../../modes';
import { custom } from '../../transports/custom';
import { createHostedTransport } from '../../transports/hosted';
import { createBrowserManifestTransport } from '../../transports/manifest-browser';
import type { ProviderTransportContext } from '../../transports/mode';
import type { InitContext, KernelTransport, SavePayload } from '../../types';
import {
	clientMode,
	lazyBrowserManifest,
	lazyHosted,
	lazyOffline,
} from '../client-mode';
import type {
	LoadHostedModule,
	LoadManifestBrowserModule,
	LoadOfflineModule,
} from '../client-mode';

const context = {
	prefetch: {},
	translations: { language: 'en', translations: {} },
} as unknown as ProviderTransportContext;

/** A request URL without the query c15t adds to `/init`. */
const pathOf = (url: unknown): string => String(url).split('?')[0] ?? '';

const initContext = (overrides: InitContext['overrides'] = {}): InitContext =>
	({ overrides, user: null }) as unknown as InitContext;

const jsonResponse = (body: unknown): Response =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status: 200,
	});

const everywhereManifest: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			...optInRule({ id: 'everywhere' }),
			match: { isDefault: true },
		}),
	],
	revision: '1',
	schemaVersion: 2,
};

const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
	Promise.resolve(jsonResponse({ subjectId: 'sub_saved' }))
);

const originalFetch = globalThis.fetch;

beforeEach(() => {
	fetchSpy.mockReset();
	fetchSpy.mockImplementation(() =>
		Promise.resolve(jsonResponse({ subjectId: 'sub_saved' }))
	);
	globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe('clientMode()', () => {
	test('defaults to manifest(), resolved on the server', () => {
		const mode = clientMode(undefined, { backendURL: '/api/c15t' });

		expect(mode.kind).toBe('manifest');
		expect({ ...mode }).toEqual({ kind: 'manifest', type: 'manifest' });
	});

	test('carries the mode data', () => {
		const rules = [optInRule({ id: 'everywhere' })];

		expect({ ...clientMode(offline({ policyRules: rules })) }).toEqual({
			kind: 'offline',
			policyRules: rules,
			type: 'offline',
		});
		expect(clientMode(hosted({ backendURL: 'https://a.example' })).kind).toBe(
			'hosted'
		);
		expect(
			clientMode(manifest({ resolve: 'browser' }), { backendURL: '' }).kind
		).toBe('manifest');
	});

	test('manifest() re-inits through the route prefix and asserts the decision', async () => {
		const mode = clientMode(manifest(), {
			backendURL: 'https://backend.example',
			routePrefix: '/api/c15t/',
		});
		const transport = mode(context);

		// No init has resolved a decision, and the payload carries none.
		await expect(
			transport.save?.({ subjectId: 'sub_1' } as unknown as SavePayload)
		).rejects.toThrow('cannot save before init resolved a policy decision');

		fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
		await transport.init?.(initContext()).catch(() => undefined);
		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toBe('/api/c15t/init');
	});

	test('manifest() without a route prefix inits against the backend, unasserted', async () => {
		const transport = clientMode(manifest(), {
			backendURL: 'https://backend.example',
		})(context);

		fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
		await transport.init?.(initContext()).catch(() => undefined);

		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://backend.example/init'
		);
	});

	test('manifest() saves through the route prefix without a backend URL', async () => {
		const transport = clientMode(manifest(), { routePrefix: '/api/c15t' })(
			context
		);

		fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
		await transport.init?.(initContext()).catch(() => undefined);

		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toBe('/api/c15t/init');
	});

	test("hosted() prefers the mode's own backend URL", async () => {
		const transport = clientMode(
			hosted({ backendURL: 'https://mode.example' }),
			{ backendURL: 'https://config.example', routePrefix: '/api/c15t' }
		)(context);

		fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
		await transport.init?.(initContext()).catch(() => undefined);

		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://mode.example/init'
		);
	});

	test('throws when a mode needs a backend and has none', () => {
		expect(() => clientMode(hosted())).toThrow('hosted() needs a backend URL');
		expect(() => clientMode(manifest())).toThrow(
			'manifest() needs a backend URL'
		);
	});

	test('returns a transport factory unchanged, warning for an implementation', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const own = custom({ init: () => Promise.resolve({}) });
		const implementation = Object.assign(() => ({}), {
			kind: 'hosted' as const,
		});

		expect(clientMode(own)).toBe(own);
		expect(warn).not.toHaveBeenCalled();
		expect(clientMode(implementation)).toBe(implementation);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('`mode` is the hosted() transport itself')
		);
	});
});

describe('lazyHosted()', () => {
	test('a save goes out at once, without loading the init path', async () => {
		const load = vi.fn<LoadHostedModule>(() =>
			Promise.reject(new Error('the init path must not load'))
		);
		const transport = lazyHosted(
			{ backendURL: 'https://backend.example' },
			load
		)(context);

		await transport.save?.({
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1, categories: {} },
			consents: { necessary: true },
			subjectId: 'sub_1',
		} as unknown as SavePayload);

		expect(load).not.toHaveBeenCalled();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://backend.example/subjects'
		);
	});

	test('the first init sends /init while the init path loads, and the transport reads it', async () => {
		fetchSpy.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse({
					branding: 'c15t',
					location: { countryCode: 'DE', regionCode: null },
					translations: { language: 'de', translations: { common: {} } },
				})
			)
		);
		let release: () => void = () => undefined;
		const released = new Promise<void>((resolve) => {
			release = resolve;
		});
		const load = vi.fn<LoadHostedModule>(async () => {
			await released;
			return { createHostedTransport };
		});
		const transport = lazyHosted(
			{ backendURL: 'https://backend.example' },
			load
		)(context);

		const pending = transport.init?.(
			initContext({ country: 'DE', language: 'de' })
		);
		await Promise.resolve();

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		const sent = new URL(String(url));
		expect(`${sent.origin}${sent.pathname}`).toBe(
			'https://backend.example/init'
		);
		expect(sent.searchParams.get('country')).toBe('DE');
		// Only `Accept` and `Accept-Language`: no CORS preflight.
		expect(init?.headers).toEqual({
			accept: 'application/json',
			'accept-language': 'de',
		});
		expect(init?.credentials).toBe('same-origin');
		release();
		await pending;
		// The loaded transport took the early response.
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('sends no early /init with init headers, which the transport filters', async () => {
		const init = vi.fn(() => Promise.resolve({}));
		const transport = lazyHosted(
			{
				backendURL: 'https://backend.example',
				headers: { 'accept-language': 'de' },
			},
			() =>
				Promise.resolve({
					createHostedTransport: () =>
						({ init }) as unknown as ReturnType<typeof createHostedTransport>,
				})
		)(context);

		await transport.init?.(initContext());

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(init).toHaveBeenCalledTimes(1);
	});

	test('the first init reads initialData and sends no /init', async () => {
		const transport = clientMode(manifest(), {
			backendURL: 'https://backend.example',
			initialData: Promise.resolve({
				init: {
					branding: 'c15t',
					location: { countryCode: 'DE', regionCode: null },
					translations: { language: 'en', translations: { common: {} } },
				},
			} as never),
			routePrefix: '/api/c15t',
		})(context);

		const response = await transport.init?.(initContext());

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(JSON.stringify(response)).toContain('"countryCode":"DE"');
	});

	test('a failed chunk load is retried on the next init', async () => {
		const init = vi.fn(() => Promise.resolve({}));
		const load = vi
			.fn<LoadHostedModule>()
			.mockRejectedValueOnce(new Error('chunk failed'))
			.mockResolvedValueOnce({
				createHostedTransport: () =>
					({ init }) as unknown as ReturnType<typeof createHostedTransport>,
			});
		fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
		const transport = lazyHosted({ backendURL: '/api/c15t' }, load)(context);

		await expect(transport.init?.(initContext())).rejects.toThrow(
			'chunk failed'
		);
		await transport.init?.(initContext());

		expect(load).toHaveBeenCalledTimes(2);
		expect(init).toHaveBeenCalledTimes(1);
	});
});

describe('lazyOffline()', () => {
	test("loads offline() on first init, with the provider's rules as fallback", async () => {
		const transportInit = vi.fn(() => Promise.resolve({}));
		const offlineFactory = vi.fn(
			() => () => ({ init: transportInit }) as KernelTransport
		);
		const load = vi.fn<LoadOfflineModule>(() =>
			Promise.resolve({
				offline: offlineFactory as unknown as Awaited<
					ReturnType<LoadOfflineModule>
				>['offline'],
			})
		);
		const providerRules = [optInRule({ id: 'provider' })];
		const factory = lazyOffline({}, load);
		const transport = factory({ ...context, policyRules: providerRules });

		expect(load).not.toHaveBeenCalled();
		await transport.init?.(initContext());
		await transport.init?.(initContext());

		expect(load).toHaveBeenCalledTimes(1);
		expect(offlineFactory).toHaveBeenCalledWith({
			policyRules: providerRules,
		});
		expect(transportInit).toHaveBeenCalledTimes(2);
	});
});

describe('lazyBrowserManifest()', () => {
	test('starts the resolver chunk and the manifest request when built', async () => {
		fetchSpy.mockImplementation((url: string) =>
			Promise.resolve(
				String(url) === '/api/c15t/manifest'
					? jsonResponse(everywhereManifest)
					: jsonResponse({ subjectId: 'sub_saved' })
			)
		);
		const load = vi.fn<LoadManifestBrowserModule>(() =>
			Promise.resolve({ createBrowserManifestTransport })
		);
		const transport = clientMode(manifest({ resolve: 'browser' }), {
			backendURL: 'https://backend.example',
			routePrefix: '/api/c15t',
		});
		const built = lazyBrowserManifest(
			{
				backendURL: 'https://backend.example',
				manifestURL: '/api/c15t/manifest',
			},
			load
		)(context);

		expect(transport.kind).toBe('manifest');
		expect(load).toHaveBeenCalledTimes(1);
		expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
			'/api/c15t/manifest',
		]);

		const response = await built.init?.(initContext({ country: 'DE' }));

		expect(load).toHaveBeenCalledTimes(1);
		// The resolver read the early manifest response.
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(response?.policyResolution).toMatchObject({ status: 'matched' });
	});

	test('a snapshot needs no manifest request', async () => {
		const transport = lazyBrowserManifest(
			{ backendURL: 'https://backend.example', snapshot: everywhereManifest },
			() => Promise.resolve({ createBrowserManifestTransport })
		)(context);

		await transport.init?.(initContext());

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
