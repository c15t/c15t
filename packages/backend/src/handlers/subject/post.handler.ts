/**
 * POST /subjects handler - Records consent (append-only).
 *
 * @packageDocumentation
 */

import type { PostSubjectInput } from '@c15t/schema';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateUniqueId } from '~/db/registry/utils';
import { getJurisdiction, getLocation } from '~/handlers/init/geo';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { getMetrics } from '~/utils/metrics';
import { resolvePolicyDecision } from '../init/policy';

function buildRuntimeDecisionDedupeKey(input: {
	tenantId?: string;
	fingerprint: string;
	matchedBy: string;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: string;
}): string {
	return [
		input.tenantId ?? 'default',
		input.fingerprint,
		input.matchedBy,
		input.countryCode ?? 'none',
		input.regionCode ?? 'none',
		input.jurisdiction,
	].join('|');
}

function parseLanguageFromHeader(header: string | null): string | undefined {
	if (!header) {
		return undefined;
	}

	const firstLanguage = header.split(',')[0]?.split(';')[0]?.trim();
	if (!firstLanguage) {
		return undefined;
	}

	return firstLanguage.split('-')[0]?.toLowerCase();
}

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

	logger.debug('Request parameters', {
		type,
		subjectId,
		identityProvider,
		externalSubjectId,
		domain,
	});

	try {
		if (type === 'cookie_banner') {
			logger.warn(
				'`cookie_banner` policy type is deprecated in 2.0 RC and will be removed in 2.0 GA. Use backend runtime `policies` for banner behavior.'
			);
		}

		const request = c.req.raw ?? new Request('https://c15t.local/subjects');
		const acceptLanguage = request.headers.get('accept-language');
		const requestLanguage = parseLanguageFromHeader(acceptLanguage);
		const location = await getLocation(request, ctx);
		const resolvedJurisdiction = getJurisdiction(location, ctx);
		const resolvedPolicyDecision = await resolvePolicyDecision({
			policies: ctx.policies,
			countryCode: location.countryCode,
			regionCode: location.regionCode,
			jurisdiction: resolvedJurisdiction,
		});

		const snapshotPayload = await verifyPolicySnapshotToken({
			token: input.policySnapshotToken,
			options: ctx.policySnapshot,
		});
		const hasValidSnapshot =
			!!snapshotPayload &&
			(!snapshotPayload.tenantId || snapshotPayload.tenantId === ctx.tenantId);
		const effectivePolicy =
			hasValidSnapshot && snapshotPayload
				? {
						id: snapshotPayload.policyId,
						model: snapshotPayload.model,
						consent: {
							expiryDays: snapshotPayload.expiryDays,
							scopeMode: snapshotPayload.scopeMode,
							categories: snapshotPayload.categories,
						},
						ui: {
							mode: snapshotPayload.uiMode,
							banner: snapshotPayload.bannerUi,
							dialog: snapshotPayload.dialogUi,
						},
						proof: snapshotPayload.proofConfig,
					}
				: resolvedPolicyDecision?.policy;

		const effectiveModel =
			effectivePolicy?.model ??
			(input.jurisdictionModel === 'opt-in' ||
			input.jurisdictionModel === 'opt-out' ||
			input.jurisdictionModel === 'iab'
				? input.jurisdictionModel
				: undefined);

		if (rawConsentAction === 'all') {
			derivedConsentAction = 'accept_all';
		} else if (rawConsentAction === 'necessary') {
			derivedConsentAction =
				effectiveModel === 'opt-out' ? 'opt_out' : 'reject_all';
		} else if (rawConsentAction === 'custom') {
			derivedConsentAction = 'custom';
		}

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
			const allowedCategories = effectivePolicy?.consent?.categories;
			const effectiveScopeMode =
				effectivePolicy?.consent?.scopeMode ?? 'unmanaged';
			const hasWildcardCategoryScope =
				allowedCategories?.includes('*') === true;
			const consentedPurposeCodes = Object.entries(preferences)
				.filter(([_, isConsented]) => isConsented)
				.map(([purposeCode]) => purposeCode);
			let filteredConsentedPurposeCodes = consentedPurposeCodes;

			if (
				allowedCategories &&
				allowedCategories.length > 0 &&
				!hasWildcardCategoryScope
			) {
				const disallowed = consentedPurposeCodes.filter(
					(purpose) => !allowedCategories.includes(purpose)
				);
				filteredConsentedPurposeCodes = consentedPurposeCodes.filter(
					(purpose) => allowedCategories.includes(purpose)
				);
				if (disallowed.length > 0 && effectiveScopeMode === 'strict') {
					throw new HTTPException(400, {
						message: 'Preferences include categories not allowed by policy',
						cause: { code: 'PURPOSE_NOT_ALLOWED', disallowed },
					});
				}
			}

			logger.debug('Consented purposes', {
				consentedPurposes: filteredConsentedPurposeCodes,
			});

			// Batch fetch all existing purposes
			const purposesRaw = await Promise.all(
				filteredConsentedPurposeCodes.map((purposeCode) =>
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
					{ consentedPurposes: filteredConsentedPurposeCodes }
				);
			}

			purposeIds = purposes;
		}

		const expiryDays = effectivePolicy?.consent?.expiryDays;
		const validUntil =
			typeof expiryDays === 'number' && Number.isFinite(expiryDays)
				? new Date(givenAt.getTime() + Math.max(0, expiryDays) * 86_400_000)
				: undefined;

		const proofConfig = effectivePolicy?.proof;
		const shouldStoreIp = proofConfig?.storeIp ?? true;
		const shouldStoreUserAgent = proofConfig?.storeUserAgent ?? true;
		const shouldStoreLanguage = proofConfig?.storeLanguage ?? false;
		const effectiveLanguage =
			(snapshotPayload?.language && hasValidSnapshot
				? snapshotPayload.language
				: requestLanguage) ?? undefined;

		const metadataWithPolicy = {
			...(metadata ?? {}),
			...(shouldStoreLanguage && effectiveLanguage
				? { policyLanguage: effectiveLanguage }
				: {}),
		};
		const effectiveJurisdiction =
			hasValidSnapshot && snapshotPayload
				? snapshotPayload.jurisdiction
				: resolvedJurisdiction;

		const decisionPayload =
			hasValidSnapshot && snapshotPayload
				? {
						tenantId: ctx.tenantId,
						policyId: snapshotPayload.policyId,
						fingerprint: snapshotPayload.fingerprint,
						matchedBy: snapshotPayload.matchedBy,
						countryCode: snapshotPayload.country,
						regionCode: snapshotPayload.region,
						jurisdiction: snapshotPayload.jurisdiction,
						language: snapshotPayload.language,
						model: snapshotPayload.model,
						uiMode: snapshotPayload.uiMode,
						bannerUi: snapshotPayload.bannerUi,
						dialogUi: snapshotPayload.dialogUi,
						categories: snapshotPayload.categories,
						proofConfig: snapshotPayload.proofConfig,
						dedupeKey: buildRuntimeDecisionDedupeKey({
							tenantId: ctx.tenantId,
							fingerprint: snapshotPayload.fingerprint,
							matchedBy: snapshotPayload.matchedBy,
							countryCode: snapshotPayload.country,
							regionCode: snapshotPayload.region,
							jurisdiction: snapshotPayload.jurisdiction,
						}),
						source: 'snapshot_token' as const,
					}
				: resolvedPolicyDecision
					? {
							tenantId: ctx.tenantId,
							policyId: resolvedPolicyDecision.policy.id,
							fingerprint: resolvedPolicyDecision.fingerprint,
							matchedBy: resolvedPolicyDecision.matchedBy,
							countryCode: location.countryCode,
							regionCode: location.regionCode,
							jurisdiction: resolvedJurisdiction,
							language: effectiveLanguage,
							model: resolvedPolicyDecision.policy.model,
							uiMode: resolvedPolicyDecision.policy.ui?.mode,
							bannerUi: resolvedPolicyDecision.policy.ui?.banner,
							dialogUi: resolvedPolicyDecision.policy.ui?.dialog,
							categories: resolvedPolicyDecision.policy.consent?.categories,
							proofConfig,
							dedupeKey: buildRuntimeDecisionDedupeKey({
								tenantId: ctx.tenantId,
								fingerprint: resolvedPolicyDecision.fingerprint,
								matchedBy: resolvedPolicyDecision.matchedBy,
								countryCode: location.countryCode,
								regionCode: location.regionCode,
								jurisdiction: resolvedJurisdiction,
							}),
							source: 'write_time_fallback' as const,
						}
					: undefined;

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

			const runtimePolicyDecision = decisionPayload
				? ((await tx.findFirst('runtimePolicyDecision', {
						where: (b) => b('dedupeKey', '=', decisionPayload.dedupeKey),
					})) ??
					(await tx.create('runtimePolicyDecision', {
						id: `rpd_${crypto.randomUUID().replaceAll('-', '')}`,
						tenantId: decisionPayload.tenantId,
						policyId: decisionPayload.policyId,
						fingerprint: decisionPayload.fingerprint,
						matchedBy: decisionPayload.matchedBy,
						countryCode: decisionPayload.countryCode,
						regionCode: decisionPayload.regionCode,
						jurisdiction: decisionPayload.jurisdiction,
						language: decisionPayload.language,
						model: decisionPayload.model,
						uiMode: decisionPayload.uiMode,
						bannerUi: decisionPayload.bannerUi
							? { json: decisionPayload.bannerUi }
							: undefined,
						dialogUi: decisionPayload.dialogUi
							? { json: decisionPayload.dialogUi }
							: undefined,
						categories: decisionPayload.categories
							? { json: decisionPayload.categories }
							: undefined,
						proofConfig: decisionPayload.proofConfig
							? { json: decisionPayload.proofConfig }
							: undefined,
						dedupeKey: decisionPayload.dedupeKey,
					})))
				: undefined;

			// Always create a new consent record (append-only)
			const consentRecord = await tx.create('consent', {
				id: await generateUniqueId(tx, 'consent', ctx),
				subjectId: subject.id,
				domainId: domainRecord.id,
				policyId,
				purposeIds: { json: purposeIds },
				metadata:
					Object.keys(metadataWithPolicy).length > 0
						? { json: metadataWithPolicy }
						: undefined,
				ipAddress: shouldStoreIp ? ctx.ipAddress : null,
				userAgent: shouldStoreUserAgent ? ctx.userAgent : null,
				jurisdiction: effectiveJurisdiction,
				jurisdictionModel: effectiveModel,
				tcString: input.tcString,
				uiSource: input.uiSource,
				consentAction: derivedConsentAction,
				givenAt,
				validUntil,
				runtimePolicyDecisionId: runtimePolicyDecision?.id,
				runtimePolicySource: decisionPayload?.source,
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
			const jurisdiction = effectiveJurisdiction;
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
