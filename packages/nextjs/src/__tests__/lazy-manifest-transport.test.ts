/**
 * The manifest transport ConsentRoot builds from `manifestURL` loads its
 * resolver lazily. A server-resolved visitor never runs init in the
 * browser, so a save must not wait for that chunk, and must still assert
 * the policy decision the backend checks.
 */
import { createConsentKernel } from '@c15t/core';
import type { InitContext, KernelTransport, SavePayload } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	createLazyManifestTransport,
	lazyHosted,
} from '../lazy-manifest-transport';
import type { LoadManifestTransport } from '../lazy-manifest-transport';
import { policyFixture } from './policy-fixture';

const options = {
	backendURL: 'https://consent.example.com',
	manifestURL: '/api/consent/manifest',
};

const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status: 200,
	});

describe('createLazyManifestTransport', () => {
	const originalFetch = globalThis.fetch;
	const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
		Promise.resolve(jsonResponse({ subjectId: 'sub_saved' }))
	);

	beforeEach(() => {
		fetchSpy.mockClear();
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test('a save for a server-resolved visitor posts without loading the resolver', async () => {
		const load = vi.fn<LoadManifestTransport>(() =>
			Promise.reject(new Error('the resolver must not load'))
		);
		const state = {
			...policyFixture({}, { id: 'gdpr' }),
			initialOverrides: { country: 'DE' },
		};
		const kernel = createConsentKernel({
			...state,
			transport: createLazyManifestTransport(options, load),
		});

		const result = await kernel.commands.save('all');

		expect(result.ok).toBe(true);
		expect(load).not.toHaveBeenCalled();
		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'https://consent.example.com/subjects',
		]);
		// The backend recomputes the decision from these to reject a save made
		// against a stale policy.
		expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject(
			{
				country: 'DE',
				fingerprint: state.initialPolicyResolution.fingerprints.policy,
				policyId: 'gdpr',
			}
		);
	});

	test('once init loads the resolver, saves go through it', async () => {
		const resolverSave = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const load = vi.fn<LoadManifestTransport>(() =>
			Promise.resolve({ init: () => Promise.resolve({}), save: resolverSave })
		);
		const transport = createLazyManifestTransport(options, load);

		await transport.init?.({ overrides: {} } as unknown as InitContext);
		await transport.save?.({} as SavePayload);

		expect(load).toHaveBeenCalledTimes(1);
		expect(resolverSave).toHaveBeenCalledTimes(1);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('lazyHosted', () => {
	const originalFetch = globalThis.fetch;
	const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
		Promise.resolve(jsonResponse({ subjectId: 'sub_saved' }))
	);

	beforeEach(() => {
		fetchSpy.mockClear();
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test('reports hosted mode', () => {
		expect(lazyHosted({ url: '/api/c15t' }).kind).toBe('hosted');
	});

	test('a save for a server-resolved visitor posts without loading the init path', async () => {
		const load = vi.fn(() =>
			Promise.reject(new Error('the init path must not load'))
		);
		const state = {
			...policyFixture({}, { id: 'gdpr' }),
			initialOverrides: { country: 'DE' },
		};
		const factory = lazyHosted(
			{
				assertDecisionInputs: true,
				initURL: '/api/consent/init',
				url: 'https://consent.example.com',
			},
			load
		);
		const kernel = createConsentKernel({
			...state,
			transport: factory({
				prefetch: {},
				translations: { language: 'en', translations: {} },
			} as unknown as Parameters<typeof factory>[0]),
		});

		const result = await kernel.commands.save('all');

		expect(result.ok).toBe(true);
		expect(load).not.toHaveBeenCalled();
		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'https://consent.example.com/subjects',
		]);
		expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject(
			{
				country: 'DE',
				fingerprint: state.initialPolicyResolution.fingerprints.policy,
				policyId: 'gdpr',
			}
		);
	});

	test('with assertDecisionInputs, a save carrying no decision is refused before init', async () => {
		const load = vi.fn(() =>
			Promise.reject(new Error('the init path must not load'))
		);
		const factory = lazyHosted(
			{ assertDecisionInputs: true, url: 'https://consent.example.com' },
			load
		);
		const transport = factory({} as unknown as Parameters<typeof factory>[0]);

		await expect(
			transport.save?.({ subjectId: 'sub_1' } as unknown as SavePayload)
		).rejects.toThrow('cannot save before init resolved a policy decision');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('init loads the full transport with the fetch captured at creation', async () => {
		const init = vi.fn(() => Promise.resolve({}));
		const load = vi.fn(() => Promise.resolve({ init }));
		const factory = lazyHosted({ url: 'https://consent.example.com' }, load);
		const transport = factory({} as unknown as Parameters<typeof factory>[0]);
		const laterFetch = vi.fn();
		globalThis.fetch = laterFetch as unknown as typeof globalThis.fetch;

		await transport.init?.({ overrides: {} } as unknown as InitContext);
		await transport.init?.({ overrides: {} } as unknown as InitContext);

		expect(load).toHaveBeenCalledTimes(1);
		expect(init).toHaveBeenCalledTimes(2);
		const [options] = load.mock.calls[0] as unknown as [
			{ fetch: unknown; url: string },
		];
		expect(options.url).toBe('https://consent.example.com');
		expect(options.fetch).not.toBe(laterFetch);
	});
});

// Raw source text, inlined by Vite so the scan works in browser-mode vitest.
const rootSources = import.meta.glob(
	['../root.tsx', '../lazy-manifest-transport.ts'],
	{ eager: true, import: 'default', query: '?raw' }
) as Record<string, string>;

const STATIC_VALUE_IMPORT =
	/^(?:import|export)\s+(?!type\b)(?:\{(?<names>[^}]*)\}|[^;]*?)\s*from\s+'(?<specifier>[^']+)';/gmu;

describe('ConsentRoot first-load imports', () => {
	test('scans the root and its transports', () => {
		expect(Object.keys(rootSources).sort()).toEqual([
			'../lazy-manifest-transport.ts',
			'../root.tsx',
		]);
	});

	test('the hosted init path and the manifest resolver load only on demand', () => {
		const staticImports = Object.entries(rootSources).flatMap(([file, text]) =>
			[...text.matchAll(STATIC_VALUE_IMPORT)].flatMap((match) => {
				const specifier = match.groups?.specifier as string;
				const names = (match.groups?.names ?? '')
					.split(',')
					.map((name) => name.trim().split(/\s+as\s+/u)[0] as string)
					.filter(Boolean);
				return [
					`${file} -> ${specifier}`,
					...names.map((name) => `${file} -> ${specifier}#${name}`),
				];
			})
		);
		const offending = staticImports.filter(
			(entry) =>
				entry.endsWith('#hosted') ||
				entry.endsWith('#createHostedTransport') ||
				entry.includes('-> ./hosted-mode') ||
				entry.includes('-> @c15t/core/transports/manifest')
		);

		expect(offending).toEqual([]);
	});
});
