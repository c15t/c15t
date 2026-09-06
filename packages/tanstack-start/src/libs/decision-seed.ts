import type {
	KernelConfig,
	KernelOverrides,
	RememberedDecisionInputs,
} from '@c15t/core';
import { decisionInputsMatchOverrides } from '@c15t/core';

/**
 * The decision inputs a server-side prefetch folded into the kernel config,
 * in the shape the hosted transport asserts on `POST /subjects`. `undefined`
 * when the config carries no resolved policy decision, or when the client
 * overrides differ from the inputs that decision was made for.
 *
 * @param config - Config produced by `prefetchInitialConsent()`.
 * @param overrides - The boundary's client overrides, if any.
 * @returns Inputs to seed the transport with, if any.
 */
export const decisionInputsFromConfig = function decisionInputsFromConfig(
	config: KernelConfig | undefined,
	overrides?: KernelOverrides
): RememberedDecisionInputs | undefined {
	const decision = config?.initialPolicyDecision;
	const language = config?.initialTranslations?.language;
	if (!(decision && language)) {
		return undefined;
	}
	const seed: RememberedDecisionInputs = {
		country: decision.country ?? config.initialLocation?.countryCode ?? null,
		fingerprint: decision.fingerprint,
		gpc: config.initialOverrides?.gpc,
		language,
		policyId: decision.policyId,
		region: decision.region ?? config.initialLocation?.regionCode ?? null,
	};
	return decisionInputsMatchOverrides(seed, overrides) ? seed : undefined;
};
