import { createDeterministicFingerprint } from '@c15t/schema/types';
import { generateDeterministicId } from '~/db/registry/utils/generate-id';
import type { C15TContext, WriteReplayClaim, WriteReplayStore } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';

type ReplayDatabase = Pick<C15TContext['db'], 'create' | 'findFirst'>;

/** Stable result of consuming a credential replay claim. */
export type WriteReplayConsumptionResult =
	| { status: 'consumed' }
	| { status: 'idempotent' }
	| { status: 'replayed' };

/** Inputs for the built-in or custom replay consumer. */
export interface ConsumeWriteReplayOptions {
	/** Replay claim derived from a verified credential. */
	claim: WriteReplayClaim;
	/** Database used by the built-in atomic consumer. */
	database: ReplayDatabase;
	/** Optional custom atomic store from write-integrity configuration. */
	replayStore?: WriteReplayStore;
}

function isUniqueConstraintViolation(error: unknown): boolean {
	const code =
		typeof error === 'object' && error !== null && 'code' in error
			? String((error as { code: unknown }).code)
			: undefined;

	if (
		code === '23505' ||
		code === 'ER_DUP_ENTRY' ||
		code === '1062' ||
		code === 'P2002' ||
		code?.startsWith('SQLITE_CONSTRAINT')
	) {
		return true;
	}

	const message = extractErrorMessage(error).toLowerCase();
	return (
		message.includes('unique constraint') ||
		message.includes('unique violation') ||
		message.includes('duplicate key') ||
		message.includes('duplicate entry') ||
		message.includes('unique conflict')
	);
}

/**
 * Derives the primary key used to atomically consume a write credential.
 *
 * The ID intentionally excludes the request fingerprint. An altered retry of
 * the same token therefore collides with the original row and is rejected.
 *
 * @param claim - Verified credential replay claim
 * @returns Stable `wrp_` identifier scoped by tenant, audience, and token ID
 */
export function buildWriteReplayId(claim: WriteReplayClaim): Promise<string> {
	return generateDeterministicId('writeReplay', 0, [
		claim.tenantId ?? null,
		claim.audience,
		claim.tokenId,
	]);
}

/**
 * Builds a stable SHA-256 fingerprint for the request fields authorized by a
 * credential.
 *
 * Object keys are recursively sorted, while array order remains significant.
 * This helper intentionally does not guess which fields are proof material:
 * callers must pass a payload that already excludes capability/assertion token
 * strings and includes every action field that should be replay-bound.
 *
 * @param payload - Caller-selected request and action fields to bind
 * @returns Stable, algorithm-prefixed request fingerprint
 */
export async function buildWriteRequestFingerprint(
	payload: unknown
): Promise<string> {
	return `sha256:${await createDeterministicFingerprint(payload)}`;
}

/**
 * Atomically consumes a verified write credential.
 *
 * The built-in implementation inserts a deterministic primary key before
 * performing any read. A unique-key conflict proves that another request won
 * the race; the stored fingerprint then distinguishes an exact idempotent
 * retry from a modified replay. Custom stores use their atomic `consume`
 * contract; because that contract returns only a boolean, an existing custom
 * claim is conservatively reported as `replayed`.
 *
 * @param options - Claim, database, and optional custom store
 * @returns Whether the credential was consumed, retried exactly, or replayed
 * @throws The storage error when replay state cannot be determined safely
 */
export async function consumeWriteReplay(
	options: ConsumeWriteReplayOptions
): Promise<WriteReplayConsumptionResult> {
	const { claim, database, replayStore } = options;

	if (replayStore) {
		const result = await replayStore.consume(claim);
		if (typeof result === 'boolean') {
			return result ? { status: 'consumed' } : { status: 'replayed' };
		}

		if (
			result.status === 'consumed' ||
			result.status === 'idempotent' ||
			result.status === 'replayed'
		) {
			return result;
		}

		throw new TypeError('Replay store returned an invalid consumption result');
	}

	const id = await buildWriteReplayId(claim);
	let insertError: unknown;
	try {
		await database.create('writeReplay', {
			id,
			tenantId: claim.tenantId ?? null,
			audience: claim.audience,
			tokenId: claim.tokenId,
			requestFingerprint: claim.requestFingerprint,
			expiresAt: claim.expiresAt,
		});
		return { status: 'consumed' };
	} catch (error) {
		if (!isUniqueConstraintViolation(error)) {
			throw error;
		}
		insertError = error;
	}

	const existing = await database.findFirst('writeReplay', {
		where: (builder) => builder('id', '=', id),
	});

	if (!existing) {
		throw insertError;
	}

	const sameCredential =
		existing.tokenId === claim.tokenId &&
		existing.audience === claim.audience &&
		(existing.tenantId ?? undefined) === claim.tenantId;

	return sameCredential &&
		existing.requestFingerprint === claim.requestFingerprint
		? { status: 'idempotent' }
		: { status: 'replayed' };
}
