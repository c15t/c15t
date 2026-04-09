/**
 * Lightweight edge consent resolver — resolves policy + default consent
 * categories from geo headers without the full /init payload.
 *
 * Designed for enterprise customers who maintain their own consent cookie
 * and need to know which categories to load in middleware.
 *
 * @packageDocumentation
 */

import type { Logger } from '@c15t/logger';
import type { ResolvedPolicy } from '@c15t/schema/types';
import { checkJurisdiction } from '~/handlers/init/geo';
import { resolvePolicySync } from '~/handlers/init/policy';
import type { C15TEdgeOptions } from './types';

/**
 * Options for the consent resolver — a subset of C15TEdgeOptions
 * containing only what's needed for policy resolution.
 */
export type C15TConsentResolverOptions = Pick<
	C15TEdgeOptions,
	'policyPacks' | 'disableGeoLocation'
>;

/**
 * Default consent state for a single category.
 */
export interface CategoryConsent {
	/** Whether this category is granted by default (before user interaction). */
	granted: boolean;
	/** Whether the user can toggle this category off. */
	required: boolean;
}

/**
 * Result of resolving consent defaults for a request.
 */
export interface ResolvedConsent {
	/** The jurisdiction code for this visitor (GDPR, CCPA, etc.) */
	jurisdiction: string;
	/** Visitor's detected location. */
	location: { countryCode: string | null; regionCode: string | null };
	/** The resolved consent model (opt-in, opt-out, none, iab). */
	model: string;
	/** The matched policy ID, or null if no policy matched. */
	policyId: string | null;
	/** Default consent state per category. */
	defaults: Record<string, CategoryConsent>;
	/** Whether a consent banner/dialog should be shown. */
	showBanner: boolean;
	/** Whether the GPC (Global Privacy Control) signal is active. */
	gpc: boolean;
}

function getLocationFromHeaders(headers: Headers): {
	countryCode: string | null;
	regionCode: string | null;
} {
	const countryCode =
		headers.get('x-c15t-country') ??
		headers.get('cf-ipcountry') ??
		headers.get('x-vercel-ip-country') ??
		headers.get('x-amz-cf-ipcountry') ??
		headers.get('x-country-code');

	const regionCode =
		headers.get('x-c15t-region') ??
		headers.get('x-vercel-ip-country-region') ??
		headers.get('x-region-code');

	return { countryCode, regionCode };
}

function resolveNoPolicyFallback(): ResolvedPolicy {
	return {
		id: 'no_banner',
		model: 'none',
		ui: { mode: 'none' },
	};
}

/**
 * Computes the default consent state for each category based on the
 * consent model and policy configuration.
 */
function resolveDefaultConsent(
	policy: ResolvedPolicy,
	gpc: boolean
): Record<string, CategoryConsent> {
	const model = policy.model;
	const categories = policy.consent?.categories ?? [];
	const preselected = new Set(policy.consent?.preselectedCategories ?? []);
	const respectsGpc = policy.consent?.gpc === true && gpc;

	const defaults: Record<string, CategoryConsent> = {};

	// "necessary" is always granted and required
	defaults.necessary = { granted: true, required: true };

	if (model === 'none') {
		// No banner — everything is granted
		for (const category of categories) {
			if (category === '*' || category === 'necessary') continue;
			defaults[category] = { granted: true, required: false };
		}
		return defaults;
	}

	if (model === 'opt-out') {
		// Opt-out: everything granted by default, unless GPC overrides
		for (const category of categories) {
			if (category === '*' || category === 'necessary') continue;
			const gpcOverride =
				respectsGpc && (category === 'marketing' || category === 'measurement');
			defaults[category] = {
				granted: !gpcOverride,
				required: false,
			};
		}
		return defaults;
	}

	// opt-in (and iab): nothing granted by default except preselected
	for (const category of categories) {
		if (category === '*' || category === 'necessary') continue;
		defaults[category] = {
			granted: preselected.has(category),
			required: false,
		};
	}

	return defaults;
}

/**
 * Resolves consent policy and default category states from a request.
 *
 * Fully synchronous — no async, no fetch calls, no crypto.
 *
 * This is a lightweight alternative to `unstable_c15tEdgeInit` for enterprise
 * customers who manage their own consent cookie. It returns the resolved
 * policy and default consent state without translations, GVL, branding,
 * or snapshot tokens.
 *
 * @experimental This API is unstable in 2.0 and may change or be removed.
 *
 * @example
 * ```ts
 * import { unstable_resolveConsent } from '@c15t/backend/edge';
 *
 * export function middleware(request: Request) {
 *   const consent = unstable_resolveConsent(request, {
 *     policyPacks: [
 *       { id: 'eu', match: { countries: ['DE', 'FR'] }, consent: { model: 'opt-in', categories: ['necessary', 'marketing', 'measurement'] }, ui: { mode: 'banner' } },
 *       { id: 'us', match: { isDefault: true }, consent: { model: 'opt-out', categories: ['necessary', 'marketing', 'measurement'] }, ui: { mode: 'banner' } },
 *     ],
 *   });
 *
 *   // consent.defaults => { necessary: { granted: true, required: true }, marketing: { granted: false, required: false }, ... }
 *   // consent.model => "opt-in"
 *   // consent.showBanner => true
 *
 *   // Read your own cookie, merge with consent.defaults, decide what to load
 * }
 * ```
 */
export function unstable_resolveConsent(
	request: Request,
	options: C15TConsentResolverOptions,
	logger?: Logger
): ResolvedConsent {
	const location = options.disableGeoLocation
		? { countryCode: null, regionCode: null }
		: getLocationFromHeaders(request.headers);
	const jurisdiction = options.disableGeoLocation
		? 'GDPR'
		: checkJurisdiction(location.countryCode, location.regionCode);
	const gpc = request.headers.get('sec-gpc') === '1';

	const hasExplicitPolicyPack = options.policyPacks !== undefined;
	const isExplicitEmptyPolicyPack =
		hasExplicitPolicyPack && (options.policyPacks?.length ?? 0) === 0;

	const policyMatch = isExplicitEmptyPolicyPack
		? undefined
		: resolvePolicySync({
				policies: options.policyPacks,
				countryCode: location.countryCode,
				regionCode: location.regionCode,
				jurisdiction,
			});

	if (hasExplicitPolicyPack && !isExplicitEmptyPolicyPack && !policyMatch) {
		logger?.warn('Policy packs configured but no policy matched', {
			country: location.countryCode,
			region: location.regionCode,
		});
	}

	const resolvedPolicy = hasExplicitPolicyPack
		? (policyMatch?.policy ?? resolveNoPolicyFallback())
		: resolveNoPolicyFallback();

	const model = resolvedPolicy.model;
	const showBanner = model !== 'none' && resolvedPolicy.ui?.mode !== 'none';
	const defaults = resolveDefaultConsent(resolvedPolicy, gpc);

	return {
		jurisdiction,
		location,
		model,
		policyId: resolvedPolicy.id,
		defaults,
		showBanner,
		gpc,
	};
}
