/**
 * The HTTP surface, exercised through real requests.
 *
 * These assert the wire contract rather than the implementation, because wire
 * compatibility with `@c15t/backend` 2.x is the hard requirement that makes
 * running both packages side by side possible (RFC 0004 §Non-goals). Response
 * bodies are checked against the same `@c15t/schema` schemas the 2.x routes
 * validate against, so a drift fails here instead of reaching a client.
 */

import { listSubjectsOutputSchema } from '@c15t/schema';
import { PgliteClient } from '@effect/sql-pglite';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import * as v from 'valibot';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { createApp } from './app';

let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
let app: ReturnType<typeof createApp>;

const API_KEY = 'sk_test_key';
const authed = { headers: { Authorization: `Bearer ${API_KEY}` } };

beforeEach(async () => {
	runtime = ManagedRuntime.make(PgliteClient.layer({}));
	await runtime.runPromise(
		Effect.gen(function* () {
			yield* baseline;
			yield* indexes;
		})
	);
	app = createApp(runtime, { apiKeys: [API_KEY] });
});

afterEach(async () => {
	await runtime.dispose();
});

const seed = () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
				values ('dom_1','example.com',now(),now())`);
			yield* sql.unsafe(`insert into "consentPolicy"
				("id","version","type","effectiveDate","isActive","createdAt")
				values ('pol_1','1.0','cookie',now(),true,now())`);
			yield* sql.unsafe(`insert into "subject"
				("id","externalId","createdAt","updatedAt")
				values ('sub_1','ext_1',now(),now())`);
			yield* sql.unsafe(`insert into "consent"
				("id","subjectId","domainId","policyId","purposeIds","givenAt")
				values ('cns_1','sub_1','dom_1','pol_1','[]',now())`);
		})
	);

describe('GET /subjects', () => {
	it('returns a body satisfying the shared output schema', async () => {
		await seed();

		const response = await app.request('/subjects?externalId=ext_1', authed);
		assert.strictEqual(response.status, 200);

		const body = await response.json();

		// Dates arrive as ISO strings over the wire; the schema expects Date,
		// so revive before validating — as a 2.x client would. Done generically
		// rather than field by field, because naming each one means a new date
		// field silently fails the assertion for the wrong reason.
		const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
		const revive = (value: unknown): unknown => {
			if (typeof value === 'string')
				return ISO.test(value) ? new Date(value) : value;
			if (Array.isArray(value)) return value.map(revive);
			if (value !== null && typeof value === 'object') {
				return Object.fromEntries(
					Object.entries(value).map(([key, nested]) => [key, revive(nested)])
				);
			}
			return value;
		};
		const revived = revive(body);

		const parsed = v.safeParse(listSubjectsOutputSchema, revived);
		assert.isTrue(
			parsed.success,
			parsed.success ? '' : JSON.stringify(v.flatten(parsed.issues))
		);
	});

	it('reports a missing externalId the way 2.x does', async () => {
		const response = await app.request('/subjects', authed);

		assert.strictEqual(response.status, 400);
		assert.deepStrictEqual(await response.json(), {
			message: 'externalId query parameter is required',
			cause: { code: 'EXTERNAL_ID_REQUIRED' },
		});
	});

	it('treats an empty externalId as missing rather than matching nothing', async () => {
		// A bare `?externalId=` is a client bug, and answering it with an empty
		// list would hide that. 2.x rejects it, so this does too.
		const response = await app.request('/subjects?externalId=', authed);
		assert.strictEqual(response.status, 400);
	});

	it('returns an empty list for an externalId nobody has', async () => {
		await seed();
		const response = await app.request(
			'/subjects?externalId=ext_absent',
			authed
		);

		assert.strictEqual(response.status, 200);
		assert.deepStrictEqual(await response.json(), { subjects: [] });
	});

	it('does not leak database detail when a query fails', async () => {
		// Drop the table out from under the handler to force a SqlError.
		await runtime.runPromise(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe('drop table "consent" cascade');
			})
		);

		const response = await app.request('/subjects?externalId=ext_1', authed);
		const body = await response.json();

		assert.strictEqual(response.status, 500);
		// Table and column names in an error body are information disclosure,
		// and more so on a consent platform. Detail belongs in the wide event.
		assert.deepStrictEqual(body, {
			message: 'Internal server error',
			cause: { code: 'DATABASE_ERROR' },
		});
		assert.notInclude(JSON.stringify(body), 'consent');
	});

	it('refuses a request with no API key', async () => {
		await seed();
		const response = await app.request('/subjects?externalId=ext_1');

		// Listing subjects exposes consent records for a named person, so an
		// unauthenticated caller must get nothing — not an empty list, which
		// would imply the person has no consents.
		assert.strictEqual(response.status, 401);
		assert.deepStrictEqual(await response.json(), {
			message: 'Unauthorized',
			cause: { code: 'UNAUTHORIZED' },
		});
	});

	it('refuses a wrong API key', async () => {
		const response = await app.request('/subjects?externalId=ext_1', {
			headers: { Authorization: 'Bearer sk_test_wrong' },
		});
		assert.strictEqual(response.status, 401);
	});

	it('authenticates before validating input', async () => {
		// A missing externalId must not leak that the endpoint exists in a
		// usable state to an unauthenticated caller.
		const response = await app.request('/subjects');
		assert.strictEqual(response.status, 401);
	});
});
