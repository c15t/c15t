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
import { getJurisdiction, getLocation } from '~/handlers/init/geo';
import { resolvePolicyDecision } from '~/handlers/init/policy';
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
 * This is a lightweight alternative to `c15tEdgeInit` for enterprise
 * customers who manage their own consent cookie. It returns the resolved
 * policy and default consent state without translations, GVL, branding,
 * or snapshot tokens.
 *
 * @experimental This API may change in future versions.
 *
 * @remarks
 * Currently async because the underlying `resolvePolicyDecision` computes
 * a SHA-256 fingerprint (via `crypto.subtle`) that this function discards.
 * There are no fetch calls. A future version will expose a sync policy
 * matcher from `@c15t/schema` to make this fully synchronous.
 *
 * @example
 * ```ts
 * import { resolveConsent } from '@c15t/backend/edge';
 *
 * export async function middleware(request: Request) {
 *   const consent = await resolveConsent(request, {
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
export async function resolveConsent(
	request: Request,
	options: C15TConsentResolverOptions,
	logger?: Logger
): Promise<ResolvedConsent> {
	const location = await getLocation(request, options);
	const jurisdiction = getJurisdiction(location, options);
	const gpc = request.headers.get('sec-gpc') === '1';

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
			});

	if (hasExplicitPolicyPack && !isExplicitEmptyPolicyPack && !policyDecision) {
		logger?.warn('Policy packs configured but no policy matched', {
			country: location.countryCode,
			region: location.regionCode,
		});
	}

	const resolvedPolicy = hasExplicitPolicyPack
		? (policyDecision?.policy ?? resolveNoPolicyFallback())
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
