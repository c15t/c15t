import type {
	KernelConfig,
	KernelOverrides,
	RememberedDecisionInputs,
} from '@c15t/core';
import { decisionInputsMatchOverrides } from '@c15t/core';

const configLocation = (config: KernelConfig) => ({
	country:
		config.initialOverrides?.country ??
		config.initialLocation?.countryCode ??
		null,
	region:
		config.initialOverrides?.region ??
		config.initialLocation?.regionCode ??
		null,
});

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
	if (!config) {
		return undefined;
	}
	const decision = config.initialPolicyResolution;
	const language = config.initialTranslations?.language;
	if (
		!(decision && language) ||
		(decision.status !== 'matched' && decision.status !== 'no-match')
	) {
		return undefined;
	}
	const seed: RememberedDecisionInputs = {
		...configLocation(config),
		fingerprint:
			decision.status === 'matched' ? decision.fingerprints.policy : undefined,
		gpc: config.initialOverrides?.gpc ?? config.initialPrivacySignals?.gpc,
		language,
		policyId: decision.status === 'matched' ? decision.policyId : null,
	};
	return decisionInputsMatchOverrides(seed, overrides) ? seed : undefined;
};
