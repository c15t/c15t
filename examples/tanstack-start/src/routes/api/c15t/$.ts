import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';

import { backendURL } from '../../../consent';

/**
 * Same-origin consent routes.
 *
 * - `GET /api/c15t/manifest` passes the cached backend manifest through with
 *   its `cache-control` and `etag`, and answers `304` to `if-none-match`.
 * - `GET /api/c15t/init` resolves init in-process from that manifest for the
 *   request's country, region, language, and GPC signal.
 * - Everything else on the allowlist (`POST /api/c15t/subjects`,
 *   `PATCH /api/c15t/subjects/:id`, `GET /api/c15t/status`, ...) is proxied
 *   to `${backendURL}` because `proxy: true` is set, so `ConsentBoundary`
 *   can use `backendURL="/api/c15t"` and the browser never leaves this
 *   origin. Paths off the allowlist are a 404.
 */
export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({ backendURL, proxy: true }),
	},
});
