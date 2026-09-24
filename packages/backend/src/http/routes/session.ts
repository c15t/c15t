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
import { emitConsentSession, instanceTenant } from '../session';

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
			// Server-to-server by design. A browser always sends `Origin` on a
			// cross-site POST and cannot add the c15t protocol header without a
			// preflight an untrusted origin fails, so either tells the request
			// apart from a page trying to inflate a tenant's sessions.
			if (
				c.req.header('origin') !== undefined ||
				c.req.header('x-c15t-version') === undefined
			) {
				return c.json(
					{
						cause: { code: 'BAD_REQUEST' },
						message:
							'Session reports are sent server-to-server by a c15t host, not from a page.',
					},
					400
				);
			}
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
			if (parsed.output.source === 'init') {
				// Reserved for the backend's own route, so a consumer can trust
				// that an `init` event was the backend resolving, not a caller
				// claiming it was.
				return c.json(
					{
						cause: { code: 'BAD_REQUEST' },
						message: 'Invalid session report: source must be render or route',
					},
					400
				);
			}
			// Awaited: the only party waiting on this response is the reporting
			// host, which already detached the request, and awaiting is what
			// keeps the sink alive on runtimes that stop work after a response.
			// The instance's tenant is the scope, as it is for every row it
			// writes, and an absent tenant is the null scope, not "any": a
			// report cannot attribute itself to another tenant.
			const scoped = { ...parsed.output, tenantId: instanceTenant(options) };
			await emitConsentSession(c, options, scoped, 'report');
			// One visitor's report, never a shared response.
			c.header('Cache-Control', 'no-store');
			return c.body(null, 204);
		}
	);
};
