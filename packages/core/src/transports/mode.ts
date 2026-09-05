import type { PolicyRule } from '@c15t/schema/types';

import type { AllConsentNames } from '../consent/consent-types';
import type {
	KernelConfig,
	KernelTranslations,
	KernelTransport,
} from '../types';
import { createHostedTransport } from './hosted';

/** Runtime values supplied by a provider to a transport factory. */
export interface ProviderTransportContext {
	/** Categories configured on the provider. */
	consentCategories?: AllConsentNames[];
	/** v3 policy rules configured on the provider. */
	policyRules?: PolicyRule[];
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
 * Providers require one of these as their `mode` option. Build it with
 * `hosted()`, `custom()`, or a framework adapter's `offline()` rather than
 * by hand so the `kind` property stays accurate. `kind` lets adapters
 * report the selected transport through `window.c15t.mode` without
 * importing every transport implementation.
 *
 * @param context - Provider values needed to create the transport.
 * @returns A transport for the consent kernel.
 */
export interface ProviderTransportFactory {
	(context: ProviderTransportContext): KernelTransport;
	readonly kind: ProviderTransportKind;
}

/** Options for {@link hosted}. */
export interface HostedModeOptions {
	/** Backend URL. Can be relative or absolute. */
	url: string;
	/** Domain sent when consent is saved. */
	domain?: string;
	/** Fetch implementation used for backend requests. */
	fetch?: typeof globalThis.fetch;
	/** Headers forwarded to the backend init endpoint. */
	headers?: Record<string, string>;
}

/**
 * Selects the hosted transport for a consent provider.
 *
 * @param options - Hosted backend connection options.
 * @returns A hosted provider transport factory.
 * @example
 * ```ts
 * import { hosted } from '@c15t/core';
 *
 * const mode = hosted({ url: '/api/c15t' });
 * ```
 */
export const hosted = function hosted(
	options: HostedModeOptions
): ProviderTransportFactory {
	return Object.assign(
		() =>
			createHostedTransport({
				backendURL: options.url,
				domain: options.domain,
				fetch: options.fetch,
				headers: options.headers,
			}),
		{ kind: 'hosted' as const }
	);
};

/**
 * Selects a caller-supplied transport for a consent provider.
 *
 * @param transport - Canonical kernel transport.
 * @returns A custom provider transport factory.
 * @example
 * ```ts
 * import { custom } from '@c15t/core';
 *
 * const mode = custom({
 *   async init() {
 *     return await loadInitResponse();
 *   },
 *   async save(payload) {
 *     await persist(payload);
 *     return { ok: true, subjectId: payload.subjectId };
 *   },
 * });
 * ```
 */
export const custom = function custom(
	transport: KernelTransport
): ProviderTransportFactory {
	if ('setConsent' in transport) {
		throw new TypeError(
			'c15t: custom() requires a KernelTransport with save(), not endpoint handlers'
		);
	}
	return Object.assign(() => transport, { kind: 'custom' as const });
};
