import { describe, expect, it } from 'vitest';

import { createContractTests } from '~/contracts/test.utils';
import { statusContract } from './status.contract';

// Create base tests for the contract using the utility
const tester = createContractTests('Status', statusContract);

// Add custom tests specific to the status contract
describe('Status Contract Custom Tests', () => {
	// Helper to access schemas consistently throughout tests
	const schemas = {
		input: statusContract['~orpc'].inputSchema,
		output: statusContract['~orpc'].outputSchema,
	};

	// Helper functions for common test patterns
	const validateInput = (input: unknown) => {
		//@ts-expect-error
		return schemas.input?.safeParse(input);
	};

	const validateOutput = (output: unknown) => {
		return schemas.output?.safeParse(output);
	};

	describe('Schema Structure', () => {
		it('input schema is an undefined', () => {
			const result = validateInput(undefined);
			expect(result?.success).toBe(undefined);
		});

		it('rejects input with extra properties', () => {
			const result = validateInput({ extraProp: 'value' });
			expect(result?.success).toBe(undefined);
		});
	});

	describe('Output Validation', () => {
		describe('Required fields', () => {
			it('validates complete output object', () => {
				const validOutput = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 'US',
							regionCode: 'CA',
						},
					},
				};

				const result = validateOutput(validOutput);
				expect(result?.success).toBe(true);
			});

			it('rejects output without required fields', () => {
				const invalidOutput = {
					status: 'ok',
					// Missing version, timestamp, and client
				};

				const result = validateOutput(invalidOutput);
				expect(result?.success).toBe(false);
			});
		});

		describe('Status field validation', () => {
			it('accepts valid status values', () => {
				for (const statusValue of ['ok', 'error']) {
					const output = {
						status: statusValue,
						version: '1.0.0',
						timestamp: new Date(),
						client: {
							ip: '127.0.0.1',
							userAgent: 'Mozilla/5.0',
							region: {
								countryCode: 'US',
								regionCode: 'CA',
							},
						},
					};
					const result = validateOutput(output);
					expect(result?.success).toBe(true);
				}
			});

			it('rejects invalid status values', () => {
				const output = {
					status: 'unknown', // Invalid status
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 'US',
							regionCode: 'CA',
						},
					},
				};
				// Need to use type assertion to bypass TypeScript
				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});

		describe('Timestamp validation', () => {
			it('accepts Date objects', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 'US',
							regionCode: 'CA',
						},
					},
				};
				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('rejects string timestamps', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date().toISOString(), // String instead of Date
				};

				// Need to use type assertion to bypass TypeScript
				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});

		describe('Client information validation', () => {
			it('accepts null values for client fields', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: null,
						userAgent: null,
						region: {
							countryCode: null,
							regionCode: null,
						},
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('validates client object structure', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 'US',
							regionCode: 'CA',
						},
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(true);
			});

			it('rejects invalid client IP format', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: 123, // Number instead of string
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 'US',
							regionCode: 'CA',
						},
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});

			it('rejects invalid region structure', () => {
				const output = {
					status: 'ok',
					version: '1.0.0',
					timestamp: new Date(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'Mozilla/5.0',
						region: {
							countryCode: 123, // Number instead of string
							regionCode: 'CA',
						},
					},
				};

				const result = validateOutput(output);
				expect(result?.success).toBe(false);
			});
		});
	});
});

// Add required fields testing using the utility
// No required fields for input since it's an empty object
tester.testRequiredFields('output', ['status', 'version', 'timestamp']);
