import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		createLemonSqueezy?: () => void;
		LemonSqueezy?: Record<string, unknown>;
	}
}

/**
 * Lemon Squeezy vendor manifest.
 *
 * Loads Lemon.js and calls `createLemonSqueezy()` after the bundle is ready.
 */
export const lemonSqueezyManifest = {
	...vendorManifestContract,
	vendor: 'lemon-squeezy',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'createLemonSqueezy',
		},
	],
} as const satisfies VendorManifest;

export interface LemonSqueezyOptions {
	/** Lemon.js loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Lemon Squeezy script.
 *
 * This keeps the expressible part of the upstream helper: load the vendor bundle
 * and run its top-level initializer when present.
 *
 * @param options - The options for the Lemon Squeezy script
 * @returns The Lemon Squeezy script configuration
 *
 * @example
 * ```ts
 * const lemonSqueezyScript = lemonSqueezy();
 * ```
 *
 * @see {@link https://docs.lemonsqueezy.com/help/lemonjs/what-is-lemonjs} Lemon.js documentation
 */
export function lemonSqueezy(options: LemonSqueezyOptions = {}): Script {
	const resolved = resolveManifest(lemonSqueezyManifest, {
		scriptSrc: options.scriptSrc ?? 'https://assets.lemonsqueezy.com/lemon.js',
	});

	return resolved;
}
