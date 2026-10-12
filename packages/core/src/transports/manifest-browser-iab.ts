/**
 * The IAB part of the browser manifest resolver: the Global Vendor List an
 * IAB policy needs. IAB is opt-in, so the resolver loads this module only
 * for a manifest with IAB enabled.
 *
 * @internal
 */
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';

import { fetchCachedGvl } from './gvl-cache';
import { c15tProtocolHeaders } from './version-header';

/**
 * Add the vendor list to an init output that resolved to an IAB policy.
 *
 * @param output - The init output, changed in place.
 * @param manifest - The manifest it resolved from.
 * @param fetchImpl - Fetch implementation for the vendor list request.
 * @internal
 */
export const attachVendorList = async function attachVendorList(
	output: InitOutput,
	manifest: ConsentManifest,
	fetchImpl: typeof globalThis.fetch
): Promise<void> {
	if (
		manifest.iab?.gvl &&
		output.policyResolution?.status === 'matched' &&
		output.policyResolution.policy.model === 'iab'
	) {
		output.gvl = await fetchCachedGvl({
			fetch: fetchImpl,
			headers: c15tProtocolHeaders,
			label: 'c15t manifest transport',
			language: output.translations.language.split('-')[0] || 'en',
			url: manifest.iab.gvl.url,
		});
	}
};
