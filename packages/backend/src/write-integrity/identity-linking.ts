import { HTTPException } from 'hono/http-exception';
import { generateUniqueId } from '~/db/registry/utils';
import type { C15TContext, WriteProvenance } from '~/types';
import { enforceWriteAbuseControl } from './abuse-control';
import type { ResolvedWriteIntegrityOptions } from './configuration';
import { resolveWriteDomain } from './domain';
import {
	type IdentityAssertionAction,
	verifyIdentityAssertion,
} from './identity-assertion';
import { buildWriteRequestFingerprint, consumeWriteReplay } from './replay';
import { verifySubjectCapability } from './subject-capability';
import type { WriteIntegrityVerificationFailureReason } from './token';

interface IdentityCredentialProvenance {
	type: 'subject_capability' | 'identity_assertion';
	credentialId: string;
	issuer: string;
}

/** Input for an external-identity link or reassignment. */
export interface LinkSubjectIdentityInput {
	subjectId: string;
	externalId: string;
	identityProvider: string;
	domain?: string;
	subjectCapability?: string;
	identityAssertion?: string;
	request: Request;
}

/** Result of applying an identity link. */
export interface LinkSubjectIdentityResult {
	status: 'linked' | 'reassigned' | 'idempotent';
	provenance: WriteProvenance;
}

function buildCredentialHttpException(
	type: 'Subject capability' | 'Identity assertion',
	codePrefix: 'SUBJECT_CAPABILITY' | 'IDENTITY_ASSERTION',
	reason: WriteIntegrityVerificationFailureReason
): HTTPException {
	if (reason === 'missing') {
		return new HTTPException(401, {
			message: `${type} is required`,
			cause: { code: `${codePrefix}_REQUIRED` },
		});
	}

	if (reason === 'expired') {
		return new HTTPException(401, {
			message: `${type} has expired`,
			cause: { code: `${codePrefix}_EXPIRED` },
		});
	}

	return new HTTPException(403, {
		message: `${type} is invalid`,
		cause: { code: `${codePrefix}_INVALID` },
	});
}

function buildIdentityConflictException(): HTTPException {
	return new HTTPException(409, {
		message: 'Subject is already linked to a different external identity',
		cause: { code: 'IDENTITY_ALREADY_LINKED' },
	});
}

function resolveOperation(params: {
	currentExternalId: string | null;
	currentIdentityProvider: string | null;
	externalId: string;
	identityProvider: string;
}): { action: IdentityAssertionAction; exactMatch: boolean } {
	const exactMatch =
		params.currentExternalId === params.externalId &&
		params.currentIdentityProvider === params.identityProvider;

	return {
		action:
			params.currentExternalId === null || exactMatch
				? 'identity:link'
				: 'identity:reassign',
		exactMatch,
	};
}

function resolveProofMode(
	writeIntegrity: ResolvedWriteIntegrityOptions,
	action: IdentityAssertionAction
):
	| 'legacy'
	| 'capability'
	| 'assertion'
	| 'capability-and-assertion'
	| 'disabled' {
	if (action === 'identity:link') {
		return writeIntegrity.identityLinking.mode;
	}

	return writeIntegrity.identityLinking.reassignment;
}

async function consumeCredential(params: {
	ctx: C15TContext;
	writeIntegrity: ResolvedWriteIntegrityOptions;
	tokenId: string;
	audience: string;
	expiresAt: Date;
	requestFingerprint: string;
	errorCode: 'SUBJECT_CAPABILITY_REPLAYED' | 'IDENTITY_ASSERTION_REPLAYED';
	errorMessage: string;
}): Promise<void> {
	const replay = await consumeWriteReplay({
		claim: {
			tokenId: params.tokenId,
			tenantId: params.ctx.tenantId,
			audience: params.audience,
			requestFingerprint: params.requestFingerprint,
			expiresAt: params.expiresAt,
		},
		database: params.ctx.db,
		replayStore: params.writeIntegrity.replayStore,
	});

	if (replay.status === 'replayed') {
		throw new HTTPException(409, {
			message: params.errorMessage,
			cause: { code: params.errorCode },
		});
	}
}

/**
 * Links a subject to an external identity under the resolved write-integrity
 * policy. Secure modes use compare-and-set semantics; legacy mode preserves
 * the v2 public replacement behavior.
 */
export async function linkSubjectIdentity(params: {
	ctx: C15TContext;
	writeIntegrity: ResolvedWriteIntegrityOptions;
	input: LinkSubjectIdentityInput;
}): Promise<LinkSubjectIdentityResult> {
	const { ctx, writeIntegrity, input } = params;
	const subject = await ctx.db.findFirst('subject', {
		where: (builder) => builder('id', '=', input.subjectId),
	});

	if (!subject) {
		throw new HTTPException(404, {
			message: 'Subject not found',
			cause: { code: 'SUBJECT_NOT_FOUND', subjectId: input.subjectId },
		});
	}

	const operation = resolveOperation({
		currentExternalId: subject.externalId,
		currentIdentityProvider: subject.identityProvider,
		externalId: input.externalId,
		identityProvider: input.identityProvider,
	});
	const proofMode = resolveProofMode(writeIntegrity, operation.action);
	if (proofMode === 'disabled') {
		if (operation.exactMatch) {
			return {
				status: 'idempotent',
				provenance: { source: 'anonymous', origin: ctx.origin },
			};
		}

		throw new HTTPException(operation.action === 'identity:link' ? 403 : 409, {
			message:
				operation.action === 'identity:link'
					? 'Identity linking is disabled'
					: 'Identity reassignment is disabled',
			cause: {
				code:
					operation.action === 'identity:link'
						? 'IDENTITY_LINKING_DISABLED'
						: 'IDENTITY_REASSIGNMENT_DISABLED',
			},
		});
	}

	const writeOrigin =
		ctx.origin ?? input.request.headers.get('origin') ?? undefined;
	const resolvedDomain =
		proofMode === 'legacy'
			? undefined
			: await resolveWriteDomain({
					options: writeIntegrity.domains,
					context: {
						action: operation.action,
						requestedDomain: input.domain,
						origin: writeOrigin,
						subjectId: input.subjectId,
						tenantId: ctx.tenantId,
						request: input.request,
					},
				});

	await enforceWriteAbuseControl(writeIntegrity.abuseControl, {
		action: operation.action,
		subjectId: input.subjectId,
		domain: resolvedDomain?.domain,
		origin: writeOrigin,
		ipAddress: ctx.ipAddress,
		tenantId: ctx.tenantId,
		request: input.request,
	});

	const requestFingerprint = await buildWriteRequestFingerprint({
		action: operation.action,
		tenantId: ctx.tenantId ?? null,
		subjectId: input.subjectId,
		domain: resolvedDomain?.domain ?? null,
		externalId: input.externalId,
		identityProvider: input.identityProvider,
	});
	const credentialProvenance: IdentityCredentialProvenance[] = [];

	if (proofMode === 'capability' || proofMode === 'capability-and-assertion') {
		const capabilityOptions = writeIntegrity.subjectCapability;
		if (!capabilityOptions) {
			throw new HTTPException(500, {
				message: 'Subject capability verification is not configured',
				cause: { code: 'SUBJECT_CAPABILITY_NOT_CONFIGURED' },
			});
		}

		const capability = await verifySubjectCapability({
			token: input.subjectCapability,
			options: capabilityOptions,
			tenantId: ctx.tenantId,
			subjectId: input.subjectId,
			action: operation.action,
			domain: resolvedDomain?.domain,
		});
		if (!capability.valid) {
			throw buildCredentialHttpException(
				'Subject capability',
				'SUBJECT_CAPABILITY',
				capability.reason
			);
		}

		await consumeCredential({
			ctx,
			writeIntegrity,
			tokenId: capability.payload.jti,
			audience: capability.payload.aud,
			expiresAt: new Date(capability.payload.exp * 1000),
			requestFingerprint,
			errorCode: 'SUBJECT_CAPABILITY_REPLAYED',
			errorMessage: 'Subject capability has already been used',
		});
		credentialProvenance.push({
			type: 'subject_capability',
			credentialId: capability.payload.jti,
			issuer: capability.payload.iss,
		});
	}

	if (proofMode === 'assertion' || proofMode === 'capability-and-assertion') {
		const assertionOptions = writeIntegrity.identityAssertion;
		if (!assertionOptions) {
			throw new HTTPException(500, {
				message: 'Identity assertion verification is not configured',
				cause: { code: 'IDENTITY_ASSERTION_NOT_CONFIGURED' },
			});
		}

		const assertion = await verifyIdentityAssertion({
			token: input.identityAssertion,
			options: assertionOptions,
			tenantId: ctx.tenantId,
			subjectId: input.subjectId,
			action: operation.action,
			domain: resolvedDomain?.domain,
			externalId: input.externalId,
			identityProvider: input.identityProvider,
		});
		if (!assertion.valid) {
			throw buildCredentialHttpException(
				'Identity assertion',
				'IDENTITY_ASSERTION',
				assertion.reason
			);
		}

		await consumeCredential({
			ctx,
			writeIntegrity,
			tokenId: assertion.payload.jti,
			audience: assertion.payload.aud,
			expiresAt: new Date(assertion.payload.exp * 1000),
			requestFingerprint,
			errorCode: 'IDENTITY_ASSERTION_REPLAYED',
			errorMessage: 'Identity assertion has already been used',
		});
		credentialProvenance.push({
			type: 'identity_assertion',
			credentialId: assertion.payload.jti,
			issuer: assertion.payload.iss,
		});
	}

	const primaryCredential = credentialProvenance.at(-1);
	const provenance: WriteProvenance = {
		source: primaryCredential?.type ?? 'legacy',
		credentialId: primaryCredential?.credentialId,
		issuer: primaryCredential?.issuer,
		origin: writeOrigin,
	};

	if (operation.exactMatch && proofMode !== 'legacy') {
		return { status: 'idempotent', provenance };
	}

	return ctx.db.transaction(async (tx) => {
		const current = await tx.findFirst('subject', {
			where: (builder) => builder('id', '=', input.subjectId),
		});
		if (!current) {
			throw new HTTPException(404, {
				message: 'Subject not found',
				cause: { code: 'SUBJECT_NOT_FOUND', subjectId: input.subjectId },
			});
		}

		const currentOperation = resolveOperation({
			currentExternalId: current.externalId,
			currentIdentityProvider: current.identityProvider,
			externalId: input.externalId,
			identityProvider: input.identityProvider,
		});
		if (currentOperation.exactMatch && proofMode !== 'legacy') {
			return { status: 'idempotent', provenance };
		}
		if (
			proofMode !== 'legacy' &&
			(current.externalId !== subject.externalId ||
				current.identityProvider !== subject.identityProvider)
		) {
			throw buildIdentityConflictException();
		}

		await tx.updateMany('subject', {
			where: (builder) =>
				proofMode === 'legacy'
					? builder('id', '=', input.subjectId)
					: builder.and(
							builder('id', '=', input.subjectId),
							subject.externalId === null
								? builder.isNull('externalId')
								: builder('externalId', '=', subject.externalId),
							builder('identityProvider', '=', subject.identityProvider)
						),
			set: {
				externalId: input.externalId,
				identityProvider: input.identityProvider,
				updatedAt: new Date(),
			},
		});

		const updated = await tx.findFirst('subject', {
			where: (builder) => builder('id', '=', input.subjectId),
		});
		if (
			!updated ||
			updated.externalId !== input.externalId ||
			updated.identityProvider !== input.identityProvider
		) {
			throw buildIdentityConflictException();
		}

		await tx.create('auditLog', {
			id: await generateUniqueId(tx, 'auditLog', ctx),
			subjectId: input.subjectId,
			entityType: 'subject',
			entityId: input.subjectId,
			actionType: 'identify_user',
			ipAddress: ctx.ipAddress || null,
			userAgent: ctx.userAgent || null,
			changes: {
				externalId: { from: current.externalId, to: input.externalId },
				identityProvider: {
					from: current.identityProvider,
					to: input.identityProvider,
				},
			},
			metadata: {
				externalId: input.externalId,
				identityProvider: input.identityProvider,
				writeProvenance: {
					...provenance,
					domain: resolvedDomain?.domain,
					credentials: credentialProvenance,
				},
			},
		});

		return {
			status:
				operation.action === 'identity:reassign' ? 'reassigned' : 'linked',
			provenance,
		};
	});
}
