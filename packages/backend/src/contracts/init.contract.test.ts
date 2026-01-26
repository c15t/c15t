import { baseTranslations } from '@c15t/translations';
import { describe, expect, it } from 'vitest';

import { initContract } from './init';

// Add custom tests specific to the show-banner contract
describe('Init Contract Custom Tests', () => {
	// Helper to access schemas consistently throughout tests
	const schemas = {
		input: initContract['~orpc'].inputSchema,
		output: initContract['~orpc'].outputSchema,
	};

	const validateOutput = (output: unknown) => {
		return schemas.output?.safeParse(output);
	};

	describe('Output Validation', () => {
		describe('Required fields', () => {
			it('validates complete output object', () => {
				const validOutput = {
					jurisdiction: 'GDPR',
					location: {
						countryCode: 'DE',
						regionCode: null,
					},
					translations: {
						translations: baseTranslations.en,
						language: 'en',
					},
					branding: 'c15t',
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('rejects output without required fields', () => {
				const invalidOutput = {
					showConsentBanner: true,
					// Missing jurisdiction and location
				};

				const result = validateOutput(invalidOutput);
				expect(result?.success).toBe(false);
			});
		});

		describe('Jurisdiction validation', () => {
			it('validates all supported jurisdiction codes', () => {
				const jurisdictionCodes = [
					'UK_GDPR',
					'GDPR',
					'CH',
					'BR',
					'PIPEDA',
					'AU',
					'APPI',
					'PIPA',
					'CCPA',
					'NONE',
				];

				for (const code of jurisdictionCodes) {
					const output = {
						jurisdiction: code,
						location: {
							countryCode: 'US',
							regionCode: null,
						},
						translations: {
							translations: baseTranslations.en,
							language: 'en',
						},
						branding: 'c15t',
					};

					const result = validateOutput(output);
					expect(result?.success).toBe(true);
				}
			});

			it('rejects invalid jurisdiction codes', () => {
				const output = {
					jurisdiction: 'INVALID_CODE', // Invalid code
					location: {
						countryCode: 'US',
						regionCode: null,
					},
					translations: {
						translations: baseTranslations.en,
						language: 'en',
					},
					branding: 'c15t',
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});

		describe('Location validation', () => {
			it('accepts null country and region codes', () => {
				const output = {
					jurisdiction: 'NONE',
					location: {
						countryCode: null,
						regionCode: null,
					},
					translations: {
						translations: baseTranslations.en,
						language: 'en',
					},
					branding: 'c15t',
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('accepts valid country and region codes', () => {
				const output = {
					jurisdiction: 'GDPR',
					location: {
						countryCode: 'DE',
						regionCode: 'BY',
					},
					translations: {
						translations: baseTranslations.en,
						language: 'en',
					},
					branding: 'c15t',
				};
				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('rejects non-string non-null country codes', () => {
				const output = {
					jurisdiction: 'GDPR',
					location: {
						countryCode: 123, // Invalid type
						regionCode: null,
					},
					translations: {
						translations: baseTranslations.en,
						language: 'en',
					},
					branding: 'c15t',
				};

				// Need to use type assertion to bypass TypeScript
				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});
	});
});
