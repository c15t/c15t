import { describe, expect, it } from 'vitest';
import { buildPolicyConfig, buildPolicyPack, policyBuilder } from './builder';

describe('buildPolicyConfig', () => {
	it('builds a policy from country model and categories', () => {
		const policy = buildPolicyConfig({
			id: 'policy_us',
			countries: ['us', 'US'],
			model: 'opt-out',
			expiryDays: 180,
			categories: ['necessary', 'marketing', 'marketing'],
			uiMode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject', 'accept'],
				primaryAction: 'reject',
				actionOrder: ['reject', 'accept', 'reject'],
				actionLayout: 'inline',
				uiProfile: 'balanced',
			},
		});

		expect(policy).toEqual({
			id: 'policy_us',
			name: undefined,
			match: {
				countries: ['US'],
			},
			i18n: undefined,
			consent: {
				model: 'opt-out',
				expiryDays: 180,
				scopeMode: undefined,
				purposeIds: ['necessary', 'marketing'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'reject',
					actionOrder: ['reject', 'accept'],
					actionLayout: 'inline',
					uiProfile: 'balanced',
				},
			},
			proof: undefined,
		});
	});

	it('supports region and jurisdiction with default matcher', () => {
		const policy = buildPolicyConfig({
			id: 'policy_mixed',
			regions: [{ country: 'us', region: 'ca' }],
			jurisdictions: ['GDPR'],
			isDefault: true,
			model: 'opt-in',
		});

		expect(policy.match).toEqual({
			isDefault: true,
			regions: [{ country: 'US', region: 'CA' }],
			jurisdictions: ['GDPR'],
		});
	});

	it('uses purposeIds over categories when both are provided', () => {
		const policy = buildPolicyConfig({
			id: 'policy_categories',
			categories: ['marketing'],
			purposeIds: ['necessary'],
		});

		expect(policy.consent?.purposeIds).toEqual(['necessary']);
	});
});

describe('policyBuilder', () => {
	it('creates a pack from input entries', () => {
		const pack = buildPolicyPack([
			{ id: 'policy_ca', regions: [{ country: 'US', region: 'CA' }] },
			{ id: 'policy_default', isDefault: true, model: 'none', uiMode: 'none' },
		]);

		expect(pack).toHaveLength(2);
		expect(pack[0]?.id).toBe('policy_ca');
		expect(pack[1]?.match.isDefault).toBe(true);
	});

	it('exposes object helpers', () => {
		const single = policyBuilder.create({ id: 'one', countries: ['DE'] });
		const many = policyBuilder.createPack([{ id: 'two', countries: ['FR'] }]);
		expect(single.match.countries).toEqual(['DE']);
		expect(many[0]?.id).toBe('two');
	});
});
