import { describe, expect, it } from 'vitest';
import {
	inspectPolicies,
	resolvePolicyDecision,
	validatePolicies,
} from './policy';

describe('resolvePolicyDecision', () => {
	it('matches with precedence region > country > jurisdiction > default', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'default',
					match: { isDefault: true },
					consent: { model: 'opt-in' },
				},
				{
					id: 'jurisdiction',
					match: { jurisdictions: ['CCPA'] },
					consent: { model: 'opt-out' },
				},
				{
					id: 'country',
					match: { countries: ['US'] },
					consent: { model: 'opt-out' },
				},
				{
					id: 'region',
					match: { regions: [{ country: 'US', region: 'CA' }] },
					consent: { model: 'none' },
				},
			],
			countryCode: 'us',
			regionCode: 'US-CA',
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.id).toBe('region');
		expect(result?.matchedBy).toBe('region');
		expect(result?.policy.model).toBe('none');
		expect(result?.fingerprint).toHaveLength(64);
	});

	it('returns default policy when no specific match exists', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'default',
					match: { isDefault: true },
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.id).toBe('default');
		expect(result?.matchedBy).toBe('default');
		expect(result?.policy.consent?.scopeMode).toBe('unmanaged');
	});

	it('resolves iab model when a matching policy defines it', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'gdpr_iab',
					match: { jurisdictions: ['GDPR'] },
					consent: { model: 'iab' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.id).toBe('gdpr_iab');
		expect(result?.policy.model).toBe('iab');
		expect(result?.policy.consent?.categories).toEqual(['*']);
		expect(result?.matchedBy).toBe('jurisdiction');
	});

	it('normalizes iab categories to wildcard even when specific IDs are configured', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'gdpr_iab',
					match: { jurisdictions: ['GDPR'] },
					consent: { model: 'iab', categories: ['measurement'] },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.consent?.categories).toEqual(['*']);
	});

	it('preserves strict scope mode when configured', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'strict_policy',
					match: { countries: ['US'] },
					consent: {
						model: 'opt-in',
						scopeMode: 'strict',
						categories: ['necessary', 'measurement'],
					},
				},
			],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.consent?.scopeMode).toBe('strict');
	});

	it('filters preselected categories to the configured policy scope', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'policy_uk',
					match: { countries: ['GB'] },
					consent: {
						model: 'opt-in',
						categories: ['necessary', 'functionality'],
						preselectedCategories: ['functionality', 'marketing'],
					},
				},
			],
			countryCode: 'GB',
			regionCode: null,
			jurisdiction: 'UK_GDPR',
		});

		expect(result?.policy.consent?.categories).toEqual([
			'necessary',
			'functionality',
		]);
		expect(result?.policy.consent?.preselectedCategories).toEqual([
			'functionality',
		]);
	});

	it('normalizes UI action order and primary action against allowed actions', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'policy_ui',
					match: { countries: ['US'] },
					consent: { model: 'opt-in' },
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryAction: 'customize',
							actionOrder: ['customize', 'reject', 'accept', 'reject'],
							actionLayout: 'inline',
							uiProfile: 'balanced',
							scrollLock: true,
						},
					},
				},
			],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.ui?.banner?.allowedActions).toEqual([
			'accept',
			'reject',
		]);
		expect(result?.policy.ui?.banner?.actionOrder).toEqual([
			'reject',
			'accept',
		]);
		expect(result?.policy.ui?.banner?.primaryAction).toBe('accept');
		expect(result?.policy.ui?.banner?.actionLayout).toBe('inline');
		expect(result?.policy.ui?.banner?.uiProfile).toBe('balanced');
		expect(result?.policy.ui?.banner?.scrollLock).toBe(true);
	});

	it('keeps banner and dialog actions isolated without cross-surface fallback', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'policy_surface_split',
					match: { countries: ['GB'] },
					consent: { model: 'opt-in' },
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'customize'],
							primaryAction: 'customize',
							actionOrder: ['customize', 'accept'],
							actionLayout: 'inline',
							uiProfile: 'balanced',
						},
						dialog: {
							allowedActions: ['accept', 'reject', 'customize'],
							primaryAction: 'reject',
							actionOrder: ['reject', 'accept', 'customize'],
							actionLayout: 'split',
							uiProfile: 'strict',
						},
					},
				},
			],
			countryCode: 'GB',
			regionCode: null,
			jurisdiction: 'UK_GDPR',
		});

		expect(result?.policy.ui?.banner?.allowedActions).toEqual([
			'accept',
			'customize',
		]);
		expect(result?.policy.ui?.dialog?.allowedActions).toEqual([
			'accept',
			'reject',
			'customize',
		]);
		expect(result?.policy.ui?.dialog?.primaryAction).toBe('reject');
		expect(result?.policy.ui?.dialog?.uiProfile).toBe('strict');
	});

	it('does not infer dialog config from banner config', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'policy_banner_only',
					match: { countries: ['US'] },
					consent: { model: 'opt-out' },
					ui: {
						mode: 'dialog',
						banner: {
							allowedActions: ['accept', 'reject'],
						},
					},
				},
			],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.ui?.banner?.allowedActions).toEqual([
			'accept',
			'reject',
		]);
		expect(result?.policy.ui?.dialog).toBeUndefined();
	});
});

describe('validatePolicies', () => {
	it('throws when multiple defaults are configured', () => {
		expect(() =>
			validatePolicies([
				{ id: 'a', match: { isDefault: true } },
				{ id: 'b', match: { isDefault: true } },
			])
		).toThrow('Only one default policy is allowed');
	});

	it('throws when policy model is iab but top-level IAB is not enabled', () => {
		expect(() =>
			validatePolicies(
				[
					{
						id: 'gdpr_iab',
						match: { jurisdictions: ['GDPR'] },
						consent: { model: 'iab' },
					},
				],
				{ iabEnabled: false }
			)
		).toThrow(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	});

	it('allows policy model iab when top-level IAB is enabled', () => {
		expect(() =>
			validatePolicies(
				[
					{
						id: 'gdpr_iab',
						match: { jurisdictions: ['GDPR'] },
						consent: { model: 'iab' },
					},
				],
				{ iabEnabled: true }
			)
		).not.toThrow();
	});

	it('throws when iab policy defines ui overrides', () => {
		expect(() =>
			validatePolicies(
				[
					{
						id: 'gdpr_iab',
						match: { jurisdictions: ['GDPR'] },
						consent: { model: 'iab' },
						ui: {
							mode: 'banner',
							banner: {
								allowedActions: ['accept', 'reject', 'customize'],
							},
						},
					},
				],
				{ iabEnabled: true }
			)
		).toThrow(
			'Policy \'gdpr_iab\' uses consent.model="iab" and cannot define ui.* overrides. IAB banner/dialog controls are fixed by TCF mode.'
		);
	});

	it('throws when policy IDs are duplicated', () => {
		expect(() =>
			validatePolicies([
				{ id: 'dup', match: { countries: ['US'] } },
				{ id: 'dup', match: { countries: ['GB'] } },
			])
		).toThrow(
			"Policy IDs must be unique. Duplicate id 'dup' found at indexes 0 and 1."
		);
	});

	it('throws when policy has no matcher and is not default', () => {
		expect(() => validatePolicies([{ id: 'no_match', match: {} }])).toThrow(
			"Policy 'no_match' has no matcher. Add countries, regions, jurisdictions, or set match.isDefault=true."
		);
	});
});

describe('inspectPolicies', () => {
	it('warns when no default policy is configured', () => {
		const result = inspectPolicies([
			{
				id: 'country_only',
				match: { countries: ['US'] },
			},
		]);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toContain(
			'No default policy configured. Requests that do not match region/country/jurisdiction will have no active policy.'
		);
	});

	it('warns about overlapping matchers and mixed default matchers', () => {
		const result = inspectPolicies([
			{
				id: 'policy_a',
				match: {
					countries: ['US'],
					regions: [{ country: 'US', region: 'CA' }],
				},
			},
			{
				id: 'policy_b',
				match: {
					countries: ['US'],
					regions: [{ country: 'US', region: 'CA' }],
					jurisdictions: ['CCPA'],
				},
			},
			{
				id: 'policy_default',
				match: { isDefault: true, countries: ['DE'] },
			},
			{
				id: 'policy_jurisdiction_overlap',
				match: { jurisdictions: ['CCPA'] },
			},
		]);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toContain(
			"Country matcher 'US' appears in multiple policies ('policy_a' and 'policy_b'). First match wins by array order."
		);
		expect(result.warnings).toContain(
			"Region matcher 'US-CA' appears in multiple policies ('policy_a' and 'policy_b'). First match wins by array order."
		);
		expect(result.warnings).toContain(
			"Jurisdiction matcher 'CCPA' appears in multiple policies ('policy_b' and 'policy_jurisdiction_overlap'). First match wins by array order."
		);
		expect(result.warnings).toContain(
			"Policy 'policy_default' is marked as default and also defines explicit matchers. Explicit matchers are ignored for default resolution."
		);
	});
});
