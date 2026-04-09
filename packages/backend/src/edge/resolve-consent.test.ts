import { describe, expect, it } from 'vitest';
import { unstable_resolveConsent } from './resolve-consent';

function makeRequest(headers: Record<string, string>): Request {
	return new Request('http://localhost/', { headers });
}

const policyPacks = [
	{
		id: 'eu_gdpr',
		match: { countries: ['DE', 'FR'] },
		consent: {
			model: 'opt-in' as const,
			categories: ['necessary', 'marketing', 'measurement', 'experience'],
		},
		ui: { mode: 'banner' as const },
	},
	{
		id: 'us_ca',
		match: { regions: [{ country: 'US', region: 'CA' }] },
		consent: {
			model: 'opt-out' as const,
			categories: ['necessary', 'marketing', 'measurement'],
			gpc: true,
		},
		ui: { mode: 'banner' as const },
	},
	{
		id: 'us_default',
		match: { isDefault: true },
		consent: {
			model: 'none' as const,
			categories: ['necessary', 'marketing', 'measurement'],
		},
		ui: { mode: 'none' as const },
	},
];

describe('unstable_resolveConsent', () => {
	it('is synchronous', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'DE' }),
			{
				policyPacks,
			}
		);

		// Not a Promise — direct value
		expect(result).not.toBeInstanceOf(Promise);
		expect(result.jurisdiction).toBe('GDPR');
	});

	it('resolves opt-in defaults for EU visitor', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'DE' }),
			{
				policyPacks,
			}
		);

		expect(result.jurisdiction).toBe('GDPR');
		expect(result.model).toBe('opt-in');
		expect(result.policyId).toBe('eu_gdpr');
		expect(result.showBanner).toBe(true);
		expect(result.defaults).toEqual({
			necessary: { granted: true, required: true },
			marketing: { granted: false, required: false },
			measurement: { granted: false, required: false },
			experience: { granted: false, required: false },
		});
	});

	it('resolves opt-out defaults for US-CA visitor', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'US', 'x-c15t-region': 'CA' }),
			{ policyPacks }
		);

		expect(result.jurisdiction).toBe('CCPA');
		expect(result.model).toBe('opt-out');
		expect(result.policyId).toBe('us_ca');
		expect(result.showBanner).toBe(true);
		expect(result.defaults).toEqual({
			necessary: { granted: true, required: true },
			marketing: { granted: true, required: false },
			measurement: { granted: true, required: false },
		});
	});

	it('resolves no-banner defaults for unmatched visitor with default policy', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'JP' }),
			{
				policyPacks,
			}
		);

		expect(result.model).toBe('none');
		expect(result.policyId).toBe('us_default');
		expect(result.showBanner).toBe(false);
		expect(result.defaults).toEqual({
			necessary: { granted: true, required: true },
			marketing: { granted: true, required: false },
			measurement: { granted: true, required: false },
		});
	});

	it('respects GPC signal for opt-out policies', () => {
		const result = unstable_resolveConsent(
			makeRequest({
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
				'sec-gpc': '1',
			}),
			{ policyPacks }
		);

		expect(result.gpc).toBe(true);
		expect(result.defaults.marketing).toEqual({
			granted: false,
			required: false,
		});
		expect(result.defaults.measurement).toEqual({
			granted: false,
			required: false,
		});
		expect(result.defaults.necessary).toEqual({
			granted: true,
			required: true,
		});
	});

	it('ignores GPC for opt-in policies', () => {
		const result = unstable_resolveConsent(
			makeRequest({
				'x-c15t-country': 'DE',
				'sec-gpc': '1',
			}),
			{ policyPacks }
		);

		expect(result.gpc).toBe(true);
		// GPC doesn't change opt-in defaults — they're already false
		expect(result.defaults.marketing).toEqual({
			granted: false,
			required: false,
		});
	});

	it('handles preselected categories in opt-in mode', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'DE' }),
			{
				policyPacks: [
					{
						id: 'eu_preselect',
						match: { countries: ['DE'] },
						consent: {
							model: 'opt-in',
							categories: ['necessary', 'marketing', 'measurement'],
							preselectedCategories: ['measurement'],
						},
						ui: { mode: 'banner' },
					},
				],
			}
		);

		expect(result.defaults).toEqual({
			necessary: { granted: true, required: true },
			marketing: { granted: false, required: false },
			measurement: { granted: true, required: false },
		});
	});

	it('returns no-banner fallback when no policies configured', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'DE' }),
			{}
		);

		expect(result.model).toBe('none');
		expect(result.showBanner).toBe(false);
		expect(result.policyId).toBe('no_banner');
	});

	it('returns no-banner fallback for explicit empty policyPacks', () => {
		const result = unstable_resolveConsent(
			makeRequest({ 'x-c15t-country': 'DE' }),
			{
				policyPacks: [],
			}
		);

		expect(result.model).toBe('none');
		expect(result.showBanner).toBe(false);
	});

	it('defaults to GDPR when geo-location is disabled', () => {
		const result = unstable_resolveConsent(makeRequest({}), {
			policyPacks,
			disableGeoLocation: true,
		});

		expect(result.jurisdiction).toBe('GDPR');
		expect(result.location).toEqual({
			countryCode: null,
			regionCode: null,
		});
	});

	it('reports location data', () => {
		const result = unstable_resolveConsent(
			makeRequest({
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
			}),
			{ policyPacks }
		);

		expect(result.location).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});
});
