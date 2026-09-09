/**
 * `@c15t/core/transports/offline` — pure client-side transport.
 *
 * Synthesizes an `InitResponse` from local policy rules + translations.
 * No network. Same response shape as `createHostedTransport`, so
 * consumers can swap transports without touching the kernel or adapter.
 *
 * Policy comes from `policyRules`, resolved with `resolvePolicyRules`.
 * Every init emits an explicit
 * `policyResolution`: unconfigured, matched, no-match or failed. Resolution
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
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';

import type {
	InitContext,
	KernelBranding,
	KernelTranslations,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';
import type { TransportInitResponse } from './init-output';

/** The offline transport's surface: every init carries `policyResolution`. */
export interface OfflineKernelTransport extends KernelTransport {
	init: (ctx: InitContext) => Promise<TransportInitResponse>;
	save: (payload: SavePayload) => Promise<SaveResult>;
}

export interface OfflineTransportOptions {
	/**
	 * v3 policy rules to resolve at init time. Matched against the request
	 * context's country/region. Use `@c15t/schema`'s `policyRulePresets`
	 * for reviewed starting points.
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
	const rules = options.policyRules;

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

			// Override language if caller supplied one.
			const resolvedTranslations: KernelTranslations = ctx.overrides.language
				? {
						...translations,
						language: ctx.overrides.language,
					}
				: translations;

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
