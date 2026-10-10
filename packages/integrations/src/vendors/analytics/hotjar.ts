import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		hj?: ((...args: unknown[]) => void) & { q?: unknown[][] };
		_hjSettings?: {
			hjid: number | string;
			hjsv: number;
		};
	}
}

/**
 * Hotjar vendor manifest.
 *
 * Seeds the global Hotjar settings object and queue stub before loading
 * the vendor bundle.
 */
export const hotjarManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			ifUndefined: true,

			name: '_hjSettings',
			type: 'setGlobal',
			value: {
				hjid: '{{siteId}}',
				hjsv: '{{version}}',
			},
		},
		{
			ifUndefined: true,

			name: 'hj',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			type: 'defineStubFunction',
		},
		{
			async: true,

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'hotjar',
	vendorDetails: {
		homepageUrl: 'https://contentsquare.com/hotjar/',
		name: 'Hotjar',
		privacyPolicyUrl: 'https://contentsquare.com/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface HotjarOptions {
	/**
	 * Your Hotjar site ID.
	 * @example `1234567`
	 */
	siteId: number | string;

	/**
	 * Hotjar script version.
	 * @default 6
	 */
	version?: number;

	/** Hotjar loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Hotjar script.
 *
 * @param options - The options for the Hotjar script.
 * @returns The Hotjar script configuration.
 * @remarks When `siteId` is missing, blank, or `0`, the helper logs
 *   `hotjar: missing or invalid siteId` with `console.error` and returns a
 *   script that never loads.
 *
 * @example
 * ```ts
 * import { hotjar } from '@c15t/integrations/hotjar';
 *
 * hotjar({ siteId: 1234567 });
 * ```
 */
export const hotjar = function hotjar({
	siteId,
	version = 6,
	scriptUrl,
}: HotjarOptions): Script {
	const normalizedSiteId = readId(siteId);
	if (normalizedSiteId === undefined || normalizedSiteId === '0') {
		return skipMissingId('hotjar', 'siteId', {
			category: 'measurement',
			manifest: hotjarManifest,
		});
	}

	return resolveManifest(hotjarManifest, {
		scriptUrl: resolveScriptUrl(
			scriptUrl,
			`https://static.hotjar.com/c/hotjar-${normalizedSiteId}.js?sv=${version}`
		),
		siteId: normalizedSiteId,
		version,
	});
};
