import { beforeEach, describe, expect, it } from 'vitest';
import { c15tInstance } from '~/core';
import type { ConsentPolicy } from '~/db/schema';
import { memoryAdapter } from '~/pkgs/db-adapters';
import { BASE_ERROR_CODES } from '~/pkgs/errors';
import type { C15TContext } from '~/pkgs/types';
import { setConsent } from '../set-consent';

describe('Consent Endpoints', () => {
	let context: C15TContext;

	beforeEach(async () => {
		const instance = await c15tInstance({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			trustedOrigins: ['http://localhost:3000'],
			secret: 'test-secret',
		});

		const contextResult = await instance.$context;
		if (!contextResult.isOk()) {
			throw new Error('Failed to initialize context');
		}
		context = contextResult.value;
	});

	describe('setConsent', () => {
		// Helper function for common consent data
		const createConsentData = (
			type: 'cookie_banner' | 'privacy_policy',
			overrides = {}
		) => ({
			type,
			domain: 'example.com',
			preferences: {
				marketing: true,
				analytics: true,
			},
			...overrides,
		});

		// Helper function for common response checks
		const expectValidConsentResponse = (
			response: {
				id: string;
				givenAt: string;
				subjectId: string;
				domainId: string;
				type: string;
				status: string;
				domain: string;
				metadata?: unknown;
			},
			type: string,
			extraChecks = {}
		) => {
			// biome-ignore lint/suspicious/noMisplacedAssertion: its okay
			expect(response).toMatchObject({
				type,
				status: 'active',
				domain: 'example.com',
				metadata: undefined,
				...extraChecks,
			});
			// biome-ignore lint/suspicious/noMisplacedAssertion: its okay
			expect(typeof response.id).toBe('string');
			// biome-ignore lint/suspicious/noMisplacedAssertion: its okay
			expect(response.givenAt).toBeDefined();
			// biome-ignore lint/suspicious/noMisplacedAssertion: its okay
			expect(response.subjectId).toBeDefined();
			// biome-ignore lint/suspicious/noMisplacedAssertion: its okay
			expect(response.domainId).toBeDefined();
		};

		it('should set cookie banner consent successfully', async () => {
			const response = await setConsent({
				context,
				params: undefined,
				query: undefined,
				body: createConsentData('cookie_banner'),
			});
			expectValidConsentResponse(response, 'cookie_banner');
		});

		it('should set privacy policy consent successfully with external subject', async () => {
			await context.registry.createSubject({
				externalId: 'test-subject',
				isIdentified: true,
				identityProvider: 'test',
			});

			const response = await setConsent({
				context,
				params: undefined,
				query: undefined,
				body: createConsentData('privacy_policy', {
					externalSubjectId: 'test-subject',
				}),
			});

			expectValidConsentResponse(response, 'privacy_policy', {
				externalSubjectId: 'test-subject',
			});
		});

		describe('Policy ID handling', () => {
			let policy: ConsentPolicy;

			beforeEach(async () => {
				policy = await context.registry.createConsentPolicy({
					name: 'Test Privacy Policy',
					version: '1.0',
					content: 'Test content',
					contentHash: 'test-hash',
					effectiveDate: new Date(),
					updatedAt: new Date(),
					isActive: true,
				});
			});

			it('should set consent with explicit policy ID', async () => {
				const response = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', { policyId: policy.id }),
				});

				expectValidConsentResponse(response, 'privacy_policy');
			});

			it('should find latest policy when policy ID is not provided', async () => {
				const response = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy'),
				});

				expectValidConsentResponse(response, 'privacy_policy');
			});

			it('should error with invalid policy ID', async () => {
				await expect(
					setConsent({
						context,
						params: undefined,
						query: undefined,
						body: createConsentData('privacy_policy', {
							policyId: 'invalid-id',
						}),
					})
				).rejects.toMatchObject({
					name: 'C15TError',
					code: BASE_ERROR_CODES.NOT_FOUND,
					status: 404,
				});
			});
		});

		describe('Subject mapping validation', () => {
			it('should validate that subjectId and externalSubjectId map to the same subject', async () => {
				// Create a subject with external ID
				const subject = await context.registry.createSubject({
					externalId: 'test-subject',
					isIdentified: true,
					identityProvider: 'test',
				});

				if (!subject) {
					throw new Error('Failed to create test subject');
				}

				// Test with matching IDs
				const response = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', {
						subjectId: subject.id,
						externalSubjectId: 'test-subject',
					}),
				});

				expectValidConsentResponse(response, 'privacy_policy', {
					subjectId: subject.id,
					externalSubjectId: 'test-subject',
				});

				// Create another subject with different external ID
				const otherSubject = await context.registry.createSubject({
					externalId: 'other-subject',
					isIdentified: true,
					identityProvider: 'test',
				});

				if (!otherSubject) {
					throw new Error('Failed to create other test subject');
				}

				// Test with mismatched IDs
				await expect(
					setConsent({
						context,
						params: undefined,
						query: undefined,
						body: createConsentData('privacy_policy', {
							subjectId: subject.id,
							externalSubjectId: 'other-subject',
						}),
					})
				).rejects.toMatchObject({
					name: 'C15TError',
					code: BASE_ERROR_CODES.BAD_REQUEST,
					status: 400,
				});
			});
		});

		describe('Error cases', () => {
			it('should create anonymous subject when external subject is not found', async () => {
				const response = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', {
						externalSubjectId: 'non-existent',
					}),
				});

				expectValidConsentResponse(response, 'privacy_policy', {
					externalSubjectId: 'non-existent',
				});
			});

			it('should error if subject ID is not found', async () => {
				await expect(
					setConsent({
						context,
						params: undefined,
						query: undefined,
						body: createConsentData('privacy_policy', {
							subjectId: 'non-existent',
						}),
					})
				).rejects.toMatchObject({
					name: 'C15TError',
					code: BASE_ERROR_CODES.NOT_FOUND,
					status: 404,
				});
			});

			it('should handle invalid consent data', async () => {
				await expect(
					setConsent({
						context,
						params: undefined,
						query: undefined,
						body: createConsentData('cookie_banner', {
							preferences: {
								marketing: 'invalid' as unknown as boolean,
								analytics: 'invalid' as unknown as boolean,
							},
						}),
					})
				).rejects.toThrow('Invalid body parameters');
			});
		});
	});
});
