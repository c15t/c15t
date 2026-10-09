import type { PolicyRule } from '@c15t/schema/types';

import type { AllConsentNames } from '../consent/consent-types';
import type { HostedModeOptions as HostedModeDataOptions } from '../modes';
import type { SSRInitialData } from '../options/ssr';
import type {
	KernelConfig,
	KernelTranslations,
	KernelTransport,
} from '../types';
import type { RememberedDecisionInputs } from './decision-inputs';
import { createHostedTransport } from './hosted';
import { hostedFactories } from './hosted-modes';

/** Runtime values supplied by a provider to a transport factory. */
export interface ProviderTransportContext {
	/** Categories configured on the provider. */
	consentCategories?: AllConsentNames[];
	/** v3 policy rules configured on the provider. */
	policyRules?: PolicyRule[];
	/** Whether the provider configured IAB TCF. */
	iabEnabled?: boolean;
	/** Server-prefetched kernel configuration. */
	prefetch: KernelConfig;
	/** Translations resolved from the provider's i18n configuration. */
	translations: KernelTranslations;
	/**
	 * Copy for another language from the bundled translations and the
	 * provider's `i18n.messages`, or `undefined` when neither has it. Lets a
	 * transport with no backend follow a language change.
	 */
	translationsFor?: (language: string) => KernelTranslations | undefined;
}

/** Transport kind exposed through `window.c15t.mode`. */
export type ProviderTransportKind =
	| 'hosted'
	| 'manifest'
	| 'offline'
	| 'custom';

/**
 * Creates a kernel transport from provider runtime context.
 *
 * Providers require one of these as their `mode` option. Build it with
 * `hosted()`, `offline()`, `manifest()` or `custom()` rather than
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
export interface HostedModeOptions extends HostedModeDataOptions {
	/** Backend URL. Can be relative (`/api/c15t`) or absolute. */
	backendURL: string;
	/** Domain sent when consent is saved. */
	domain?: string;
	/** Fetch implementation used for backend requests. */
	fetch?: typeof globalThis.fetch;
	/** Headers forwarded to the backend init endpoint. */
	headers?: Record<string, string>;
	/**
	 * URL used for `GET /init`. Defaults to `${backendURL}/init`.
	 *
	 * Point this at a same-origin server route that resolves init from a
	 * manifest (for example with `resolveManifestInit` from
	 * `@c15t/core/transports/manifest-cache`) while consent saves keep going
	 * to `${backendURL}/subjects`. Manifest resolution never issues a
	 * `policySnapshotToken`, so setting `initURL` also turns on
	 * `assertDecisionInputs`.
	 */
	initURL?: string;
	/**
	 * Assert the resolved policy decision on `POST /subjects` when the save
	 * carries no signed `policySnapshotToken`, so the backend can reject a
	 * save made against a stale policy instead of recording it unbound.
	 *
	 * @defaultValue `true` when `initURL` is set, otherwise `false`
	 */
	assertDecisionInputs?: boolean;
	/**
	 * An init response an inline prefetch script already requested. The
	 * first `init()` consumes it instead of calling `initURL`, keeping the
	 * decision-input assertion intact.
	 */
	initialData?: Promise<SSRInitialData | undefined>;
	/**
	 * Decision inputs a server-side prefetch already resolved, so a save
	 * made before the first client `init()` resolves still carries the
	 * decision assertion. Only used with `assertDecisionInputs`.
	 */
	decisionInputs?: RememberedDecisionInputs;
}

/**
 * What `hosted()` returns: a transport factory that also carries its
 * options as enumerable data, so it satisfies `HostedMode` from
 * `@c15t/core/modes`.
 */
export type HostedModeFactory = ProviderTransportFactory &
	Readonly<HostedModeOptions> & {
		readonly kind: 'hosted';
		readonly type: 'hosted';
	};

/**
 * Selects the hosted transport for a consent provider.
 *
 * @param options - Hosted backend connection options.
 * @returns A hosted provider transport factory carrying its options.
 * @example
 * ```ts
 * import { hosted } from '@c15t/core';
 *
 * const mode = hosted({ backendURL: '/api/c15t' });
 *
 * // Resolve init from a same-origin route, save to the backend. Saves
 * // assert the decision because `initURL` is set.
 * const sameOriginInit = hosted({
 *   backendURL: 'https://consent.example.com',
 *   initURL: '/api/consent/init',
 * });
 * ```
 */
export const hosted = function hosted(
	options: HostedModeOptions
): HostedModeFactory {
	// The options as of this call: editing the object afterwards changes
	// neither the transports this factory builds nor what a provider
	// compares them by. `fetch` and `initialData` stay the same values.
	const settings: HostedModeOptions = {
		...options,
		headers: options.headers && { ...options.headers },
	};
	if (settings.headers === undefined) {
		delete settings.headers;
	}
	const mode = Object.assign(
		() =>
			createHostedTransport({
				assertDecisionInputs:
					settings.assertDecisionInputs ?? settings.initURL !== undefined,
				backendURL: settings.backendURL,
				decisionInputs: settings.decisionInputs,
				domain: settings.domain,
				fetch: settings.fetch,
				headers: settings.headers && { ...settings.headers },
				initURL: settings.initURL,
				initialData: settings.initialData,
			}),
		settings,
		{ kind: 'hosted' as const, type: 'hosted' as const }
	);
	hostedFactories.add(mode);
	return mode;
};

export { custom } from './custom';
