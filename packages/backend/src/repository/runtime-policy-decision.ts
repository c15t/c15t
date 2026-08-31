/**
 * Runtime policy decisions.
 *
 * A decision records *why* a given consent was collected the way it was: which
 * policy matched, under which jurisdiction, with which UI. It is the evidence
 * behind a consent record, so it has to be reproducible — the same inputs must
 * resolve to the same decision row rather than accumulating near-duplicates
 * that make an audit ambiguous.
 *
 * Deduplication is on `dedupeKey`, which the caller derives from fingerprint,
 * match reason, geo and jurisdiction. That key is unique in the schema, so the
 * database enforces it rather than the application hoping.
 *
 * ## The key is namespaced by tenant here, not scoped by the constraint
 *
 * The unique is on `dedupeKey` alone — that is the shape shipped 2.0.0 created,
 * and it is in every production database. Two tenants sending the same
 * client-supplied key therefore collide: the second loses the conflict and is
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
 * Only namespaced when a tenant is set, deliberately: a single-tenant database
 * adopted from 2.x keeps producing byte-identical keys, so its existing rows
 * still deduplicate rather than every decision being recorded a second time
 * after the upgrade.
 */

import { generateEntityId, hashSha256Hex } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId } from '../db/tenant';

export interface DecisionInput {
	readonly policyId: string;
	readonly fingerprint: string;
	readonly matchedBy: string;
	readonly countryCode?: string | null;
	readonly regionCode?: string | null;
	readonly jurisdiction: string;
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
 * The stored key: bounded and tenant-qualified when there is a tenant,
 * untouched when there is not.
 *
 * Concatenating `${tenantId}|${dedupeKey}` was the obvious form and overflows:
 * the column is `indexedText`, which is `varchar(255)` on MySQL because MySQL
 * cannot index TEXT without a prefix length. A client-supplied key already near
 * that width would push past it once prefixed, so a key that recorded fine
 * before scoping would start failing. Hashing bounds it at 71 characters
 * whatever goes in — the same thing `buildLegalDocumentPolicyId` does, for the
 * same reason.
 *
 * The lengths are part of the hashed input, so `("a|b", "c")` and `("a", "b|c")`
 * cannot collide on a shared separator.
 *
 * Untouched without a tenant, deliberately: a single-tenant database adopted
 * from 2.x keeps producing byte-identical keys, so its existing rows still
 * deduplicate rather than every decision being written a second time after the
 * upgrade.
 */
export const scopedDedupeKey = async (
	tenantId: string | undefined,
	dedupeKey: string
): Promise<string> => {
	if (tenantId === undefined) {
		return dedupeKey;
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
				jurisdiction: input.jurisdiction,
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

		return { created: false, id: existing[0]?.id ?? id };
	}
);
