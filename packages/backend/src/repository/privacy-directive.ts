/**
 * Standing privacy directives.
 *
 * A directive records that a user-agent signal (Global Privacy Control today)
 * asked for categories to be denied. It is a privacy request, not consent:
 * nothing here touches `consent`, `runtimePolicyDecision` or the
 * `consent_given` audit trail, and no consent save ever deletes or replaces
 * a row written here. Removing the browser signal later does not erase it
 * either; only clearing c15t data on the device forgets the local copy, and
 * the server copy stays as the record of the request that was made.
 *
 * ## Authority
 *
 * Two kinds of caller can record one, and the difference decides how far it
 * reaches:
 *
 * - `subject`: the subject's own device, holding nothing but its subject id.
 *   The directive applies to that subject and to nothing else. It does not
 *   follow `externalId`, because a browser can link any `externalId` to its
 *   own subject through the public PATCH route without proving anything, and
 *   a link that costs nothing must not let one device push a directive onto
 *   another person's profiles.
 * - `api`: an authenticated caller asserting the directive for an external
 *   identity. This is the only path that reaches every subject sharing that
 *   identity, and it is scoped to the exact `(tenant, externalId,
 *   identityProvider)` triple rather than `externalId` alone.
 *
 * Reads for a subject return its own directives, plus the `api` directives for
 * its identity when its identity link was itself asserted through the
 * authenticated path. Every predicate carries the tenant, on the directive
 * and on the subject it is joined to. A directive stores no client IP or user
 * agent.
 */

import { hashSha256Hex } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId, tenantScope } from '../db/tenant';
import { encodeRow, encoder, toBoolean, toDate } from '../db/values';

export type PrivacyDirectiveAuthority = 'subject' | 'api';

export interface PrivacyDirective {
	readonly id: string;
	readonly authority: PrivacyDirectiveAuthority;
	readonly source: 'gpc';
	readonly categories: readonly string[];
	readonly recordedAt: Date;
	/** Whether the recording request itself carried `Sec-GPC: 1`. */
	readonly signalHeader: boolean | null;
}

interface DirectiveRow {
	readonly id: string;
	readonly authority: string;
	readonly source: string;
	readonly categories: unknown;
	readonly recordedAt: unknown;
	readonly signalHeader: unknown;
}

const safeParse = (value: string): unknown => {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
};

/** Stored categories, which SQLite hands back as a JSON string. */
const decodeCategories = (value: unknown): string[] => {
	const parsed = typeof value === 'string' ? safeParse(value) : value;
	return Array.isArray(parsed)
		? parsed.filter((entry): entry is string => typeof entry === 'string')
		: [];
};

const decodeRow = (row: DirectiveRow): PrivacyDirective => ({
	authority: row.authority === 'api' ? 'api' : 'subject',
	categories: decodeCategories(row.categories),
	id: row.id,
	recordedAt: toDate(row.recordedAt),
	signalHeader:
		row.signalHeader === null || row.signalHeader === undefined
			? null
			: toBoolean(row.signalHeader),
	source: 'gpc',
});

/**
 * Deterministic id, so a retried request lands once.
 *
 * The identity is the whole directive: who it is for, who asserted it, what
 * it denies and when. Two directives that differ in any of those are two
 * requests and both belong in the record.
 */
const buildDirectiveId = async (
	identity: readonly (string | null)[]
): Promise<string> => {
	const digest = await hashSha256Hex(JSON.stringify(identity));
	return `pdr_${digest.slice(0, 40)}`;
};

interface DirectiveInput {
	readonly source: 'gpc';
	readonly categories: readonly string[];
	readonly recordedAt: Date;
	readonly signalHeader: boolean | null;
}

const canonicalCategories = (categories: readonly string[]): string[] =>
	[...new Set(categories)].sort((left, right) => left.localeCompare(right));

/**
 * Records a directive a subject asserted for itself.
 *
 * Returns `undefined` when the subject does not exist in this tenant, so a
 * caller holding a guessed or foreign subject id learns nothing and writes
 * nothing.
 */
export const recordSubjectDirective = Effect.fn(
	'privacyDirective.recordForSubject'
)(function* recordSubjectDirective(
	input: DirectiveInput & { readonly subjectId: string }
) {
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;
	const tenantId = yield* currentTenantId;
	const scope = yield* tenantScope();

	const subject = yield* sql<{ id: string }>`
		select ${sql('id')} from ${sql('subject')}
		where ${sql('id')} = ${input.subjectId} and ${scope}
	`;
	if (subject.length === 0) {
		return undefined;
	}

	const categories = canonicalCategories(input.categories);
	const id = yield* Effect.promise(() =>
		buildDirectiveId([
			tenantId ?? null,
			'subject',
			input.subjectId,
			input.source,
			categories.join(','),
			input.recordedAt.toISOString(),
		])
	);

	const created = yield* insertOnce({
		conflictOn: 'id',
		into: 'privacyDirective',
		values: {
			authority: 'subject',
			categories: JSON.stringify(categories),
			createdAt: new Date(),
			externalId: null,
			id,
			identityProvider: null,
			recordedAt: input.recordedAt,
			signalHeader: input.signalHeader,
			source: input.source,
			subjectId: input.subjectId,
			tenantId: tenantId ?? null,
		},
	});

	if (created) {
		// One audit entry per request made, never per HTTP request received.
		yield* sql`
			insert into ${sql('auditLog')} ${sql.insert(
				encodeRow(encode, {
					actionType: 'privacy_opt_out_recorded',
					changes: JSON.stringify({ categories, source: input.source }),
					createdAt: new Date(),
					entityId: id,
					entityType: 'privacyDirective',
					id: `log_${id.slice(4)}`,
					// A privacy request carries no client IP or user agent, on the
					// record or in its audit entry.
					ipAddress: null,
					metadata: JSON.stringify({
						authority: 'subject',
						signalHeader: input.signalHeader,
					}),
					subjectId: input.subjectId,
					tenantId: tenantId ?? null,
					userAgent: null,
				})
			)}
		`;
	}

	return {
		created,
		directive: {
			authority: 'subject',
			categories,
			id,
			recordedAt: input.recordedAt,
			signalHeader: input.signalHeader,
			source: input.source,
		} satisfies PrivacyDirective,
	};
});

/**
 * Records a directive an authenticated caller asserted for an identity.
 *
 * Stored once against the identity rather than copied onto each matching
 * subject, so a subject linked to the identity later still sees it, and so
 * the record says what was actually asserted: a request about a person, not
 * about a device.
 */
export const recordIdentityDirective = Effect.fn(
	'privacyDirective.recordForIdentity'
)(function* recordIdentityDirective(
	input: DirectiveInput & {
		readonly externalId: string;
		readonly identityProvider: string;
	}
) {
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;
	const tenantId = yield* currentTenantId;
	const scope = yield* tenantScope();

	const categories = canonicalCategories(input.categories);
	const id = yield* Effect.promise(() =>
		buildDirectiveId([
			tenantId ?? null,
			'api',
			input.identityProvider,
			input.externalId,
			input.source,
			categories.join(','),
			input.recordedAt.toISOString(),
		])
	);

	const created = yield* insertOnce({
		conflictOn: 'id',
		into: 'privacyDirective',
		values: {
			authority: 'api',
			categories: JSON.stringify(categories),
			createdAt: new Date(),
			externalId: input.externalId,
			id,
			identityProvider: input.identityProvider,
			recordedAt: input.recordedAt,
			signalHeader: input.signalHeader,
			source: input.source,
			subjectId: null,
			tenantId: tenantId ?? null,
		},
	});

	if (created) {
		yield* sql`
			insert into ${sql('auditLog')} ${sql.insert(
				encodeRow(encode, {
					actionType: 'privacy_opt_out_recorded',
					changes: JSON.stringify({ categories, source: input.source }),
					createdAt: new Date(),
					entityId: id,
					entityType: 'privacyDirective',
					id: `log_${id.slice(4)}`,
					ipAddress: null,
					metadata: JSON.stringify({
						authority: 'api',
						externalId: input.externalId,
						identityProvider: input.identityProvider,
					}),
					subjectId: null,
					tenantId: tenantId ?? null,
					userAgent: null,
				})
			)}
		`;
	}

	const subjects = yield* sql<{ total: number | string }>`
		select count(*) as total from ${sql('subject')}
		where ${sql('externalId')} = ${input.externalId}
			and ${sql('identityProvider')} = ${input.identityProvider}
			and ${scope}
	`;

	return {
		created,
		directive: {
			authority: 'api',
			categories,
			id,
			recordedAt: input.recordedAt,
			signalHeader: input.signalHeader,
			source: input.source,
		} satisfies PrivacyDirective,
		subjects: Number(subjects[0]?.total ?? 0),
	};
});

/**
 * Directives that apply to one subject. `undefined` when the subject is not
 * in this tenant.
 *
 * Always the subject's own directives. Identity-level `api` directives are
 * added only when the subject's link to that identity was itself asserted
 * through the authenticated path: a browser can attach any `externalId` to
 * its own subject through the public PATCH route, and reading another
 * person's identity-level privacy requests through such a link would be a
 * disclosure. Every predicate carries the tenant, on the directive and on the
 * subject.
 */
export const listDirectivesForSubject = Effect.fn(
	'privacyDirective.listForSubject'
)(function* listDirectivesForSubject(subjectId: string) {
	const sql = yield* SqlClient.SqlClient;

	const subject = yield* sql<{
		id: string;
		externalId: string | null;
		identityProvider: string | null;
		identityAuthority: string | null;
	}>`
		select ${sql('id')}, ${sql('externalId')}, ${sql('identityProvider')},
			${sql('identityAuthority')}
		from ${sql('subject')}
		where ${sql('id')} = ${subjectId} and ${yield* tenantScope()}
	`;
	const [found] = subject;
	if (!found) {
		return undefined;
	}

	const trustedIdentity =
		found.identityAuthority === 'api' &&
		found.externalId !== null &&
		found.identityProvider !== null;

	const rows = yield* sql<DirectiveRow>`
		select ${sql('d.id')} as ${sql('id')}, ${sql('d.authority')} as ${sql(
			'authority'
		)}, ${sql('d.source')} as ${sql('source')}, ${sql('d.categories')} as ${sql(
			'categories'
		)}, ${sql('d.recordedAt')} as ${sql('recordedAt')}, ${sql(
			'd.signalHeader'
		)} as ${sql('signalHeader')}
		from ${sql('privacyDirective')} d
		where ${yield* tenantScope('d')}
			and (
				${sql('d.subjectId')} = ${found.id}
				or (
					${sql('d.authority')} = ${'api'}
					and ${sql('d.subjectId')} is null
					and ${
						trustedIdentity
							? sql`${sql('d.externalId')} = ${found.externalId}
								and ${sql('d.identityProvider')} = ${found.identityProvider}`
							: sql`1 = 0`
					}
				)
			)
		order by ${sql('d.recordedAt')} asc, ${sql('d.id')} asc
	`;

	return rows.map(decodeRow);
});

/**
 * Identity-level directives for an external identity, for authenticated
 * callers. This is how a host projects a person's standing privacy requests
 * into its own trusted session without relying on a browser-asserted link.
 */
export const listDirectivesForIdentity = Effect.fn(
	'privacyDirective.listForIdentity'
)(function* listDirectivesForIdentity(input: {
	readonly externalId: string;
	readonly identityProvider: string;
}) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<DirectiveRow>`
		select ${sql('id')}, ${sql('authority')}, ${sql('source')},
			${sql('categories')}, ${sql('recordedAt')}, ${sql('signalHeader')}
		from ${sql('privacyDirective')}
		where ${yield* tenantScope()}
			and ${sql('authority')} = ${'api'}
			and ${sql('subjectId')} is null
			and ${sql('externalId')} = ${input.externalId}
			and ${sql('identityProvider')} = ${input.identityProvider}
		order by ${sql('recordedAt')} asc, ${sql('id')} asc
	`;
	return rows.map(decodeRow);
});
