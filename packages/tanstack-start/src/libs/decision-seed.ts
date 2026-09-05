import type {
	KernelConfig,
	KernelOverrides,
	RememberedDecisionInputs,
} from '@c15t/core';

const primaryLanguage = function primaryLanguage(value: string): string {
	return value.toLowerCase().split('-')[0] ?? value.toLowerCase();
};

/**
 * Whether client overrides would change the inputs the server decided
 * with. Any override that differs invalidates the seed: the client init
 * will resolve a fresh decision for the new inputs.
 */
const overridesMatch = function overridesMatch(
	seed: RememberedDecisionInputs,
	overrides: KernelOverrides | undefined
): boolean {
	if (!overrides) {
		return true;
	}
	if (overrides.country !== undefined && overrides.country !== seed.country) {
		return false;
	}
	if (overrides.region !== undefined && overrides.region !== seed.region) {
		return false;
	}
	if (overrides.gpc !== undefined && overrides.gpc !== seed.gpc) {
		return false;
	}
	return (
		overrides.language === undefined ||
		primaryLanguage(overrides.language) === primaryLanguage(seed.language)
	);
};

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
	return overridesMatch(seed, overrides) ? seed : undefined;
};
