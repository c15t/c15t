/**
 * `GET /manifest` — the geo-independent consent manifest.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { describeRoute } from 'hono-openapi';

import type { RouteContext } from '../context';
import { buildManifestResponse } from '../manifest';

export function register({ app, options, run }: RouteContext): void {
	app.get(
		'/manifest',
		describeRoute({
			summary: 'Get the geo-independent consent manifest',
			tags: ['Manifest'],
		}),
		async (c) => {
			const manifest = await buildManifestResponse(
				options.manifest ?? {},
				options.manifestCache,
				c.req.query('language') ?? null
			);

			c.header('Cache-Control', manifest.cacheControl);
			c.header('ETag', manifest.etag);

			// A matching etag means the client already has this manifest; 304
			// saves re-sending a document that can be large.
			if (c.req.header('If-None-Match') === manifest.etag) {
				return c.body(null, 304);
			}

			return c.json(manifest.body);
		}
	);
}
