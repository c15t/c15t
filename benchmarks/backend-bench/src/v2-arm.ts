/**
 * The real `@c15t/backend` data layer, as an arm.
 *
 * The `chunked-fanout` arm in `arms.ts` reproduces the shipped *query pattern*
 * against a bare SQL client, which isolates the pattern but excludes fumadb
 * entirely. That is a defensible floor for the old design and a deliberately
 * conservative comparison — but it is not what a user runs.
 *
 * This arm runs the actual published data layer: the real fumadb client, the
 * real kysely adapter, the real `orm('2.0.0')`, issuing the same sequence
 * `list.handler.ts` and `consent-enrichment.ts` issue. The difference between
 * this and `chunked-fanout` is fumadb's own overhead — query construction,
 * result mapping, the proxy layers — which the pattern-only arm cannot see.
 *
 * Reporting both is the honest thing to do: `chunked-fanout` says how much of
 * the win is the query shape, and this says what a user actually experiences.
 */

import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { DB } from '@c15t/backend/db/schema';
import type { Kysely } from 'kysely';
import type { ArmResult } from './arms';

/** `list.handler.ts:13`. */
const SUBJECT_ID_BATCH_SIZE = 500;

/**
 * The v2 ORM, pinned to schema 2.0.0 exactly as `init.ts:68` does.
 *
 * Typed structurally rather than by naming fumadb's inferred query type: that
 * type is not nameable from outside the backend's own node_modules, and this
 * benchmark only needs the four methods the read path calls.
 */
type WhereBuilder = ((
	column: string,
	operator: string,
	value: unknown
) => unknown) & {
	and(...clauses: unknown[]): unknown;
};

export interface Orm {
	findMany(
		table: string,
		options: {
			where?: (b: WhereBuilder) => unknown;
			orderBy?: [string, string];
		}
	): Promise<Array<Record<string, unknown>>>;
	findFirst(
		table: string,
		options: {
			where?: (b: WhereBuilder) => unknown;
			orderBy?: [string, string];
		}
	): Promise<Record<string, unknown> | null>;
}

export function createV2Orm(db: Kysely<Record<string, never>>): Orm {
	const client = DB.client(kyselyAdapter({ db, provider: 'postgresql' }));
	return client.orm('2.0.0') as unknown as Orm;
}

/**
 * The shipped read path, through the shipped ORM.
 *
 * Mirrors `list.handler.ts` and `consent-enrichment.ts` step for step: one
 * query for subjects, a sequential chunk per 500 ids for consents, then a
 * sequential query per distinct policy type.
 */
export async function v2ListByExternalId(
	orm: Orm,
	externalId: string
): Promise<ArmResult> {
	let queries = 0;

	const subjects = await orm.findMany('subject', {
		where: (b) => b('externalId', '=', externalId),
	});
	queries += 1;

	const ids = subjects.map((subject) => subject.id);
	const consents: Array<{ policyId: string | null }> = [];

	for (let index = 0; index < ids.length; index += SUBJECT_ID_BATCH_SIZE) {
		const batch = ids.slice(index, index + SUBJECT_ID_BATCH_SIZE);
		if (batch.length === 0) break;
		const rows = await orm.findMany('consent', {
			where: (b) => b('subjectId', 'in', batch),
		});
		queries += 1;
		consents.push(...(rows as Array<{ policyId: string | null }>));
	}

	const policyIds = [
		...new Set(consents.map((row) => row.policyId).filter(Boolean)),
	] as string[];

	const types = new Set<string>();
	if (policyIds.length > 0) {
		const policies = await orm.findMany('consentPolicy', {
			where: (b) => b('id', 'in', policyIds),
		});
		queries += 1;
		for (const policy of policies as Array<{ type: string }>) {
			types.add(policy.type);
		}
	}

	// consent-enrichment.ts resolves the latest policy per type one at a time,
	// sequentially, and not with Promise.all.
	for (const type of types) {
		await orm.findFirst('consentPolicy', {
			where: (b) => b.and(b('isActive', '=', true), b('type', '=', type)),
			orderBy: ['effectiveDate', 'desc'],
		});
		queries += 1;
	}

	return { subjects: subjects.length, consents: consents.length, queries };
}

/**
 * Creates the schema the way a real v2 deployment does — through fumadb's own
 * migrator, not through our baseline migration.
 *
 * Using our DDL here would quietly benchmark the v2 ORM against a schema it
 * did not create. fumadb's migrator works on Postgres (only MySQL is broken),
 * so this is the genuine article.
 */
export async function applyV2Schema(
	db: Kysely<Record<string, never>>,
	indexed: boolean
): Promise<void> {
	const client = DB.client(kyselyAdapter({ db, provider: 'postgresql' }));
	const plan = await client
		.createMigrator()
		.migrateToLatest({ mode: 'from-database' });
	await plan.execute();

	if (!indexed) return;

	// The same indexes migration 2 adds, so the indexed cells compare like
	// with like rather than crediting the rewrite with an index the v2 arm
	// never got.
	const { sql } = await import('kysely');
	for (const statement of [
		'create index if not exists "v2_subject_externalId_idx" on "subject" ("externalId")',
		'create index if not exists "v2_consent_subjectId_idx" on "consent" ("subjectId")',
		'create index if not exists "v2_consentPolicy_type_isActive_idx" on "consentPolicy" ("type","isActive","effectiveDate")',
	]) {
		await sql.raw(statement).execute(db);
	}
}

/** Seeds the v2 arm's database to match the Effect arms' fixture exactly. */
export async function seedV2(
	db: Kysely<Record<string, never>>,
	subjects: number,
	policyTypes: number,
	backgroundRatio: number
): Promise<void> {
	const { sql } = await import('kysely');
	const run = (statement: string) => sql.raw(statement).execute(db);

	await run(`insert into "domain" ("id","name","createdAt","updatedAt")
		values ('dom_1','example.com',now(),now())`);

	for (let type = 0; type < policyTypes; type++) {
		for (const version of [0, 1]) {
			await run(`insert into "consentPolicy"
				("id","version","type","effectiveDate","isActive","createdAt")
				values ('pol_${type}_${version}','1.${version}','type_${type}',
					now() - interval '${version} day', true, now())`);
		}
	}

	const subjectRows = Array.from(
		{ length: subjects },
		(_, index) => `('sub_${index}','ext_bench',now(),now())`
	).join(',');
	await run(
		`insert into "subject" ("id","externalId","createdAt","updatedAt") values ${subjectRows}`
	);

	const consentRows = Array.from(
		{ length: subjects },
		(_, index) =>
			`('cns_${index}','sub_${index}','dom_1','pol_${index % policyTypes}_0','[]',now())`
	).join(',');
	await run(
		`insert into "consent" ("id","subjectId","domainId","policyId","purposeIds","givenAt") values ${consentRows}`
	);

	const background = subjects * backgroundRatio;
	for (let offset = 0; offset < background; offset += 5000) {
		const size = Math.min(5000, background - offset);
		await run(
			`insert into "subject" ("id","externalId","createdAt","updatedAt") values ${Array.from(
				{ length: size },
				(_, i) => `('bg_${offset + i}','ext_other_${offset + i}',now(),now())`
			).join(',')}`
		);
		await run(
			`insert into "consent" ("id","subjectId","domainId","policyId","purposeIds","givenAt") values ${Array.from(
				{ length: size },
				(_, i) =>
					`('bgc_${offset + i}','bg_${offset + i}','dom_1','pol_${(offset + i) % policyTypes}_0','[]',now())`
			).join(',')}`
		);
	}

	await run('analyze');
}
