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
 *
 * Consent saves are not proxied: `ConsentBoundary` posts them straight to
 * `${backendURL}/subjects`.
 */
export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({ backendURL }),
	},
});
