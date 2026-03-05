import { describe, expect, it } from 'vitest';
import {
	applyPolicyPurposeAllowlist,
	applyPolicyScopeForRuntimeGating,
	filterConsentCategoriesByPolicy,
	getEffectivePolicy,
	validateUIAgainstPolicy,
} from '../policy';

describe('getEffectivePolicy', () => {
	it('returns undefined when init data has no policy', () => {
		expect(getEffectivePolicy(undefined)).toBeUndefined();
	});
});

describe('validateUIAgainstPolicy', () => {
	it('returns violations for disallowed actions and mode mismatches', () => {
		const issues = validateUIAgainstPolicy({
			policy: {
				id: 'policy_1',
				model: 'opt-in',
				ui: {
					mode: 'banner',
					banner: {
						allowedActions: ['accept', 'reject'],
					},
				},
			},
			state: {
				mode: 'dialog',
				actions: ['accept', 'customize'],
			},
		});

		expect(issues).toHaveLength(1);
		expect(issues[0]?.code).toBe('mode_mismatch');
	});

	it('returns violations when action order/layout do not match policy', () => {
		const issues = validateUIAgainstPolicy({
			policy: {
				id: 'policy_2',
				model: 'opt-in',
				ui: {
					banner: {
						actionOrder: ['accept', 'reject', 'customize'],
						actionLayout: 'inline',
					},
				},
			},
			state: {
				mode: 'banner',
				actions: ['reject', 'accept', 'customize'],
				layout: 'split',
			},
		});

		expect(issues).toHaveLength(2);
		expect(issues[0]?.code).toBe('action_order_mismatch');
		expect(issues[1]?.code).toBe('layout_mismatch');
	});

	it('returns violation when UI profile does not match policy', () => {
		const issues = validateUIAgainstPolicy({
			policy: {
				id: 'policy_3',
				model: 'opt-in',
				ui: {
					banner: {
						uiProfile: 'balanced',
					},
				},
			},
			state: {
				mode: 'banner',
				actions: ['accept', 'customize'],
				uiProfile: 'compact',
			},
		});

		expect(issues).toHaveLength(1);
		expect(issues[0]?.code).toBe('ui_profile_mismatch');
	});
});

describe('applyPolicyPurposeAllowlist', () => {
	it('returns unchanged preferences when no allowlist is provided', () => {
		const preferences = {
			necessary: true,
			marketing: true,
		};

		expect(applyPolicyPurposeAllowlist(preferences, undefined)).toEqual(
			preferences
		);
	});

	it('forces non-allowlisted preference keys to false', () => {
		const preferences = {
			necessary: true,
			marketing: true,
			measurement: true,
			functionality: true,
			experience: false,
		};

		expect(
			applyPolicyPurposeAllowlist(preferences, [
				'necessary',
				'measurement',
				'marketing',
			])
		).toEqual({
			necessary: true,
			marketing: true,
			measurement: true,
			functionality: false,
			experience: false,
		});
	});

	it('returns unchanged preferences when allowlist includes wildcard', () => {
		const preferences = {
			necessary: true,
			marketing: true,
			measurement: true,
			functionality: true,
			experience: false,
		};

		expect(applyPolicyPurposeAllowlist(preferences, ['*'])).toEqual(
			preferences
		);
	});
});

describe('filterConsentCategoriesByPolicy', () => {
	it('returns unchanged categories when no allowlist is provided', () => {
		expect(
			filterConsentCategoriesByPolicy(['necessary', 'measurement'], undefined)
		).toEqual(['necessary', 'measurement']);
	});

	it('filters categories to policy purpose scope', () => {
		expect(
			filterConsentCategoriesByPolicy(
				['necessary', 'measurement', 'experience', 'marketing'],
				['necessary', 'measurement']
			)
		).toEqual(['necessary', 'measurement']);
	});

	it('keeps necessary even when missing from input categories', () => {
		expect(
			filterConsentCategoriesByPolicy(['marketing'], ['marketing'])
		).toEqual(['necessary', 'marketing']);
	});

	it('does not filter when wildcard scope is used', () => {
		expect(
			filterConsentCategoriesByPolicy(
				['necessary', 'measurement', 'experience', 'marketing'],
				['*']
			)
		).toEqual(['necessary', 'measurement', 'experience', 'marketing']);
	});
});

describe('applyPolicyScopeForRuntimeGating', () => {
	it('returns unchanged consents when no allowlist is provided', () => {
		const consents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: true,
		};

		expect(applyPolicyScopeForRuntimeGating(consents, undefined)).toEqual(
			consents
		);
	});

	it('treats out-of-policy categories as granted for runtime gating', () => {
		const consents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: true,
		};

		expect(
			applyPolicyScopeForRuntimeGating(
				consents,
				['necessary', 'measurement'],
				'unmanaged'
			)
		).toEqual({
			necessary: true,
			functionality: true,
			experience: true,
			marketing: true,
			measurement: true,
		});
	});

	it('does not modify consents for wildcard scope', () => {
		const consents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: true,
		};

		expect(
			applyPolicyScopeForRuntimeGating(consents, ['*'], 'unmanaged')
		).toEqual(consents);
	});

	it('does not grant out-of-scope categories in strict mode', () => {
		const consents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: true,
		};

		expect(
			applyPolicyScopeForRuntimeGating(
				consents,
				['necessary', 'measurement'],
				'strict'
			)
		).toEqual(consents);
	});
});
