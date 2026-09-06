/**
 * Browser-resolved manifest transport for the `client-manifest` arm.
 *
 * `@c15t/svelte` has no shipped browser manifest mode — the SvelteKit layer
 * resolves manifests on the server (`createSvelteKitConsentRouteHandlers`).
 * This arm exists so the suite can price the alternative: fetch the
 * CDN-cacheable manifest once and resolve `/init` in the page, trading an
 * `/init` round-trip for the resolver plus the translation catalogue.
 *
 * It mirrors what `@c15t/vue` does for `manifest: 'client'` — the resolver,
 * the catalogue and the manifest all load lazily and in parallel with
 * hydration, so the import cost is not serialized behind it.
 */
import { createHostedTransport } from '@c15t/core';
import type { KernelTransport } from '@c15t/core';
import type { ConsentManifest } from '@c15t/schema/types';

const BACKEND_URL = '/api/bench-consent';
const MANIFEST_URL = '/api/bench-consent/manifest';

type Settled<Value> =
	| { ok: true; value: Value }
	| { ok: false; error: unknown };

const settle = async function settle<Value>(
	promise: Promise<Value>
): Promise<Settled<Value>> {
	try {
		return { ok: true, value: await promise };
	} catch (error) {
		return { error, ok: false };
	}
};

const fetchManifest = async function fetchManifest(): Promise<ConsentManifest> {
	const response = await fetch(MANIFEST_URL, {
		headers: { accept: 'application/json' },
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`sveltekit-browser-bench: /manifest responded ${response.status}`
		);
	}
	return (await response.json()) as ConsentManifest;
};

/**
 * Build the browser manifest transport for the `client-manifest` arm.
 *
 * @returns A transport that resolves `/init` from a fetched manifest and
 * posts consent to the fixture backend.
 */
export const createBrowserManifestTransport =
	function createBrowserManifestTransport(): KernelTransport {
		const hostedTransport = createHostedTransport({ backendURL: BACKEND_URL });
		let manifestTransport: KernelTransport | undefined;

		// Started eagerly so the resolver, the catalogue and the manifest
		// fetch overlap hydration instead of queueing behind it.
		const loadResources = () =>
			settle(
				Promise.all([
					import('@c15t/core/transports/manifest'),
					import('@c15t/translations/all'),
					fetchManifest(),
				])
			);

		let resources = typeof window === 'undefined' ? undefined : loadResources();

		return {
			async init(context) {
				if (typeof window === 'undefined') {
					return {};
				}
				resources ??= loadResources();
				const loaded = await resources;
				if (!loaded.ok) {
					resources = undefined;
					throw loaded.error;
				}
				const [{ createManifestTransport }, { baseTranslations }, manifest] =
					loaded.value;
				manifestTransport ??= createManifestTransport({
					backendURL: BACKEND_URL,
					baseTranslations,
					manifest,
					manifestURL: MANIFEST_URL,
				});
				return (await manifestTransport.init?.(context)) ?? {};
			},
			async save(payload) {
				return (
					(await manifestTransport?.save?.(payload)) ??
					(await hostedTransport.save?.(payload)) ?? { ok: true }
				);
			},
		};
	};
