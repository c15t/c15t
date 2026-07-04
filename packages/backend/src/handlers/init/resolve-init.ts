/**
 * Shared init payload resolution — used by both the Hono route and the edge handler.
 *
 * @packageDocumentation
 */

import type { Logger } from '@c15t/logger';
import type { InitOutput, ResolvedPolicy } from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { createGVLResolver } from '~/cache/gvl-resolver';
import type { C15TEdgeOptions } from '~/edge/types';
import { createPolicySnapshotToken } from '~/handlers/policy/snapshot';
import { getMetrics } from '~/utils/metrics';
import { getLocation } from './geo';
import { buildConsentManifestFromOptions } from './manifest';

/**
 * Subset of C15TOptions needed by the init resolver.
 * Derived from {@link C15TEdgeOptions} minus `logger` (passed separately).
 */
export type InitResolverOptions = Omit<C15TEdgeOptions, 'logger'>;

/** The JSON-serializable payload returned by /init. */
export type InitPayload = InitOutput;

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
	const manifest = await buildConsentManifestFromOptions(options);
	const gpc = request.headers.get('sec-gpc') === '1';
	const payload = resolveInitFromManifest(
		manifest,
		{
			country: location.countryCode,
			region: location.regionCode,
			language: acceptLanguage,
			gpc,
		},
		{ logger }
	);
	const hasExplicitPolicyPack = options.policyPacks !== undefined;
	const isExplicitEmptyPolicyPack =
		hasExplicitPolicyPack && (options.policyPacks?.length ?? 0) === 0;
	const policyDecision = isExplicitEmptyPolicyPack
		? undefined
		: payload.policyDecision;
	if (
		hasExplicitPolicyPack &&
		!isExplicitEmptyPolicyPack &&
		!payload.policyDecision
	) {
		logger?.warn('Policy packs configured but no policy matched', {
			country: location.countryCode,
			region: location.regionCode,
		});
	}
	const resolvedPolicy = payload.policy;
	const iabOptions = options.iab;
	const shouldIncludeIabPayload =
		iabOptions?.enabled === true &&
		(!hasExplicitPolicyPack || resolvedPolicy?.model === 'iab');

	// Get GVL only when IAB is active for this request
	let gvl = null;
	if (shouldIncludeIabPayload && iabOptions) {
		const language = payload.translations.language.split('-')[0] || 'en';
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
	const snapshot =
		policyDecision && resolvedPolicy
			? await createPolicySnapshotToken({
					options: options.policySnapshot,
					tenantId: options.tenantId,
					policyId: policyDecision.policyId,
					fingerprint: policyDecision.fingerprint,
					matchedBy: policyDecision.matchedBy,
					country: location?.countryCode ?? null,
					region: location?.regionCode ?? null,
					jurisdiction: payload.jurisdiction,
					language: payload.translations.language,
					model: resolvedPolicy.model,
					policyI18n: resolvedPolicy.i18n,
					expiryDays: resolvedPolicy.consent?.expiryDays,
					scopeMode: resolvedPolicy.consent?.scopeMode,
					uiMode: resolvedPolicy.ui?.mode,
					bannerUi: resolvedPolicy.ui?.banner,
					dialogUi: resolvedPolicy.ui?.dialog,
					categories: resolvedPolicy.consent?.categories,
					preselectedCategories: resolvedPolicy.consent?.preselectedCategories,
					gpc: resolvedPolicy.consent?.gpc,
					proofConfig: resolvedPolicy.proof,
				})
			: undefined;

	// Record init metric
	getMetrics()?.recordInit({
		jurisdiction: payload.jurisdiction,
		country: location?.countryCode ?? undefined,
		region: location?.regionCode ?? undefined,
		gpc,
	});

	return {
		...payload,
		...(shouldIncludeIabPayload && {
			gvl,
		}),
		...(snapshot?.token && {
			policySnapshotToken: snapshot.token,
		}),
	};
}
