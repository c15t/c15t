/**
 * The HTTP surface.
 *
 * Hono stays, because RFC 0004 changes the data layer and the runtime, not the
 * wire. Routes hand off to Effect immediately and the app owns exactly two
 * things: turning a request into handler inputs, and turning a typed failure
 * into a response.
 *
 * ## Wire compatibility is enforced, not asserted
 *
 * §Non-goals makes wire compatibility with `@c15t/backend` 2.x a hard
 * requirement. Rather than restate the response shapes here and hope they stay
 * aligned, every handler validates its output against the **same
 * `@c15t/schema` schema the 2.x routes validate against**. If the two drift,
 * this package fails its own tests rather than shipping a silently different
 * response.
 *
 * That also means the schemas remain the single source of truth across the
 * cutover, which is what makes running both packages against one contract
 * possible at all.
 */

import { getSubjectOutputSchema, listSubjectsOutputSchema } from '@c15t/schema';
import {
	getIpAddress,
	type IpAddressConfig,
	isOriginTrusted,
} from '@c15t/schema/geo';
import { Effect, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { Hono } from 'hono';
import * as v from 'valibot';
import {
	LegalDocumentConflictError,
	syncCurrent,
} from '../repository/legal-document';
import {
	findById,
	linkExternalId,
	listByExternalId,
} from '../repository/subject';
import { validateRequestAuth } from './auth';
import {
	BadRequestError,
	NotFoundError,
	type RouteError,
	toHttp,
} from './errors';
import { status } from './status';

export interface AppLayers {
	readonly sql: SqlClient.SqlClient;
}

/**
 * Builds the app over a runtime that already has its layers provided.
 *
 * The runtime is constructed once by the caller and reused for every request —
 * building a layer per request would open a connection pool per request.
 */
export interface AppOptions {
	/**
	 * Client IP handling, passed through to `@c15t/schema`'s shared derivation.
	 *
	 * The IP ends up on consent records, so this is a compliance setting rather
	 * than a diagnostic one: masking is on unless explicitly disabled, and
	 * `tracking: false` records nothing at all.
	 */
	readonly ipAddress?: IpAddressConfig;
	/** Reported by `GET /status`. */
	readonly version?: string;
	/**
	 * Origins permitted to call this backend from a browser.
	 *
	 * Empty or absent means no cross-origin request is allowed. The banner is
	 * loaded from the host's own page, so a deployment that has not configured
	 * this should reject rather than default open.
	 */
	readonly trustedOrigins?: readonly string[];
	/**
	 * Keys accepted on `Authorization: Bearer <key>`.
	 *
	 * Absent or empty means no request authenticates. A deployment that has
	 * not configured keys should expose nothing, not everything.
	 */
	readonly apiKeys?: readonly string[];
}

export function createApp(
	runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>,
	options: AppOptions = {}
) {
	const app = new Hono();

	// CORS before anything else: a preflight must be answered without touching
	// a route, and a disallowed origin must not reach one either. Origin
	// matching is the shared implementation, so this backend and @c15t/backend
	// cannot disagree about who is allowed in.
	app.use('*', async (c, next) => {
		const origin = c.req.header('Origin');
		const allowed =
			origin !== undefined &&
			isOriginTrusted(origin, [...(options.trustedOrigins ?? [])]);

		if (allowed && origin) {
			c.header('Access-Control-Allow-Origin', origin);
			c.header('Vary', 'Origin');
			c.header('Access-Control-Allow-Credentials', 'true');
		}

		if (c.req.method === 'OPTIONS') {
			if (!allowed) {
				// No CORS headers, so the browser blocks it. 204 rather than 403
				// because the preflight itself is well-formed.
				return c.body(null, 204);
			}
			c.header(
				'Access-Control-Allow-Methods',
				'GET, POST, PUT, DELETE, PATCH, OPTIONS'
			);
			c.header(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, x-request-id, x-c15t-version, x-c15t-country, x-c15t-region, sec-gpc, accept-language'
			);
			c.header('Access-Control-Max-Age', '86400');
			return c.body(null, 204);
		}

		await next();
	});

	/**
	 * Runs a handler and maps its typed failure onto a response.
	 *
	 * `Effect.result` moves the typed error into the success channel, so what
	 * comes back is a value to branch on. A defect is left alone and still
	 * rejects the promise — laundering one into a tidy 500 would erase the
	 * distinction the typed channel exists to make.
	 */
	const run = async <A>(
		effect: Effect.Effect<A, RouteError, SqlClient.SqlClient>
	): Promise<
		{ ok: true; value: A } | { ok: false; failure: ReturnType<typeof toHttp> }
	> => {
		const result = await runtime.runPromise(Effect.result(effect));
		return result._tag === 'Success'
			? { ok: true, value: result.success }
			: { ok: false, failure: toHttp(result.failure) };
	};

	app.get('/status', async (c) => {
		// Unauthenticated on purpose, matching @c15t/backend: a health check a
		// load balancer cannot reach without credentials is not a health check.
		// It exposes only version and the caller's own request metadata.
		const result = await run(
			status(c.req.raw.headers, options.version ?? '0.0.0', options.ipAddress)
		);

		if (!result.ok) {
			// 503 rather than the generic 500 a SqlError would otherwise map to:
			// orchestrators read 503 as "retry me" and 500 as "I am broken", and
			// an unreachable database is the former.
			return c.json(
				{
					message: 'Database health check failed',
					cause: { code: 'SERVICE_UNAVAILABLE' },
				},
				503
			);
		}

		return c.json(result.value);
	});

	app.put('/legal-documents/:type/current', async (c) => {
		// API-key only: this decides which policy every subsequent consent is
		// measured against, so it is an administrative operation.
		if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
			return c.json(
				{
					message: 'API key required. Use Authorization: Bearer <api_key>',
					cause: { code: 'UNAUTHORIZED' },
				},
				401
			);
		}

		const type = c.req.param('type');
		const body = await c.req.json().catch(() => undefined);

		const effectiveDate = new Date(body?.effectiveDate ?? Number.NaN);
		if (Number.isNaN(effectiveDate.getTime())) {
			// 422 rather than 400, matching @c15t/backend: the request parsed,
			// the value is unusable.
			return c.json(
				{
					message: 'effectiveDate must be a valid ISO-8601 string',
					cause: { code: 'INPUT_VALIDATION_FAILED' },
				},
				422
			);
		}

		const result = await run(
			syncCurrent({
				type,
				version: body.version,
				hash: body.hash,
				effectiveDate,
			}).pipe(
				Effect.map((policy) => ({ policy })),
				Effect.catchTag('LegalDocumentConflictError', (error) =>
					Effect.fail(
						new BadRequestError({ message: error.message, code: 'CONFLICT' })
					)
				)
			)
		);

		if (!result.ok) {
			return c.json(result.failure.body, result.failure.status);
		}

		return c.json(result.value);
	});

	app.get('/consents/check', async (c) => {
		const externalId = c.req.query('externalId');
		const type = c.req.query('type');

		const result = await run(
			Effect.gen(function* () {
				if (!externalId) {
					return yield* new BadRequestError({
						message: 'externalId query parameter is required',
						code: 'EXTERNAL_ID_REQUIRED',
					});
				}
				if (!type) {
					return yield* new BadRequestError({
						message: 'type query parameter is required',
						code: 'TYPE_REQUIRED',
					});
				}

				const types = type
					.split(',')
					.map((entry) => entry.trim())
					.filter(Boolean);

				// Every requested type is reported, present or not. Omitting the
				// absent ones would make "no consent" indistinguishable from "you
				// asked about a type I do not know", and a caller gating script
				// execution on this must be able to tell those apart.
				const results: Record<
					string,
					{ hasConsent: boolean; isLatestPolicy: boolean }
				> = {};
				for (const entry of types) {
					results[entry] = { hasConsent: false, isLatestPolicy: false };
				}

				// The shipped handler issues one query per subject plus policy
				// resolution on top. This is the same two-query read the list path
				// uses, projected down.
				const subjects = yield* listByExternalId(externalId);
				for (const subject of subjects) {
					for (const consent of subject.consents) {
						const entry = results[consent.type];
						if (!entry) continue;
						entry.hasConsent = true;
						if (consent.isLatestPolicy) {
							entry.isLatestPolicy = true;
						}
					}
				}

				return { results };
			})
		);

		if (!result.ok) {
			return c.json(result.failure.body, result.failure.status);
		}

		return c.json(result.value);
	});

	app.patch('/subjects/:id', async (c) => {
		const subjectId = c.req.param('id');
		const body = await c.req.json().catch(() => undefined);

		const result = await run(
			Effect.gen(function* () {
				if (!body?.externalId) {
					return yield* new BadRequestError({
						message: 'externalId is required',
						code: 'EXTERNAL_ID_REQUIRED',
					});
				}

				const linked = yield* linkExternalId({
					subjectId,
					externalId: body.externalId,
					// Matches @c15t/backend's default: an identity supplied
					// without a named provider is still externally sourced.
					identityProvider: body.identityProvider ?? 'external',
					ipAddress: getIpAddress(c.req.raw.headers, options.ipAddress),
					userAgent: c.req.header('user-agent') ?? null,
				});

				if (linked === undefined) {
					return yield* new NotFoundError({
						resource: 'Subject',
						id: subjectId,
					});
				}

				return { subject: linked };
			})
		);

		if (!result.ok) {
			return c.json(result.failure.body, result.failure.status);
		}

		return c.json(result.value);
	});

	app.get('/subjects/:id', async (c) => {
		// Unauthenticated, matching @c15t/backend: a visitor's own device reads
		// its own consent status by subject id, and the id is the capability.
		const subjectId = c.req.param('id');
		// `?type=a,b` narrows to those policy types and additionally decides
		// isValid — with no filter every subject is trivially valid.
		const typeFilter = (c.req.query('type') ?? '')
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);

		const result = await run(
			Effect.gen(function* () {
				const subject = yield* findById(subjectId);
				if (subject === undefined) {
					return yield* new NotFoundError({
						resource: 'Subject',
						id: subjectId,
					});
				}

				const consents = subject.consents
					.filter(
						(consent) =>
							typeFilter.length === 0 || typeFilter.includes(consent.type)
					)
					.map((consent) => ({
						id: consent.id,
						type: consent.type,
						policyId: consent.policyId,
						policyVersion: consent.policyVersion,
						policyHash: consent.policyHash,
						policyEffectiveDate: consent.policyEffectiveDate,
						givenAt: consent.givenAt,
						isLatestPolicy: consent.isLatestPolicy,
					}));

				return {
					subject: {
						id: subject.id,
						externalId: subject.externalId ?? undefined,
						createdAt: subject.createdAt,
					},
					consents,
					// Valid only if every requested type has consent against the
					// *current* policy — consent to a superseded policy does not
					// count, which is the whole point of tracking isLatestPolicy.
					isValid:
						typeFilter.length === 0 ||
						typeFilter.every((type) =>
							consents.some(
								(consent) => consent.type === type && consent.isLatestPolicy
							)
						),
				};
			})
		);

		if (!result.ok) {
			return c.json(result.failure.body, result.failure.status);
		}

		const parsedSubject = v.safeParse(getSubjectOutputSchema, result.value);
		if (!parsedSubject.success) {
			throw new Error(
				`Response does not satisfy getSubjectOutputSchema: ${JSON.stringify(
					v.flatten(parsedSubject.issues)
				)}`
			);
		}

		return c.json(result.value);
	});

	app.get('/subjects', async (c) => {
		// Listing subjects by external id exposes consent records for a named
		// person, so it is API-key only — matching @c15t/backend, where the
		// route is documented as requiring a key.
		if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
			return c.json(
				{ message: 'Unauthorized', cause: { code: 'UNAUTHORIZED' } },
				401
			);
		}

		const externalId = c.req.query('externalId');

		const result = await run(
			Effect.gen(function* () {
				if (externalId === undefined || externalId === '') {
					// Matches 2.x's error shape exactly, code included.
					return yield* new BadRequestError({
						message: 'externalId query parameter is required',
						code: 'EXTERNAL_ID_REQUIRED',
					});
				}

				const subjects = yield* listByExternalId(externalId);

				return {
					subjects: subjects.map((subject) => ({
						id: subject.id,
						// 2.x falls back to the queried value when the stored
						// column is null, and the schema requires a string.
						externalId: subject.externalId ?? externalId,
						createdAt: subject.createdAt,
						consents: subject.consents.map((consent) => ({
							id: consent.id,
							type: consent.type,
							policyId: consent.policyId,
							policyVersion: consent.policyVersion,
							policyHash: consent.policyHash,
							policyEffectiveDate: consent.policyEffectiveDate,
							givenAt: consent.givenAt,
							isLatestPolicy: consent.isLatestPolicy,
						})),
					})),
				};
			})
		);

		if (!result.ok) {
			return c.json(result.failure.body, result.failure.status);
		}

		// The contract check. Parsing against the shared schema means a drift
		// from 2.x is a test failure here, not a surprise for a client.
		const parsed = v.safeParse(listSubjectsOutputSchema, result.value);
		if (!parsed.success) {
			throw new Error(
				`Response does not satisfy listSubjectsOutputSchema: ${v
					.flatten(parsed.issues)
					.root?.join(', ')}`
			);
		}

		return c.json(result.value);
	});

	return app;
}
