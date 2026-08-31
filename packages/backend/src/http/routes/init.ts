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
				options.gvl
			);
			// Geo-dependent by definition, so it must never be cached across
			// visitors the way /manifest is.
			c.header('Cache-Control', 'no-store');
			return c.json(body);
		}
	);
};
