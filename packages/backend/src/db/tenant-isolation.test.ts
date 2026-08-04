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

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { ENGINES, resetDatabase } from '../__tests__/engines';
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
import { encodeRow, encoder, toBoolean } from './values';

/**
 * Two tenants whose data collides on every natural key: same external id, same
 * subject id shape, same policy type. Anything that leaks will be visible.
 */
const seedBothTenants = Effect.gen(function* () {
	yield* resetDatabase;
	yield* baseline;
	const sql = yield* SqlClient.SqlClient;
	// Seeds go through the same encoder as production writes: SQLite can bind
	// neither a Date nor a boolean.
	const encode = yield* encoder;
	const now = new Date(1_800_000_000_000);

	for (const tenant of ['tenant_a', 'tenant_b']) {
		yield* sql`insert into ${sql('domain')} ${sql.insert(
			encodeRow(encode, {
				id: `dom_${tenant}`,
				name: 'shared.example',
				tenantId: tenant,
				createdAt: now,
				updatedAt: now,
			})
		)}`;
		yield* sql`insert into ${sql('subject')} ${sql.insert(
			encodeRow(encode, {
				id: `sub_${tenant}`,
				externalId: 'shared_external_id',
				tenantId: tenant,
				createdAt: now,
				updatedAt: now,
			})
		)}`;
		yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
			encodeRow(encode, {
				id: `pol_${tenant}`,
				version: '1.0',
				type: 'cookie',
				effectiveDate: now,
				isActive: true,
				tenantId: tenant,
				createdAt: now,
			})
		)}`;
		yield* sql`insert into ${sql('consent')} ${sql.insert(
			encodeRow(encode, {
				id: `cns_${tenant}`,
				subjectId: `sub_${tenant}`,
				domainId: `dom_${tenant}`,
				policyId: `pol_${tenant}`,
				purposeIds: '[]',
				givenAt: now,
				tenantId: tenant,
			})
		)}`;
	}
});

for (const engine of ENGINES) {
	describe('tenant isolation: reads', () => {
		it.effect(
			'listing sees only its own tenant despite a shared external id',
			() =>
				Effect.gen(function* () {
					yield* seedBothTenants;
					const subjects = yield* listByExternalId('shared_external_id');

					assert.strictEqual(subjects.length, 1, 'leaked another tenant');
					assert.strictEqual(subjects[0]?.id, 'sub_tenant_a');
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
			{ timeout: 60_000 }
		);

		it.effect(
			'counting does not count another tenant',
			() =>
				Effect.gen(function* () {
					yield* seedBothTenants;
					// Both tenants have exactly one subject under this external id.
					assert.strictEqual(yield* countByExternalId('shared_external_id'), 1);
				}).pipe(Effect.provide(engine.asTenant('tenant_b'))),
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
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
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
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
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
					const others = yield* sql<{ isActive: unknown }>`
					select ${sql('isActive')} from ${sql('consentPolicy')}
					where ${sql('id')} = ${'pol_tenant_b'}
				`;

					// Cross-tenant corruption, not just disclosure: tenant B's banner
					// would stop matching a current policy because tenant A published.
					// Decoded rather than compared raw: Postgres gives `true`, MySQL a
					// tinyint `1`, SQLite an integer `1`.
					assert.isTrue(
						toBoolean(others[0]?.isActive),
						"deactivated another tenant's policy"
					);
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
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
					select ${sql('externalId')} from ${sql('subject')}
						where ${sql('id')} = ${'sub_tenant_b'}
				`;
					assert.strictEqual(rows[0]?.externalId, 'shared_external_id');
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
			{ timeout: 60_000 }
		);

		it.effect(
			'the same submission under two tenants is two consents',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* baseline;
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					for (const tenant of ['tenant_a', 'tenant_b']) {
						yield* sql`insert into ${sql('domain')} ${sql.insert(
							encodeRow(encode, {
								id: `dom_${tenant}`,
								name: 'd',
								tenantId: tenant,
								createdAt: new Date(1_800_000_000_000),
								updatedAt: new Date(1_800_000_000_000),
							})
						)}`;
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
					select count(*) as total from ${sql('consent')}
				`;
					assert.strictEqual(Number(rows[0]?.total), 2);
				}).pipe(Effect.provide(engine.asTenant('tenant_a'))),
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
					yield* sql`insert into ${sql('subject')} ${sql.insert(
						encodeRow(yield* encoder, {
							id: 'sub_null',
							externalId: 'shared_external_id',
							createdAt: new Date(1_800_000_000_000),
							updatedAt: new Date(1_800_000_000_000),
						})
					)}`;

					const subjects = yield* listByExternalId('shared_external_id');

					// `is null` is still a filter. A single-tenant deployment that
					// later gains tenanted rows must not start seeing them.
					assert.strictEqual(subjects.length, 1);
					assert.strictEqual(subjects[0]?.id, 'sub_null');
				}).pipe(Effect.provide(engine.asTenant(undefined))),
			{ timeout: 60_000 }
		);
	});
}
