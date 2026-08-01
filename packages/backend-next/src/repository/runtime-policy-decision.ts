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

	const inserted = yield* sql<{ id: string }>`
		insert into "runtimePolicyDecision" (
			"id","tenantId","policyId","fingerprint","matchedBy","countryCode",
			"regionCode","jurisdiction","language","model","policyI18n","uiMode",
			"bannerUi","dialogUi","categories","preselectedCategories",
			"proofConfig","dedupeKey","createdAt"
		) values (
			${id}, ${input.tenantId ?? null}, ${input.policyId}, ${input.fingerprint},
			${input.matchedBy}, ${input.countryCode ?? null}, ${input.regionCode ?? null},
			${input.jurisdiction}, ${input.language ?? null}, ${input.model},
			${json(input.policyI18n)}, ${input.uiMode ?? null}, ${json(input.bannerUi)},
			${json(input.dialogUi)}, ${json(input.categories)},
			${json(input.preselectedCategories)}, ${json(input.proofConfig)},
			${input.dedupeKey}, ${new Date()}
		)
		on conflict ("dedupeKey") do nothing
		returning "id"
	`;

	const created = inserted[0];
	if (created) {
		return { id: created.id, created: true };
	}

	// Lost the conflict: someone already recorded this exact decision.
	const existing = yield* sql<{ id: string }>`
		select "id" from "runtimePolicyDecision" where "dedupeKey" = ${input.dedupeKey}
	`;

	return { id: existing[0]?.id ?? id, created: false };
});
