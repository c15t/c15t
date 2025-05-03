import { describe, expect, it } from 'vitest';

import { createContractTests } from '~/testing/contract-testing';
import { showConsentBannerContract } from './show-banner.contract';

// Create base tests for the contract using the utility
const tester = createContractTests(
	'Show Consent Banner',
	showConsentBannerContract
);

// Add custom tests specific to the show-banner contract
describe('Show Consent Banner Contract Custom Tests', () => {
	// Helper to access schemas consistently throughout tests
	const schemas = {
		input: showConsentBannerContract['~orpc'].inputSchema,
		output: showConsentBannerContract['~orpc'].outputSchema,
	};

	// Helper functions for common test patterns
	const validateInput = (input: unknown) => {
		return schemas.input?.safeParse(input);
	};

	const validateOutput = (output: unknown) => {
		return schemas.output?.safeParse(output);
	};

	describe('Schema Structure', () => {
		it('input schema is an empty object', () => {
			const result = validateInput({});
			expect(result?.success).toBe(true);
		});

		it('rejects input with extra properties', () => {
			const result = validateInput({ extraProp: 'value' });
			expect(result?.success).toBe(false);
		});
	});

	describe('Output Validation', () => {
		describe('Required fields', () => {
			it('validates complete output object', () => {
				const validOutput = {
					showConsentBanner: true,
					jurisdiction: {
						code: 'GDPR',
						message: 'GDPR or equivalent regulations require a cookie banner.',
					},
					location: {
						countryCode: 'DE',
						regionCode: null,
					},
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
					'GDPR',
					'CH',
					'BR',
					'PIPEDA',
					'AU',
					'APPI',
					'PIPA',
					'NONE',
				];

				for (const code of jurisdictionCodes) {
					const output = {
						showConsentBanner: true,
						jurisdiction: {
							code,
							message: 'Test message',
						},
						location: {
							countryCode: 'US',
							regionCode: null,
						},
					};

					const result = validateOutput(output);
					expect(result?.success).toBe(true);
				}
			});

			it('rejects invalid jurisdiction codes', () => {
				const output = {
					showConsentBanner: true,
					jurisdiction: {
						code: 'INVALID_CODE', // Invalid code
						message: 'Test message',
					},
					location: {
						countryCode: 'US',
						regionCode: null,
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});

		describe('Location validation', () => {
			it('accepts null country and region codes', () => {
				const output = {
					showConsentBanner: false,
					jurisdiction: {
						code: 'NONE',
						message: 'No specific requirements',
					},
					location: {
						countryCode: null,
						regionCode: null,
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('accepts valid country and region codes', () => {
				const output = {
					showConsentBanner: true,
					jurisdiction: {
						code: 'GDPR',
						message: 'GDPR applies',
					},
					location: {
						countryCode: 'DE',
						regionCode: 'BY',
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('rejects non-string non-null country codes', () => {
				const output = {
					showConsentBanner: true,
					jurisdiction: {
						code: 'GDPR',
						message: 'GDPR applies',
					},
					location: {
						countryCode: 123, // Invalid type
						regionCode: null,
					},
				};

				// Need to use type assertion to bypass TypeScript
				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});

		describe('ShowConsentBanner flag', () => {
			it('validates boolean value', () => {
				const trueOutput = {
					showConsentBanner: true,
					jurisdiction: {
						code: 'GDPR',
						message: 'GDPR applies',
					},
					location: {
						countryCode: 'DE',
						regionCode: null,
					},
				};

				const falseOutput = {
					showConsentBanner: false,
					jurisdiction: {
						code: 'NONE',
						message: 'No requirements',
					},
					location: {
						countryCode: 'US',
						regionCode: null,
					},
				};

				expect(validateOutput(trueOutput)?.success).toBe(true);
				expect(validateOutput(falseOutput)?.success).toBe(true);
			});

			it('rejects non-boolean values', () => {
				const invalidOutput = {
					showConsentBanner: 'yes', // Invalid type
					jurisdiction: {
						code: 'GDPR',
						message: 'GDPR applies',
					},
					location: {
						countryCode: 'DE',
						regionCode: null,
					},
				};

				// Need to use type assertion to bypass TypeScript
				const result = validateOutput(invalidOutput);
				expect(result?.success).toBe(false);
			});
		});
	});
});

// Add required fields testing using the utility
// No required fields for input since it's an empty object
tester.testRequiredFields('output', [
	'showConsentBanner',
	'jurisdiction',
	'location',
]);
