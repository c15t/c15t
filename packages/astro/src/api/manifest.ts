/**
 * `GET /api/c15t/manifest` — injected by the integration in manifest mode.
 *
 * Proxies the backend's manifest with its cache headers intact, so a CDN in
 * front of the site can cache it exactly as the backend intended.
 */

import type { APIRoute } from 'astro';
import options from 'virtual:c15t/options';

import { createConsentRouteHandlers } from './handlers';

const handlers = createConsentRouteHandlers({ options });

export const GET: APIRoute = ({ locals, request }) =>
	handlers.manifest(request, { locals });
export const prerender = false;
