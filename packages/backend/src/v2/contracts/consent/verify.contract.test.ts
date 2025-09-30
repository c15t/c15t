import { describe, expect, it } from 'vitest';

import { createContractTests } from '~/v2/contracts/test.utils';
import { verifyConsentContract } from './verify.contract';

// Create base tests for the contract using the utility
const tester = createContractTests('Verify Consent', verifyConsentContract);

// Custom tests specific to verify consent
describe('Verify Consent Contract Custom Tests', () => {
	// Helper to access schemas consistently throughout tests
	const schemas = {
		input: verifyConsentContract['~orpc'].inputSchema,
		output: verifyConsentContract['~orpc'].outputSchema,
	};

	// Helper functions for common test patterns
	const validateInput = (input: unknown) => {
		return schemas.input?.safeParse(input);
	};

	const validateOutput = (output: unknown) => {
		return schemas.output?.safeParse(output);
	};

	describe('Input Validation', () => {
		it('accepts valid input with minimum required fields', () => {
			const validInput = {
				domain: 'example.com',
				type: 'cookie_banner',
			};

			const result = validateInput(validInput);
			expect(result?.success).toBe(true);
		});

		it('accepts valid input with all fields', () => {
			const validInput = {
				subjectId: 'subject-123',
				externalSubjectId: 'ext-123',
				domain: 'example.com',
				type: 'privacy_policy',
				policyId: 'policy-123',
				preferences: ['analytics', 'marketing'],
			};

			const result = validateInput(validInput);
			expect(result?.success).toBe(true);
		});

		it('rejects input without required domain', () => {
			const invalidInput = {
				type: 'cookie_banner',
			};

			const result = validateInput(invalidInput);
			expect(result?.success).toBe(false);
		});

		it('rejects input without required type', () => {
			const invalidInput = {
				domain: 'example.com',
			};

			const result = validateInput(invalidInput);
			expect(result?.success).toBe(false);
		});

		it('rejects input with invalid type', () => {
			const invalidInput = {
				domain: 'example.com',
				type: 'invalid_type', // Not in PolicyTypeSchema
			};

			const result = validateInput(invalidInput);
			expect(result?.success).toBe(false);
		});

		it('rejects input with extra properties', () => {
			const invalidInput = {
				domain: 'example.com',
				type: 'cookie_banner',
				extraProperty: 'should not be allowed',
			};

			const result = validateInput(invalidInput);
			expect(result?.success).toBe(false);
		});

		it('validates preferences as array of strings', () => {
			const validInput = {
				domain: 'example.com',
				type: 'cookie_banner',
				preferences: ['analytics', 'marketing'],
			};

			expect(validateInput(validInput)?.success).toBe(true);

			const invalidInput = {
				domain: 'example.com',
				type: 'cookie_banner',
				preferences: { analytics: true }, // Object instead of array
			};

			expect(validateInput(invalidInput)?.success).toBe(false);
		});
	});

	describe('Output Validation', () => {
		it('validates successful consent verification', () => {
			const validOutput = {
				isValid: true,
				consent: {
					id: 'consent-123',
					purposeIds: ['analytics', 'marketing'],
					additionalProperty: 'allowed by passthrough',
				},
			};

			const result = validateOutput(validOutput);
			expect(result?.success).toBe(true);
		});

		it('validates unsuccessful consent verification with reasons', () => {
			const validOutput = {
				isValid: false,
				reasons: ['No consent found for the given policy'],
			};

			const result = validateOutput(validOutput);
			expect(result?.success).toBe(true);
		});

		it('rejects output without required isValid field', () => {
			const invalidOutput = {
				reasons: ['Some reason'],
			};

			const result = validateOutput(invalidOutput);
			expect(result?.success).toBe(false);
		});

		it('validates consent object structure', () => {
			const invalidOutput = {
				isValid: true,
				consent: {
					// Missing required id
					purposeIds: ['analytics'],
				},
			};

			expect(validateOutput(invalidOutput)?.success).toBe(false);

			const anotherInvalidOutput = {
				isValid: true,
				consent: {
					id: 'consent-123',
					// Missing required purposeIds
				},
			};

			expect(validateOutput(anotherInvalidOutput)?.success).toBe(false);
		});

		it('validates reasons as array of strings', () => {
			const validOutput = {
				isValid: false,
				reasons: ['Reason 1', 'Reason 2'],
			};

			expect(validateOutput(validOutput)?.success).toBe(true);

			const invalidOutput = {
				isValid: false,
				reasons: 'Single reason', // String instead of array
			};

			expect(validateOutput(invalidOutput)?.success).toBe(false);
		});
	});
});

// Add required fields testing
tester.testRequiredFields('input', ['domain', 'type']);
tester.testRequiredFields('output', ['isValid']);
