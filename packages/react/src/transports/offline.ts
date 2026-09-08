import type { ProviderTransportFactory, InitContext } from '@c15t/core';
import {
	recommendedPolicyRules,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';

/** Policy rules evaluated locally when initialization runs. */
export interface OfflineModeOptions {
	/**
	 * Rules to resolve locally. Omit them to use `recommendedPolicyRules()`:
	 * strict opt-in for Europe, the UK, Quebec and unknown locations, opt-out
	 * for the US states with a privacy law, and `none` everywhere else.
	 * Passing rules replaces that pack entirely.
	 */
	policyRules?: PolicyRule[];
}

/**
 * Resolve local rules outside render and hydration.
 * @param options - Explicit policy rules; absence resolves the recommended pack.
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
							iabEnabled: context.iabEnabled,
							regionCode: overrides.region ?? null,
							rules:
								options.policyRules ??
								recommendedPolicyRules({ iab: context.iabEnabled }),
						})
					),
					translations: context.translations,
				}),
		}),
		{ kind: 'offline' as const }
	);
};
