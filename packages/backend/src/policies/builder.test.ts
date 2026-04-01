import { describe, expect, it } from 'vitest';
import {
	buildPolicyConfig,
	buildPolicyPack,
	buildPolicyPackWithDefault,
	composePacks,
	policyBuilder,
} from './builder';

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
				primaryActions: ['reject'],
				layout: [['reject', 'accept']],
				direction: 'row',
				uiProfile: 'balanced',
				scrollLock: true,
			},
		});

		expect(policy).toEqual({
			id: 'policy_us',
			match: {
				countries: ['US'],
			},
			i18n: undefined,
			consent: {
				model: 'opt-out',
				expiryDays: 180,
				scopeMode: undefined,
				categories: ['necessary', 'marketing'],
				preselectedCategories: undefined,
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryActions: ['reject'],
					layout: [['reject', 'accept']],
					direction: 'row',
					uiProfile: 'balanced',
					scrollLock: true,
				},
			},
			proof: undefined,
		});
	});

	it('supports region and country with default matcher', () => {
		const policy = buildPolicyConfig({
			id: 'policy_mixed',
			regions: [{ country: 'us', region: 'ca' }],
			countries: ['de'],
			isDefault: true,
			model: 'opt-in',
		});

		expect(policy.match).toEqual({
			isDefault: true,
			regions: [{ country: 'US', region: 'CA' }],
			countries: ['DE'],
		});
	});

	it('keeps preselected categories separate from scoped categories', () => {
		const policy = buildPolicyConfig({
			id: 'policy_uk',
			categories: ['necessary', 'functionality', 'measurement'],
			preselectedCategories: ['functionality', 'measurement'],
		});

		expect(policy.consent?.categories).toEqual([
			'necessary',
			'functionality',
			'measurement',
		]);
		expect(policy.consent?.preselectedCategories).toEqual([
			'functionality',
			'measurement',
		]);
	});

	it('omits empty categories and preselected categories', () => {
		const policy = buildPolicyConfig({
			id: 'policy_empty',
			categories: [],
			preselectedCategories: [],
		});

		expect(policy.consent).toBeUndefined();
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

	it('appends a default fallback policy when none is provided', () => {
		const pack = buildPolicyPackWithDefault([
			{ id: 'policy_ca', regions: [{ country: 'US', region: 'CA' }] },
		]);

		expect(pack).toHaveLength(2);
		expect(pack[1]?.match.isDefault).toBe(true);
		expect(pack[1]?.consent?.model).toBe('none');
		expect(pack[1]?.ui?.mode).toBe('none');
	});

	it('uses a custom default fallback policy input when provided', () => {
		const pack = buildPolicyPackWithDefault(
			[{ id: 'policy_fr', countries: ['FR'], model: 'opt-in' }],
			{
				id: 'policy_custom_default',
				name: 'Custom Default',
				countries: ['DE'],
				model: 'opt-out',
				uiMode: 'dialog',
			}
		);

		expect(pack).toHaveLength(2);
		expect(pack[1]?.id).toBe('policy_custom_default');
		expect(pack[1]?.match.isDefault).toBe(true);
		expect(pack[1]?.match.countries).toBeUndefined();
		expect(pack[1]?.consent?.model).toBe('opt-out');
		expect(pack[1]?.ui?.mode).toBe('dialog');
	});

	it('exposes composePacks on object helpers', () => {
		expect(policyBuilder.composePacks).toBe(composePacks);
	});

	it('exposes object helpers', () => {
		const single = policyBuilder.create({ id: 'one', countries: ['DE'] });
		const many = policyBuilder.createPack([{ id: 'two', countries: ['FR'] }]);
		const withDefault = policyBuilder.createPackWithDefault([
			{ id: 'three', countries: ['US'] },
		]);
		expect(single.match.countries).toEqual(['DE']);
		expect(many[0]?.id).toBe('two');
		expect(withDefault.at(-1)?.match.isDefault).toBe(true);
	});
});

describe('composePacks', () => {
	it('merges multiple packs preserving order', () => {
		const pack = composePacks(
			[buildPolicyConfig({ id: 'eu', countries: ['DE'] })],
			[
				buildPolicyConfig({
					id: 'ca',
					regions: [{ country: 'US', region: 'CA' }],
				}),
			],
			[
				buildPolicyConfig({
					id: 'default',
					isDefault: true,
					model: 'none',
					uiMode: 'none',
				}),
			]
		);

		expect(pack.map((p) => p.id)).toEqual(['eu', 'ca', 'default']);
	});

	it('deduplicates by id keeping first occurrence', () => {
		const pack = composePacks(
			[buildPolicyConfig({ id: 'eu', countries: ['DE'], model: 'opt-in' })],
			[buildPolicyConfig({ id: 'eu', countries: ['FR'], model: 'opt-out' })]
		);

		expect(pack).toHaveLength(1);
		expect(pack[0]?.match.countries).toEqual(['DE']);
	});
});
