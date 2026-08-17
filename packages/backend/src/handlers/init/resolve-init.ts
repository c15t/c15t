/**
 * Shared init payload resolution — used by both the Hono route and the edge handler.
 *
 * @packageDocumentation
 */

import type { Logger } from '@c15t/logger';
import type { ResolvedPolicy } from '@c15t/schema/types';
import { createGVLResolver } from '~/cache/gvl-resolver';
import type { C15TEdgeOptions } from '~/edge/types';
import { createPolicySnapshotToken } from '~/handlers/policy/snapshot';
import { getMetrics } from '~/utils/metrics';
import { getJurisdiction, getLocation } from './geo';
import { resolvePolicyDecision } from './policy';
import { getTranslationsData } from './translations';

/**
 * Subset of C15TOptions needed by the init resolver.
 * Derived from {@link C15TEdgeOptions} minus `logger` (passed separately).
 */
export type InitResolverOptions = Omit<C15TEdgeOptions, 'logger'>;

/** The JSON-serializable payload returned by /init. */
export interface InitPayload {
	jurisdiction: string;
	location: { countryCode: string | null; regionCode: string | null };
	translations: {
		translations: unknown;
		language: string;
	};
	branding: string;
	gvl?: unknown;
	customVendors?: unknown[];
	policy?: ResolvedPolicy;
	policyDecision?: {
		policyId: string;
		fingerprint: string;
		matchedBy: string;
		country: string | null;
		region: string | null;
		jurisdiction: string;
	};
	policySnapshotToken?: string;
	cmpId?: number;
}

function stripIabTranslations(
	translations: Record<string, unknown>
): Record<string, unknown> {
	const { iab: _iab, ...rest } = translations;
	return rest;
}

function resolveNoPolicyFallback(): ResolvedPolicy {
	return {
		id: 'no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

/**
 * Resolves the full /init payload from a request and options.
 * Pure function — no Hono, no database dependency.
 */
export async function resolveInitPayload(
	request: Request,
	options: InitResolverOptions,
	logger?: Logger
): Promise<InitPayload> {
	// Get accept-language header
	const acceptLanguage = request.headers.get('accept-language') || 'en';

	// Get location and jurisdiction
	const location = await getLocation(request, options);
	const jurisdiction = getJurisdiction(location, options);
	const hasExplicitPolicyPack = options.policyPacks !== undefined;
	const isExplicitEmptyPolicyPack =
		hasExplicitPolicyPack && (options.policyPacks?.length ?? 0) === 0;
	const policyDecision = isExplicitEmptyPolicyPack
		? undefined
		: await resolvePolicyDecision({
				policies: options.policyPacks,
				countryCode: location.countryCode,
				regionCode: location.regionCode,
				jurisdiction,
				iabEnabled: options.iab?.enabled === true,
			});
	if (hasExplicitPolicyPack && !isExplicitEmptyPolicyPack && !policyDecision) {
		logger?.warn('Policy packs configured but no policy matched', {
			country: location.countryCode,
			region: location.regionCode,
		});
	}
	const resolvedPolicy = hasExplicitPolicyPack
		? (policyDecision?.policy ?? resolveNoPolicyFallback())
		: undefined;
	const iabOptions = options.iab;
	const shouldIncludeIabPayload =
		iabOptions?.enabled === true &&
		(!hasExplicitPolicyPack || resolvedPolicy?.model === 'iab');

	// Get translations
	const translationsResult = getTranslationsData(
		acceptLanguage,
		options.customTranslations,
		{
			i18n: options.i18n,
			policyI18n: resolvedPolicy?.i18n,
			logger,
		}
	);
	const responseTranslations = shouldIncludeIabPayload
		? translationsResult
		: {
				...translationsResult,
				translations: stripIabTranslations(
					translationsResult.translations as unknown as Record<string, unknown>
				),
			};

	// Get GVL only when IAB is active for this request
	let gvl = null;
	if (shouldIncludeIabPayload && iabOptions) {
		const language = translationsResult.language.split('-')[0] || 'en';
		const gvlResolver = createGVLResolver({
			appName: options.appName || 'c15t',
			bundled: iabOptions.bundled,
			cacheAdapter: options.cache?.adapter,
			vendorIds: iabOptions.vendorIds,
			endpoint: iabOptions.endpoint,
		});
		gvl = await gvlResolver.get(language);
	}

	// Get custom vendors if configured
	const customVendors = shouldIncludeIabPayload
		? iabOptions?.customVendors
		: undefined;
	const snapshot = policyDecision
		? await createPolicySnapshotToken({
				options: options.policySnapshot,
				tenantId: options.tenantId,
				policyId: policyDecision.policy.id,
				fingerprint: policyDecision.fingerprint,
				matchedBy: policyDecision.matchedBy,
				country: location?.countryCode ?? null,
				region: location?.regionCode ?? null,
				jurisdiction,
				language: translationsResult.language,
				model: policyDecision.policy.model,
				policyI18n: policyDecision.policy.i18n,
				expiryDays: policyDecision.policy.consent?.expiryDays,
				scopeMode: policyDecision.policy.consent?.scopeMode,
				uiMode: policyDecision.policy.ui?.mode,
				bannerUi: policyDecision.policy.ui?.banner,
				dialogUi: policyDecision.policy.ui?.dialog,
				categories: policyDecision.policy.consent?.categories,
				preselectedCategories:
					policyDecision.policy.consent?.preselectedCategories,
				gpc: policyDecision.policy.consent?.gpc,
				proofConfig: policyDecision.policy.proof,
			})
		: undefined;

	// Record init metric
	const gpc = request.headers.get('sec-gpc') === '1';
	getMetrics()?.recordInit({
		jurisdiction,
		country: location?.countryCode ?? undefined,
		region: location?.regionCode ?? undefined,
		gpc,
	});

	return {
		jurisdiction,
		location,
		translations: responseTranslations,
		branding: options.branding || 'c15t',
		...(shouldIncludeIabPayload && {
			gvl,
			customVendors,
		}),
		...(resolvedPolicy && {
			policy: resolvedPolicy,
		}),
		...(policyDecision && {
			policyDecision: {
				policyId: policyDecision.policy.id,
				fingerprint: policyDecision.fingerprint,
				matchedBy: policyDecision.matchedBy,
				country: location.countryCode,
				region: location.regionCode,
				jurisdiction,
			},
		}),
		...(snapshot?.token && {
			policySnapshotToken: snapshot.token,
		}),
		...(shouldIncludeIabPayload &&
			iabOptions?.cmpId != null && {
				cmpId: iabOptions.cmpId,
			}),
	};
}
