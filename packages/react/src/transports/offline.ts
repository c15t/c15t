import type { ProviderTransportFactory } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';

/** Policy rules evaluated locally when initialization runs. */
export interface OfflineModeOptions {
	policyRules?: PolicyRule[];
}

/**
 * Resolve local rules outside render and hydration.
 * @param options - Explicit policy rules; absence retains the safe fallback.
 * @returns A provider transport with no network requests.
 */
export const offline = function offline(
	options: OfflineModeOptions = {}
): ProviderTransportFactory {
	return Object.assign(
		(context: Parameters<ProviderTransportFactory>[0]) => ({
			init: () =>
				Promise.resolve({
					policyResolution: resolvePolicyRules({
						countryCode: null,
						regionCode: null,
						rules: options.policyRules,
					}),
					translations: context.translations,
				}),
		}),
		{ kind: 'offline' as const }
	);
};
