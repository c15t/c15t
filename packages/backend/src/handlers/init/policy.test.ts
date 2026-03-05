import { describe, expect, it } from 'vitest';
import { resolvePolicyDecision, validatePolicies } from './policy';

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
		expect(result?.policy.consent?.purposeIds).toEqual(['*']);
		expect(result?.matchedBy).toBe('jurisdiction');
	});

	it('normalizes iab purposeIds to wildcard even when specific IDs are configured', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'gdpr_iab',
					match: { jurisdictions: ['GDPR'] },
					consent: { model: 'iab', purposeIds: ['measurement'] },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.consent?.purposeIds).toEqual(['*']);
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
						purposeIds: ['necessary', 'measurement'],
					},
				},
			],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.consent?.scopeMode).toBe('strict');
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
});
