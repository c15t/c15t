/**
 * Subject reads.
 *
 * This is the path RFC 0004 is largely an argument about. In `@c15t/backend`,
 * `GET /subjects?externalId=` costs:
 *
 * 1. one query for the subjects;
 * 2. `ceil(n / SUBJECT_ID_BATCH_SIZE)` **sequential** queries for their
 *    consents, hand-rolled in `list.handler.ts` because fumadb cannot join;
 * 3. one further **sequential** query per distinct policy type inside
 *    `consent-enrichment.ts`, in a loop that is not even `Promise.all`.
 *
 * So a subject with consents spanning four policy types costs six or more
 * round trips, and the count grows with the data. Every one of those queries
 * also hit unindexed columns until `2-hot-path-indexes` (§7).
 *
 * Here it is **two** queries, flat, regardless of how many subjects or policy
 * types are involved:
 *
 * 1. subjects left-joined to their consents;
 * 2. the latest active policy per type, ranked in SQL.
 *
 * The second could be folded into the first, but keeping it separate means it
 * is cacheable per tenant and independent of the subject being queried — the
 * shape of the data, not an accident of the query.
 */

import { generateEntityId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient, SqlError } from 'effect/unstable/sql';
import { tenantScope } from '../db/tenant';

export interface ConsentRow {
	readonly id: string;
	readonly subjectId: string;
	/**
	 * The policy's type, which the wire contract requires on every consent.
	 *
	 * 2.x fetched this in a second pass inside `consent-enrichment.ts`; joining
	 * it here costs nothing extra and keeps the whole read at one query.
	 */
	readonly type: string;
	readonly policyId: string | undefined;
	readonly policyVersion: string | undefined;
	readonly policyHash: string | undefined;
	readonly policyEffectiveDate: Date | undefined;
	readonly purposeIds: unknown;
	readonly givenAt: Date;
	/** True when this consent points at the newest active policy of its type. */
	readonly isLatestPolicy: boolean;
}

export interface SubjectWithConsents {
	readonly id: string;
	readonly externalId: string | null;
	readonly createdAt: Date;
	readonly consents: readonly ConsentRow[];
}

interface JoinedRow {
	readonly subject_id: string;
	readonly subject_externalId: string | null;
	readonly subject_createdAt: Date;
	readonly consent_id: string | null;
	readonly consent_policyId: string | null;
	readonly consent_purposeIds: unknown;
	readonly consent_givenAt: Date | null;
	readonly policy_type: string | null;
	readonly policy_version: string | null;
	readonly policy_hash: string | null;
	readonly policy_effectiveDate: Date | null;
}

/** Valibot `optional` means absent, not null; the database means null. */
const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/**
 * The newest active policy for each type, in one query.
 *
 * Replaces the per-type loop in `consent-enrichment.ts`. `row_number()` over a
 * partition is supported by Postgres 11+, MySQL 8+ and SQLite 3.25+, so this
 * needs no dialect branching.
 */
export const latestPolicyIdByType = Effect.fn(
	'repository.latestPolicyIdByType'
)(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ id: string; type: string }>`
			select "id", "type"
			from (
				select
					"id",
					"type",
					row_number() over (
						partition by "type" order by "effectiveDate" desc
					) as rn
				from "consentPolicy"
				where "isActive" = ${true} and ${yield* tenantScope()}
			) ranked
			where rn = 1
		`;

	return new Map(rows.map((row) => [row.type, row.id]));
});

/**
 * Every subject with a given external id, and each subject's consents.
 *
 * One query. The old implementation issued one plus a chunk per hundred
 * subject ids, sequentially, because it had no join available.
 */
export const listByExternalId = Effect.fn('repository.listByExternalId')(
	function* (externalId: string) {
		const sql = yield* SqlClient.SqlClient;

		const rows = yield* sql<JoinedRow>`
			select
				s."id"          as "subject_id",
				s."externalId"  as "subject_externalId",
				s."createdAt"   as "subject_createdAt",
				c."id"          as "consent_id",
				c."policyId"    as "consent_policyId",
				c."purposeIds"  as "consent_purposeIds",
				c."givenAt"     as "consent_givenAt",
				p."type"          as "policy_type",
				p."version"       as "policy_version",
				p."hash"          as "policy_hash",
				p."effectiveDate" as "policy_effectiveDate"
			from "subject" s
			left join "consent" c on c."subjectId" = s."id"
			left join "consentPolicy" p on p."id" = c."policyId"
			where s."externalId" = ${externalId} and ${yield* tenantScope('s')}
			order by s."id", c."givenAt" desc
		`;

		const latest = yield* latestPolicyIdByType();
		const latestIds = new Set(latest.values());

		const bySubject = new Map<string, SubjectWithConsents>();
		for (const row of rows) {
			const existing = bySubject.get(row.subject_id);
			const subject: SubjectWithConsents = existing ?? {
				id: row.subject_id,
				externalId: row.subject_externalId,
				createdAt: row.subject_createdAt,
				consents: [],
			};

			// A left join yields one all-null consent row for a subject with no
			// consents; that is an absence, not a record.
			if (row.consent_id !== null && row.consent_givenAt !== null) {
				(subject.consents as ConsentRow[]).push({
					id: row.consent_id,
					subjectId: row.subject_id,
					// A consent whose policy row is gone still has to satisfy the
					// contract's required `type`; '' is the honest answer rather
					// than inventing one.
					type: row.policy_type ?? '',
					policyId: orUndefined(row.consent_policyId),
					policyVersion: orUndefined(row.policy_version),
					policyHash: orUndefined(row.policy_hash),
					policyEffectiveDate: orUndefined(row.policy_effectiveDate),
					purposeIds: row.consent_purposeIds,
					givenAt: row.consent_givenAt,
					isLatestPolicy:
						row.consent_policyId !== null &&
						latestIds.has(row.consent_policyId),
				});
			}

			bySubject.set(row.subject_id, subject);
		}

		return [...bySubject.values()];
	}
);

/**
 * How many subjects carry an external id.
 *
 * `list.handler.ts` returns `count: subjectItems.length` — the length of the
 * page, not a total. Any client paginating on it is reading a number that
 * means something else. A real `count(*)` costs one cheap indexed query.
 */
export const countByExternalId = Effect.fn('repository.countByExternalId')(
	function* (externalId: string) {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql<{ total: number | string }>`
			select count(*) as total from "subject"
			where "externalId" = ${externalId} and ${yield* tenantScope()}
		`;
		return Number(rows[0]?.total ?? 0);
	}
);

export type RepositoryError = SqlError.SqlError;

/**
 * One subject and its consents, by primary key.
 *
 * Same single-query shape as `listByExternalId` — subject joined to consents
 * joined to their policies — rather than the three round trips the shipped
 * handler makes (subject, then consents, then policy enrichment).
 */
export const findById = Effect.fn('repository.findById')(function* (
	subjectId: string
) {
	const sql = yield* SqlClient.SqlClient;

	const rows = yield* sql<JoinedRow>`
		select
			s."id"          as "subject_id",
			s."externalId"  as "subject_externalId",
			s."createdAt"   as "subject_createdAt",
			c."id"          as "consent_id",
			c."policyId"    as "consent_policyId",
			c."purposeIds"  as "consent_purposeIds",
			c."givenAt"     as "consent_givenAt",
			p."type"          as "policy_type",
			p."version"       as "policy_version",
			p."hash"          as "policy_hash",
			p."effectiveDate" as "policy_effectiveDate"
		from "subject" s
		left join "consent" c on c."subjectId" = s."id"
		left join "consentPolicy" p on p."id" = c."policyId"
		where s."id" = ${subjectId} and ${yield* tenantScope('s')}
		order by c."givenAt" desc
	`;

	const first = rows[0];
	if (first === undefined) {
		return undefined;
	}

	const latest = yield* latestPolicyIdByType();
	const latestIds = new Set(latest.values());

	const consents: ConsentRow[] = [];
	for (const row of rows) {
		if (row.consent_id === null || row.consent_givenAt === null) continue;
		consents.push({
			id: row.consent_id,
			subjectId: row.subject_id,
			type: row.policy_type ?? '',
			policyId: orUndefined(row.consent_policyId),
			policyVersion: orUndefined(row.policy_version),
			policyHash: orUndefined(row.policy_hash),
			policyEffectiveDate: orUndefined(row.policy_effectiveDate),
			purposeIds: row.consent_purposeIds,
			givenAt: row.consent_givenAt,
			isLatestPolicy:
				row.consent_policyId !== null && latestIds.has(row.consent_policyId),
		});
	}

	return {
		id: first.subject_id,
		externalId: first.subject_externalId,
		createdAt: first.subject_createdAt,
		consents,
	} satisfies SubjectWithConsents;
});

/**
 * Links a subject to an external identity.
 *
 * The update and its audit entry are one transaction. An audit log that can
 * disagree with the row it describes is worse than none — it makes the trail
 * untrustworthy rather than merely incomplete — and on a consent platform the
 * trail is the product.
 */
export const linkExternalId = Effect.fn('repository.linkExternalId')(
	function* (input: {
		subjectId: string;
		externalId: string;
		identityProvider: string;
		ipAddress: string | null;
		userAgent: string | null;
	}) {
		const sql = yield* SqlClient.SqlClient;
		const scope = yield* tenantScope();

		const found = yield* sql<{
			externalId: string | null;
			identityProvider: string | null;
		}>`
		select "externalId", "identityProvider" from "subject"
		where "id" = ${input.subjectId} and ${scope}
	`;
		const before = found[0];
		if (before === undefined) {
			return undefined;
		}

		yield* sql.withTransaction(
			Effect.gen(function* () {
				yield* sql`
				update "subject" set
					"externalId" = ${input.externalId},
					"identityProvider" = ${input.identityProvider},
					"updatedAt" = ${new Date()}
				where "id" = ${input.subjectId} and ${scope}
			`;

				// Records what changed, not just that something did: a trail that
				// cannot answer "from what?" cannot support a subject access request.
				yield* sql`
				insert into "auditLog" (
					"id","subjectId","entityType","entityId","actionType",
					"ipAddress","userAgent","changes","metadata","createdAt"
				) values (
					${generateEntityId('auditLog')},
					${input.subjectId}, ${'subject'}, ${input.subjectId},
					${'identify_user'},
					${input.ipAddress}, ${input.userAgent},
					${JSON.stringify({
						externalId: { from: before.externalId, to: input.externalId },
						identityProvider: {
							from: before.identityProvider,
							to: input.identityProvider,
						},
					})},
					${JSON.stringify({
						externalId: input.externalId,
						identityProvider: input.identityProvider,
					})},
					${new Date()}
				)
			`;
			})
		);

		return {
			id: input.subjectId,
			externalId: input.externalId,
			identityProvider: input.identityProvider,
		};
	}
);

/**
 * Finds a subject by client-supplied id, or creates it.
 *
 * The v2.0 flow has the client generate the subject id, so this is an upsert
 * keyed on it. `on conflict do nothing` rather than read-then-create: two
 * requests from the same device arriving together must produce one subject,
 * and the returning clause tells us which call won without a second query.
 *
 * A subject that already exists is returned untouched. Overwriting its
 * externalId here would silently re-identify someone as a side effect of
 * recording consent, which is what PATCH exists to do explicitly.
 */
export const findOrCreate = Effect.fn('repository.findOrCreate')(
	function* (input: {
		subjectId: string;
		externalId?: string | null;
		identityProvider?: string | null;
		tenantId?: string | null;
	}) {
		const sql = yield* SqlClient.SqlClient;
		const now = new Date();

		const inserted = yield* sql<{ id: string }>`
		insert into "subject"
			("id","externalId","identityProvider","tenantId","createdAt","updatedAt")
		values (
			${input.subjectId},
			${input.externalId ?? null},
			${input.externalId ? (input.identityProvider ?? 'external') : 'anonymous'},
			${input.tenantId ?? null},
			${now}, ${now}
		)
		on conflict ("id") do nothing
		returning "id"
	`;

		return { id: input.subjectId, created: inserted.length > 0 };
	}
);
