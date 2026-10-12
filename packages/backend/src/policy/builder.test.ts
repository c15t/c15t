import { inspectPolicyRules } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import { policyBuilder, buildPolicyRule, composePacks } from './builder';

describe('canonical policy builder', () => {
	it('normalizes geography without mixing behavior and presentation', () => {
		const rule = buildPolicyRule({
			countries: [' us ', 'US'],
			id: 'ca',
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'notice',
			regions: [{ country: 'us', region: 'ca' }],
		});
		expect(rule.match).toEqual({
			countries: ['US'],
			regions: [{ country: 'US', region: 'CA' }],
		});
		expect(rule).not.toHaveProperty('ui');
		expect(inspectPolicyRules([rule]).errors).toEqual([]);
	});
	it('preserves invalid behavior so validation rejects it', () => {
		expect(
			inspectPolicyRules([
				buildPolicyRule({ id: 'invalid', model: 'opt-in', prompt: 'notice' }),
			]).errors.length
		).toBeGreaterThan(0);
	});
	it('appends only an explicit default and strips its geographic restrictions', () => {
		const result = policyBuilder.createPackWithDefault(
			[
				{
					countries: ['DE'],
					id: 'regional',
					model: 'opt-in',
					prompt: 'choice',
				},
			],
			{
				countries: ['US'],
				fallback: true,
				id: 'default',
				model: 'opt-out',
				prompt: 'none',
			}
		);
		expect(result.map((rule) => rule.id)).toEqual(['regional', 'default']);
		expect(result[1]?.match).toEqual({ isDefault: true });
	});
	it('retains an existing default and preserves first-match order', () => {
		const result = policyBuilder.createPackWithDefault(
			[{ id: 'first', isDefault: true, model: 'opt-in', prompt: 'choice' }],
			{ id: 'unused', model: 'opt-out', prompt: 'none' }
		);
		expect(result).toHaveLength(1);
		expect(composePacks(result, result)).toEqual(result);
	});
});
