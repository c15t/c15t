import type { ConsentMode } from '@c15t/core/modes';
/**
 * The mode the Nuxt plugin hands the browser for
 * `manifest({ resolve: 'browser' })`.
 */
import { clientMode } from '@c15t/core/runtime/client-mode';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; importing the plugin only needs `defineNuxtPlugin`.
vi.mock('#imports', () => ({ defineNuxtPlugin: (plugin: unknown) => plugin }));

afterEach(() => {
	vi.unstubAllGlobals();
});

test("browser resolution sends a visitor without a location to the backend's /init", async () => {
	// A region-based policy resolved for an unknown location could apply
	// the wrong region's rules. Every single-page app asks the backend.
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockRejectedValue(new Error('offline'));
	vi.stubGlobal('fetch', fetch);
	// Imported as the other Nuxt plugin tests do: its `#imports` are Nuxt's.
	const { withClientData } = await vi.importActual<{
		withClientData: (
			mode: ConsentMode,
			headers: Record<string, string>
		) => ConsentMode;
	}>('../runtime/plugin.nuxt');
	const mode = withClientData(
		{
			resolve: 'browser',
			snapshot: {
				branding: 'c15t',
				policyPacks: [
					createConsentManifestPolicyPack({
						id: 'eu-opt-in',
						match: { countries: ['DE'], fallback: true },
						model: 'opt-in',
						prompt: 'choice',
					}),
				],
				revision: 'nuxt-browser',
				schemaVersion: 2,
			},
			type: 'manifest',
		},
		{}
	);
	const factory = clientMode(mode, {
		backendURL: 'https://consent.example.com',
	});
	const transport = factory({} as Parameters<typeof factory>[0]);
	await transport
		.init?.({
			journey: undefined,
			overrides: {},
		} as unknown as Parameters<NonNullable<typeof transport.init>>[0])
		.catch(() => null);
	expect(String(fetch.mock.calls[0]?.[0])).toContain(
		'https://consent.example.com/init'
	);
});
