import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

// Extended Window interface to include Hotjar-specific properties
declare global {
	interface Window {
		hj: ((...args: unknown[]) => void) & { q?: unknown[][] };
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
			ifUndefined: false,
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
			src: '{{scriptSrc}}',
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
	scriptSrc?: string;
}

/**
 * Creates a Hotjar script.
 *
 * @param options - The options for the Hotjar script
 * @returns The Hotjar script configuration
 *
 * @example
 * ```ts
 * const hotjarScript = hotjar({
 *   siteId: 1234567,
 * });
 * ```
 *
 * @see {@link https://help.hotjar.com/hc/en-us/articles/115009336727-Install-the-Hotjar-Tracking-Code} Hotjar installation documentation
 */
export function hotjar({
	siteId,
	version = 6,
	scriptSrc,
}: HotjarOptions): Script {
	const resolved = resolveManifest(hotjarManifest, {
		siteId,
		version,
		scriptSrc:
			scriptSrc ??
			`https://static.hotjar.com/c/hotjar-${siteId}.js?sv=${version}`,
	});

	return resolved;
}
