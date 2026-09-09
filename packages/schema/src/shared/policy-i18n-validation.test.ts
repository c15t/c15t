import { describe, expect, it, vi } from 'vitest';

import { policyRulePresets } from './policy-rule-presets';
import { getTranslationsData, validateMessages } from './translations-runtime';

describe('stock policy message profiles', () => {
	it('accepts recommended policy presets without custom translations', () => {
		expect(
			validateMessages({
				policies: [
					policyRulePresets.australiaOptOut(),
					policyRulePresets.japanOptOut(),
				],
			}).errors
		).toEqual([]);
	});
	it.each(['default', 'preferences'])(
		'uses base translations for %s without a missing-profile warning',
		(messageProfile) => {
			const warn = vi.fn();
			const rule = {
				...policyRulePresets.australiaOptOut(),
				i18n: { messageProfile },
			};
			expect(validateMessages({ policies: [rule] }).errors).toEqual([]);
			const result = getTranslationsData('en', undefined, {
				logger: { warn },
				policyI18n: rule.i18n,
			});
			expect(result).toBeDefined();
			expect(warn).not.toHaveBeenCalled();
		}
	);
	it('still rejects unknown profiles', () => {
		const rule = {
			...policyRulePresets.australiaOptOut(),
			i18n: { messageProfile: 'typo' },
		};
		expect(validateMessages({ policies: [rule] }).errors).toContain(
			"Policy 'australia_opt_out' references missing i18n profile 'typo'."
		);
	});
	it('validates an explicitly configured stock-profile override', () => {
		const policies = [policyRulePresets.australiaOptOut()];
		expect(
			validateMessages({
				i18n: { messages: { preferences: { translations: {} } } },
				policies,
			}).errors
		).toContain(
			"Policy 'australia_opt_out' references i18n profile 'preferences' with no configured translations."
		);
		expect(
			validateMessages({
				i18n: { messages: { preferences: { translations: { en: {} } } } },
				policies,
			}).errors
		).toEqual([]);
	});
});
