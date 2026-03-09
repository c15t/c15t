/**
 * Init route - Initializes the consent manager and returns the initial state.
 *
 * @packageDocumentation
 */

import { initOutputSchema } from '@c15t/schema';
import type { ResolvedPolicy } from '@c15t/schema/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { createGVLResolver } from '~/cache/gvl-resolver';
import { getJurisdiction, getLocation } from '~/handlers/init/geo';
import { getTranslationsData } from '~/handlers/init/translations';
import { createPolicySnapshotToken } from '~/handlers/policy/snapshot';
import type { C15TContext, C15TOptions } from '~/types';
import { getMetrics } from '~/utils/metrics';
import { resolvePolicyDecision } from '../handlers/init/policy';

function stripIabTranslations(
	translations: Record<string, unknown>
): Record<string, unknown> {
	const { iab: _iab, ...rest } = translations;
	return rest;
}

function resolveNoPolicyFallback(): ResolvedPolicy {
	return {
		id: 'policy_default_no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

/**
 * Creates the init route handler
 */
export const createInitRoute = (options: C15TOptions) => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.get(
		'/',
		describeRoute({
			summary: 'Get initial consent manager state',
			description: `Returns the initial state required to render the consent manager.

- **Jurisdiction** – User's jurisdiction (defaults to GDPR if geo-location is disabled)
- **Location** – User's location (null if geo-location is disabled)
- **Translations** – Consent manager copy (from \`Accept-Language\` header)
- **Branding** – Configured branding key
- **GVL** – Global Vendor List when IAB is active for the request

Use for geo-targeted consent banners and regional compliance.`,
			tags: ['Init'],
			responses: {
				200: {
					description:
						'Initialization payload (jurisdiction, location, translations, branding, GVL)',
					content: {
						'application/json': {
							schema: resolver(initOutputSchema),
						},
					},
				},
			},
		}),
		async (c) => {
			const ctx = c.get('c15tContext');
			const request = c.req.raw;

			// Get accept-language header
			const acceptLanguage = request.headers.get('accept-language') || 'en';

			// Get location and jurisdiction
			const location = await getLocation(request, options);
			const jurisdiction = getJurisdiction(location, options);
			const hasExplicitPolicyPack = options.policies !== undefined;
			const isExplicitEmptyPolicyPack =
				hasExplicitPolicyPack && (options.policies?.length ?? 0) === 0;
			const policyDecision = isExplicitEmptyPolicyPack
				? undefined
				: await resolvePolicyDecision({
						policies: options.policies,
						countryCode: location.countryCode,
						regionCode: location.regionCode,
						jurisdiction,
						iabEnabled: options.iab?.enabled === true,
					});
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
					logger: ctx?.logger,
				}
			);
			const responseTranslations = shouldIncludeIabPayload
				? translationsResult
				: {
						...translationsResult,
						translations: stripIabTranslations(
							translationsResult.translations as unknown as Record<
								string,
								unknown
							>
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

			return c.json({
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
			});
		}
	);

	return app;
};
