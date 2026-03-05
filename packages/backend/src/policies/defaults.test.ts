import { describe, expect, it } from 'vitest';
import { policyDefaults } from './defaults';

describe('policyDefaults templates', () => {
	it('returns europe opt-in and iab templates', () => {
		const optIn = policyDefaults.europeOptInBanner();
		const iab = policyDefaults.europeIabBanner();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(iab.consent?.model).toBe('iab');
		expect(iab.match.jurisdictions).toEqual(['GDPR', 'UK_GDPR']);
	});

	it('returns california opt-in and opt-out templates', () => {
		const optIn = policyDefaults.californiaOptInBanner();
		const optOut = policyDefaults.californiaOptOutBanner();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(optOut.consent?.model).toBe('opt-out');
		expect(optIn.match.regions).toEqual([{ country: 'US', region: 'CA' }]);
		expect(optIn.ui?.banner?.uiProfile).toBe('balanced');
		expect(optOut.ui?.banner?.uiProfile).toBe('balanced');
	});

	it('returns world no-banner default template', () => {
		const policy = policyDefaults.worldNoBanner();
		expect(policy.consent?.model).toBe('none');
		expect(policy.ui?.mode).toBe('none');
		expect(policy.match.isDefault).toBe(true);
	});
});

describe('policyDefaults packs', () => {
	it('returns legacy-compatible defaults', () => {
		const pack = policyDefaults.legacyCompatiblePack();
		expect(pack.map((policy) => policy.id)).toEqual([
			'policy_default_california_opt_out',
			'policy_default_europe_opt_in',
			'policy_default_regulated_opt_in',
			'policy_default_regulated_opt_out',
			'policy_default_world_no_banner',
		]);
	});

	it('exposes legacy fallback templates', () => {
		expect(
			policyDefaults.legacyJurisdictionOptInFallback().consent?.model
		).toBe('opt-in');
		expect(
			policyDefaults.legacyJurisdictionOptInFallback().ui?.banner?.uiProfile
		).toBe('balanced');
		expect(
			policyDefaults.legacyJurisdictionOptOutFallback().consent?.model
		).toBe('opt-out');
		expect(
			policyDefaults.legacyJurisdictionOptOutFallback().ui?.banner?.uiProfile
		).toBe('strict');
	});
});
