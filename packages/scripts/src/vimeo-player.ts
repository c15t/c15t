import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		Vimeo?: {
			Player?: new (
				element: string | HTMLElement,
				options?: Record<string, unknown>
			) => unknown;
		};
	}
}

/**
 * Vimeo Player vendor manifest.
 *
 * This integration only needs a single external loader, so a simple declarative
 * manifest is sufficient.
 */
export const vimeoPlayerManifest = {
	...vendorManifestContract,
	vendor: 'vimeo-player',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface VimeoPlayerOptions {
	/** Full Vimeo Player loader URL override. */
	scriptSrc?: string;
}

/**
 * Creates a Vimeo Player script.
 *
 * @param options - Optional configuration for the Vimeo Player script
 * @returns The Vimeo Player script configuration
 */
export function vimeoPlayer(options: VimeoPlayerOptions = {}): Script {
	let resolvedScriptSrc = options.scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = 'https://player.vimeo.com/api/player.js';
	}

	const resolved = resolveManifest(vimeoPlayerManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
