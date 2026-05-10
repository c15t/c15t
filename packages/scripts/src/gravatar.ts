import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

/**
 * Gravatar vendor manifest.
 *
 * The c15t helper keeps the expressible portion of the upstream registry helper by
 * loading Gravatar's profile script. Proxy-based URL helper methods are not
 * reproduced because they rely on runtime utilities outside the manifest model.
 */
export const gravatarManifest = {
	...vendorManifestContract,
	vendor: 'gravatar',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
		},
	],
} as const satisfies VendorManifest;

export interface GravatarOptions {
	/**
	 * Optional script identifier override.
	 */
	key?: string;

	/** Gravatar loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Gravatar script.
 *
 * @param options - The options for the Gravatar script
 * @returns The Gravatar script configuration
 *
 * @example
 * ```ts
 * const gravatarScript = gravatar();
 * ```
 *
 * @see {@link https://docs.gravatar.com/sdk/javascript/} Gravatar JavaScript SDK documentation
 */
export function gravatar(options: GravatarOptions = {}): Script {
	const manifest: VendorManifest = {
		...gravatarManifest,
		vendor: options.key ?? gravatarManifest.vendor,
	};

	const resolved = resolveManifest(manifest, {
		scriptSrc:
			options.scriptSrc ?? 'https://secure.gravatar.com/js/gprofiles.js',
	});

	return resolved;
}
