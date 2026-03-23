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
import {
	type PolicySnapshotVerificationFailureReason,
	verifyPolicySnapshotToken,
} from '~/handlers/policy/snapshot';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { getMetrics } from '~/utils/metrics';
import { resolvePolicyDecision } from '../init/policy';

export function buildRuntimeDecisionDedupeKey(input: {
	tenantId?: string;
	fingerprint: string;
	matchedBy: string;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: string;
	language?: string;
}): string {
	return [
		input.tenantId ?? 'default',
		input.fingerprint,
		input.matchedBy,
		input.countryCode ?? 'none',
		input.regionCode ?? 'none',
		input.jurisdiction,
		input.language ?? 'none',
	].join('|');
}

/**
 * Builds the runtime decision payload from either a verified snapshot token
 * or a freshly resolved policy decision.
 *
 * @returns The decision payload for audit storage, or `undefined` when
 *          no policy information is available.
 */
function buildDecisionPayload(params: {
	tenantId?: string;
	snapshot: {
		valid: true;
		payload: NonNullable<
			Extract<
				Awaited<ReturnType<typeof verifyPolicySnapshotToken>>,
				{ valid: true }
			>['payload']
		>;
	} | null;
	decision: Awaited<ReturnType<typeof resolvePolicyDecision>> | undefined;
	location: { countryCode: string | null; regionCode: string | null };
	jurisdiction: string;
	language: string | undefined;
	proofConfig:
		| { storeIp?: boolean; storeUserAgent?: boolean; storeLanguage?: boolean }
		| undefined;
}) {
	const {
		tenantId,
		snapshot,
		decision,
		location,
		jurisdiction,
		language,
		proofConfig,
	} = params;

	if (snapshot?.valid && snapshot.payload) {
		const sp = snapshot.payload;
		return {
			tenantId,
			policyId: sp.policyId,
			fingerprint: sp.fingerprint,
			matchedBy: sp.matchedBy,
			countryCode: sp.country,
			regionCode: sp.region,
			jurisdiction: sp.jurisdiction,
			language: sp.language,
			model: sp.model,
			policyI18n: sp.policyI18n,
			uiMode: sp.uiMode,
			bannerUi: sp.bannerUi,
			dialogUi: sp.dialogUi,
			categories: sp.categories,
			preselectedCategories: sp.preselectedCategories,
			proofConfig: sp.proofConfig,
			dedupeKey: buildRuntimeDecisionDedupeKey({
				tenantId,
				fingerprint: sp.fingerprint,
				matchedBy: sp.matchedBy,
				countryCode: sp.country,
				regionCode: sp.region,
				jurisdiction: sp.jurisdiction,
				language: sp.language,
			}),
			source: 'snapshot_token' as const,
		};
	}

	if (decision) {
		return {
			tenantId,
			policyId: decision.policy.id,
			fingerprint: decision.fingerprint,
			matchedBy: decision.matchedBy,
			countryCode: location.countryCode,
			regionCode: location.regionCode,
			jurisdiction,
			language,
			model: decision.policy.model,
			policyI18n: decision.policy.i18n,
			uiMode: decision.policy.ui?.mode,
			bannerUi: decision.policy.ui?.banner,
			dialogUi: decision.policy.ui?.dialog,
			categories: decision.policy.consent?.categories,
			preselectedCategories: decision.policy.consent?.preselectedCategories,
			proofConfig,
			dedupeKey: buildRuntimeDecisionDedupeKey({
				tenantId,
				fingerprint: decision.fingerprint,
				matchedBy: decision.matchedBy,
				countryCode: location.countryCode,
				regionCode: location.regionCode,
				jurisdiction,
				language,
			}),
			source: 'write_time_fallback' as const,
		};
	}

	return undefined;
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

function resolveSnapshotFailureMode(
	ctx: C15TContext
): 'reject' | 'resolve_current' {
	return ctx.policySnapshot?.onValidationFailure ?? 'reject';
}

function buildSnapshotHttpException(
	reason: PolicySnapshotVerificationFailureReason
): HTTPException {
	switch (reason) {
		case 'missing':
			return new HTTPException(409, {
				message: 'Policy snapshot token is required',
				cause: { code: 'POLICY_SNAPSHOT_REQUIRED' },
			});
		case 'expired':
			return new HTTPException(409, {
				message: 'Policy snapshot token has expired',
				cause: { code: 'POLICY_SNAPSHOT_EXPIRED' },
			});
		case 'malformed':
		case 'invalid':
			return new HTTPException(409, {
				message: 'Policy snapshot token is invalid',
				cause: { code: 'POLICY_SNAPSHOT_INVALID' },
			});
	}
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
				'`cookie_banner` policy type is deprecated in 2.0 RC and will be removed in 2.0 GA. Use backend runtime `policyPacks` for banner behavior.'
			);
		}

		const request = c.req.raw ?? new Request('https://c15t.local/subjects');
		const acceptLanguage = request.headers.get('accept-language');
		const requestLanguage = parseLanguageFromHeader(acceptLanguage);
		const location = await getLocation(request, ctx);
		const resolvedJurisdiction = getJurisdiction(location, ctx);
		const snapshotVerification = await verifyPolicySnapshotToken({
			token: input.policySnapshotToken,
			options: ctx.policySnapshot,
			tenantId: ctx.tenantId,
		});
		const hasValidSnapshot = snapshotVerification.valid;
		const snapshotPayload = snapshotVerification.valid
			? snapshotVerification.payload
			: null;
		const shouldRequireSnapshot =
			!!ctx.policySnapshot?.signingKey &&
			resolveSnapshotFailureMode(ctx) === 'reject';
		if (!hasValidSnapshot && shouldRequireSnapshot) {
			throw buildSnapshotHttpException(snapshotVerification.reason);
		}
		const resolvedPolicyDecision = hasValidSnapshot
			? undefined
			: await resolvePolicyDecision({
					policies: ctx.policyPacks,
					countryCode: location.countryCode,
					regionCode: location.regionCode,
					jurisdiction: resolvedJurisdiction,
					iabEnabled: ctx.iab?.enabled === true,
				});
		const effectivePolicy =
			hasValidSnapshot && snapshotPayload
				? {
						id: snapshotPayload.policyId,
						model: snapshotPayload.model,
						i18n: snapshotPayload.policyI18n,
						consent: {
							expiryDays: snapshotPayload.expiryDays,
							scopeMode: snapshotPayload.scopeMode,
							categories: snapshotPayload.categories,
							preselectedCategories: snapshotPayload.preselectedCategories,
							gpc: snapshotPayload.gpc,
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
		let appliedPreferences: Record<string, boolean> | undefined;

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
				effectivePolicy?.consent?.scopeMode ?? 'permissive';
			const hasWildcardCategoryScope =
				allowedCategories?.includes('*') === true;
			const appliedPreferenceEntries = Object.entries(preferences);
			let filteredAppliedPreferenceEntries = appliedPreferenceEntries;

			if (
				allowedCategories &&
				allowedCategories.length > 0 &&
				!hasWildcardCategoryScope
			) {
				const disallowed = appliedPreferenceEntries
					.map(([purpose]) => purpose)
					.filter((purpose) => !allowedCategories.includes(purpose));
				filteredAppliedPreferenceEntries = appliedPreferenceEntries.filter(
					([purpose]) => allowedCategories.includes(purpose)
				);
				if (disallowed.length > 0 && effectiveScopeMode === 'strict') {
					throw new HTTPException(400, {
						message: 'Preferences include categories not allowed by policy',
						cause: { code: 'PURPOSE_NOT_ALLOWED', disallowed },
					});
				}
			}

			appliedPreferences = Object.fromEntries(filteredAppliedPreferenceEntries);
			const filteredConsentedPurposeCodes = filteredAppliedPreferenceEntries
				.filter(([_, isConsented]) => isConsented)
				.map(([purposeCode]) => purposeCode);

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

		const decisionPayload = buildDecisionPayload({
			tenantId: ctx.tenantId,
			snapshot:
				hasValidSnapshot && snapshotPayload
					? { valid: true, payload: snapshotPayload }
					: null,
			decision: resolvedPolicyDecision,
			location: {
				countryCode: location.countryCode,
				regionCode: location.regionCode,
			},
			jurisdiction: resolvedJurisdiction,
			language: effectiveLanguage,
			proofConfig,
		});

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
				appliedPreferences,
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
					(await tx
						.create('runtimePolicyDecision', {
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
							policyI18n: decisionPayload.policyI18n
								? { json: decisionPayload.policyI18n }
								: undefined,
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
							preselectedCategories: decisionPayload.preselectedCategories
								? { json: decisionPayload.preselectedCategories }
								: undefined,
							proofConfig: decisionPayload.proofConfig
								? { json: decisionPayload.proofConfig }
								: undefined,
							dedupeKey: decisionPayload.dedupeKey,
						})
						.catch(async () =>
							// Race: another request may have inserted the same dedupeKey
							tx.findFirst('runtimePolicyDecision', {
								where: (b) => b('dedupeKey', '=', decisionPayload.dedupeKey),
							})
						)))
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
			appliedPreferences,
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
