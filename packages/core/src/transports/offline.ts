/**
 * `@c15t/core/transports/offline` — pure client-side transport.
 *
 * Synthesizes an `InitResponse` from local policy rules + translations.
 * No network. Same response shape as `createHostedTransport`, so
 * consumers can swap transports without touching the kernel or adapter.
 *
 * Policy comes from `policyRules`, or the recommended pack when the caller
 * passes none, resolved with `resolvePolicyRules`. Every init emits an
 * explicit `policyResolution`: matched, no-match or failed. Resolution
 * runs once per init, inside the transport, so nothing hashes during kernel
 * construction, hydration or render.
 *
 * Use cases:
 * - Pure static sites with no backend.
 * - Tests and storybook fixtures.
 * - Apps that deliberately choose a bundled policy instead of a backend.
 */
import type {
	PolicyResolution,
	PolicyRule,
	TranslationsResponse,
} from '@c15t/schema/types';
import {
	recommendedPolicyRules,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';

import type { OfflineModeOptions as OfflineModeDataOptions } from '../modes';
import type {
	InitContext,
	KernelBranding,
	KernelTranslations,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';
import type { TransportInitResponse } from './init-output';
import type { ProviderTransportFactory } from './mode';

/** The offline transport's surface: every init carries `policyResolution`. */
export interface OfflineKernelTransport extends KernelTransport {
	init: (ctx: InitContext) => Promise<TransportInitResponse>;
	save: (payload: SavePayload) => Promise<SaveResult>;
}

export interface OfflineTransportOptions {
	/**
	 * v3 policy rules to resolve at init time. Matched against the request
	 * context's country/region. Omitted, the transport resolves
	 * `recommendedPolicyRules()`: strict opt-in for Europe and unknown
	 * countries, opt-out for US privacy states and missing US states, and
	 * `none` for other known locations. Missing Canadian provinces stay strict.
	 * Passing rules replaces that pack entirely.
	 */
	policyRules?: PolicyRule[];

	/**
	 * Translations to serve. Optional — defaults to en with empty
	 * strings. Bundled translations ship in `@c15t/translations`.
	 */
	translations?: KernelTranslations | TranslationsResponse;

	/**
	 * Default language to use when the request context carries no
	 * language override. Defaults to 'en'.
	 */
	defaultLanguage?: string;

	/**
	 * Copy for a requested language, or `undefined` when none exists. With
	 * it, a language change switches the copy, and a language without copy
	 * gets `translations`, still labelled with that copy's own language.
	 * Without it, `translations` is relabelled with the requested language.
	 * Pass the transport context's `translationsFor`.
	 */
	translationsFor?: (language: string) => KernelTranslations | undefined;

	/**
	 * A language detected before the app started, such as the
	 * `Accept-Language` a server prefetch recorded. Requesting it serves
	 * `translations` unchanged until the app first asks for a different
	 * language; from then on it switches the copy like any other.
	 */
	detectedLanguage?: string;

	/**
	 * Brand identifier. Defaults to 'c15t'.
	 */
	branding?: KernelBranding;

	/**
	 * Whether IAB TCF is enabled. Affects whether matching policies
	 * resolve to `model: 'iab'` or `'opt-in'`. Defaults to false.
	 */
	iabEnabled?: boolean;
}

/**
 * Normalize the `translations` option into the `KernelTranslations`
 * shape that init responses carry.
 *
 * Accepts three input shapes:
 * - `undefined`                  → empty translations bundle.
 * - `KernelTranslations`         → passed through.
 * - raw `TranslationsResponse`   → wrapped with `defaultLanguage`.
 */
const normalizeTranslations = function normalizeTranslations(
	input: KernelTranslations | TranslationsResponse | undefined,
	defaultLanguage: string
): KernelTranslations {
	if (!input) {
		return {
			language: defaultLanguage,
			translations: {} as TranslationsResponse,
		};
	}
	if (
		typeof input === 'object' &&
		'language' in input &&
		'translations' in input
	) {
		return input;
	}
	return {
		language: defaultLanguage,
		translations: input as TranslationsResponse,
	};
};

/**
 * Pick the copy each offline init serves for the requested language.
 *
 * The detected language only stands for "no choice yet". Once the app has
 * asked for a different language, a later request for the detected one is
 * the app's own and resolves its copy too.
 *
 * @param translations - The startup copy.
 * @param translationsFor - The copy for a requested language, if any.
 * @param readDetectedLanguage - Reads the detected language at each init, so
 * a prefetch that resolves after the transport is built still counts.
 * @returns A function from the requested language, if any, to the copy.
 */
const createOfflineTranslationSelector =
	function createOfflineTranslationSelector(
		translations: KernelTranslations,
		translationsFor: OfflineTransportOptions['translationsFor'],
		readDetectedLanguage: () => string | undefined
	): (requested: string | undefined) => KernelTranslations {
		let choseAnother = false;
		return (requested) => {
			if (!requested) {
				return translations;
			}
			if (!translationsFor) {
				return { ...translations, language: requested };
			}
			if (!choseAnother && requested === readDetectedLanguage()) {
				return translations;
			}
			choseAnother = true;
			return translationsFor(requested) ?? translations;
		};
	};

/**
 * Build an offline transport. The returned object is plain — no
 * listeners, no caches, no state. Safe to create per request.
 */
export const createOfflineTransport = function createOfflineTransport(
	options: OfflineTransportOptions = {}
): OfflineKernelTransport {
	const defaultLanguage = options.defaultLanguage ?? 'en';
	const branding: KernelBranding = options.branding ?? 'c15t';
	const iabEnabled = options.iabEnabled === true;
	const translations = normalizeTranslations(
		options.translations,
		defaultLanguage
	);
	const rules =
		options.policyRules ?? recommendedPolicyRules({ iab: iabEnabled });
	const selectTranslations = createOfflineTranslationSelector(
		translations,
		options.translationsFor,
		() => options.detectedLanguage
	);

	return {
		init(ctx: InitContext): Promise<TransportInitResponse> {
			const country = ctx.overrides.country ?? null;
			const region = ctx.overrides.region ?? null;

			// The v3 outcome, resolved and fingerprinted once here.
			const resolution: PolicyResolution = resolvePolicyRules({
				countryCode: country,
				iabEnabled,
				regionCode: region,
				rules,
			});

			const resolvedTranslations = selectTranslations(ctx.overrides.language);

			const response: TransportInitResponse = {
				branding,
				location: {
					countryCode: country,
					regionCode: region,
				},
				policyResolution: writePolicyResolutionWire(resolution),
				translations: resolvedTranslations,
			};
			return Promise.resolve(response);
		},

		save(payload: SavePayload): Promise<SaveResult> {
			// Offline mode — no server to acknowledge the save. The caller's
			// persistence module handles client-side storage. Echo the kernel's
			// subject ID so save results stay consistent across transports.
			return Promise.resolve({ ok: true, subjectId: payload.subjectId });
		},

		// identify is a no-op in offline mode — no server to notify.
	};
};

/** Options for {@link offline}. */
export interface OfflineModeOptions extends OfflineModeDataOptions {
	/**
	 * Rules to resolve locally. Omit them to use `recommendedPolicyRules()`:
	 * strict opt-in for Europe, the UK, Quebec and unknown locations, opt-out
	 * for the US states with a privacy law, and `none` everywhere else.
	 * Passing rules replaces that pack entirely.
	 */
	policyRules?: PolicyRule[];
}

/**
 * What `offline()` returns: a transport factory that also carries its
 * options as enumerable data, so it satisfies `OfflineMode` from
 * `@c15t/core/modes`.
 */
export type OfflineModeFactory = ProviderTransportFactory &
	Readonly<OfflineModeOptions> & {
		readonly kind: 'offline';
		readonly type: 'offline';
	};

/**
 * Selects a transport that resolves policy rules locally, with no network.
 *
 * A language the app sets through the kernel (`overrides.language`,
 * `kernel.set.language()`) switches the copy when c15t's built-in copy or
 * the provider's `i18n.messages` has that language. A language with no copy
 * gets the startup copy back, still labelled with the startup language. The
 * language a server prefetch detected from `Accept-Language` does not switch
 * the copy until the app has asked for a different language.
 *
 * @param options - Explicit policy rules; absence resolves the recommended pack.
 * @returns A provider transport factory with no network requests.
 * @example
 * ```ts
 * import { offline } from '@c15t/core';
 * import { createConsentRuntime } from '@c15t/core/runtime';
 *
 * const runtime = createConsentRuntime({
 * 	i18n: { messages: { de: { cookieBanner: { title: 'Datenschutz' } } } },
 * 	mode: offline(),
 * });
 * runtime.kernel.set.language('de');
 * ```
 */
export const offline = function offline(
	options: OfflineModeOptions = {}
): OfflineModeFactory {
	const settings: OfflineModeOptions =
		options.policyRules === undefined
			? {}
			: { policyRules: options.policyRules };
	return Object.assign(
		(context: Parameters<ProviderTransportFactory>[0]): KernelTransport => {
			const rules =
				settings.policyRules ??
				recommendedPolicyRules({ iab: context.iabEnabled });
			// Read at each init: a pending prefetch fills `context.prefetch`
			// after this transport is built.
			const selectTranslations = createOfflineTranslationSelector(
				context.translations,
				context.translationsFor,
				() => context.prefetch.initialOverrides?.language
			);
			return {
				init: ({ overrides }: InitContext) => {
					const countryCode = overrides.country ?? null;
					const regionCode = overrides.region ?? null;
					return Promise.resolve({
						// The location it resolved for, as `/init` and
						// `createOfflineTransport()` answer: surfaces that read
						// the init's display data wait for one.
						location: { countryCode, regionCode },
						policyResolution: writePolicyResolutionWire(
							resolvePolicyRules({
								countryCode,
								iabEnabled: context.iabEnabled,
								regionCode,
								rules,
							})
						),
						translations: selectTranslations(overrides.language),
					});
				},
			};
		},
		settings,
		{ kind: 'offline' as const, type: 'offline' as const }
	);
};
