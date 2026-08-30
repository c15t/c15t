/**
 * Manifest-resolved init endpoint — the SvelteKit analogue of the
 * @c15t/vue Nitro init handler (packages/vue/src/runtime/server/init.get.ts):
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

export const GET: RequestHandler = ({ request }) => {
	const inputs = extractConsentRequestInputs(request.headers);
	const init = resolveInitFromManifest(benchConsentManifestResponse, {
		country: inputs.country,
		region: inputs.region,
		language: inputs.language ?? 'en',
		gpc: inputs.gpc,
	});

	return json(
		{
			...init,
			// Resolver inputs use `null` for absent; the overrides record
			// wants the fields dropped instead (same as the Nuxt handler).
			resolvedOverrides: consentInputsToOverrides({
				country: inputs.country ?? undefined,
				region: inputs.region ?? undefined,
				language: inputs.language ?? undefined,
				gpc: inputs.gpc,
			}),
		},
		{ headers: { 'cache-control': 'private, no-store' } }
	);
};
