import type { ProviderTransportFactory, InitContext } from '@c15t/core';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
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
			init: ({ overrides }: InitContext) =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						resolvePolicyRules({
							countryCode: overrides.country ?? null,
							regionCode: overrides.region ?? null,
							rules: options.policyRules,
						})
					),
					translations: context.translations,
				}),
		}),
		{ kind: 'offline' as const }
	);
};
