/**
 * POST /subjects handler - Records consent (append-only).
 *
 * @packageDocumentation
 */

import type { PostSubjectInput } from '@c15t/schema';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateUniqueId } from '~/db/registry/utils';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { getMetrics } from '~/utils/metrics';

/**
 * Handles the creation of a new consent record for a subject.
 *
 * This handler processes consent submissions with client-generated subject IDs.
 * Each call creates a new consent record (append-only), preserving the full audit trail.
 */
export const postSubjectHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling POST /subjects request');

	const { db, registry } = ctx;

	const input = await c.req.json<PostSubjectInput>();

	const {
		type,
		subjectId,
		identityProvider,
		externalSubjectId,
		domain,
		metadata,
		givenAt: givenAtEpoch,
	} = input;

	const preferences = 'preferences' in input ? input.preferences : undefined;
	const givenAt = new Date(givenAtEpoch);

	// Derive model-aware consent action from the raw frontend type
	const rawConsentAction =
		'consentAction' in input ? input.consentAction : undefined;
	let derivedConsentAction: string | undefined;
	if (rawConsentAction === 'all') {
		derivedConsentAction = 'accept_all';
	} else if (rawConsentAction === 'necessary') {
		derivedConsentAction =
			input.jurisdictionModel === 'opt-out' ? 'opt_out' : 'reject_all';
	} else if (rawConsentAction === 'custom') {
		derivedConsentAction = 'custom';
	}

	logger.debug('Request parameters', {
		type,
		subjectId,
		identityProvider,
		externalSubjectId,
		domain,
	});

	try {
		// Find or create subject with the client-provided ID
		const subject = await registry.findOrCreateSubject({
			subjectId,
			externalSubjectId,
			identityProvider,
			ipAddress: ctx.ipAddress,
		});

		if (!subject) {
			throw new HTTPException(500, {
				message: 'Failed to create subject',
				cause: { code: 'SUBJECT_CREATION_FAILED', subjectId },
			});
		}

		logger.debug('Subject found/created', { subjectId: subject.id });

		const domainRecord = await registry.findOrCreateDomain(domain);

		if (!domainRecord) {
			throw new HTTPException(500, {
				message: 'Failed to create domain',
				cause: { code: 'DOMAIN_CREATION_FAILED', domain },
			});
		}

		let policyId: string | undefined;
		let purposeIds: string[] = [];

		const inputPolicyId =
			'policyId' in input ? (input.policyId as string | undefined) : undefined;
		if (inputPolicyId) {
			policyId = inputPolicyId;

			// Verify the policy exists and is active
			const policy = await registry.findConsentPolicyById(inputPolicyId);
			if (!policy) {
				throw new HTTPException(404, {
					message: 'Policy not found',
					cause: { code: 'POLICY_NOT_FOUND', policyId, type },
				});
			}
			if (!policy.isActive) {
				throw new HTTPException(400, {
					message: 'Policy is inactive',
					cause: { code: 'POLICY_INACTIVE', policyId, type },
				});
			}
		} else {
			const policy = await registry.findOrCreatePolicy(type);
			if (!policy) {
				throw new HTTPException(500, {
					message: 'Failed to create policy',
					cause: { code: 'POLICY_CREATION_FAILED', type },
				});
			}
			policyId = policy.id;
		}

		// Handle purposes if they exist
		if (preferences) {
			const consentedPurposes = Object.entries(preferences)
				.filter(([_, isConsented]) => isConsented)
				.map(([purposeCode]) => purposeCode);

			logger.debug('Consented purposes', { consentedPurposes });

			// Batch fetch all existing purposes
			const purposesRaw = await Promise.all(
				consentedPurposes.map((purposeCode) =>
					registry.findOrCreateConsentPurposeByCode(purposeCode)
				)
			);

			const purposes = purposesRaw
				.map((purpose) => purpose?.id ?? null)
				.filter((id): id is string => Boolean(id));

			logger.debug('Filtered purposes', { purposes });

			if (purposes.length === 0) {
				logger.warn(
					'No valid purpose IDs found after filtering. Using empty list.',
					{ consentedPurposes }
				);
			}

			purposeIds = purposes;
		}

		// Check for duplicate consent (idempotency)
		const existingConsent = await db.findFirst('consent', {
			where: (b) =>
				b.and(
					b('subjectId', '=', subject.id),
					b('domainId', '=', domainRecord.id),
					b('policyId', '=', policyId),
					b('givenAt', '=', givenAt)
				),
		});

		if (existingConsent) {
			logger.debug('Duplicate consent detected, returning existing record', {
				consentId: existingConsent.id,
			});
			return c.json({
				subjectId: subject.id,
				consentId: existingConsent.id,
				domainId: domainRecord.id,
				domain: domainRecord.name,
				type,
				metadata,
				uiSource: input.uiSource,
				givenAt: existingConsent.givenAt,
			});
		}

		const result = await db.transaction(async (tx) => {
			logger.debug('Creating consent record', {
				subjectId: subject.id,
				domainId: domainRecord.id,
				policyId,
				purposeIds,
			});

			// Always create a new consent record (append-only)
			const consentRecord = await tx.create('consent', {
				id: await generateUniqueId(tx, 'consent', ctx),
				subjectId: subject.id,
				domainId: domainRecord.id,
				policyId,
				purposeIds: { json: purposeIds },
				metadata: metadata ? { json: metadata } : undefined,
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
				jurisdiction: input.jurisdiction,
				jurisdictionModel: input.jurisdictionModel,
				tcString: input.tcString,
				uiSource: input.uiSource,
				consentAction: derivedConsentAction,
				givenAt,
			});

			logger.debug('Created consent', { consentRecord: consentRecord.id });

			if (!consentRecord) {
				throw new HTTPException(500, {
					message: 'Failed to create consent',
					cause: {
						code: 'CONSENT_CREATION_FAILED',
						subjectId: subject.id,
						domain,
					},
				});
			}

			return {
				consent: consentRecord,
			};
		});

		// Record telemetry metrics
		const metrics = getMetrics();
		if (metrics) {
			const jurisdiction = input.jurisdiction;
			metrics.recordConsentCreated({ type, jurisdiction });

			// Determine accepted vs rejected based on preferences
			const hasAccepted =
				preferences && Object.values(preferences).some(Boolean);
			if (hasAccepted) {
				metrics.recordConsentAccepted({ type, jurisdiction });
			} else {
				metrics.recordConsentRejected({ type, jurisdiction });
			}
		}

		// Return the response
		return c.json({
			subjectId: subject.id,
			consentId: result.consent.id,
			domainId: domainRecord.id,
			domain: domainRecord.name,
			type,
			metadata,
			uiSource: input.uiSource,
			givenAt: result.consent.givenAt,
		});
	} catch (error) {
		logger.error('Error in POST /subjects handler', {
			error: extractErrorMessage(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: 'Internal server error',
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
