/**
 * Runtime policy decisions.
 *
 * A decision records *why* a given consent was collected the way it was: which
 * policy matched, for which location and language, with which UI. It is the evidence
 * behind a consent record, so it has to be reproducible — the same inputs must
 * resolve to the same decision row rather than accumulating near-duplicates
 * that make an audit ambiguous.
 *
 * Deduplication is on `dedupeKey`, which the caller derives from fingerprint,
 * match reason, geo and language. That key is unique in the schema, so the
 * database enforces it rather than the application hoping.
 *
 * ## The key is namespaced by tenant here, not scoped by the constraint
 *
 * The unique is on `dedupeKey` alone — that is the shape shipped 2.0.0 created,
 * and it is in every production database. Two tenants resolving the same
 * decision would therefore collide: the second loses the conflict and is
 * handed **the first tenant's decision row**, so its consent record ends up
 * citing another tenant's evidence.
 *
 * The obvious repair — `unique (tenantId, dedupeKey)` — is wrong, and measurably
 * so. `tenantId` is NULL for single-tenant deployments, and SQL treats NULLs as
 * distinct in a unique constraint, so a composite would admit unlimited
 * duplicates for exactly the deployments that are most common. That is asserted
 * rather than assumed — `a composite unique would not have worked` in the tests
 * beside this file inserts two `(null, 'same')` rows on every engine in the
 * matrix, and fails if one ever starts rejecting them.
 *
 * So the tenant goes into the key's *value* instead, which needs no migration
 * and no constraint change. `buildLegalDocumentPolicyId` already derives its id
 * the same way.
 *
 * v3 keys never match 2.x rows: the policy fingerprint in them is a different
 * hash. A database upgraded from 2.x records each decision once more on first
 * use, then deduplicates as before. Old consents keep pointing at old rows.
 */

import { generateEntityId, hashSha256Hex } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId } from '../db/tenant';

export interface DecisionInput {
	readonly policyId: string;
	readonly fingerprint: string;
	readonly matchedBy: string;
	readonly countryCode?: string | null;
	readonly regionCode?: string | null;
	readonly language?: string | null;
	readonly model: string;
	readonly dedupeKey: string;
	readonly policyI18n?: unknown;
	readonly uiMode?: string | null;
	readonly bannerUi?: unknown;
	readonly dialogUi?: unknown;
	readonly categories?: unknown;
	readonly preselectedCategories?: unknown;
	readonly proofConfig?: unknown;
}

/**
 * The stored key: hashed, and tenant-qualified when there is a tenant.
 *
 * Hashing bounds the key at 66 characters whatever goes in. The column is
 * `indexedText`, which is `varchar(255)` on MySQL because MySQL cannot index
 * TEXT without a prefix length. `buildLegalDocumentPolicyId` does the same,
 * for the same reason.
 */
export const scopedDedupeKey = async (
	tenantId: string | undefined,
	dedupeKey: string
): Promise<string> => {
	if (tenantId === undefined) {
		return `d_${await hashSha256Hex(JSON.stringify([dedupeKey]))}`;
	}

	const digest = await hashSha256Hex(JSON.stringify([tenantId, dedupeKey]));
	return `t_${digest}`;
};

const json = (value: unknown) =>
	value === undefined || value === null ? null : JSON.stringify(value);

/**
 * Records a decision, or returns the existing one for the same inputs.
 *
 * One statement. `dedupeKey` is unique, so a concurrent duplicate loses the
 * conflict rather than creating a second row, and the follow-up select only
 * runs when that happens.
 */
export const recordDecision = Effect.fn('decision.record')(
	function* recordDecision(input: DecisionInput) {
		const sql = yield* SqlClient.SqlClient;
		const id = generateEntityId('runtimePolicyDecision');
		// From the scope rather than the input: the key arrives in the request body,
		// so a caller could otherwise namespace itself into another tenant.
		const tenantId = yield* currentTenantId;
		const dedupeKey = yield* Effect.promise(() =>
			scopedDedupeKey(tenantId, input.dedupeKey)
		);

		const created = yield* insertOnce({
			// Any unique index, not only one on exactly `dedupeKey`: a database
			// changed by hand, such as one indexed on `(tenantId, dedupeKey)`,
			// would otherwise fail every consent save on Postgres. The other
			// unique index the migrator creates is the random primary key.
			// `migrate --plan` reports the missing index.
			anyUniqueConflict: true,
			conflictOn: 'dedupeKey',
			into: 'runtimePolicyDecision',
			values: {
				bannerUi: json(input.bannerUi),
				categories: json(input.categories),
				countryCode: input.countryCode ?? null,
				createdAt: new Date(),
				dedupeKey,
				dialogUi: json(input.dialogUi),
				fingerprint: input.fingerprint,
				id,
				// 2.x stored a regulation label here. Nullable since migration 7.
				jurisdiction: null,
				language: input.language ?? null,
				matchedBy: input.matchedBy,
				model: input.model,
				policyI18n: json(input.policyI18n),
				policyId: input.policyId,
				preselectedCategories: json(input.preselectedCategories),
				proofConfig: json(input.proofConfig),
				regionCode: input.regionCode ?? null,
				tenantId: tenantId ?? null,
				uiMode: input.uiMode ?? null,
			},
		});

		if (created) {
			return { created: true, id };
		}

		// Lost the conflict: someone already recorded this exact decision. Unlike
		// consent, the id here is random rather than derived, so the existing
		// row's id has to be read back rather than recomputed.
		const existing = yield* sql<{ id: string }>`
		select ${sql('id')} from ${sql('runtimePolicyDecision')}
		where ${sql('dedupeKey')} = ${dedupeKey}
	`;

		const [row] = existing;
		if (row === undefined) {
			// The conflict was on some other unique index the table carries, not
			// on this key. Returning `id` would hand back a row that was never
			// written.
			return yield* Effect.die(
				new Error(
					'runtimePolicyDecision insert conflicted on a unique index other than dedupeKey; run `c15t self-host migrate --plan` to check the schema'
				)
			);
		}
		return { created: false, id: row.id };
	}
);
