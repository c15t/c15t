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

import { listSubjectsOutputSchema } from '@c15t/schema';
import { Effect, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { Hono } from 'hono';
import * as v from 'valibot';
import { listByExternalId } from '../repository/subject';
import { validateRequestAuth } from './auth';
import { BadRequestError, type RouteError, toHttp } from './errors';

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
