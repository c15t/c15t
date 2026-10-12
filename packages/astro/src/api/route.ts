/**
 * `@c15t/astro/api` — the consent route the integration injects at
 * `${routePrefix}/[...path]`.
 *
 * `init` resolves the visitor's policy from the build's snapshot, or a
 * cached manifest, so a page that inits again gets an `/init` payload
 * without the backend on the request path and without the manifest in
 * client JavaScript. `manifest` proxies the backend's manifest with its
 * cache headers intact.
 *
 * The route renders on demand. For `manifest({ resolve: 'browser' })` on
 * a site with no adapter, the integration prerenders it instead, and
 * `getStaticPaths` writes only `${routePrefix}/manifest`.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import options from 'virtual:c15t/options';

import { createConsentRouteHandlers } from './handlers';

const handlers = createConsentRouteHandlers({ options });

export const GET: APIRoute = ({ locals, request }) =>
	handlers.GET(request, { locals });

/**
 * The paths a prerendered route writes: only the manifest, which the
 * browser resolver fetches. Ignored when the route renders on demand.
 *
 * @returns The `manifest` path.
 */
export const getStaticPaths: GetStaticPaths = () => [
	{ params: { path: 'manifest' } },
];
