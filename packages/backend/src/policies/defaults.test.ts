import { describe, expect, it } from 'vitest';
import { policyPackPresets } from './defaults';

describe('policyPackPresets templates', () => {
	it('returns europe opt-in and iab templates', () => {
		const optIn = policyPackPresets.europeOptIn();
		const iab = policyPackPresets.europeIab();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(iab.consent?.model).toBe('iab');
		expect(iab.match.countries).toEqual([
			'AT',
			'BE',
			'BG',
			'HR',
			'CY',
			'CZ',
			'DK',
			'EE',
			'FI',
			'FR',
			'DE',
			'GR',
			'HU',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MT',
			'NL',
			'PL',
			'PT',
			'RO',
			'SK',
			'SI',
			'ES',
			'SE',
			'IS',
			'LI',
			'NO',
			'GB',
		]);
	});

	it('returns california opt-in and opt-out templates', () => {
		const optIn = policyPackPresets.californiaOptIn();
		const optOut = policyPackPresets.californiaOptOut();

		expect(optIn.consent?.model).toBe('opt-in');
		expect(optOut.consent?.model).toBe('opt-out');
		expect(optIn.match.regions).toEqual([{ country: 'US', region: 'CA' }]);
		expect(optIn.ui?.banner?.uiProfile).toBe('compact');
		expect(optOut.ui?.mode).toBe('none');
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
	it('supports composing starter packs from the remaining presets', () => {
		const pack = [
			policyPackPresets.europeOptIn(),
			policyPackPresets.californiaOptOut(),
			policyPackPresets.worldNoBanner(),
		];

		expect(pack.map((policy) => policy.id)).toEqual([
			'europe_opt_in',
			'california_opt_out',
			'world_no_banner',
		]);
	});
});
