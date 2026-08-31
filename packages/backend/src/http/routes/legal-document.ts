/**
 * `PUT /legal-documents/:type/current` — release sync.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';

import { syncCurrent } from '../../repository/legal-document';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError } from '../errors';

export const register = function register({
	app,
	options,
	run,
}: RouteContext): void {
	app.put(
		'/legal-documents/:type/current',
		describeRoute({
			security: [{ bearerAuth: [] }],
			summary: 'Sync the current legal document release',
			tags: ['LegalDocument'],
		}),
		async (c) => {
			// API-key only: this decides which policy every subsequent consent is
			// measured against, so it is an administrative operation.
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{
						cause: { code: 'UNAUTHORIZED' },
						message: 'API key required. Use Authorization: Bearer <api_key>',
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
						cause: { code: 'INPUT_VALIDATION_FAILED' },
						message: 'effectiveDate must be a valid ISO-8601 string',
					},
					422
				);
			}

			const result = await run(
				c,
				syncCurrent({
					effectiveDate,
					hash: body.hash,
					type,
					version: body.version,
				}).pipe(
					Effect.map((policy) => ({ policy })),
					Effect.catchTag('LegalDocumentConflictError', (error) =>
						Effect.fail(
							new BadRequestError({ code: 'CONFLICT', message: error.message })
						)
					)
				)
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			return c.json(result.value);
		}
	);
};
