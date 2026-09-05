/**
 * BRIDGE helpers kept for adapters that still import them from
 * `@c15t/core/consent-record`. They are not part of the v3 model and are
 * removed once the Vue adapter reads `snapshot.policyRule.scope`.
 */
import type { InitOutput } from '@c15t/schema/types';

import { CONSENT_CATEGORIES } from './types';
import type { CONSENT_CATEGORY } from './types';

/**
 * BRIDGE: categories a preference form may show for an init payload.
 *
 * @deprecated Read `snapshot.policyRule.scope` instead.
 */
export const getConsentAvailableCategories =
	function getConsentAvailableCategories(
		init: InitOutput | null | undefined,
		configuredCategories: readonly CONSENT_CATEGORY[] = CONSENT_CATEGORIES
	): CONSENT_CATEGORY[] {
		const knownCategories = new Set<CONSENT_CATEGORY>(CONSENT_CATEGORIES);
		const baseSource =
			configuredCategories.length > 0
				? configuredCategories
				: CONSENT_CATEGORIES;
		const base = [...new Set(baseSource)].filter(
			(category): category is CONSENT_CATEGORY =>
				category !== 'necessary' && knownCategories.has(category)
		);
		const policyCategories = init?.policy?.consent?.categories ?? [];
		const policyOptional = policyCategories.filter(
			(category): category is CONSENT_CATEGORY =>
				category !== '*' &&
				(category as string) !== 'necessary' &&
				knownCategories.has(category as CONSENT_CATEGORY)
		);

		let list: CONSENT_CATEGORY[] = [...base];
		if (!policyCategories.includes('*') && policyOptional.length > 0) {
			const allowed = new Set(policyOptional);
			list = list.filter((category) => allowed.has(category));
		}

		list.unshift('necessary');
		return list;
	};

/**
 * BRIDGE: the pre-#1025 policy-agnostic record shape the Vue adapter still
 * builds for its context.
 *
 * @deprecated Read `snapshot.explicitChoice` instead.
 */
export interface Consent {
	/** Per-policy acknowledgements, keyed by `policyId`. */
	policies: Record<string, { fingerprint: string; timestamp: string }>;
	/** Categories granted or denied explicitly. Absent means no choice yet. */
	categories: {
		[key in CONSENT_CATEGORY]?: boolean;
	};
}
