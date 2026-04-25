/**
 * c15t/v3/transports/offline — pure client-side transport.
 *
 * Synthesizes an `InitResponse` from local policy packs + translations.
 * No network. Same response shape as `createHostedTransport`, so
 * consumers can swap transports without touching the kernel or adapter.
 *
 * Use cases:
 * - Pure static sites with no backend.
 * - Tests and storybook fixtures.
 * - Fallback path when the hosted backend is unreachable (combine with
 *   a wrapper that races hosted/offline transports).
 */
import type {
	JurisdictionCode,
	PolicyConfig,
	PolicyDecision,
	ResolvedPolicy,
	TranslationsResponse,
} from '@c15t/schema/types';
import { resolvePolicySync } from '@c15t/schema/types';
import type {
	InitContext,
	InitResponse,
	KernelBranding,
	KernelTranslations,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';

export interface OfflineTransportOptions {
	/**
	 * Policy packs to resolve at init time. Matched against the request
	 * context's country/region. Use `@c15t/schema`'s policyPackPresets
	 * for ready-made GDPR / CCPA / LGPD configs.
	 */
	policyPacks?: PolicyConfig[];

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
	 * Default jurisdiction to report when no policy matches. Defaults
	 * to 'NONE' — treat as no-regulation-applies (opt-out everything
	 * except necessary).
	 */
	defaultJurisdiction?: JurisdictionCode;

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

function normalizeTranslations(
	input: KernelTranslations | TranslationsResponse | undefined,
	defaultLanguage: string
): KernelTranslations {
	if (!input) {
		return {
			language: defaultLanguage,
			translations: {} as TranslationsResponse,
		};
	}
	// If the caller passed a KernelTranslations shape, use it directly.
	if (
		typeof input === 'object' &&
		'language' in input &&
		'translations' in input
	) {
		return input;
	}
	// Otherwise treat as a raw translations map — wrap with the default language.
	return {
		language: defaultLanguage,
		translations: input as TranslationsResponse,
	};
}

export function createOfflineTransport(
	options: OfflineTransportOptions = {}
): KernelTransport {
	const defaultLanguage = options.defaultLanguage ?? 'en';
	const defaultJurisdiction: JurisdictionCode =
		options.defaultJurisdiction ?? 'NONE';
	const branding: KernelBranding = options.branding ?? 'c15t';
	const iabEnabled = options.iabEnabled === true;
	const translations = normalizeTranslations(
		options.translations,
		defaultLanguage
	);

	return {
		async init(ctx: InitContext): Promise<InitResponse> {
			const country = ctx.overrides.country ?? null;
			const region = ctx.overrides.region ?? null;

			// Resolve policy pack locally. Returns undefined if no pack matches.
			const match = options.policyPacks
				? resolvePolicySync({
						policies: options.policyPacks,
						countryCode: country,
						regionCode: region,
						iabEnabled,
					})
				: undefined;

			const policy: ResolvedPolicy | undefined = match?.policy;
			const jurisdiction: JurisdictionCode =
				(policy as { jurisdiction?: JurisdictionCode } | undefined)
					?.jurisdiction ?? defaultJurisdiction;

			// showConsentBanner: when a policy matched and it says banner,
			// show it. Otherwise default to false (no regulation applies).
			const showConsentBanner =
				policy?.ui?.mode === 'banner' || policy?.ui?.mode === 'dialog';

			const policyDecision: PolicyDecision | undefined = match
				? ({
						matchedBy: match.matchedBy,
						fingerprint: '',
					} as unknown as PolicyDecision)
				: undefined;

			// Override language if caller supplied one.
			const resolvedTranslations: KernelTranslations = ctx.overrides.language
				? {
						...translations,
						language: ctx.overrides.language,
					}
				: translations;

			const response: InitResponse = {
				jurisdiction,
				showConsentBanner,
				location: {
					countryCode: country,
					regionCode: region,
				},
				translations: resolvedTranslations,
				branding,
			};
			if (policy) {
				response.policy = policy;
			}
			if (policyDecision) {
				response.policyDecision = policyDecision;
			}
			return response;
		},

		async save(_payload: SavePayload): Promise<SaveResult> {
			// Offline mode — no server to acknowledge the save. The caller's
			// persistence module handles client-side storage. Always succeeds
			// with no subjectId (local writes use generateSubjectId separately).
			return { ok: true };
		},

		// identify is a no-op in offline mode — no server to notify.
	};
}
