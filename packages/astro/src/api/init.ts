/**
 * `GET /api/c15t/init` — injected by the integration in manifest mode.
 *
 * Resolves the consent decision for this request from the cached manifest,
 * so the browser gets an `/init` payload without the backend being on the
 * request path and without shipping the manifest to the client.
 */

import type { APIRoute } from 'astro';
import options from 'virtual:c15t/options';

import { createConsentRouteHandlers } from './handlers';

const handlers = createConsentRouteHandlers({ options });

export const GET: APIRoute = ({ request }) => handlers.init(request);
export const prerender = false;
