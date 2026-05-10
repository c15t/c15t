import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		paypal?: Record<string, unknown>;
	}
}

/**
 * PayPal vendor manifest.
 *
 * Loads the PayPal Web SDK core bundle with no additional runtime bootstrap.
 */
export const paypalManifest = {
	...vendorManifestContract,
	vendor: 'paypal',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
		},
	],
} as const satisfies VendorManifest;

export interface PayPalOptions {
	/**
	 * Loads the PayPal sandbox Web SDK when true.
	 * @default false
	 */
	sandbox?: boolean;

	/** PayPal loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a PayPal script.
 *
 * This helper intentionally stays minimal and only selects the core loader URL.
 *
 * @param options - The options for the PayPal script
 * @returns The PayPal script configuration
 *
 * @example
 * ```ts
 * const paypalScript = paypal({
 *   sandbox: true,
 * });
 * ```
 *
 * @see {@link https://docs.paypal.ai/payments/methods/paypal/sdk/js/v6/paypal-checkout} PayPal Web SDK documentation
 */
export function paypal({
	sandbox = false,
	scriptSrc,
}: PayPalOptions = {}): Script {
	const resolved = resolveManifest(paypalManifest, {
		scriptSrc:
			scriptSrc ??
			(sandbox
				? 'https://www.sandbox.paypal.com/web-sdk/v6/core'
				: 'https://www.paypal.com/web-sdk/v6/core'),
	});

	return resolved;
}
