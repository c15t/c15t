import type { ConsentPresentation } from '../packages/core/src/libs/policy-actions';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '../packages/schema/src/types';
import type { PolicyRule } from '../packages/schema/src/types';

export const storybookPolicy: PolicyRule = {
	categories: ['functionality', 'measurement', 'experience', 'marketing'],
	id: 'storybook',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

export const storybookIABPolicy: PolicyRule = {
	...storybookPolicy,
	id: 'storybook-iab',
	model: 'iab',
};

export const storybookPresentation: ConsentPresentation = {
	preferences: {
		direction: 'row',
		layout: [['reject', 'accept'], 'save'],
		primaryActions: ['reject', 'accept'],
		scrollLock: false,
		uiProfile: 'compact',
	},
	prompt: {
		direction: 'row',
		layout: [['reject', 'accept'], 'customize'],
		primaryActions: ['reject', 'accept'],
		scrollLock: false,
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
