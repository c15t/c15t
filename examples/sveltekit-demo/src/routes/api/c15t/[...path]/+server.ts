/**
 * Same-origin consent endpoint.
 *
 * `GET /api/c15t` resolves `/init` locally from the tenant manifest, and
 * `GET /api/c15t/manifest` proxies the manifest with the backend's own cache
 * headers. Everything else — consent writes, identity linking — is forwarded
 * to the self-hosted backend mounted at `/api/self-host`, so the browser only
 * ever talks to this origin.
 */
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

import type { RequestHandler } from './$types';

const BACKEND_BASE = '/api/self-host';

const consentRoutes = createSvelteKitConsentRouteHandlers({
	backendURL: BACKEND_BASE,
});

/** Forwards a write through to the backend without leaving the process. */
const proxyToBackend: RequestHandler = ({ fetch, params, request, url }) => {
	const target = `${BACKEND_BASE}/${params.path}${url.search}`;
	return fetch(target, {
		body: request.body,
		// Streaming a request body requires duplex; SvelteKit's fetch honours it.
		duplex: 'half',
		headers: request.headers,
		method: request.method,
	} as RequestInit);
};

export const GET = consentRoutes.GET;
export const POST = proxyToBackend;
export const PATCH = proxyToBackend;
export const OPTIONS = proxyToBackend;
