import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		Stripe?: (...args: unknown[]) => unknown;
	}
}

/**
 * Stripe vendor manifest.
 *
 * Loads Stripe.js from a declarative manifest. The upstream helper's runtime-only
 * attribute overrides are intentionally omitted because the manifest runtime
 * only serializes the script URL and standard attributes map.
 */
export const stripeManifest = {
	...vendorManifestContract,
	vendor: 'stripe',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
		},
	],
} as const satisfies VendorManifest;

export interface StripeOptions {
	/**
	 * Disables Stripe advanced fraud signals when set to `false`.
	 */
	advancedFraudSignals?: boolean;

	/** Stripe loader URL. */
	scriptSrc?: string;
}

function buildStripeScriptSrc({
	advancedFraudSignals,
	scriptSrc,
}: StripeOptions): string {
	if (scriptSrc) {
		return scriptSrc;
	}

	const url = new URL('https://js.stripe.com/basil/stripe.js');
	if (advancedFraudSignals === false) {
		url.searchParams.set('advancedFraudSignals', 'false');
	}

	return url.toString();
}

/**
 * Creates a Stripe script.
 *
 * @param options - The options for the Stripe script
 * @returns The Stripe script configuration
 *
 * @example
 * ```ts
 * const stripeScript = stripe({
 *   advancedFraudSignals: false,
 * });
 * ```
 *
 * @see {@link https://docs.stripe.com/js} Stripe.js documentation
 */
export function stripe(options: StripeOptions = {}): Script {
	const resolved = resolveManifest(stripeManifest, {
		scriptSrc: buildStripeScriptSrc(options),
	});

	return resolved;
}
