import { createOfflineTransport } from '@c15t/core';
import type {
	InitContext,
	InitResponse,
	KernelConfig,
	KernelTransport,
	PolicyConfig,
	ProviderTransportContext,
	ProviderTransportFactory,
} from '@c15t/core';
import { buildDefaultOptInPolicy, policyDefaults } from '@c15t/schema/types';

/** Options for {@link offline}. */
export interface OfflineModeOptions {
	/** Policy packs to resolve locally instead of the provider's policy packs. */
	policyPacks?: PolicyConfig[];
}

const buildInlinePolicy = function buildInlinePolicy(
	categories: ProviderTransportContext['consentCategories']
): KernelConfig['initialPolicy'] {
	const fallback = policyDefaults.offlineOptInBanner();
	const inline = buildDefaultOptInPolicy(categories);
	return {
		...inline,
		consent: {
			...fallback.consent,
			...inline.consent,
		},
		ui: fallback.ui,
	};
};

const getProviderPolicies = function getProviderPolicies(
	options: OfflineModeOptions,
	context: ProviderTransportContext
): PolicyConfig[] | undefined {
	return (
		options.policyPacks ??
		context.policies ??
		context.offlinePolicy?.policyPacks
	);
};

const createStaticOfflineTransport = function createStaticOfflineTransport(
	baseTransport: KernelTransport,
	context: ProviderTransportContext,
	policyPacks: PolicyConfig[] | undefined
): KernelTransport {
	const configuredPolicy =
		context.prefetch.initialPolicy ?? context.offlinePolicy?.policy;
	const inlinePolicy =
		policyPacks === undefined
			? buildInlinePolicy(context.consentCategories)
			: undefined;
	const policy = configuredPolicy ?? inlinePolicy;
	if (!policy) {
		return baseTransport;
	}

	return {
		...baseTransport,
		async init(initContext: InitContext): Promise<InitResponse> {
			const response = (await baseTransport.init?.(initContext)) ?? {};
			return {
				...response,
				branding: context.prefetch.initialBranding ?? response.branding,
				policy,
				policyDecision:
					context.prefetch.initialPolicyDecision ??
					context.offlinePolicy?.policyDecision ??
					response.policyDecision,
				policySnapshotToken:
					context.prefetch.initialPolicySnapshotToken ??
					context.offlinePolicy?.policySnapshotToken ??
					response.policySnapshotToken,
				translations:
					context.prefetch.initialTranslations ?? response.translations,
			};
		},
	};
};

/**
 * Selects the local-only transport for a consent provider.
 *
 * @param options - Offline policy resolution options.
 * @returns An offline provider transport factory.
 * @example
 * ```ts
 * import { offline } from '@c15t/svelte';
 *
 * // Resolve the provider's `policies` locally, no backend involved.
 * const mode = offline();
 *
 * // Or pin a specific set of policy packs for this provider.
 * const previewMode = offline({ policyPacks });
 * ```
 */
export const offline = function offline(
	options: OfflineModeOptions = {}
): ProviderTransportFactory {
	const createTransport = (context: ProviderTransportContext) => {
		const policyPacks = getProviderPolicies(options, context);
		const baseTransport = createOfflineTransport({
			// A pack whose model is `iab` only resolves when a CMP is
			// configured; without this an offline IAB site fell through to
			// the no-banner fallback.
			iabEnabled: context.iabEnabled,
			policyPacks,
			translations: context.translations,
		});
		return createStaticOfflineTransport(baseTransport, context, policyPacks);
	};
	return Object.assign(createTransport, { kind: 'offline' as const });
};
