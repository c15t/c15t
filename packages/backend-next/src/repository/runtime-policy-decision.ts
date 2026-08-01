/**
 * Runtime policy decisions.
 *
 * A decision records *why* a given consent was collected the way it was: which
 * policy matched, under which jurisdiction, with which UI. It is the evidence
 * behind a consent record, so it has to be reproducible — the same inputs must
 * resolve to the same decision row rather than accumulating near-duplicates
 * that make an audit ambiguous.
 *
 * Deduplication is on `dedupeKey`, which the caller derives from tenant,
 * fingerprint, match reason, geo and jurisdiction. That key is unique in the
 * schema, so the database enforces it rather than the application hoping.
 */

import { generateEntityId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { insertOnce } from '../db/insert-once';

export interface DecisionInput {
	readonly tenantId?: string | null;
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

const json = (value: unknown) =>
	value === undefined || value === null ? null : JSON.stringify(value);

/**
 * Records a decision, or returns the existing one for the same inputs.
 *
 * One statement. `dedupeKey` is unique, so a concurrent duplicate loses the
 * conflict rather than creating a second row, and the follow-up select only
 * runs when that happens.
 */
export const recordDecision = Effect.fn('decision.record')(function* (
	input: DecisionInput
) {
	const sql = yield* SqlClient.SqlClient;
	const id = generateEntityId('runtimePolicyDecision');

	const created = yield* insertOnce({
		into: 'runtimePolicyDecision',
		conflictOn: 'dedupeKey',
		values: {
			id,
			tenantId: input.tenantId ?? null,
			policyId: input.policyId,
			fingerprint: input.fingerprint,
			matchedBy: input.matchedBy,
			countryCode: input.countryCode ?? null,
			regionCode: input.regionCode ?? null,
			jurisdiction: input.jurisdiction,
			language: input.language ?? null,
			model: input.model,
			policyI18n: json(input.policyI18n),
			uiMode: input.uiMode ?? null,
			bannerUi: json(input.bannerUi),
			dialogUi: json(input.dialogUi),
			categories: json(input.categories),
			preselectedCategories: json(input.preselectedCategories),
			proofConfig: json(input.proofConfig),
			dedupeKey: input.dedupeKey,
			createdAt: new Date(),
		},
	});

	if (created) {
		return { id, created: true };
	}

	// Lost the conflict: someone already recorded this exact decision. Unlike
	// consent, the id here is random rather than derived, so the existing
	// row's id has to be read back rather than recomputed.
	const existing = yield* sql<{ id: string }>`
		select ${sql('id')} from ${sql('runtimePolicyDecision')}
		where ${sql('dedupeKey')} = ${input.dedupeKey}
	`;

	return { id: existing[0]?.id ?? id, created: false };
});
