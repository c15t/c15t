import type {
	AllConsentNames,
	OfflinePolicyConfig,
	PolicyConfig,
} from '@c15t/core';
import type {
	KernelConfig,
	KernelTranslations,
	KernelTransport,
} from '@c15t/core/v3';

/** Runtime values supplied by {@link ConsentProvider} to a transport factory. */
export interface ProviderTransportContext {
	/** Categories configured on the provider. */
	consentCategories?: AllConsentNames[];
	/** Legacy offline policy configuration used during the v3 migration. */
	offlinePolicy?: OfflinePolicyConfig;
	/** Policy packs configured on the provider. */
	policies?: PolicyConfig[];
	/** Server-prefetched kernel configuration. */
	prefetch: KernelConfig;
	/** Translations resolved from the provider's i18n configuration. */
	translations: KernelTranslations;
}

/** Transport kind exposed through `window.c15t.mode`. */
export type ProviderTransportKind = 'hosted' | 'offline' | 'custom';

/**
 * Creates a kernel transport from provider runtime context.
 *
 * The `kind` property lets adapters report the selected transport without
 * importing every transport implementation.
 *
 * @param context - Provider values needed to create the transport.
 * @returns A transport for the consent kernel.
 */
export interface ProviderTransportFactory {
	(context: ProviderTransportContext): KernelTransport;
	readonly kind: ProviderTransportKind;
}
