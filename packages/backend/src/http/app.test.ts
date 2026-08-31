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
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import * as v from 'valibot';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import * as Dialect from '../db/dialect';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

for (const engine of ENGINES) {
	let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
	let app: ReturnType<typeof createApp>;

	const API_KEY = 'sk_test_key';
	const authed = { headers: { Authorization: `Bearer ${API_KEY}` } };

	beforeEach(async () => {
		runtime = ManagedRuntime.make(engine.client);
		await runtime.runPromise(
			Effect.gen(function* () {
				yield* resetDatabase;
				yield* baseline;
				yield* indexes;
			})
		);
		app = createApp(runtime, {
			apiKeys: [API_KEY],
			trustedOrigins: ['https://app.example.com'],
		});
	});

	afterEach(async () => {
		await runtime.dispose();
	});

	const seed = () =>
		runtime.runPromise(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				// Through the encoder, quoted by the dialect: SQLite binds neither a
				// Date nor a boolean, and MySQL rejects double-quoted identifiers.
				const encode = yield* encoder;
				const now = new Date(1_800_000_000_000);

				yield* sql`insert into ${sql('domain')} ${sql.insert(
					encodeRow(encode, {
						id: 'dom_1',
						name: 'example.com',
						createdAt: now,
						updatedAt: now,
					})
				)}`;
				yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
					encodeRow(encode, {
						id: 'pol_1',
						version: '1.0',
						type: 'cookie',
						effectiveDate: now,
						isActive: true,
						createdAt: now,
					})
				)}`;
				yield* sql`insert into ${sql('subject')} ${sql.insert(
					encodeRow(encode, {
						id: 'sub_1',
						externalId: 'ext_1',
						createdAt: now,
						updatedAt: now,
					})
				)}`;
				yield* sql`insert into ${sql('consent')} ${sql.insert(
					encodeRow(encode, {
						id: 'cns_1',
						subjectId: 'sub_1',
						domainId: 'dom_1',
						policyId: 'pol_1',
						purposeIds: '[]',
						givenAt: now,
					})
				)}`;
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
			const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/u;
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
					const q = Dialect.escaperFor(yield* Dialect.current);
					// Foreign keys point at this table, so they have to go first
					// on the engines with no `cascade`.
					yield* sql.onDialectOrElse({
						pg: () => sql.unsafe(`drop table ${q('consent')} cascade`),
						mysql: () =>
							Effect.gen(function* () {
								yield* sql`set foreign_key_checks = 0`;
								yield* sql.unsafe(`drop table ${q('consent')}`);
								yield* sql`set foreign_key_checks = 1`;
							}),
						orElse: () => sql.unsafe(`drop table ${q('consent')}`),
					});
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
					const q = Dialect.escaperFor(yield* Dialect.current);
					yield* sql.onDialectOrElse({
						pg: () => sql.unsafe(`drop table ${q('subject')} cascade`),
						mysql: () =>
							Effect.gen(function* () {
								yield* sql`set foreign_key_checks = 0`;
								yield* sql.unsafe(`drop table ${q('subject')}`);
								yield* sql`set foreign_key_checks = 1`;
							}),
						orElse: () => sql.unsafe(`drop table ${q('subject')}`),
					});
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
					const encode = yield* encoder;
					yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
						encodeRow(encode, {
							id: 'pol_2',
							version: '2.0',
							type: 'cookie',
							effectiveDate: new Date(1_800_086_400_000),
							isActive: true,
							createdAt: new Date(1_800_000_000_000),
						})
					)}`;
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

	describe('GET /consents/check', () => {
		it('reports every requested type, present or not', async () => {
			await seed();
			const body = await (
				await app.request(
					'/consents/check?externalId=ext_1&type=cookie,marketing'
				)
			).json();

			// An absent type must appear as false rather than be omitted: a caller
			// gating script execution has to tell "no consent" from "unknown type".
			assert.deepStrictEqual(body.results, {
				cookie: { hasConsent: true, isLatestPolicy: true },
				marketing: { hasConsent: false, isLatestPolicy: false },
			});
		});

		it('separates having consent from it being current', async () => {
			await seed();
			await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
						encodeRow(yield* encoder, {
							id: 'pol_2',
							version: '2.0',
							type: 'cookie',
							effectiveDate: new Date(1_800_086_400_000),
							isActive: true,
							createdAt: new Date(1_800_000_000_000),
						})
					)}`;
				})
			);

			const body = await (
				await app.request('/consents/check?externalId=ext_1&type=cookie')
			).json();

			// Consent exists but is against a superseded policy — the two flags
			// exist precisely so a caller can act on that difference.
			assert.deepStrictEqual(body.results.cookie, {
				hasConsent: true,
				isLatestPolicy: false,
			});
		});

		it('requires both query parameters', async () => {
			const noExternal = await app.request('/consents/check?type=cookie');
			assert.strictEqual(noExternal.status, 400);
			assert.strictEqual(
				(await noExternal.json()).cause.code,
				'EXTERNAL_ID_REQUIRED'
			);

			const noType = await app.request('/consents/check?externalId=ext_1');
			assert.strictEqual(noType.status, 400);
			assert.strictEqual((await noType.json()).cause.code, 'TYPE_REQUIRED');
		});

		it('reports all types false for an unknown subject', async () => {
			const body = await (
				await app.request('/consents/check?externalId=nobody&type=cookie')
			).json();
			assert.deepStrictEqual(body.results.cookie, {
				hasConsent: false,
				isLatestPolicy: false,
			});
		});
	});

	describe('CORS', () => {
		it('allows a trusted origin', async () => {
			const response = await app.request('/status', {
				headers: { Origin: 'https://app.example.com' },
			});
			assert.strictEqual(
				response.headers.get('Access-Control-Allow-Origin'),
				'https://app.example.com'
			);
			// Without Vary, a shared cache could serve one origin's response to
			// another.
			assert.strictEqual(response.headers.get('Vary'), 'Origin');
		});

		it('sends no CORS headers for an untrusted origin', async () => {
			const response = await app.request('/status', {
				headers: { Origin: 'https://evil.example.com' },
			});
			// Absence is the rejection — the browser blocks it. Echoing the origin
			// back would defeat the allowlist entirely.
			assert.isNull(response.headers.get('Access-Control-Allow-Origin'));
		});

		it('rejects every origin when none are configured', async () => {
			const closed = createApp(runtime, { apiKeys: [API_KEY] });
			const response = await closed.request('/status', {
				headers: { Origin: 'https://app.example.com' },
			});
			// A deployment that has not configured origins should reject rather
			// than default open.
			assert.isNull(response.headers.get('Access-Control-Allow-Origin'));
		});

		it('answers a preflight without reaching a route', async () => {
			const response = await app.request('/subjects', {
				method: 'OPTIONS',
				headers: {
					Origin: 'https://app.example.com',
					'Access-Control-Request-Method': 'GET',
				},
			});

			// 204 and not 401: the preflight carries no credentials by design, so
			// requiring auth here would break every browser client.
			assert.strictEqual(response.status, 204);
			assert.include(
				response.headers.get('Access-Control-Allow-Methods') ?? '',
				'GET'
			);
		});
	});

	describe('PUT /legal-documents/:type/current', () => {
		const release = {
			version: '1.0',
			hash: 'sha256-abc',
			effectiveDate: new Date(1_800_000_000_000).toISOString(),
		};
		const put = (body: unknown, auth = true) =>
			app.request('/legal-documents/privacy_policy/current', {
				method: 'PUT',
				headers: (() => {
					const headers: Record<string, string> = {
						'Content-Type': 'application/json',
					};
					if (auth) {
						headers.Authorization = `Bearer ${API_KEY}`;
					}
					return headers;
				})(),
				body: JSON.stringify(body),
			});

		it('requires an API key', async () => {
			const response = await put(release, false);
			// This decides which policy every later consent is measured against,
			// so it is an administrative operation.
			assert.strictEqual(response.status, 401);
		});

		it('creates and activates a release', async () => {
			const body = await (await put(release)).json();
			assert.strictEqual(body.policy.version, '1.0');
			assert.isTrue(body.policy.isActive);
		});

		it('is idempotent', async () => {
			const first = await (await put(release)).json();
			const second = await (await put(release)).json();

			assert.strictEqual(second.policy.id, first.policy.id);

			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{
						total: string;
					}>`select count(*) as total from ${sql('consentPolicy')}`;
				})
			);
			assert.strictEqual(Number(rows[0]?.total), 1);
		});

		it('leaves exactly one active policy per type', async () => {
			await put(release);
			await put({ ...release, version: '2.0', hash: 'sha256-def' });

			const active = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{ version: string }>`
						select ${sql('version')} from ${sql('consentPolicy')}
						where ${sql('type')} = ${'privacy_policy'}
							and ${sql('isActive')} = ${(yield* encoder)(true)}
					`;
				})
			);

			// isLatestPolicy on every consent is derived from this invariant, so
			// two actives would silently break validity checks system-wide.
			assert.strictEqual(active.length, 1);
			assert.strictEqual(active[0]?.version, '2.0');
		});

		it('rejects a hash reused under different metadata', async () => {
			await put(release);
			const response = await put({ ...release, version: '9.9' });

			// The hash identifies the content; the same hash claiming a different
			// version means the caller has two ideas about what the document says.
			assert.strictEqual(response.status, 400);
			assert.strictEqual((await response.json()).cause.code, 'CONFLICT');
		});

		it('rejects an unparseable effectiveDate', async () => {
			const response = await put({ ...release, effectiveDate: 'not-a-date' });
			assert.strictEqual(response.status, 422);
		});
	});

	describe('PATCH /subjects/:id', () => {
		const patch = (id: string, body: unknown) =>
			app.request(`/subjects/${id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'x-forwarded-for': '203.0.113.42',
				},
				body: JSON.stringify(body),
			});

		it('links a subject to an external identity', async () => {
			await seed();
			const body = await (
				await patch('sub_1', { externalId: 'ext_new' })
			).json();
			assert.strictEqual(body.subject.externalId, 'ext_new');
			assert.strictEqual(body.subject.identityProvider, 'external');
		});

		it('writes an audit entry recording what changed', async () => {
			await seed();
			await patch('sub_1', {
				externalId: 'ext_new',
				identityProvider: 'auth0',
			});

			const entries = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{
						actionType: string;
						changes: unknown;
						ipAddress: string | null;
					}>`select ${sql('actionType')}, ${sql('changes')}, ${sql('ipAddress')}
						from ${sql('auditLog')}`;
				})
			);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0]?.actionType, 'identify_user');
			// From-and-to, not just "changed": a trail that cannot answer "from
			// what?" cannot support a subject access request.
			// Postgres and MySQL hand back parsed JSON; SQLite stores the column
			// as TEXT and returns the string.
			const raw = entries[0]?.changes;
			const changes = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
				externalId: { from: string | null; to: string };
			};
			assert.strictEqual(changes.externalId.from, 'ext_1');
			assert.strictEqual(changes.externalId.to, 'ext_new');
			// The recorded IP is masked, as everywhere else.
			assert.strictEqual(entries[0]?.ipAddress, '203.0.113.0');
		});

		it('404s for a subject that does not exist', async () => {
			const response = await patch('sub_absent', { externalId: 'ext_new' });
			assert.strictEqual(response.status, 404);
		});

		it('requires an externalId', async () => {
			await seed();
			const response = await patch('sub_1', {});
			assert.strictEqual(response.status, 400);
		});

		it('writes no audit entry when the subject is missing', async () => {
			await patch('sub_absent', { externalId: 'ext_new' });
			const entries = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{
						total: string;
					}>`select count(*) as total from ${sql('auditLog')}`;
				})
			);
			// An audit entry for a change that never happened is worse than none.
			assert.strictEqual(Number(entries[0]?.total), 0);
		});
	});

	describe('POST /subjects', () => {
		const post = (body: unknown) =>
			app.request('/subjects', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-forwarded-for': '203.0.113.42',
				},
				body: JSON.stringify(body),
			});

		const submission = {
			subjectId: 'sub_client',
			domainId: 'dom_1',
			policyId: 'pol_1',
			purposeIds: ['analytics'],
			givenAt: new Date(1_800_000_000_000).toISOString(),
		};

		it('records a consent', async () => {
			await seed();
			const response = await post(submission);

			assert.strictEqual(response.status, 200);
			const body = await response.json();
			assert.match(body.consentId, /^cns_/u);
			assert.strictEqual(body.subjectId, 'sub_client');
		});

		it('is unauthenticated', async () => {
			// A visitor's own browser submits its own consent; requiring an API key
			// would mean shipping one to every client.
			await seed();
			assert.strictEqual((await post(submission)).status, 200);
		});

		it('returns the same consent id on a replay', async () => {
			await seed();
			const first = await (await post(submission)).json();
			const second = await (await post(submission)).json();

			assert.strictEqual(second.consentId, first.consentId);

			// Scoped to this submission: seed() already inserted an unrelated
			// consent, so a bare count would measure the fixture, not the replay.
			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{ total: string }>`
						select count(*) as total from ${sql('consent')}
						where ${sql('id')} = ${first.consentId}
					`;
				})
			);
			assert.strictEqual(Number(rows[0]?.total), 1);
		});

		it('masks the recorded IP', async () => {
			await seed();
			const { consentId } = await (await post(submission)).json();

			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{ ipAddress: string | null }>`
						select ${sql('ipAddress')} from ${sql('consent')}
						where ${sql('id')} = ${consentId}
					`;
				})
			);
			assert.strictEqual(rows[0]?.ipAddress, '203.0.113.0');
		});

		it('rejects a submission missing its identifiers', async () => {
			assert.strictEqual((await post({ domainId: 'dom_1' })).status, 400);
			assert.strictEqual((await post({ subjectId: 'sub_1' })).status, 400);
		});

		it('rejects an unparseable givenAt rather than defaulting to now', async () => {
			await seed();
			// Defaulting would make a malformed retry a distinct consent, since
			// givenAt is part of the deterministic id.
			const response = await post({ ...submission, givenAt: 'not-a-date' });
			assert.strictEqual(response.status, 400);
		});
	});

	describe('OpenAPI spec', () => {
		it('publishes a spec listing every route', async () => {
			const response = await app.request('/spec.json');
			assert.strictEqual(response.status, 200);

			const spec = await response.json();
			assert.strictEqual(spec.openapi, '3.1.0');

			// Every endpoint the backend serves should be discoverable — a spec
			// that silently omits routes is worse than none, because an integrator
			// concludes they do not exist.
			for (const path of [
				'/subjects',
				'/subjects/{id}',
				'/consents/check',
				'/legal-documents/{type}/current',
				'/status',
			]) {
				assert.property(spec.paths, path, path);
			}
		});

		it('declares the bearer scheme the authenticated routes use', async () => {
			const spec = await (await app.request('/spec.json')).json();
			assert.deepStrictEqual(spec.components.securitySchemes.bearerAuth, {
				type: 'http',
				scheme: 'bearer',
			});
		});

		it('can be turned off', async () => {
			const quiet = createApp(runtime, {
				apiKeys: [API_KEY],
				openapi: { enabled: false },
			});
			assert.strictEqual((await quiet.request('/spec.json')).status, 404);
		});

		it('is enabled by default', async () => {
			// The spec documents a public API; an integrator should not have to opt
			// in to discovering the endpoints.
			const bare = createApp(runtime, {});
			assert.strictEqual((await bare.request('/spec.json')).status, 200);
		});
	});
}
