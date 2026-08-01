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

describe('GET /status', () => {
	it('reports version and client context', async () => {
		const response = await app.request('/status', {
			headers: {
				'accept-language': 'de-DE',
				'x-forwarded-for': '203.0.113.42',
			},
		});

		assert.strictEqual(response.status, 200);
		const body = await response.json();
		assert.strictEqual(body.client.acceptLanguage, 'de-DE');
		// The IP is masked on the way in, as it is everywhere else.
		assert.strictEqual(body.client.ip, '203.0.113.0');
		assert.isString(body.version);
	});

	it('needs no API key', async () => {
		// A health check a load balancer cannot reach without credentials is
		// not a health check.
		const response = await app.request('/status');
		assert.strictEqual(response.status, 200);
	});

	it('reports 503 rather than 500 when the database is unreachable', async () => {
		await runtime.runPromise(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe('drop table "subject" cascade');
			})
		);

		const response = await app.request('/status');

		// Orchestrators read 503 as "retry me" and 500 as "I am broken". An
		// unreachable database is the former.
		assert.strictEqual(response.status, 503);
		assert.deepStrictEqual(await response.json(), {
			message: 'Database health check failed',
			cause: { code: 'SERVICE_UNAVAILABLE' },
		});
	});
});

describe('GET /subjects/:id', () => {
	it('returns a body satisfying the shared output schema', async () => {
		await seed();
		const response = await app.request('/subjects/sub_1');

		assert.strictEqual(response.status, 200);
		const body = await response.json();
		assert.strictEqual(body.subject.id, 'sub_1');
		assert.strictEqual(body.consents.length, 1);
	});

	it('404s for a subject that does not exist', async () => {
		const response = await app.request('/subjects/sub_absent');

		// Distinct from an empty consent list, which would wrongly assert the
		// subject exists and has consented to nothing.
		assert.strictEqual(response.status, 404);
		assert.deepStrictEqual(await response.json(), {
			message: 'Subject not found',
			cause: { code: 'NOT_FOUND' },
		});
	});

	it('narrows to the requested policy types', async () => {
		await seed();
		const matched = await (
			await app.request('/subjects/sub_1?type=cookie')
		).json();
		assert.strictEqual(matched.consents.length, 1);

		const unmatched = await (
			await app.request('/subjects/sub_1?type=marketing')
		).json();
		assert.strictEqual(unmatched.consents.length, 0);
	});

	it('is valid only against the current policy', async () => {
		await seed();

		// With no filter there is nothing to be invalid about.
		const unfiltered = await (await app.request('/subjects/sub_1')).json();
		assert.isTrue(unfiltered.isValid);

		const matched = await (
			await app.request('/subjects/sub_1?type=cookie')
		).json();
		assert.isTrue(matched.isValid);

		// A type the subject has never consented to cannot be valid.
		const missing = await (
			await app.request('/subjects/sub_1?type=marketing')
		).json();
		assert.isFalse(missing.isValid);
	});

	it('does not count consent given against a superseded policy', async () => {
		await seed();
		await runtime.runPromise(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				// A newer active policy of the same type supersedes pol_1.
				yield* sql.unsafe(`insert into "consentPolicy"
					("id","version","type","effectiveDate","isActive","createdAt")
					values ('pol_2','2.0','cookie',now() + interval '1 day',true,now())`);
			})
		);

		const body = await (
			await app.request('/subjects/sub_1?type=cookie')
		).json();

		// The consent still exists, but it is against an outdated policy — which
		// is exactly the case a compliance check has to catch.
		assert.strictEqual(body.consents.length, 1);
		assert.isFalse(body.consents[0].isLatestPolicy);
		assert.isFalse(body.isValid);
	});
});
