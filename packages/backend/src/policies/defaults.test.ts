import { describe, expect, it } from 'vitest';
import { policyPackPresets } from './defaults';

describe('policyPackPresets templates', () => {
	it('returns europe opt-in and iab templates', () => {
		const optIn = policyPackPresets.europeOptIn();
		const iab = policyPackPresets.europeIab();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(iab.consent?.model).toBe('iab');
		expect(iab.match.jurisdictions).toEqual(['GDPR', 'UK_GDPR']);
	});

	it('returns california opt-in and opt-out templates', () => {
		const optIn = policyPackPresets.californiaOptIn();
		const optOut = policyPackPresets.californiaOptOut();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(optOut.consent?.model).toBe('opt-out');
		expect(optIn.match.regions).toEqual([{ country: 'US', region: 'CA' }]);
		expect(optIn.ui?.banner?.uiProfile).toBe('compact');
		expect(optOut.ui?.banner?.uiProfile).toBe('compact');
	});

	it('returns quebec opt-in template', () => {
		const policy = policyPackPresets.quebecOptIn();

		expect(policy.consent?.model).toBe('opt-in');
		expect(policy.match.regions).toEqual([{ country: 'CA', region: 'QC' }]);
		expect(policy.ui?.banner?.uiProfile).toBe('compact');
	});

	it('returns world no-banner default template', () => {
		const policy = policyPackPresets.worldNoBanner();
		expect(policy.consent?.model).toBe('none');
		expect(policy.ui?.mode).toBe('none');
		expect(policy.match.isDefault).toBe(true);
	});
});

describe('policyPackPresets packs', () => {
	it('returns legacy-compatible defaults', () => {
		const pack = policyPackPresets.legacyCompatiblePack();
		expect(pack.map((policy) => policy.id)).toEqual([
			'policy_default_california_opt_out',
			'policy_default_europe_opt_in',
			'policy_default_regulated_opt_in',
			'policy_default_regulated_opt_out',
			'policy_default_world_no_banner',
		]);
	});

	it('exposes legacy fallback templates', () => {
		expect(policyPackPresets.legacyJurisdictionOptIn().consent?.model).toBe(
			'opt-in'
		);
		expect(
			policyPackPresets.legacyJurisdictionOptIn().ui?.banner?.uiProfile
		).toBe('balanced');
		expect(policyPackPresets.legacyJurisdictionOptOut().consent?.model).toBe(
			'opt-out'
		);
		expect(
			policyPackPresets.legacyJurisdictionOptOut().ui?.banner?.uiProfile
		).toBe('strict');
	});
});
