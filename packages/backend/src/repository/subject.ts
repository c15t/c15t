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
 *
 * ## On the identifier noise
 *
 * Columns are written `${sql('s.externalId')}` rather than `s."externalId"`.
 * The literal form is a syntax error on MySQL, which delimits identifiers with
 * backticks; `sql(…)` defers the choice to the connected dialect's compiler.
 */

import { generateEntityId } from '@c15t/schema';
import type { SubjectChoiceWire } from '@c15t/schema';
import { Data, Effect } from 'effect';
import { SqlClient, Statement } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { tenantScope } from '../db/tenant';
import { encodeRow, encoder, toDate, toDateOrNull } from '../db/values';
import { purposeCodesById } from './consent-purpose';
import {
	decodePreferences,
	decodeStoredChoice,
	mergeSubjectChoice,
} from './subject-choice';
import type { StoredChoice } from './subject-choice';

/**
 * Who asserted a subject's external identity link.
 *
 * `api` means an authenticated caller linked it; `browser` means the
 * subject's own device did through a public route. Rows written before the
 * column existed are `null`, which reads as untrusted.
 */
export type IdentityAuthority = 'api' | 'browser';

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
	/**
	 * Granted category codes as 2.x reported them: the codes of the purposes
	 * `purposeIds` references, each `true`. Denials are not representable
	 * here; `choice` carries them for rows written by a v3 client.
	 */
	readonly preferences: Record<string, boolean> | undefined;
	/** v3 receipts this submission confirmed, exactly as the client sent them. */
	readonly choice: SubjectChoiceWire | undefined;
	/** What the row's receipt column holds, including an unreadable value. */
	readonly storedChoice: StoredChoice;
	readonly givenAt: Date;
	/** True when this consent points at the newest active policy of its type. */
	readonly isLatestPolicy: boolean;
}

export interface SubjectWithConsents {
	readonly id: string;
	readonly externalId: string | null;
	readonly identityProvider: string | null;
	readonly identityAuthority: IdentityAuthority | null;
	readonly createdAt: Date;
	readonly consents: readonly ConsentRow[];
	/** Latest receipt per category across the cookie-banner consents. */
	readonly choice: SubjectChoiceWire | undefined;
}

interface JoinedRow {
	readonly subject_id: string;
	readonly subject_externalId: string | null;
	readonly subject_identityProvider: string | null;
	readonly subject_identityAuthority: string | null;
	// Engine-shaped: SQLite returns epoch milliseconds where the others
	// return a Date. Decoded on the way out by `groupSubjects`.
	readonly subject_createdAt: unknown;
	readonly consent_id: string | null;
	readonly consent_policyId: string | null;
	readonly consent_purposeIds: unknown;
	readonly consent_choice: unknown;
	readonly consent_givenAt: unknown;
	readonly policy_type: string | null;
	readonly policy_version: string | null;
	readonly policy_hash: string | null;
	readonly policy_effectiveDate: unknown;
}

/** Valibot `optional` means absent, not null; the database means null. */
const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/**
 * The joined column list, as `[column, alias]` pairs.
 *
 * Shared by both read paths so their projections cannot drift — `JoinedRow`
 * describes one row shape, and two hand-written select lists would eventually
 * stop agreeing with it in different ways.
 */
const JOINED_COLUMNS: readonly (readonly [column: string, alias: string])[] = [
	['s.id', 'subject_id'],
	['s.externalId', 'subject_externalId'],
	['s.identityProvider', 'subject_identityProvider'],
	['s.identityAuthority', 'subject_identityAuthority'],
	['s.createdAt', 'subject_createdAt'],
	['c.id', 'consent_id'],
	['c.policyId', 'consent_policyId'],
	['c.purposeIds', 'consent_purposeIds'],
	['c.choice', 'consent_choice'],
	['c.givenAt', 'consent_givenAt'],
	['p.type', 'policy_type'],
	['p.version', 'policy_version'],
	['p.hash', 'policy_hash'],
	['p.effectiveDate', 'policy_effectiveDate'],
];

/**
 * A subject id that exists but under a different tenant.
 *
 * `subject.id` is the primary key and the client chooses it, so it is unique
 * across the whole table rather than per tenant. Changing that is a migration
 * against a column every foreign key references; refusing the collision is not.
 */
export class SubjectTenantConflictError extends Data.TaggedError(
	'SubjectTenantConflictError'
)<{
	readonly message: string;
}> {}

/**
 * `select … from subject left join consent left join consentPolicy`, up to but
 * not including the `where`.
 *
 * Both read paths differ only in how they filter and order, so the join itself
 * is built once.
 */
const joinedSelect = Effect.fn('repository.joinedSelect')(
	function* joinedSelect() {
		const sql = yield* SqlClient.SqlClient;
		const projection = Statement.csv(
			JOINED_COLUMNS.map(
				([column, alias]) => sql`${sql(column)} as ${sql(alias)}`
			)
		);

		// Every joined table carries its own tenant predicate, not just `subject`.
		// Scoping the driving table alone is only sufficient while `subjectId` is
		// unique across tenants, and it is client-supplied — so two tenants can name
		// the same subject, and an unscoped join then hands one tenant the other's
		// consent rows. Measured before fixing: tenant A read 2 consents where one
		// was tenant B's.
		//
		// On the join rather than in `where`, because these are left joins: a
		// predicate in `where` would drop subjects that have no consent instead of
		// returning them with none.
		return sql`
		select ${projection}
		from ${sql('subject')} s
		left join ${sql('consent')} c
			on ${sql('c.subjectId')} = ${sql('s.id')} and ${yield* tenantScope('c')}
		left join ${sql('consentPolicy')} p
			on ${sql('p.id')} = ${sql('c.policyId')} and ${yield* tenantScope('p')}
	`;
	}
);

/**
 * Turns joined rows into subjects, each with its consents.
 *
 * A left join yields one all-null consent row for a subject with no consents;
 * that is an absence, not a record. Insertion order is preserved, so the
 * caller's `order by` decides the result order.
 */
const toIdentityAuthority = (value: string | null): IdentityAuthority | null =>
	value === 'api' || value === 'browser' ? value : null;

const groupSubjects = (
	rows: readonly JoinedRow[],
	latestIds: ReadonlySet<string>,
	codesById: ReadonlyMap<string, string>
): SubjectWithConsents[] => {
	const bySubject = new Map<string, SubjectWithConsents>();

	for (const row of rows) {
		const subject: SubjectWithConsents = bySubject.get(row.subject_id) ?? {
			choice: undefined,
			consents: [],
			createdAt: toDate(row.subject_createdAt),
			externalId: row.subject_externalId,
			id: row.subject_id,
			identityAuthority: toIdentityAuthority(row.subject_identityAuthority),
			identityProvider: row.subject_identityProvider,
		};

		if (row.consent_id !== null && row.consent_givenAt !== null) {
			const storedChoice = decodeStoredChoice(row.consent_choice);
			(subject.consents as ConsentRow[]).push({
				choice:
					storedChoice.kind === 'receipts' ? storedChoice.choice : undefined,
				givenAt: toDate(row.consent_givenAt),
				id: row.consent_id,
				isLatestPolicy:
					row.consent_policyId !== null && latestIds.has(row.consent_policyId),

				policyEffectiveDate:
					orUndefined(toDateOrNull(row.policy_effectiveDate)) ?? undefined,
				policyHash: orUndefined(row.policy_hash),
				policyId: orUndefined(row.consent_policyId),
				policyVersion: orUndefined(row.policy_version),
				preferences: decodePreferences(row.consent_purposeIds, codesById),
				purposeIds: row.consent_purposeIds,
				storedChoice,
				subjectId: row.subject_id,
				// A consent whose policy row is gone still has to satisfy the
				// contract's required `type`; '' is the honest answer rather
				// than inventing one.
				type: row.policy_type ?? '',
			});
		}

		bySubject.set(row.subject_id, subject);
	}

	return [...bySubject.values()].map((subject) => ({
		...subject,
		choice: mergeSubjectChoice(
			subject.consents.map((consent) => ({
				choice: consent.storedChoice,
				givenAt: consent.givenAt,
				preferences: consent.preferences,
				type: consent.type,
			}))
		),
	}));
};

/**
 * The newest active policy for each type, in one query.
 *
 * Replaces the per-type loop in `consent-enrichment.ts`. `row_number()` over a
 * partition is supported by Postgres 11+, MySQL 8+ and SQLite 3.25+, so this
 * needs no dialect branching.
 */
export const latestPolicyIdByType = Effect.fn(
	'repository.latestPolicyIdByType'
)(function* latestPolicyIdByType() {
	const sql = yield* SqlClient.SqlClient;
	// SQLite has no boolean to bind; `true` has to become `1` there.
	const encode = yield* encoder;
	const scope = yield* tenantScope();

	const rows = yield* sql<{ id: string; type: string }>`
		select ${sql('id')}, ${sql('type')}
		from (
			select
				${sql('id')},
				${sql('type')},
				row_number() over (
					partition by ${sql('type')} order by ${sql('effectiveDate')} desc
				) as rn
			from ${sql('consentPolicy')}
			where ${sql('isActive')} = ${encode(true)} and ${scope}
		) ranked
		where rn = 1
	`;

	return new Map(rows.map((row) => [row.type, row.id]));
});

/** The ids of the newest active policy of every type, for `isLatestPolicy`. */
const latestPolicyIds = Effect.fn('repository.latestPolicyIds')(
	function* latestPolicyIds() {
		const latest = yield* latestPolicyIdByType();
		return new Set(latest.values());
	}
);

/**
 * Every subject with a given external id, and each subject's consents.
 *
 * One query. The old implementation issued one plus a chunk per hundred
 * subject ids, sequentially, because it had no join available.
 */
export const listByExternalId = Effect.fn('repository.listByExternalId')(
	function* listByExternalId(externalId: string) {
		const sql = yield* SqlClient.SqlClient;
		const select = yield* joinedSelect();

		const rows = yield* sql<JoinedRow>`
			${select}
			where ${sql('s.externalId')} = ${externalId} and ${yield* tenantScope('s')}
			order by ${sql('s.id')}, ${sql('c.givenAt')} desc
		`;

		return groupSubjects(
			rows,
			yield* latestPolicyIds(),
			yield* purposeCodesById()
		);
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
	function* countByExternalId(externalId: string) {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql<{ total: number | string }>`
			select count(*) as total from ${sql('subject')}
			where ${sql('externalId')} = ${externalId} and ${yield* tenantScope()}
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
export const findById = Effect.fn('repository.findById')(function* findById(
	subjectId: string
) {
	const sql = yield* SqlClient.SqlClient;
	const select = yield* joinedSelect();

	const rows = yield* sql<JoinedRow>`
		${select}
		where ${sql('s.id')} = ${subjectId} and ${yield* tenantScope('s')}
		order by ${sql('c.givenAt')} desc
	`;

	if (rows.length === 0) {
		return undefined;
	}

	// A primary-key lookup, so the join can only produce rows for one subject.
	return groupSubjects(
		rows,
		yield* latestPolicyIds(),
		yield* purposeCodesById()
	)[0];
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
	function* linkExternalId(input: {
		subjectId: string;
		externalId: string;
		identityProvider: string;
		/** Who is asserting the link. Decides what the link may unlock. */
		authority: IdentityAuthority;
		ipAddress: string | null;
		userAgent: string | null;
	}) {
		const sql = yield* SqlClient.SqlClient;
		const encode = yield* encoder;
		const scope = yield* tenantScope();

		const found = yield* sql<{
			externalId: string | null;
			identityProvider: string | null;
		}>`
			select ${sql('externalId')}, ${sql('identityProvider')}
			from ${sql('subject')}
			where ${sql('id')} = ${input.subjectId} and ${scope}
		`;
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const before = found[0];
		if (before === undefined) {
			return undefined;
		}

		yield* sql.withTransaction(
			// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
			Effect.gen(function* linkExternalId() {
				yield* sql`
					update ${sql('subject')} set
						${sql('externalId')} = ${input.externalId},
						${sql('identityProvider')} = ${input.identityProvider},
						${sql('identityAuthority')} = ${input.authority},
						${sql('updatedAt')} = ${encode(new Date())}
					where ${sql('id')} = ${input.subjectId} and ${scope}
				`;

				// Records what changed, not just that something did: a trail that
				// cannot answer "from what?" cannot support a subject access
				// request.
				yield* sql`
					insert into ${sql('auditLog')} ${sql.insert(
						encodeRow(encode, {
							actionType: 'identify_user',
							changes: JSON.stringify({
								externalId: { from: before.externalId, to: input.externalId },
								identityProvider: {
									from: before.identityProvider,
									to: input.identityProvider,
								},
							}),
							createdAt: new Date(),
							entityId: input.subjectId,
							entityType: 'subject',
							id: generateEntityId('auditLog'),
							ipAddress: input.ipAddress,
							metadata: JSON.stringify({
								authority: input.authority,
								externalId: input.externalId,
								identityProvider: input.identityProvider,
							}),
							subjectId: input.subjectId,
							userAgent: input.userAgent,
						})
					)}
				`;
			})
		);

		return {
			authority: input.authority,
			externalId: input.externalId,
			id: input.subjectId,
			identityProvider: input.identityProvider,
		};
	}
);

/**
 * Finds a subject by client-supplied id, or creates it.
 *
 * The v2.0 flow has the client generate the subject id, so this is an upsert
 * keyed on it. Insert-if-absent rather than read-then-create: two requests
 * from the same device arriving together must produce one subject, and the
 * statement itself reports which call won without a second query.
 *
 * A subject that already exists is returned untouched. Overwriting its
 * externalId here would silently re-identify someone as a side effect of
 * recording consent, which is what PATCH exists to do explicitly.
 */
export const findOrCreate = Effect.fn('repository.findOrCreate')(
	function* findOrCreate(input: {
		subjectId: string;
		externalId?: string | null;
		identityProvider?: string | null;
		/** Who asserted `externalId`. Ignored when there is none. */
		identityAuthority?: IdentityAuthority;
		tenantId?: string | null;
	}) {
		const sql = yield* SqlClient.SqlClient;
		const now = new Date();

		const created = yield* insertOnce({
			conflictOn: 'id',
			into: 'subject',
			values: {
				createdAt: now,
				externalId: input.externalId ?? null,
				id: input.subjectId,
				identityAuthority: input.externalId
					? (input.identityAuthority ?? 'browser')
					: null,
				identityProvider: input.externalId
					? (input.identityProvider ?? 'external')
					: 'anonymous',
				tenantId: input.tenantId ?? null,
				updatedAt: now,
			},
		});

		if (created) {
			return { created, id: input.subjectId };
		}

		// The row already existed — but `id` is the primary key and is supplied
		// by the client, so "already existed" does not imply "is ours". Two
		// tenants naming the same subject would otherwise share one row: the
		// second tenant's consent would hang off the first tenant's subject,
		// which the first tenant then reads and the second cannot.
		//
		// Refused rather than reconciled. Silently writing under another
		// tenant's subject is the disclosure; quietly dropping the submission
		// would lose a consent record. The caller is told the id is taken.
		const owner = yield* sql<{ tenantId: string | null }>`
			select ${sql('tenantId')} from ${sql('subject')}
			where ${sql('id')} = ${input.subjectId}
		`;
		const ownerTenant = owner[0]?.tenantId ?? null;
		const mine = input.tenantId ?? null;

		if (owner.length > 0 && ownerTenant !== mine) {
			return yield* new SubjectTenantConflictError({
				message: `subjectId "${input.subjectId}" already belongs to another tenant`,
			});
		}

		return { created, id: input.subjectId };
	}
);
