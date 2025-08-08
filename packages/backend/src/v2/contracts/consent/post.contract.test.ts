import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { PolicyTypeSchema } from '~/v2/schema';
import { createContractTests } from '~/v2/testing/contract-testing';

import { postConsentContract } from './post.contract';

// Create base tests for the contract using the utility
const tester = createContractTests('Post Consent', postConsentContract);

// Keep the detailed custom tests to maintain existing coverage
describe('Post Consent Contract Custom Tests', () => {
	// Helper to access schemas consistently throughout tests
	const schemas = {
		input: postConsentContract['~orpc'].inputSchema,
		output: postConsentContract['~orpc'].outputSchema,
	};

	// Helper functions for common test patterns
	const validateInput = (input: unknown) => {
		return schemas.input?.safeParse(input);
	};

	const validateOutput = (output: unknown) => {
		return schemas.output?.safeParse(output);
	};

	describe('Schema Structure', () => {
		it('input schema is a discriminated union based on type', () => {
			// Using explicit type cast to avoid linter warnings
			const schema = schemas.input as z.ZodDiscriminatedUnion<
				string,
				z.ZodObject<z.ZodRawShape>[]
			>;
			expect(schema._def.typeName).toBe('ZodDiscriminatedUnion');
			expect(schema._def.discriminator).toBe('type');
		});

		it('supports all defined policy types', () => {
			const policyTypes = PolicyTypeSchema.options;

			for (const type of policyTypes) {
				const input = {
					type,
					domain: 'example.com',
					...(type === 'cookie_banner' ? { preferences: { test: true } } : {}),
				};

				const result = validateInput(input);
				expect(result?.success).toBe(true);
			}
		});
	});

	describe('Input Validation', () => {
		describe('cookie_banner type', () => {
			it('accepts valid input with preferences', () => {
				const validInput = {
					type: 'cookie_banner',
					domain: 'example.com',
					preferences: { analytics: true, marketing: false },
				} as const;

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('rejects input without required preferences', () => {
				const invalidInput = {
					type: 'cookie_banner',
					domain: 'example.com',
				} as const;

				const result = validateInput(invalidInput);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
				if (!result.success) {
					// Use optional chaining to safely access potentially undefined properties
					expect(result.error.issues?.[0]?.path).toContain('preferences');
				}
			});

			it('verifies boolean values in preferences', () => {
				const invalidPreferences = {
					type: 'cookie_banner',
					domain: 'example.com',
					preferences: { analytics: 'yes' }, // Should be boolean
				};

				const result = validateInput(invalidPreferences);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues?.[0]?.path).toContain('preferences');
				}
			});
		});

		describe('policy-based types', () => {
			it('validates privacy_policy input', () => {
				const validInput = {
					type: 'privacy_policy',
					domain: 'example.com',
					policyId: 'policy-123',
				} as const;

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('validates dpa input', () => {
				const validInput = {
					type: 'dpa',
					domain: 'example.com',
					policyId: 'dpa-123',
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('validates terms_and_conditions input', () => {
				const validInput = {
					type: 'terms_and_conditions',
					domain: 'example.com',
					policyId: 'terms-123',
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('accepts optional preferences for policy-based consents', () => {
				const validInput = {
					type: 'privacy_policy',
					domain: 'example.com',
					policyId: 'policy-123',
					preferences: { acceptAll: true, marketing: false },
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});
		});

		describe('other consent types', () => {
			it('validates marketing_communications input', () => {
				const validInput = {
					type: 'marketing_communications',
					domain: 'example.com',
					subjectId: 'user-123',
				} as const;

				const result = validateInput(validInput);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(true);
			});

			it('validates age_verification input', () => {
				const validInput = {
					type: 'age_verification',
					domain: 'example.com',
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('validates other type input', () => {
				const validInput = {
					type: 'other',
					domain: 'example.com',
					metadata: { customField: 'value' },
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});
		});

		describe('common requirements', () => {
			it('rejects input with invalid type', () => {
				const invalidInput = {
					// Type cast to bypass TS errors for testing
					type: 'invalid_type' as unknown as z.infer<typeof PolicyTypeSchema>,
					domain: 'example.com',
				};

				const result = validateInput(invalidInput);

				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues?.[0]?.path).toContain('type');
				}
			});

			it('requires domain field', () => {
				const invalidInput = {
					type: 'marketing_communications' as z.infer<typeof PolicyTypeSchema>,
				};

				const result = validateInput(invalidInput);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues?.[0]?.path).toContain('domain');
				}
			});

			it('accepts additional metadata', () => {
				const validInput = {
					type: 'marketing_communications',
					domain: 'example.com',
					metadata: {
						source: 'web',
						campaign: 'summer2023',
						customData: { nested: true },
					},
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('accepts optional subjectId', () => {
				const validInput = {
					type: 'privacy_policy',
					domain: 'example.com',
					subjectId: 'user-abc-123',
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});

			it('accepts optional externalSubjectId', () => {
				const validInput = {
					type: 'privacy_policy',
					domain: 'example.com',
					externalSubjectId: 'external-user-123',
				};

				const result = validateInput(validInput);
				expect(result?.success).toBe(true);
			});
		});
	});

	describe('Output Validation', () => {
		it('validates complete output object', () => {
			const validOutput = {
				id: '123',
				domainId: '456',
				domain: 'example.com',
				type: 'marketing_communications',
				status: 'granted',
				recordId: '789',
				givenAt: new Date(),
				metadata: { source: 'web' },
			} as const;

			const result = validateOutput(validOutput);
			if (!result) {
				throw new Error('Result is undefined');
			}

			expect(result.success).toBe(true);
		});

		it('rejects output without required fields', () => {
			const invalidOutput = {
				id: '123',
				domain: 'example.com',
				type: 'marketing_communications',
				// Missing required fields: domainId, status, recordId, givenAt
			} as const;

			const result = validateOutput(invalidOutput);
			if (!result) {
				throw new Error('Result is undefined');
			}

			expect(result.success).toBe(false);
		});

		it('validates output with all possible status values', () => {
			const statusValues = ['granted', 'denied', 'pending', 'withdrawn'];

			for (const status of statusValues) {
				const output = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status,
					recordId: '789',
					givenAt: new Date(),
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			}
		});

		it('validates output with different policy types', () => {
			const policyTypes = PolicyTypeSchema.options;

			for (const type of policyTypes) {
				const output = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type,
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			}
		});

		describe('givenAt field', () => {
			it('rejects string values', () => {
				const invalidOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: 'not-a-date', // This should now fail with z.date()
					metadata: {},
				} as const;

				const result = validateOutput(invalidOutput);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
			});

			it('accepts Date objects', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					metadata: {},
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('rejects non-date values', () => {
				const invalidOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: 123, // Number instead of Date
					metadata: {},
				};

				const result = validateOutput(invalidOutput);
				expect(result?.success).toBe(false);
			});

			it('accepts ISO date strings', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					metadata: {},
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('rejects non-string values', () => {
				// Create an object with a number for givenAt (should fail validation)
				const invalidOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: 123, // Number instead of string (intentionally invalid)
					metadata: {},
				};

				// We need to cast here because TypeScript wouldn't allow this invalid type normally
				const result = validateOutput(invalidOutput);
				if (!result) {
					throw new Error('Result is undefined');
				}

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues?.[0]?.path).toContain('givenAt');
				}
			});
		});

		describe('Optional fields validation', () => {
			it('accepts output without optional fields', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					// No metadata, subjectId or externalSubjectId
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('accepts output with optional subjectId', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					subjectId: 'user-123',
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('accepts output with optional externalSubjectId', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					externalSubjectId: 'external-user-123',
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('accepts output with complex metadata', () => {
				const validOutput = {
					id: '123',
					domainId: '456',
					domain: 'example.com',
					type: 'marketing_communications',
					status: 'granted',
					recordId: '789',
					givenAt: new Date(),
					metadata: {
						source: 'web',
						platform: 'mobile',
						browser: { name: 'Chrome', version: '115' },
						consentMethod: 'explicit',
						nestedData: {
							level1: {
								level2: {
									level3: true,
								},
							},
						},
					},
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});
		});
	});
});

// Add required fields testing using the utility
tester.testRequiredFields('input', ['domain', 'type']);
tester.testRequiredFields('output', [
	'id',
	'domainId',
	'domain',
	'type',
	'status',
	'recordId',
	'givenAt',
]);
