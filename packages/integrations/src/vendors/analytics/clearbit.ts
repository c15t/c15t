import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

const getDefaultClearbitScriptUrl = function getDefaultClearbitScriptUrl(
	publishableKey: string
): string {
	return `https://tag.clearbitscripts.com/v1/${encodeURIComponent(publishableKey)}/tags.js`;
};

/**
 * Clearbit vendor manifest.
 *
 * Loads Clearbit's visitor and company enrichment tag from the account-keyed
 * `tags.js` endpoint. Clearbit enrichment can identify visitors and companies,
 * so the default consent category is `marketing` rather than `measurement`.
 * The GitHub issue left the category open between measurement and marketing;
 * c15t treats enrichment and intent profiling as marketing-sensitive.
 */
export const clearbitManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{
			attributes: {
				referrerpolicy: 'strict-origin-when-cross-origin',
			},

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'clearbit',
	vendorDetails: {
		homepageUrl: 'https://clearbit.com/',
		legalName: 'HubSpot, Inc.',
		name: 'Clearbit',
		privacyPolicyUrl: 'https://clearbit.com/privacy-policy',
	},
} as const satisfies VendorManifest;

export interface ClearbitOptions {
	/**
	 * Your Clearbit publishable key.
	 */
	publishableKey: string;

	/**
	 * Custom loader URL.
	 * @default `https://tag.clearbitscripts.com/v1/{publishableKey}/tags.js`
	 */
	scriptUrl?: string;
}

/**
 * Creates a Clearbit enrichment script.
 *
 * @see https://help.clearbit.com/hc/en-us/articles/4420022080783 — installing the Clearbit tag
 *
 * @param options - The options for the Clearbit script.
 * @returns The Clearbit script.
 *
 * @remarks
 * When `publishableKey` is missing or blank, the helper logs
 * `clearbit: missing or invalid publishableKey` with `console.error` and
 * returns a script that never loads.
 *
 * Clearbit identifies visitors and companies for enrichment and intent use
 * cases. This helper therefore uses the `marketing` consent category by
 * default even though Clearbit is listed with analytics integrations for
 * discovery.
 *
 * @example
 * ```ts
 * import { clearbit } from '@c15t/integrations/clearbit';
 *
 * clearbit({
 *   publishableKey: 'YOUR_PUBLISHABLE_KEY',
 * });
 * ```
 */
export const clearbit = function clearbit(options: ClearbitOptions): Script {
	const publishableKey = readId(options.publishableKey);
	if (publishableKey === undefined) {
		return skipMissingId('clearbit', 'publishableKey', {
			category: 'marketing',
			id: 'clearbit',
		});
	}

	return resolveManifest(clearbitManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			getDefaultClearbitScriptUrl(publishableKey)
		),
	});
};
