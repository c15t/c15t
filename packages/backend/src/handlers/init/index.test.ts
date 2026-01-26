import { baseTranslations } from '@c15t/translations';
import { describe, expect, it, vi } from 'vitest';
import type { C15TContext } from '~/types';
import { init } from './index';

// First, mock the oRPC handler
vi.mock('~/contracts', () => ({
	os: {
		init: {
			handler: (fn: typeof init) => fn,
		},
	},
}));

describe('Init Handler', () => {
	// Helper to create mock context with headers
	const createMockContext = (
		headers: Record<string, string>,
		advanced?: Partial<C15TContext['advanced']>
	) => {
		return {
			context: {
				headers: new Headers(headers),
				advanced: {
					...(advanced ?? {}),
				},
			},
		};
	};

	describe('Header extraction', () => {
		it('extracts country code from cf-ipcountry header', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'cf-ipcountry': 'DE' }));

			expect(result.location.countryCode).toBe('DE');
		});

		it('falls back to alternative country code headers', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext({ 'x-vercel-ip-country': 'FR' })
			);

			expect(result.location.countryCode).toBe('FR');
		});

		it('prioritizes cf-ipcountry over other headers when multiple are present', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext({
					'cf-ipcountry': 'DE',
					'x-vercel-ip-country': 'FR',
				})
			);

			expect(result.location.countryCode).toBe('DE');
		});

		it('extracts region code from headers', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext({
					'cf-ipcountry': 'US',
					'x-vercel-ip-country-region': 'CA',
				})
			);

			expect(result.location.countryCode).toBe('US');
			expect(result.location.regionCode).toBe('CA');
		});

		it('handles missing headers gracefully', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({}));

			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});

		it('handles case-insensitive header names', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'CF-IPCountry': 'GB' }));

			expect(result.location.countryCode).toBe('GB');
		});
	});

	describe('Integration and response structure', () => {
		it('returns properly structured response with all required fields', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'cf-ipcountry': 'DE' }));

			// Verify structure
			expect(result).toHaveProperty('jurisdiction');
			expect(result).toHaveProperty('location');
			expect(result).toHaveProperty('translations');
			expect(result).toHaveProperty('branding');

			// Verify types
			expect(typeof result.jurisdiction).toBe('string');
			expect(result.location.countryCode).toBe('DE');
			expect(
				typeof result.location.countryCode === 'string' ||
					result.location.countryCode === null
			).toBe(true);
			expect(
				typeof result.location.regionCode === 'string' ||
					result.location.regionCode === null
			).toBe(true);
			expect(typeof result.translations.language).toBe('string');
			expect(typeof result.translations.translations).toBe('object');
			expect(typeof result.branding).toBe('string');
		});

		it('integrates geo logic correctly for regulated countries', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'cf-ipcountry': 'DE' }));

			// DE is in the GDPR jurisdiction
			expect(result.jurisdiction).toBe('GDPR');
		});

		it('integrates geo logic correctly for non-regulated countries', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'cf-ipcountry': 'US' }));

			// US (without CCPA regions) is non-regulated
			expect(result.jurisdiction).toBe('NONE');
		});

		it('integrates translations correctly', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({}));

			expect(result.translations.translations).toStrictEqual(
				baseTranslations.en
			);
			expect(result.translations.language).toBe('en');
		});

		it('handles custom translations when provided', async () => {
			const customTranslations = {
				en: { cookieBanner: { title: 'Custom Title' } },
			};

			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({}, { customTranslations }));

			expect(result.translations.translations.cookieBanner.title).toBe(
				'Custom Title'
			);
		});

		it('maintains consistency between location and jurisdiction', async () => {
			// Test that the country code extracted matches the jurisdiction determination
			// @ts-expect-error test context is partially typed
			const result = await init(createMockContext({ 'cf-ipcountry': 'CH' }));

			expect(result.location.countryCode).toBe('CH');
			expect(result.jurisdiction).toBe('CH');
		});
	});

	describe('Geo location disabling', () => {
		it('forces GDPR jurisdiction and clears location when disableGeoLocation is true for regulated country', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' }, // Normally would be GDPR based on geo
					{ disableGeoLocation: true }
				)
			);

			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});

		it('forces GDPR jurisdiction and clears location when disableGeoLocation is true for non-regulated country', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'US' }, // Normally would be NONE
					{ disableGeoLocation: true }
				)
			);

			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});

		it('still provides translations when geo location is disabled', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' },
					{ disableGeoLocation: true }
				)
			);

			// Translations should still be provided
			expect(result.translations.translations).toStrictEqual(
				baseTranslations.en
			);
			expect(result.translations.language).toBe('en');
		});

		it('respects custom translations when geo location is disabled', async () => {
			const customTranslations = {
				en: { cookieBanner: { title: 'Custom Disabled Title' } },
			};

			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' },
					{ disableGeoLocation: true, customTranslations }
				)
			);

			expect(result.translations.translations.cookieBanner.title).toBe(
				'Custom Disabled Title'
			);
			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});

		it('ignores all geo headers when geo location is disabled', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{
						'cf-ipcountry': 'DE',
						'x-vercel-ip-country': 'FR',
						'x-vercel-ip-country-region': 'IDF',
					},
					{ disableGeoLocation: true }
				)
			);

			// Should ignore all geo headers
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
			expect(result.jurisdiction).toBe('GDPR');
		});

		it('applies normal geo logic when disableGeoLocation is false', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' },
					{ disableGeoLocation: false }
				)
			);

			// Should apply normal geo logic
			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBe('DE');
		});

		it('applies normal geo logic when disableGeoLocation is undefined', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' },
					{ disableGeoLocation: undefined }
				)
			);

			// Should apply normal geo logic when undefined
			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBe('DE');
		});

		it('maintains consistent response structure when geo is disabled', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{ 'cf-ipcountry': 'DE' },
					{ disableGeoLocation: true }
				)
			);

			// Verify the response has the same structure as normal responses
			expect(result).toHaveProperty('jurisdiction');
			expect(result).toHaveProperty('location');
			expect(result).toHaveProperty('translations');
			expect(result).toHaveProperty('branding');

			// Verify specific disabled values
			expect(typeof result.jurisdiction).toBe('string');
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
			expect(typeof result.translations.language).toBe('string');
			expect(typeof result.translations.translations).toBe('object');
			expect(typeof result.branding).toBe('string');
		});
	});

	describe('Edge cases and error handling', () => {
		it('handles malformed headers gracefully', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext({
					'cf-ipcountry': '', // Empty string
					'x-vercel-ip-country-region': '   ', // Whitespace
				})
			);

			// Should handle gracefully without throwing
			expect(result).toHaveProperty('jurisdiction');
			expect(result).toHaveProperty('location');
			expect(result).toHaveProperty('translations');
			expect(result).toHaveProperty('branding');
		});

		it('handles undefined context options gracefully', async () => {
			const contextWithoutOptions = {
				context: {
					headers: new Headers({ 'cf-ipcountry': 'DE' }),
					// No advanced options
				},
			};

			// @ts-expect-error test context is partially typed
			const result = await init(contextWithoutOptions);

			expect(result.translations.translations).toStrictEqual(
				baseTranslations.en
			);
		});

		it('handles malformed headers gracefully when geo is disabled', async () => {
			// @ts-expect-error test context is partially typed
			const result = await init(
				createMockContext(
					{
						'cf-ipcountry': '', // Empty string
						'x-vercel-ip-country-region': '   ', // Whitespace
					},
					{ disableGeoLocation: true }
				)
			);

			// Should handle gracefully and ignore malformed headers while forcing GDPR
			expect(result.jurisdiction).toBe('GDPR');
			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});
	});
});
