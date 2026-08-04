/**
 * Tenant scoping through the HTTP surface.
 *
 * `db/tenant-isolation.test.ts` proves the repository layer scopes correctly
 * **when it is given a tenant**. That is a different claim from the one that
 * matters to a deployment, which is that a configured instance writes rows
 * carrying its tenant and can read them back — and the two came apart.
 *
 * The reads took their tenant from the `Tenant` service; the write path took
 * it from a field on its argument, and `routes/subject.ts` never passed one.
 * So an instance configured with a tenant wrote every row with a NULL tenant
 * and then could not see them. Two consequences, both bad on a consent
 * platform:
 *
 * - a tenanted deployment silently loses every consent it records, because
 *   its own reads filter on a tenant the rows do not have;
 * - every tenant's rows land in the same NULL bucket, where a single-tenant
 *   instance pointed at that database reads all of them.
 *
 * The repository suite could not catch it: it calls `submit` directly and
 * passes the tenant itself, which is precisely the step that was missing. It
 * takes a test at this boundary, so that is what this is.
 */

import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_test_key';
const GIVEN_AT = new Date(1_800_000_000_000);

const submission = {
	subjectId: 'sub_tenanted',
	domainId: 'dom_1',
	policyId: 'pol_1',
	externalId: 'ext_tenanted',
	purposeIds: ['analytics'],
	givenAt: GIVEN_AT.toISOString(),
};

for (const engine of ENGINES) {
	describe(`tenant through the HTTP surface (${engine.name})`, () => {
		let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

		const appFor = (tenantId: string | undefined) =>
			createApp(runtime, { apiKeys: [API_KEY], tenantId });

		const post = (app: ReturnType<typeof createApp>, body: unknown) =>
			app.request('/subjects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

		beforeEach(async () => {
			runtime = ManagedRuntime.make(engine.client);
			await runtime.runPromise(
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					// Untenanted so every tenant's instance can reference them; the
					// tenant under test is the only variable.
					yield* sql`insert into ${sql('domain')} ${sql.insert(
						encodeRow(encode, {
							id: 'dom_1',
							name: 'example.com',
							createdAt: GIVEN_AT,
							updatedAt: GIVEN_AT,
						})
					)}`;
					yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
						encodeRow(encode, {
							id: 'pol_1',
							version: '1.0',
							type: 'cookie',
							effectiveDate: GIVEN_AT,
							isActive: true,
							createdAt: GIVEN_AT,
						})
					)}`;
				})
			);
		});

		afterEach(async () => {
			await runtime.dispose();
		});

		const rowTenants = (table: string) =>
			runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ tenantId: string | null }>`
						select ${sql('tenantId')} from ${sql(table)}
					`;
					return rows.map((row) => row.tenantId);
				})
			);

		it('writes rows carrying the configured tenant', async () => {
			const response = await post(appFor('tenant_a'), submission);
			assert.strictEqual(response.status, 200, await response.text());

			// Every table the submission touches, not just the consent: a subject
			// or audit entry under the wrong tenant is the same disclosure.
			for (const table of ['subject', 'consent', 'auditLog']) {
				assert.deepStrictEqual(
					await rowTenants(table),
					['tenant_a'],
					`${table} row must carry the configured tenant`
				);
			}
		});

		it('reads back what it recorded', async () => {
			const app = appFor('tenant_a');
			await post(app, submission);

			const read = await app.request('/subjects?externalId=ext_tenanted', {
				headers: { Authorization: `Bearer ${API_KEY}` },
			});
			const body = (await read.json()) as { subjects: unknown[] };

			// The whole point of a write: an instance that cannot see its own
			// consent records has silently lost them.
			assert.strictEqual(body.subjects.length, 1);
		});

		it('does not read another tenant', async () => {
			await post(appFor('tenant_a'), submission);

			const read = await appFor('tenant_b').request(
				'/subjects?externalId=ext_tenanted',
				{ headers: { Authorization: `Bearer ${API_KEY}` } }
			);
			const body = (await read.json()) as { subjects: unknown[] };

			assert.strictEqual(body.subjects.length, 0, 'leaked another tenant');
		});

		it('does not expose tenanted rows to a single-tenant instance', async () => {
			await post(appFor('tenant_a'), submission);

			// The bug's second consequence: with writes landing under NULL, an
			// untenanted instance sharing the database read every tenant's rows.
			const read = await appFor(undefined).request(
				'/subjects?externalId=ext_tenanted',
				{ headers: { Authorization: `Bearer ${API_KEY}` } }
			);
			const body = (await read.json()) as { subjects: unknown[] };

			assert.strictEqual(body.subjects.length, 0, 'leaked to a null scope');
		});

		it('publishes a legal document under the configured tenant', async () => {
			// `syncCurrent` had the same defect as the consent write: the route
			// passed no tenant, so a published policy landed under NULL while the
			// instance's reads filtered on its own tenant.
			const response = await appFor('tenant_a').request(
				'/legal-documents/terms/current',
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${API_KEY}`,
					},
					body: JSON.stringify({
						version: '2.0',
						hash: 'sha256-terms',
						effectiveDate: GIVEN_AT.toISOString(),
					}),
				}
			);
			assert.strictEqual(response.status, 200, await response.text());

			const published = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{ tenantId: string | null }>`
						select ${sql('tenantId')} from ${sql('consentPolicy')}
						where ${sql('type')} = ${'terms'}
					`;
				})
			);

			assert.deepStrictEqual(
				published.map((row) => row.tenantId),
				['tenant_a']
			);
		});

		it('keeps an identical submission from two tenants as two records', async () => {
			await post(appFor('tenant_a'), submission);
			await post(appFor('tenant_b'), submission);

			// Byte-identical bodies. The consent id is deterministic, so if the
			// tenant were not part of it the second would be treated as a replay
			// and one tenant's consent would go unrecorded.
			assert.deepStrictEqual((await rowTenants('consent')).sort(), [
				'tenant_a',
				'tenant_b',
			]);
		});
	});
}
