import { describe, expect, it } from 'vitest';
import { showConsentBanner } from '../show-consent-banner';

describe('showConsentBanner', () => {
	describe('location detection', () => {
		it('should detect country code from Cloudflare headers', () => {
			const headers = {
				get: (name: string) => (name === 'cf-ipcountry' ? 'DE' : null),
			};

			const result = showConsentBanner(headers);
			expect(result.location.countryCode).toBe('DE');
		});

		it('should detect country code from Vercel headers', () => {
			const headers = {
				get: (name: string) => (name === 'x-vercel-ip-country' ? 'FR' : null),
			};

			const result = showConsentBanner(headers);
			expect(result.location.countryCode).toBe('FR');
		});

		it('should detect country code from AWS CloudFront headers', () => {
			const headers = {
				get: (name: string) => (name === 'x-amz-cf-ipcountry' ? 'GB' : null),
			};

			const result = showConsentBanner(headers);
			expect(result.location.countryCode).toBe('GB');
		});

		it('should detect country code from generic headers', () => {
			const headers = {
				get: (name: string) => (name === 'x-country-code' ? 'US' : null),
			};

			const result = showConsentBanner(headers);
			expect(result.location.countryCode).toBe('US');
		});

		it('should detect region code from Vercel headers', () => {
			const headers = {
				get: (name: string) =>
					name === 'x-vercel-ip-country-region' ? 'CA' : null,
			};

			const result = showConsentBanner(headers);
			expect(result.location.regionCode).toBe('CA');
		});

		it('should detect region code from generic headers', () => {
			const headers = {
				get: (name: string) => (name === 'x-region-code' ? 'NY' : null),
			};

			const result = showConsentBanner(headers);
			expect(result.location.regionCode).toBe('NY');
		});

		it('should handle missing location headers', () => {
			const headers = {
				get: () => null,
			};

			const result = showConsentBanner(headers);
			expect(result.location).toEqual({
				countryCode: null,
				regionCode: null,
			});
		});
	});

	describe('jurisdiction detection', () => {
		it('should show banner for GDPR jurisdictions', () => {
			const headers = {
				get: (name: string) => (name === 'cf-ipcountry' ? 'DE' : null),
			};

			const result = showConsentBanner(headers);
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdiction: {
					code: 'GDPR',
					message: 'GDPR or equivalent regulations require a cookie banner.',
				},
				location: {
					countryCode: 'DE',
					regionCode: null,
				},
			});
		});

		it('should not show banner for non-regulated jurisdictions', () => {
			const headers = {
				get: (name: string) => (name === 'cf-ipcountry' ? 'US' : null),
			};

			const result = showConsentBanner(headers);
			expect(result).toEqual({
				showConsentBanner: false,
				jurisdiction: {
					code: 'NONE',
					message: 'No specific requirements',
				},
				location: {
					countryCode: 'US',
					regionCode: null,
				},
			});
		});
	});
});
