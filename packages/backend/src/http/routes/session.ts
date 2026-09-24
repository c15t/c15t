/**
 * `POST /sessions` — a host reports an init it resolved from a manifest.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout. See `../session.ts` for why the route exists and why it
 * writes nothing.
 */

import { consentSessionReportSchema } from '@c15t/schema';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import type { RouteContext } from '../context';
import { emitConsentSession } from '../session';

const describeIssues = (issues: readonly v.BaseIssue<unknown>[]): string =>
	issues
		.slice(0, 5)
		.map((issue) => {
			const path = issue.path?.map((segment) => String(segment.key)).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');

export const register = function register({
	app,
	options,
}: RouteContext): void {
	app.post(
		'/sessions',
		describeRoute({
			summary: 'Report an init resolved by a host from a cached manifest',
			tags: ['Sessions'],
		}),
		async (c) => {
			const body = await c.req.json().catch(() => undefined);
			const parsed = v.safeParse(consentSessionReportSchema, body);
			if (!parsed.success) {
				return c.json(
					{
						cause: { code: 'BAD_REQUEST' },
						message: `Invalid session report: ${describeIssues(parsed.issues)}`,
					},
					400
				);
			}
			emitConsentSession(c, options, parsed.output);
			// One visitor's report, never a shared response.
			c.header('Cache-Control', 'no-store');
			return c.body(null, 204);
		}
	);
};
