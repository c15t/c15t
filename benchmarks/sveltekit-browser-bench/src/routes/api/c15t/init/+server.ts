/**
 * Manifest-resolved init endpoint — the SvelteKit analogue of the
 * `@c15t/vue` Nitro init handler (packages/vue/src/runtime/server/init.get.ts):
 * resolve the request's geo/language/GPC inputs against the static
 * manifest fixture and return an InitOutput plus `resolvedOverrides`.
 */

import { benchConsentManifestResponse } from '$lib/fixture';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const inputs = extractConsentRequestInputs(request.headers);
	const init = resolveInitFromManifest(await benchConsentManifestResponse, {
		country: inputs.country,
		gpc: inputs.gpc,
		language: inputs.language ?? 'en',
		region: inputs.region,
	});

	return json(
		{
			...init,
			// Resolver inputs use `null` for absent; the overrides record
			// wants the fields dropped instead (same as the Nuxt handler).
			resolvedOverrides: consentInputsToOverrides({
				country: inputs.country ?? undefined,
				gpc: inputs.gpc,
				language: inputs.language ?? undefined,
				region: inputs.region ?? undefined,
			}),
		},
		{ headers: { 'cache-control': 'private, no-store' } }
	);
};
