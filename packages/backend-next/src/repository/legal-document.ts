/**
 * Legal document releases.
 *
 * Syncing a release makes it the current one for its type, which means exactly
 * one policy of a given type may be active at a time. That invariant is what
 * `isLatestPolicy` on every consent is derived from, so breaking it silently
 * invalidates consent validity checks across the whole system.
 *
 * Enforced in a transaction rather than by convention: deactivating the old
 * and activating the new must not be observable as two separate states, or a
 * concurrent read sees either zero or two active policies for the type.
 */

import { hashSha256Hex } from '@c15t/schema';
import { Data, Effect } from 'effect';
import { SqlClient, SqlError } from 'effect/unstable/sql';

export interface LegalDocumentRelease {
	readonly tenantId?: string;
	readonly type: string;
	readonly version: string;
	readonly hash: string;
	readonly effectiveDate: Date;
}

export interface SyncedPolicy {
	readonly id: string;
	readonly type: string;
	readonly version: string;
	readonly hash: string;
	readonly effectiveDate: Date;
	readonly isActive: boolean;
}

/**
 * Raised when a release reuses a hash under different metadata.
 *
 * The hash identifies the document's content, so the same hash claiming a
 * different version or effective date means the caller has two different ideas
 * about what a document says. Accepting either silently would corrupt the
 * record of what a subject actually consented to.
 */
export class LegalDocumentConflictError extends Data.TaggedError(
	'LegalDocumentConflictError'
)<{
	readonly message: string;
}> {}

/**
 * Deterministic policy id from tenant, type and content hash.
 *
 * Matches `buildLegalDocumentPolicyId` in `@c15t/backend` exactly — the same
 * inputs joined the same way — so re-syncing the same release through either
 * backend resolves to the same row rather than creating a second one.
 */
export const buildLegalDocumentPolicyId = (input: {
	tenantId?: string;
	type: string;
	hash: string;
}): Promise<string> =>
	hashSha256Hex(
		[input.tenantId ?? 'default', input.type, input.hash].join('|')
	).then((digest) => `pol_${digest}`);

/**
 * Marks a release as the current one for its type.
 *
 * Idempotent: syncing the same release twice returns the same policy without
 * a second row.
 */
export const syncCurrent = Effect.fn('legalDocument.syncCurrent')(function* (
	release: LegalDocumentRelease
): Generator<
	Effect.Effect<
		unknown,
		SqlError.SqlError | LegalDocumentConflictError,
		SqlClient.SqlClient
	>,
	SyncedPolicy
> {
	const sql = yield* SqlClient.SqlClient;
	const id = yield* Effect.promise(() =>
		buildLegalDocumentPolicyId({
			tenantId: release.tenantId,
			type: release.type,
			hash: release.hash,
		})
	);

	return yield* sql.withTransaction(
		Effect.gen(function* () {
			const existing = yield* sql<{
				id: string;
				type: string;
				version: string;
				hash: string | null;
				effectiveDate: Date;
				isActive: boolean;
			}>`select * from "consentPolicy" where "id" = ${id}`;

			const found = existing[0];

			if (found) {
				// Same content hash must mean same metadata, or the caller has
				// two different ideas about what this document says.
				if (
					found.version !== release.version ||
					found.effectiveDate.getTime() !== release.effectiveDate.getTime()
				) {
					return yield* new LegalDocumentConflictError({
						message: 'Release metadata conflicts with existing consent policy',
					});
				}

				yield* sql`
					update "consentPolicy" set "isActive" = ${false}
					where "type" = ${release.type} and "isActive" = ${true} and "id" <> ${id}
				`;

				if (!found.isActive) {
					yield* sql`update "consentPolicy" set "isActive" = ${true} where "id" = ${id}`;
				}

				return {
					id: found.id,
					type: found.type,
					version: found.version,
					hash: found.hash ?? release.hash,
					effectiveDate: found.effectiveDate,
					isActive: true,
				};
			}

			yield* sql`
				update "consentPolicy" set "isActive" = ${false}
				where "type" = ${release.type} and "isActive" = ${true}
			`;

			yield* sql`
				insert into "consentPolicy"
					("id","version","type","hash","effectiveDate","isActive","createdAt","tenantId")
				values (${id}, ${release.version}, ${release.type}, ${release.hash},
					${release.effectiveDate}, ${true}, ${new Date()}, ${release.tenantId ?? null})
			`;

			return {
				id,
				type: release.type,
				version: release.version,
				hash: release.hash,
				effectiveDate: release.effectiveDate,
				isActive: true,
			};
		})
	);
});
