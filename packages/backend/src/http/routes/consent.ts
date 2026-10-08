/**
 * `GET /consents/check` — consent lookup by external id. Needs an API key,
 * and counts only subjects whose link to the external id was verified.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';

import { listByExternalId } from '../../repository/subject';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError } from '../errors';

export const register = function register({
	app,
	options,
	run,
}: RouteContext): void {
	app.get(
		'/consents/check',
		describeRoute({
			security: [{ bearerAuth: [] }],
			summary: 'Check consent by external id and policy type',
			tags: ['Consent'],
		}),
		async (c) => {
			// API-key only, like `GET /subjects?externalId=`: it reports per-user
			// consent, which is server-to-server data.
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{ cause: { code: 'UNAUTHORIZED' }, message: 'Unauthorized' },
					401
				);
			}

			const externalId = c.req.query('externalId');
			const type = c.req.query('type');

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (!externalId) {
						return yield* new BadRequestError({
							code: 'EXTERNAL_ID_REQUIRED',
							message: 'externalId query parameter is required',
						});
					}
					if (!type) {
						return yield* new BadRequestError({
							code: 'TYPE_REQUIRED',
							message: 'type query parameter is required',
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
							if (!entry) {
								continue;
							}
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
		}
	);
};
