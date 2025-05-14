import { baseTranslations } from '@c15t/translations';
import { describe, expect, it, vi } from 'vitest';
import { JurisdictionMessages } from '~/contracts/shared/jurisdiction.schema';
import { showConsentBanner } from './show-banner.handler';

// First, mock the oRPC handler
vi.mock('~/contracts', () => ({
	os: {
		consent: {
			showBanner: {
				handler: (fn: unknown) => fn, // Make the handler function directly callable for testing
			},
		},
	},
}));

describe('Show Consent Banner Handler', () => {
	// Helper to create mock context with headers
	const createMockContext = (headers: Record<string, string>) => {
		return {
			context: {
				headers: new Headers(headers),
			},
		};
	};

	describe('Header extraction', () => {
		it('extracts country code from cf-ipcountry header', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'DE' })
			);

			expect(result.location.countryCode).toBe('DE');
		});

		it('falls back to alternative country code headers', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'x-vercel-ip-country': 'FR' })
			);

			expect(result.location.countryCode).toBe('FR');
		});

		it('extracts region code from headers', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({
					'cf-ipcountry': 'US',
					'x-vercel-ip-country-region': 'CA',
				})
			);

			expect(result.location.countryCode).toBe('US');
			expect(result.location.regionCode).toBe('CA');
		});

		it('handles missing headers gracefully', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(createMockContext({}));

			expect(result.location.countryCode).toBeNull();
			expect(result.location.regionCode).toBeNull();
		});
	});

	describe('Jurisdiction determination', () => {
		it('identifies EU countries as GDPR', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'DE' })
			);

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdiction.code).toBe('GDPR');
			expect(result.jurisdiction.message).toBe(JurisdictionMessages.GDPR);
		});

		it('identifies UK as GDPR', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'GB' })
			);

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdiction.code).toBe('GDPR');
		});

		it('identifies other jurisdictions correctly', async () => {
			const cases = [
				{ country: 'CH', code: 'CH' },
				{ country: 'BR', code: 'BR' },
				{ country: 'CA', code: 'PIPEDA' },
				{ country: 'AU', code: 'AU' },
				{ country: 'JP', code: 'APPI' },
				{ country: 'KR', code: 'PIPA' },
			];

			for (const testCase of cases) {
				//@ts-expect-error
				const result = await showConsentBanner(
					createMockContext({ 'cf-ipcountry': testCase.country })
				);

				expect(result.showConsentBanner).toBe(true);
				expect(result.jurisdiction.code).toBe(testCase.code);

				expect(result.jurisdiction.message).toBe(
					JurisdictionMessages[
						testCase.code as keyof typeof JurisdictionMessages
					]
				);
			}
		});

		it('identifies non-regulated countries', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'US' })
			);

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdiction.code).toBe('NONE');
			expect(result.jurisdiction.message).toBe(JurisdictionMessages.NONE);
		});
	});

	describe('Translation handling', () => {
		it('returns default translations when no language is detected', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'DE' })
			);

			expect(result.translations).toEqual({
				translations: baseTranslations.en,
				language: 'en',
			});
		});

		it('returns translations for detected language', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'DE', 'accept-language': 'de-DE' })
			);

			expect(result.translations).toEqual({
				translations: baseTranslations.de,
				language: 'de',
			});
		});

		it('returns default translations when language is not supported', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({
					'cf-ipcountry': 'DE',
					'accept-language': 'foobar',
				})
			);

			expect(result.translations).toEqual({
				translations: baseTranslations.en,
				language: 'en',
			});
		});
	});

	describe('Response format', () => {
		it('returns properly structured response', async () => {
			//@ts-expect-error
			const result = await showConsentBanner(
				createMockContext({ 'cf-ipcountry': 'DE' })
			);

			expect(result).toEqual({
				showConsentBanner: true,
				jurisdiction: {
					code: 'GDPR',
					message: JurisdictionMessages.GDPR,
				},
				location: {
					countryCode: 'DE',
					regionCode: null,
				},
				translations: {
					translations: baseTranslations.en,
					language: 'en',
				},
			});
		});
	});
});
