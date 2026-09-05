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
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_test_key';
const GIVEN_AT = new Date(1_800_000_000_000);
/** A moment that has already happened; later-than-server times are refused. */
const ACTED_AT = new Date(1_700_000_000_000);

const submission = {
	domain: 'example.com',
	externalSubjectId: 'ext_tenanted',
	givenAt: ACTED_AT.getTime(),
	preferences: { analytics: true, necessary: true },
	subjectId: 'sub_tenanted',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`tenant through the HTTP surface (${engine.name})`, () => {
		let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

		const appFor = (tenantId: string | undefined) =>
			createApp(runtime, { apiKeys: [API_KEY], tenantId });

		const post = (app: ReturnType<typeof createApp>, body: unknown) =>
			app.request('/subjects', {
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' },
				method: 'POST',
			});

		beforeEach(async () => {
			runtime = ManagedRuntime.make(engine.client);
			await runtime.runPromise(
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					// Untenanted so every tenant's instance can reference them; the
					// tenant under test is the only variable.
					yield* sql`insert into ${sql('domain')} ${sql.insert(
						encodeRow(encode, {
							createdAt: GIVEN_AT,
							id: 'dom_1',
							name: 'example.com',
							updatedAt: GIVEN_AT,
						})
					)}`;
					yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
						encodeRow(encode, {
							createdAt: GIVEN_AT,
							effectiveDate: GIVEN_AT,
							id: 'pol_1',
							isActive: true,
							type: 'cookie',
							version: '1.0',
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
				// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
				Effect.gen(function* rowTenants() {
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
			await Array.from(['subject', 'consent', 'auditLog']).reduce(
				async (previousIteration, table) => {
					await previousIteration;
					assert.deepStrictEqual(
						await rowTenants(table),
						['tenant_a'],
						`${table} row must carry the configured tenant`
					);
				},
				Promise.resolve()
			);
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
					body: JSON.stringify({
						effectiveDate: GIVEN_AT.toISOString(),
						hash: 'sha256-terms',
						version: '2.0',
					}),
					headers: {
						Authorization: `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					method: 'PUT',
				}
			);
			assert.strictEqual(response.status, 200, await response.text());

			const published = await runtime.runPromise(
				Effect.gen(function* published() {
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
			// Same everything except the subject id, which each tenant generates
			// for itself. `subject.id` is the primary key and globally unique, so
			// a shared one is a conflict rather than two subjects — covered
			// separately below.
			await post(appFor('tenant_a'), { ...submission, subjectId: 'sub_a' });
			await post(appFor('tenant_b'), { ...submission, subjectId: 'sub_b' });

			// The consent id is deterministic, so if the tenant were not part of
			// it the second would be treated as a replay and one tenant's consent
			// would go unrecorded.
			assert.deepStrictEqual((await rowTenants('consent')).sort(), [
				'tenant_a',
				'tenant_b',
			]);
		});

		it('refuses a subjectId another tenant already owns', async () => {
			// `subject.id` is the primary key and the client chooses it, so two
			// tenants can name the same subject. Reusing the existing row would
			// hang tenant B's consent off tenant A's subject — which tenant A then
			// reads and tenant B cannot. Measured before the fix: tenant A saw 2
			// consents, one of them tenant B's.
			const first = await post(appFor('tenant_a'), submission);
			assert.strictEqual(first.status, 200);

			const second = await post(appFor('tenant_b'), submission);
			assert.strictEqual(second.status, 400);
			const body = (await second.json()) as { cause?: { code?: string } };
			assert.strictEqual(body.cause?.code, 'CONFLICT');

			// And nothing was written under the second tenant.
			assert.deepStrictEqual(await rowTenants('consent'), ['tenant_a']);
		});

		it('refuses a resubmission that changes the purposes', async () => {
			// The consent id covers identity and not purposes, so this arrives
			// looking exactly like a retry. Answering 200 would tell the client
			// its purposes were recorded while the stored record still said
			// something else.
			const first = await post(appFor('tenant_a'), submission);
			assert.strictEqual(first.status, 200);

			const changed = await post(appFor('tenant_a'), {
				...submission,
				preferences: { analytics: true, marketing: true, necessary: true },
			});
			assert.strictEqual(changed.status, 400);
			const body = (await changed.json()) as { cause?: { code?: string } };
			assert.strictEqual(body.cause?.code, 'CONFLICT');
		});

		it('still treats an identical resubmission as a replay', async () => {
			// The conflict check must not cost idempotency: the same purposes in
			// a different order are the same act.
			await post(appFor('tenant_a'), {
				...submission,
				preferences: { analytics: true, marketing: true, necessary: true },
			});
			const replay = await post(appFor('tenant_a'), {
				...submission,
				// oxlint-disable-next-line sort-keys -- Key order is the point: the same map in a different order is the same act.
				preferences: { marketing: true, necessary: true, analytics: true },
			});

			assert.strictEqual(replay.status, 200);
			assert.deepStrictEqual(await rowTenants('consent'), ['tenant_a']);
		});

		it('does not join another tenant consent onto its own subject', async () => {
			// Defence in depth for the same disclosure, independent of the write
			// path refusing: a cross-tenant consent row planted directly must not
			// appear in a tenant's read. The join carries its own tenant
			// predicate rather than relying on the driving table's.
			await post(appFor('tenant_a'), submission);

			await runtime.runPromise(
				Effect.gen(function* gen() {
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					yield* sql`insert into ${sql('consent')} ${sql.insert(
						encodeRow(encode, {
							domainId: 'dom_1',
							givenAt: GIVEN_AT,
							id: 'cns_planted',
							policyId: 'pol_1',
							purposeIds: '[]',
							subjectId: 'sub_tenanted',
							tenantId: 'tenant_b',
						})
					)}`;
				})
			);

			const read = await appFor('tenant_a').request(
				'/subjects?externalId=ext_tenanted',
				{ headers: { Authorization: `Bearer ${API_KEY}` } }
			);
			const body = (await read.json()) as {
				subjects: { consents: unknown[] }[];
			};
			assert.strictEqual(
				body.subjects[0]?.consents.length,
				1,
				'leaked another tenant consent through the join'
			);
		});
	});
}
