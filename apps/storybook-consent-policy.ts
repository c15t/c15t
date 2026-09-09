import type { ConsentPresentation } from '../packages/core/src/libs/policy-actions';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	resolvePolicyRules,
} from '../packages/schema/src/types';
import type {
	PolicyRule,
	PolicyResolution,
} from '../packages/schema/src/types';

export const storybookPolicy: PolicyRule = {
	categories: ['functionality', 'measurement', 'experience', 'marketing'],
	id: 'storybook',
	match: { fallback: true, isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

export const storybookIABPolicy: PolicyRule = {
	...storybookPolicy,
	id: 'storybook-iab',
	model: 'iab',
};

/**
 * The storybook policy already resolved, for adapters whose provider can
 * take a prefetched resolution. Consent surfaces render only once a policy
 * is resolved, so a story that waits on an async `offline()` init paints
 * without its link, trigger, and widget for a tick; a prefetched resolution
 * makes the first paint authoritative, as server rendering does in an app.
 */
export const storybookPolicyResolution: PolicyResolution = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [storybookPolicy],
});

/**
 * Shared story presentation. The prompt keeps the resolver's non-blocking
 * default (a labelled region that never steals focus); the preference dialog
 * keeps its blocking default (backdrop, focus trap, scroll lock). Stories
 * that need a blocking banner pass `blocking` or the legacy `trapFocus`.
 */
export const storybookPresentation: ConsentPresentation = {
	preferences: {
		direction: 'row',
		layout: [['reject', 'accept'], 'save'],
		primaryActions: ['reject', 'accept'],
		uiProfile: 'compact',
	},
	prompt: {
		direction: 'row',
		layout: [['reject', 'accept'], 'customize'],
		primaryActions: ['reject', 'accept'],
		uiProfile: 'compact',
	},
};

/** Seed explicit fixture choices with their original confirmation metadata. */
export const seedStorybookChoice = (
	consents: Record<string, boolean>,
	policy: PolicyRule = storybookPolicy
): void => {
	const confirmedAt = Date.now();
	const basis = {
		fingerprint: createPolicyRuleFingerprints(normalizePolicyRule(policy))
			.choice,
		kind: 'choice-v1',
	};
	const categories = Object.fromEntries(
		Object.entries(consents)
			.filter(([category]) => category !== 'necessary')
			.map(([category, value]) => [category, { basis, confirmedAt, value }])
	);
	window.localStorage.setItem(
		'c15t',
		JSON.stringify({ categories, version: 3 })
	);
};

/** IAB comparison stories use the default modal presentation in every adapter. */
export const storybookIABPresentation: ConsentPresentation = {
	...storybookPresentation,
	preferences: { ...storybookPresentation.preferences, blocking: true },
	prompt: { ...storybookPresentation.prompt, blocking: true },
};
