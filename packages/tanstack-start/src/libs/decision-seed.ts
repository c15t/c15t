import type { KernelConfig, RememberedDecisionInputs } from '@c15t/core';

/**
 * The decision inputs a server-side prefetch folded into the kernel config,
 * in the shape the hosted transport asserts on `POST /subjects`. `undefined`
 * when the config carries no resolved policy decision.
 *
 * @param config - Config produced by `prefetchInitialConsent()`.
 * @returns Inputs to seed the transport with, if any.
 */
export const decisionInputsFromConfig = function decisionInputsFromConfig(
	config: KernelConfig | undefined
): RememberedDecisionInputs | undefined {
	const decision = config?.initialPolicyDecision;
	const language = config?.initialTranslations?.language;
	if (!(decision && language)) {
		return undefined;
	}
	return {
		country: decision.country ?? config.initialLocation?.countryCode ?? null,
		fingerprint: decision.fingerprint,
		gpc: config.initialOverrides?.gpc,
		language,
		policyId: decision.policyId,
		region: decision.region ?? config.initialLocation?.regionCode ?? null,
	};
};
