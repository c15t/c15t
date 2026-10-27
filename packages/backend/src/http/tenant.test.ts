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

import type { PolicyRule } from '@c15t/schema';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/sql';
import { SignJWT } from 'jose';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { up as vendorChoice } from '../db/migrations/4-vendor-choice';
import { up as attribution } from '../db/migrations/6-experiment-attribution';
import { up as optionalJurisdiction } from '../db/migrations/7-optional-decision-jurisdiction';
import { up as verifiedExternalId } from '../db/migrations/8-verified-external-id';
import { up as additionalConsent } from '../db/migrations/9-additional-consent';
import { TABLES } from '../db/schema';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_test_key';
const SIGNING_KEY = 'test-signing-key-at-least-32-chars-long';
const IDENTITY_KEY = 'identity-signing-key-for-backend-tests';
const GIVEN_AT = new Date(1_800_000_000_000);
/** A moment that has already happened; later-than-server times are refused. */
const ACTED_AT = new Date(1_700_000_000_000);

/** A matched rule, so the save records a runtime policy decision. */
const RULES: PolicyRule[] = [
	{
		categories: ['marketing'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	},
	{
		id: 'world_opt_out',
		match: { isDefault: true },
		model: 'opt-out',
		prompt: 'none',
	},
];

/** An identity token as `@c15t/node-sdk`'s `createIdentityToken` signs it. */
const identityTokenFor = (externalId: string) =>
	new SignJWT({})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer('c15t')
		.setAudience('c15t-identity')
		.setSubject(externalId)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + 600)
		.sign(new TextEncoder().encode(IDENTITY_KEY));

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

		// With the API key, as the customer's server would send it, so the
		// external id link is verified and reads by external id can see it.
		const post = (app: ReturnType<typeof createApp>, body: unknown) =>
			app.request('/subjects', {
				body: JSON.stringify(body),
				headers: {
					Authorization: `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
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
					yield* vendorChoice;
					yield* attribution;
					yield* optionalJurisdiction;
					yield* verifiedExternalId;
					yield* additionalConsent;
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

		it('logs an identity link under the configured tenant', async () => {
			const app = appFor('tenant_a');
			await post(app, { ...submission, externalSubjectId: undefined });

			const response = await app.request(`/subjects/${submission.subjectId}`, {
				body: JSON.stringify({ externalId: 'ext_linked' }),
				headers: { 'Content-Type': 'application/json' },
				method: 'PATCH',
			});
			assert.strictEqual(response.status, 200, await response.text());

			// The consent's `consent_given` entry and the link's `identify_user`
			// entry: the second is written by a different repository function.
			assert.deepStrictEqual(await rowTenants('auditLog'), [
				'tenant_a',
				'tenant_a',
			]);
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

			// 409 with its own code, so a client can tell it apart from a
			// receipt conflict: this one it recovers from with a new id.
			const second = await post(appFor('tenant_b'), submission);
			assert.strictEqual(second.status, 409);
			const body = (await second.json()) as { cause?: { code?: string } };
			assert.strictEqual(body.cause?.code, 'SUBJECT_CONFLICT');

			// And nothing was written under the second tenant.
			assert.deepStrictEqual(await rowTenants('consent'), ['tenant_a']);
		});

		it('refuses to link a subjectId another tenant already owns', async () => {
			// PATCH creates a missing subject, so it runs the same ownership
			// check a save does.
			assert.strictEqual(
				(await post(appFor('tenant_a'), submission)).status,
				200
			);

			const response = await appFor('tenant_b').request(
				`/subjects/${submission.subjectId}`,
				{
					body: JSON.stringify({ externalId: 'ext_other' }),
					headers: { 'Content-Type': 'application/json' },
					method: 'PATCH',
				}
			);
			assert.strictEqual(response.status, 409);
			const body = (await response.json()) as { cause?: { code?: string } };
			assert.strictEqual(body.cause?.code, 'SUBJECT_CONFLICT');
			assert.deepStrictEqual(await rowTenants('subject'), ['tenant_a']);
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
			assert.strictEqual(changed.status, 409);
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

	describe(`every write under a tenant (${engine.name})`, () => {
		let harness: HttpHarness;

		const appOptions = {
			apiKeys: [API_KEY],
			identityToken: { signingKey: IDENTITY_KEY },
			manifest: { appName: 'Tenanted', policyRules: RULES },
			policySnapshot: { signingKey: SIGNING_KEY },
		};

		/** Every write route, with the branches that write differently. */
		const writeAll = async (
			app: ReturnType<typeof createApp>,
			subjectId: string
		) => {
			const auth = { Authorization: `Bearer ${API_KEY}` };
			const expect = (
				step: string,
				result: { body: unknown; status: number },
				status = 200
			) =>
				assert.strictEqual(
					result.status,
					status,
					`${subjectId} ${step}: ${JSON.stringify(result.body)}`
				);

			const init = await harness.json(
				'GET',
				'/init',
				undefined,
				{ 'x-c15t-country': 'DE' },
				app
			);
			const save = {
				...submission,
				externalSubjectId: undefined,
				policySnapshotToken: init.body.policySnapshotToken,
				preferences: { marketing: true, necessary: true },
				subjectId,
			};
			const post = (body: unknown) =>
				harness.json('POST', '/subjects', body, auth, app);
			expect('save', await post(save));
			expect('replay', await post(save));
			expect(
				'conflicting resubmission',
				await post({ ...save, preferences: { necessary: true } }),
				409
			);

			// Unverified, then by identity token, then by API key: each takes a
			// different path through `linkExternalId`. The external ids are the
			// same for every tenant, so an unscoped conflict check refuses one.
			const link = (body: unknown, headers = {}) =>
				harness.json('PATCH', `/subjects/${subjectId}`, body, headers, app);
			expect('unverified link', await link({ externalId: 'ext_unverified' }));
			expect(
				'token link',
				await link({
					externalId: 'ext_token',
					identityToken: await identityTokenFor('ext_token'),
				})
			);
			expect('api key link', await link({ externalId: 'ext_key' }, auth));

			// Publish, supersede, then bring the first back: the last two update
			// rows by type, which is where another tenant's policy would change.
			const publish = (version: string, hash: string) =>
				harness.json(
					'PUT',
					'/legal-documents/terms/current',
					{ effectiveDate: GIVEN_AT.toISOString(), hash, version },
					auth,
					app
				);
			expect('publish', await publish('1.0', 'sha256-terms-1'));
			expect('supersede', await publish('2.0', 'sha256-terms-2'));
			expect('reactivate', await publish('1.0', 'sha256-terms-1'));
			expect('resync', await publish('1.0', 'sha256-terms-1'));
		};

		const allRows = () =>
			harness.runtime.runPromise(
				Effect.forEach(TABLES, (table) =>
					Effect.gen(function* tableRows() {
						const sql = yield* SqlClient.SqlClient;
						const rows = yield* sql<Record<string, unknown>>`
							select * from ${sql(table.name)} order by ${sql('id')}
						`;
						return [table.name, rows] as const;
					})
				)
			);

		beforeEach(async () => {
			// Nothing seeded: every row in the database was written by a route.
			harness = await createHttpHarness(engine, {
				...appOptions,
				tenantId: 'tenant_a',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('writes only its own tenant rows', async () => {
			// The column defaults to NULL, so a write that forgets the tenant
			// succeeds and only shows up as a row under the wrong one.
			// `identify_user` audit entries did exactly that while every other
			// write carried it. The neighbours write first, so an unscoped update
			// or lookup has someone else's row to land on.
			await writeAll(harness.appWith(appOptions), 'sub_untenanted');
			await writeAll(
				harness.appWith({ ...appOptions, tenantId: 'tenant_b' }),
				'sub_tenantB'
			);
			const before = await allRows();

			await writeAll(harness.app, 'sub_tenantA');
			const after = await allRows();

			for (const [index, [table, rows]] of after.entries()) {
				const mine = rows.filter((row) => row.tenantId === 'tenant_a');
				// An empty table proves nothing, so a new table fails here until
				// the writes above reach it.
				assert.isNotEmpty(mine, `no write above reaches ${table}`);
				assert.deepStrictEqual(
					rows.filter((row) => row.tenantId !== 'tenant_a'),
					before[index]?.[1],
					`${table}: a tenant_a write added or changed another tenant's row`
				);
			}

			// The PATCH's own entries, which the save's would otherwise hide.
			const audit = after
				.find(([table]) => table === 'auditLog')?.[1]
				.filter((row) => row.tenantId === 'tenant_a')
				.map((row) => row.actionType);
			assert.includeMembers(audit ?? [], ['consent_given', 'identify_user']);
			assert.lengthOf(
				audit?.filter((action) => action === 'identify_user') ?? [],
				3
			);
		});
	});
}
