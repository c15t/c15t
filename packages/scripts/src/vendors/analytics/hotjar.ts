import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
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
	vendor: 'hotjar',
	category: 'measurement',
	install: [
		{
			type: 'setGlobal',
			name: '_hjSettings',
			value: {
				hjid: '{{siteId}}',
				hjsv: '{{version}}',
			},
			ifUndefined: true,
		},
		{
			type: 'defineStubFunction',
			name: 'hj',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
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
 *
 * @example
 * ```ts
 * import { hotjar } from '@c15t/scripts/hotjar';
 *
 * hotjar({ siteId: 1234567 });
 * ```
 */
export function hotjar({
	siteId,
	version = 6,
	scriptUrl,
}: HotjarOptions): Script {
	return resolveManifest(hotjarManifest, {
		siteId,
		version,
		scriptUrl: resolveScriptUrl(
			scriptUrl,
			`https://static.hotjar.com/c/hotjar-${siteId}.js?sv=${version}`
		),
	});
}
