/**
 * Subject reads.
 *
 * This is the path the v3 rewrite was mostly about. In `@c15t/backend` 2.x,
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

// oxlint-disable-next-line max-classes-per-file -- One tagged error per repository failure, beside the code that raises it.
import { generateEntityId } from '@c15t/schema';
import type { SubjectChoiceWire, VendorChoiceWire } from '@c15t/schema';
import { Data, Effect } from 'effect';
import { SqlClient, Statement } from 'effect/sql';
import type { SqlError } from 'effect/sql';

import { insertOnce } from '../db/insert-once';
import { tenantScope } from '../db/tenant';
import { encodeRow, encoder, toDate, toDateOrNull } from '../db/values';
import { purposeCodesById } from './consent-purpose';
import {
	decodePreferences,
	decodeStoredChoice,
	decodeStoredVendorChoice,
	mergeSubjectChoice,
	mergeSubjectVendorChoice,
} from './subject-choice';
import type { StoredChoice, StoredVendorChoice } from './subject-choice';

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
	readonly choice: SubjectChoiceWire | null | undefined;
	/** What the row's receipt column holds, including an unreadable value. */
	readonly storedChoice: StoredChoice;
	/** Per-vendor grants this submission carried, as the client sent them. */
	readonly vendorChoice: VendorChoiceWire | null | undefined;
	readonly storedVendorChoice: StoredVendorChoice;
	readonly givenAt: Date;
	/** True when this consent points at the newest active policy of its type. */
	readonly isLatestPolicy: boolean;
}

export interface SubjectWithConsents {
	readonly id: string;
	readonly externalId: string | null;
	readonly identityProvider: string | null;
	readonly createdAt: Date;
	readonly consents: readonly ConsentRow[];
	/** Latest receipt per category across the cookie-banner consents. */
	readonly choice: SubjectChoiceWire | null;
	/** Newest vendor grant map across the cookie-banner consents. */
	readonly vendorChoice: VendorChoiceWire | null;
}

interface JoinedRow {
	readonly subject_id: string;
	readonly subject_externalId: string | null;
	readonly subject_identityProvider: string | null;
	readonly subject_verifiedExternalId: string | null;
	// Engine-shaped: SQLite returns epoch milliseconds where the others
	// return a Date. Decoded on the way out by `groupSubjects`.
	readonly subject_createdAt: unknown;
	readonly consent_id: string | null;
	readonly consent_policyId: string | null;
	readonly consent_purposeIds: unknown;
	readonly consent_choice: unknown;
	readonly consent_vendorChoice: unknown;
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
	['s.verifiedExternalId', 'subject_verifiedExternalId'],
	['s.createdAt', 'subject_createdAt'],
	['c.id', 'consent_id'],
	['c.policyId', 'consent_policyId'],
	['c.purposeIds', 'consent_purposeIds'],
	['c.choice', 'consent_choice'],
	['c.vendorChoice', 'consent_vendorChoice'],
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
const groupSubjects = (
	rows: readonly JoinedRow[],
	latestIds: ReadonlySet<string>,
	codesById: ReadonlyMap<string, string>
): SubjectWithConsents[] => {
	const bySubject = new Map<string, SubjectWithConsents>();

	for (const row of rows) {
		const subject: SubjectWithConsents = bySubject.get(row.subject_id) ?? {
			choice: null,
			consents: [],
			createdAt: toDate(row.subject_createdAt),
			externalId: row.subject_externalId,
			id: row.subject_id,
			identityProvider: row.subject_identityProvider,
			vendorChoice: null,
		};

		if (row.consent_id !== null && row.consent_givenAt !== null) {
			const storedChoice = decodeStoredChoice(row.consent_choice);
			let choice: ConsentRow['choice'];
			if (storedChoice.kind === 'receipts') {
				({ choice } = storedChoice);
			} else if (storedChoice.kind === 'unreadable') {
				choice = null;
			}
			const storedVendorChoice = decodeStoredVendorChoice(
				row.consent_vendorChoice
			);
			let vendorChoice: ConsentRow['vendorChoice'];
			if (storedVendorChoice.kind === 'grants') {
				({ vendorChoice } = storedVendorChoice);
			} else if (storedVendorChoice.kind === 'unreadable') {
				vendorChoice = null;
			}
			(subject.consents as ConsentRow[]).push({
				choice,
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
				storedVendorChoice,
				subjectId: row.subject_id,
				// A consent whose policy row is gone still has to satisfy the
				// contract's required `type`; '' is the honest answer rather
				// than inventing one.
				type: row.policy_type ?? '',
				vendorChoice,
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
		vendorChoice: mergeSubjectVendorChoice(
			subject.consents.map((consent) => ({
				givenAt: consent.givenAt,
				id: consent.id,
				type: consent.type,
				vendorChoice: consent.storedVendorChoice,
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
 * Whether a subject row is verifiably linked to `externalId`, compared byte
 * for byte rather than by the database's collation.
 */
const isVerifiedLink = (
	row: {
		readonly subject_externalId: string | null;
		readonly subject_verifiedExternalId: string | null;
	},
	externalId: string
): boolean =>
	row.subject_externalId === externalId &&
	row.subject_verifiedExternalId === externalId;

/**
 * Every subject verifiably linked to an external id, and each subject's
 * consents.
 *
 * A subject counts only when `verifiedExternalId` equals `externalId`: the
 * link was made with an API key or a signed identity token, and nothing has
 * rewritten it since. An unverified link is a claim any browser can make, so
 * it must not answer "what did this user consent to". See migration 8.
 *
 * The match is checked again in JavaScript, byte for byte. MySQL's default
 * collations compare case- and accent-insensitively, so SQL alone would treat
 * a verified `Alice` rewritten to `alice` as still verified.
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
			where ${sql('s.externalId')} = ${externalId}
				and ${sql('s.verifiedExternalId')} = ${externalId}
				and ${yield* tenantScope('s')}
			order by ${sql('s.id')}, ${sql('c.givenAt')} desc
		`;

		return groupSubjects(
			rows.filter((row) => isVerifiedLink(row, externalId)),
			yield* latestPolicyIds(),
			yield* purposeCodesById()
		);
	}
);

/**
 * How many subjects are verifiably linked to an external id, by the same
 * rule as {@link listByExternalId}.
 *
 * `list.handler.ts` returns `count: subjectItems.length` — the length of the
 * page, not a total. Any client paginating on it is reading a number that
 * means something else. A real `count(*)` costs one cheap indexed query.
 */
export const countByExternalId = Effect.fn('repository.countByExternalId')(
	function* countByExternalId(externalId: string) {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql<{
			subject_externalId: string | null;
			subject_verifiedExternalId: string | null;
		}>`
			select
				${sql('externalId')} as ${sql('subject_externalId')},
				${sql('verifiedExternalId')} as ${sql('subject_verifiedExternalId')}
			from ${sql('subject')}
			where ${sql('externalId')} = ${externalId}
				and ${sql('verifiedExternalId')} = ${externalId}
				and ${yield* tenantScope()}
		`;
		return rows.filter((row) => isVerifiedLink(row, externalId)).length;
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
 * An unverified request tried to replace a verified identity.
 *
 * A verified link was proved by the customer's server, so only the same kind
 * of proof can change it.
 */
export class IdentityConflictError extends Data.TaggedError(
	'IdentityConflictError'
)<{
	readonly message: string;
}> {}

/**
 * Links a subject to an external identity.
 *
 * `verified` says whether the caller proved the identity (API key or signed
 * identity token). The rules:
 *
 * - A verified link always applies and records `verifiedExternalId`.
 * - An unverified link may not change a subject whose current identity is
 *   verified. Relinking the same identity is a no-op, so retries succeed.
 * - Otherwise an unverified link applies and clears `verifiedExternalId`.
 *   The subject id is the capability here: whoever holds it is the device,
 *   and a shared device signing a second user in is a normal flow.
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
		/** How the caller proved the identity, or `null` when it did not. */
		verifiedBy: 'api_key' | 'identity_token' | null;
		ipAddress: string | null;
		userAgent: string | null;
	}) {
		const sql = yield* SqlClient.SqlClient;
		const encode = yield* encoder;
		const scope = yield* tenantScope();

		const found = yield* sql<{
			externalId: string | null;
			identityProvider: string | null;
			verifiedExternalId: string | null;
		}>`
			select
				${sql('externalId')},
				${sql('identityProvider')},
				${sql('verifiedExternalId')}
			from ${sql('subject')}
			where ${sql('id')} = ${input.subjectId} and ${scope}
		`;
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const before = found[0];
		if (before === undefined) {
			return undefined;
		}

		const wasVerified =
			before.externalId !== null &&
			before.verifiedExternalId === before.externalId;
		const verified = input.verifiedBy !== null;
		// A null provider is the default one: rows written outside this
		// backend may leave it empty, and the route fills in `external`.
		const unchanged =
			before.externalId === input.externalId &&
			(before.identityProvider ?? 'external') === input.identityProvider;

		if (!verified && wasVerified) {
			if (unchanged) {
				return {
					externalId: input.externalId,
					id: input.subjectId,
					identityProvider: input.identityProvider,
				};
			}
			return yield* new IdentityConflictError({
				message:
					'This subject is linked to a verified identity. Changing it needs an API key or an identity token.',
			});
		}

		const verifiedExternalId = verified ? input.externalId : null;

		yield* sql.withTransaction(
			// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
			Effect.gen(function* linkExternalId() {
				const target = [sql`${sql('id')} = ${input.subjectId}`, scope];
				if (!verified) {
					// An unverified write must not land on a link verified since
					// the read above, so it carries the check in its own predicate.
					// Byte for byte on MySQL, whose default collations would call
					// `Alice` and `alice` the same link.
					const differs = sql.onDialectOrElse({
						mysql: () =>
							sql`cast(${sql('verifiedExternalId')} as binary) <> cast(${sql('externalId')} as binary)`,
						orElse: () =>
							sql`${sql('verifiedExternalId')} <> ${sql('externalId')}`,
					});
					target.push(sql`(
						${sql('verifiedExternalId')} is null
						or ${sql('externalId')} is null
						or ${differs}
					)`);
				}
				yield* sql`
					update ${sql('subject')} set
						${sql('externalId')} = ${input.externalId},
						${sql('identityProvider')} = ${input.identityProvider},
						${sql('verifiedExternalId')} = ${verifiedExternalId},
						${sql('updatedAt')} = ${encode(new Date())}
					where ${sql.and(target)}
				`;
				if (!verified) {
					const after = yield* sql<{
						externalId: string | null;
						verifiedExternalId: string | null;
					}>`
						select ${sql('externalId')}, ${sql('verifiedExternalId')}
						from ${sql('subject')}
						where ${sql('id')} = ${input.subjectId} and ${scope}
					`;
					if (
						after[0]?.externalId !== input.externalId ||
						after[0]?.verifiedExternalId !== null
					) {
						return yield* new IdentityConflictError({
							message:
								'This subject was linked to a verified identity while the request was in flight.',
						});
					}
				}

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
								verifiedExternalId: {
									from: before.verifiedExternalId,
									to: verifiedExternalId,
								},
							}),
							createdAt: new Date(),
							entityId: input.subjectId,
							entityType: 'subject',
							id: generateEntityId('auditLog'),
							ipAddress: input.ipAddress,
							metadata: JSON.stringify({
								externalId: input.externalId,
								identityProvider: input.identityProvider,
								verifiedBy: input.verifiedBy,
							}),
							subjectId: input.subjectId,
							userAgent: input.userAgent,
						})
					)}
				`;
			})
		);

		return {
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
		/** Whether the caller proved `externalId`. See {@link linkExternalId}. */
		externalIdVerified?: boolean;
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
				identityProvider: input.externalId
					? (input.identityProvider ?? 'external')
					: 'anonymous',
				tenantId: input.tenantId ?? null,
				updatedAt: now,
				verifiedExternalId:
					input.externalId && input.externalIdVerified
						? input.externalId
						: null,
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
