import { generateDeterministicId } from '~/db/registry/utils/generate-id';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';

type ConsentLookupDatabase = Pick<C15TContext['db'], 'findFirst'>;

export interface ConsentSubmissionIdentity {
	tenantId?: string;
	subjectId: string;
	domainId: string;
	policyId?: string | null;
	givenAt: Date;
}

/**
 * Derives the consent record's primary key from the fields that identify a
 * single consent submission.
 *
 * @param input - Fields identifying the consent submission
 * @returns The deterministic `cns_`-prefixed consent ID
 */
export function buildConsentId(
	input: ConsentSubmissionIdentity
): Promise<string> {
	return generateDeterministicId('consent', input.givenAt.getTime(), [
		input.tenantId ?? null,
		input.subjectId,
		input.domainId,
		input.policyId ?? null,
		input.givenAt.toISOString(),
	]);
}

/**
 * Finds a consent by its deterministic primary key.
 *
 * @param database - Database used for the lookup
 * @param consentId - Deterministic consent primary key
 * @returns The matching consent, or `null` when it does not exist
 */
export function findConsentById(
	database: ConsentLookupDatabase,
	consentId: string
) {
	return database.findFirst('consent', {
		where: (builder) => builder('id', '=', consentId),
	});
}

/**
 * Finds an existing consent written by either the current deterministic-ID
 * implementation or an older random-ID implementation.
 *
 * The legacy lookup must run whenever the primary-key lookup misses. During a
 * rolling deployment, an older process can write a random-ID row after a newer
 * process has started, so process start time cannot safely distinguish legacy
 * rows.
 *
 * @param database - Database used for the lookup
 * @param consentId - Deterministic consent primary key
 * @param identity - Fields identifying the consent submission
 * @returns The matching current or legacy consent, or `null`
 */
export async function findExistingConsentSubmission(
	database: ConsentLookupDatabase,
	consentId: string,
	identity: ConsentSubmissionIdentity
) {
	const deterministicConsent = await findConsentById(database, consentId);
	if (deterministicConsent) {
		return deterministicConsent;
	}

	return database.findFirst('consent', {
		where: (builder) =>
			builder.and(
				builder('subjectId', '=', identity.subjectId),
				builder('domainId', '=', identity.domainId),
				builder('policyId', '=', identity.policyId ?? null),
				builder('givenAt', '=', identity.givenAt),
				identity.tenantId === undefined
					? builder.isNull('tenantId')
					: builder('tenantId', '=', identity.tenantId)
			),
	});
}

/**
 * Detects unique-constraint violations, including primary-key conflicts,
 * across the supported database adapters.
 *
 * @param error - Database error or wrapped database error
 * @returns Whether the error represents a unique-constraint violation
 */
export function isUniqueConstraintViolationError(error: unknown): boolean {
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
