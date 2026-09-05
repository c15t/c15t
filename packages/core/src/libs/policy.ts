import type { ConsentState } from '../consent/compliance';
import { allConsentNames } from '../consent/consent-types';
import type { AllConsentNames } from '../consent/consent-types';

const isConsentCategory = function isConsentCategory(
	value: string
): value is AllConsentNames {
	return allConsentNames.includes(value as AllConsentNames);
};

/**
 * Applies a policy purpose allowlist to a consent preference object.
 *
 * Any preference key not in `allowedPurposeIds` is forced to `false`.
 * This prevents backend allowlist enforcement errors when clients hold
 * additional consent keys (for example from IAB category mapping).
 * When `allowedPurposeIds` contains `*`, no filtering is applied. `necessary`
 * is always retained.
 */
export const applyPolicyPurposeAllowlist = function applyPolicyPurposeAllowlist<
	T extends Record<string, boolean>,
>(preferences: T, allowedPurposeIds?: string[]): T {
	if (
		!allowedPurposeIds ||
		allowedPurposeIds.length === 0 ||
		allowedPurposeIds.includes('*')
	) {
		return preferences;
	}

	const allowed = new Set(['necessary', ...allowedPurposeIds]);
	const next = {} as T;

	for (const [key, value] of Object.entries(preferences)) {
		next[key as keyof T] = (allowed.has(key) ? value : false) as T[keyof T];
	}

	return next;
};

/**
 * Strips preference keys that are outside the active policy allowlist.
 *
 * Use this for API payloads when the backend enforces strict purpose scope and
 * rejects unknown preference keys entirely. `necessary` is always retained to
 * stay aligned with `applyPolicyPurposeAllowlist()`.
 */
export const stripDisallowedPreferenceKeys =
	function stripDisallowedPreferenceKeys<T extends Record<string, boolean>>(
		preferences: T,
		allowedPurposeIds?: string[]
	): Partial<T> {
		if (
			!allowedPurposeIds ||
			allowedPurposeIds.length === 0 ||
			allowedPurposeIds.includes('*')
		) {
			return preferences;
		}

		const allowed = new Set(['necessary', ...allowedPurposeIds]);
		const next: Partial<T> = {};

		for (const [key, value] of Object.entries(preferences)) {
			if (allowed.has(key)) {
				next[key as keyof T] = value as T[keyof T];
			}
		}

		return next;
	};

/**
 * Filters consent categories against a policy purpose allowlist.
 *
 * When allowlist is active, only categories present in it are kept and
 * `necessary` is always retained.
 */
export const filterConsentCategoriesByPolicy =
	function filterConsentCategoriesByPolicy(
		categories: AllConsentNames[],
		allowedPurposeIds?: string[] | null
	): AllConsentNames[] {
		const uniqueCategories = Array.from(new Set(categories));

		if (
			!allowedPurposeIds ||
			allowedPurposeIds.length === 0 ||
			allowedPurposeIds.includes('*')
		) {
			return uniqueCategories;
		}

		const allowedCategories = new Set<AllConsentNames>([
			'necessary',
			...allowedPurposeIds.filter(isConsentCategory),
		]);
		const filtered = uniqueCategories.filter((category) =>
			allowedCategories.has(category)
		);

		if (!filtered.includes('necessary')) {
			filtered.unshift('necessary');
		}

		return filtered;
	};

/**
 * Applies policy scope to runtime gating behavior.
 *
 * Out-of-policy categories are treated as permissive by c15t runtime and are
 * therefore granted for gating decisions (scripts/iframes load normally).
 */
export const applyPolicyScopeForRuntimeGating =
	function applyPolicyScopeForRuntimeGating(
		consents: ConsentState,
		allowedPurposeIds?: string[] | null,
		scopeMode: 'strict' | 'permissive' | null = 'permissive'
	): ConsentState {
		if (scopeMode === 'strict') {
			return consents;
		}

		if (
			!allowedPurposeIds ||
			allowedPurposeIds.length === 0 ||
			allowedPurposeIds.includes('*')
		) {
			return consents;
		}

		const allowedCategories = new Set<AllConsentNames>([
			'necessary',
			...allowedPurposeIds.filter(isConsentCategory),
		]);
		const next = { ...consents };

		for (const category of allConsentNames) {
			if (!allowedCategories.has(category)) {
				next[category] = true;
			}
		}

		next.necessary = true;

		return next;
	};
