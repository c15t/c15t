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
	/**
	 * Policy packs to resolve against the visitor's geo overrides. Without
	 * any, every visitor gets an opt-in banner for the configured
	 * categories.
	 */
	policyPacks?: PolicyConfig[];
}

const buildInlinePolicy = function buildInlinePolicy(
	categories: ProviderTransportContext['consentCategories']
): KernelConfig['initialPolicy'] {
	const fallback = policyDefaults.offlineOptInBanner();
	const inline = buildDefaultOptInPolicy(categories);
	return {
		...inline,
		consent: { ...fallback.consent, ...inline.consent },
		ui: fallback.ui,
	};
};

/**
 * Consent kept in the browser only, with no backend.
 *
 * The same factory `@c15t/react`, `@c15t/svelte` and `@c15t/astro` ship;
 * `@c15t/core` exposes only the transport, so each adapter wires it up.
 *
 * @param options - Optional policy packs.
 * @returns A transport factory for `mode`.
 *
 * @example
 * ```ts
 * init({ mode: offline(), consentCategories: ['measurement'] });
 * ```
 */
export const offline = function offline(
	options: OfflineModeOptions = {}
): ProviderTransportFactory {
	const createTransport = function createTransport(
		context: ProviderTransportContext
	): KernelTransport {
		const policyPacks =
			options.policyPacks ??
			context.policies ??
			context.offlinePolicy?.policyPacks;
		const baseTransport = createOfflineTransport({
			// A pack whose model is `iab` only resolves when a CMP is
			// configured; without this an offline IAB site fell through to
			// the no-banner fallback.
			iabEnabled: context.iabEnabled,
			policyPacks,
			translations: context.translations,
		});
		const configuredPolicy =
			context.prefetch.initialPolicy ?? context.offlinePolicy?.policy;
		const policy =
			configuredPolicy ??
			(policyPacks === undefined
				? buildInlinePolicy(context.consentCategories)
				: undefined);
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
	return Object.assign(createTransport, { kind: 'offline' as const });
};
