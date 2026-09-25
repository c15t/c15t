/**
 * The manifest transport ConsentRoot builds from `manifestURL` loads its
 * resolver lazily. A server-resolved visitor never runs init in the
 * browser, so a save must not wait for that chunk, and must still assert
 * the policy decision the backend checks.
 */
import { createConsentKernel } from '@c15t/core';
import type { InitContext, KernelTransport, SavePayload } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createLazyManifestTransport } from '../lazy-manifest-transport';
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
