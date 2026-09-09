/**
 * `GET /init` — the per-request consent decision.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { describeRoute } from 'hono-openapi';

import type { RouteContext } from '../context';
import { buildInitResponse } from '../init';

export const register = function register({
	app,
	options,
}: RouteContext): void {
	app.get(
		'/init',
		describeRoute({
			summary: 'Resolve the consent decision for this request',
			tags: ['Init'],
		}),
		async (c) => {
			const { body } = await buildInitResponse(
				options.manifest ?? {},
				c.req.raw.headers,
				options.policySnapshot,
				options.gvl,
				options.tenantId ?? options.manifest?.tenantId
			);
			// Geo-dependent by definition, so it must never be cached across
			// visitors the way /manifest is. The contract header is part of the
			// response identity too, for any cache that ignores no-store.
			c.header('Cache-Control', 'no-store');
			c.header('Vary', 'Origin, x-c15t-policy-contract');
			return c.json(body);
		}
	);
};
