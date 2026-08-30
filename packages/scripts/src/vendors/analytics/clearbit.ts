import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

function getDefaultClearbitScriptUrl(publishableKey: string): string {
	return `https://tag.clearbitscripts.com/v1/${encodeURIComponent(publishableKey)}/tags.js`;
}

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
	vendor: 'clearbit',
	category: 'marketing',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			attributes: {
				referrerpolicy: 'strict-origin-when-cross-origin',
			},
		},
	],
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
 * @throws {Error} When `publishableKey` is missing, empty, or invalid.
 * Provide a valid non-empty `publishableKey` string to prevent this error.
 *
 * @remarks
 * Clearbit identifies visitors and companies for enrichment and intent use
 * cases. This helper therefore uses the `marketing` consent category by
 * default even though Clearbit is listed with analytics integrations for
 * discovery.
 *
 * @example
 * ```ts
 * import { clearbit } from '@c15t/scripts/clearbit';
 *
 * clearbit({
 *   publishableKey: 'YOUR_PUBLISHABLE_KEY',
 * });
 * ```
 */
export function clearbit(options: ClearbitOptions): Script {
	const publishableKey =
		typeof options.publishableKey === 'string'
			? options.publishableKey.trim()
			: '';

	if (publishableKey.length === 0) {
		throw new Error(
			'clearbit: invalid publishableKey - must be a non-empty string'
		);
	}

	return resolveManifest(clearbitManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			getDefaultClearbitScriptUrl(publishableKey)
		),
	});
}
