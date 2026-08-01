/**
 * Cross-tenant isolation.
 *
 * The type system makes a query that needs a tenant scope declare it, so a
 * caller cannot forget to provide one. What it cannot catch is a query that
 * never asks for `Tenant` in the first place — and that is exactly the bug
 * these tests exist to find. Every repository read and write is exercised with
 * two tenants holding deliberately colliding data, and asserted to see only
 * its own.
 *
 * Worth being blunt about why: an earlier revision of this package stored
 * `tenantId` on writes and filtered on it in **no** reads. Every subject
 * listing returned every tenant's subjects, and syncing a legal document
 * deactivated other tenants' active policies. Both passed the entire suite,
 * because nothing tested for it.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { syncCurrent } from '../repository/legal-document';
import { submit } from '../repository/record-consent';
import {
	countByExternalId,
	findById,
	linkExternalId,
	listByExternalId,
} from '../repository/subject';
import { up as baseline } from './migrations/1-baseline';
import { layer as tenantLayer } from './tenant';

const Pglite = PgliteClient.layer({});
const asTenant = (id: string) => Layer.merge(Pglite, tenantLayer(id));

/**
 * Two tenants whose data collides on every natural key: same external id, same
 * subject id shape, same policy type. Anything that leaks will be visible.
 */
const seedBothTenants = Effect.gen(function* () {
	yield* baseline;
	const sql = yield* SqlClient.SqlClient;

	for (const tenant of ['tenant_a', 'tenant_b']) {
		yield* sql`insert into "domain" ("id","name","tenantId","createdAt","updatedAt")
			values (${`dom_${tenant}`}, ${'shared.example'}, ${tenant}, ${new Date()}, ${new Date()})`;
		yield* sql`insert into "subject" ("id","externalId","tenantId","createdAt","updatedAt")
			values (${`sub_${tenant}`}, ${'shared_external_id'}, ${tenant}, ${new Date()}, ${new Date()})`;
		yield* sql`insert into "consentPolicy"
			("id","version","type","effectiveDate","isActive","tenantId","createdAt")
			values (${`pol_${tenant}`}, ${'1.0'}, ${'cookie'}, ${new Date()}, ${true},
				${tenant}, ${new Date()})`;
		yield* sql`insert into "consent"
			("id","subjectId","domainId","policyId","purposeIds","givenAt","tenantId")
			values (${`cns_${tenant}`}, ${`sub_${tenant}`}, ${`dom_${tenant}`},
				${`pol_${tenant}`}, ${'[]'}, ${new Date()}, ${tenant})`;
	}
});

describe('tenant isolation: reads', () => {
	it.effect(
		'listing sees only its own tenant despite a shared external id',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;
				const subjects = yield* listByExternalId('shared_external_id');

				assert.strictEqual(subjects.length, 1, 'leaked another tenant');
				assert.strictEqual(subjects[0]?.id, 'sub_tenant_a');
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);

	it.effect(
		'counting does not count another tenant',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;
				// Both tenants have exactly one subject under this external id.
				assert.strictEqual(yield* countByExternalId('shared_external_id'), 1);
			}).pipe(Effect.provide(asTenant('tenant_b'))),
		{ timeout: 60_000 }
	);

	it.effect(
		'fetching another tenant subject by id returns nothing',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;
				// Knowing the id must not be enough — ids are guessable and
				// sometimes logged.
				assert.isUndefined(yield* findById('sub_tenant_b'));
				assert.isDefined(yield* findById('sub_tenant_a'));
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);

	it.effect(
		'a consent is not marked latest by another tenant policy',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;
				const subjects = yield* listByExternalId('shared_external_id');
				const consent = subjects[0]?.consents[0];

				// The "latest policy per type" lookup is tenant-scoped; if it were
				// not, tenant B's newer policy would silently invalidate tenant
				// A's consent.
				assert.isTrue(consent?.isLatestPolicy);
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);
});

describe('tenant isolation: writes', () => {
	it.effect(
		'syncing a release does not deactivate another tenant policy',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;

				yield* syncCurrent({
					tenantId: 'tenant_a',
					type: 'cookie',
					version: '2.0',
					hash: 'sha256-new',
					effectiveDate: new Date(),
				});

				const sql = yield* SqlClient.SqlClient;
				const others = yield* sql<{ isActive: boolean }>`
					select "isActive" from "consentPolicy" where "id" = 'pol_tenant_b'
				`;

				// Cross-tenant corruption, not just disclosure: tenant B's banner
				// would stop matching a current policy because tenant A published.
				assert.isTrue(
					others[0]?.isActive,
					"deactivated another tenant's policy"
				);
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);

	it.effect(
		'identifying a subject cannot reach another tenant',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;

				const result = yield* linkExternalId({
					subjectId: 'sub_tenant_b',
					externalId: 'hijacked',
					identityProvider: 'external',
					ipAddress: null,
					userAgent: null,
				});

				assert.isUndefined(result, 'wrote to another tenant');

				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql<{ externalId: string | null }>`
					select "externalId" from "subject" where "id" = 'sub_tenant_b'
				`;
				assert.strictEqual(rows[0]?.externalId, 'shared_external_id');
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);

	it.effect(
		'the same submission under two tenants is two consents',
		() =>
			Effect.gen(function* () {
				yield* baseline;
				const sql = yield* SqlClient.SqlClient;
				for (const tenant of ['tenant_a', 'tenant_b']) {
					yield* sql`insert into "domain" ("id","name","tenantId","createdAt","updatedAt")
						values (${`dom_${tenant}`}, ${'d'}, ${tenant}, ${new Date()}, ${new Date()})`;
				}

				const submission = {
					subjectId: 'sub_shared',
					domainId: 'dom_tenant_a',
					purposeIds: ['analytics'],
					givenAt: new Date(1_800_000_000_000),
					ipAddress: null,
					userAgent: null,
				};

				yield* submit({ ...submission, tenantId: 'tenant_a' });
				yield* submit({
					...submission,
					domainId: 'dom_tenant_b',
					tenantId: 'tenant_b',
				});

				// Structurally identical consent from two tenants is two separate
				// legal records, so the deterministic id must include the tenant.
				const rows = yield* sql<{ total: string }>`
					select count(*) as total from "consent"
				`;
				assert.strictEqual(Number(rows[0]?.total), 2);
			}).pipe(Effect.provide(asTenant('tenant_a'))),
		{ timeout: 60_000 }
	);
});

describe('tenant isolation: single-tenant deployments', () => {
	it.effect(
		'a null-tenant scope does not see tenanted rows',
		() =>
			Effect.gen(function* () {
				yield* seedBothTenants;
				const sql = yield* SqlClient.SqlClient;
				yield* sql`insert into "subject" ("id","externalId","createdAt","updatedAt")
					values (${'sub_null'}, ${'shared_external_id'}, ${new Date()}, ${new Date()})`;

				const subjects = yield* listByExternalId('shared_external_id');

				// `is null` is still a filter. A single-tenant deployment that
				// later gains tenanted rows must not start seeing them.
				assert.strictEqual(subjects.length, 1);
				assert.strictEqual(subjects[0]?.id, 'sub_null');
			}).pipe(Effect.provide(Layer.merge(Pglite, tenantLayer(undefined)))),
		{ timeout: 60_000 }
	);
});
