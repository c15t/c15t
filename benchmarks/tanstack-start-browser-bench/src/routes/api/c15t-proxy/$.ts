import { createConsentServerRoute } from '@c15t/tanstack-start/api';
import { createFileRoute } from '@tanstack/react-router';

import {
	BENCH_BACKEND_URL,
	getBenchManifestURL,
} from '../../../bench/manifest-url';

/**
 * Second mount, proxy enabled, for the `manifest-ssr-proxy` arm. The same
 * manifest source URL means it shares the module-level manifest cache with
 * `/api/c15t/$`; the difference is that `POST /api/c15t-proxy/subjects` is
 * forwarded to the fixture instead of the browser posting there directly.
 */
export const Route = createFileRoute('/api/c15t-proxy/$')({
	server: {
		handlers: createConsentServerRoute({
			backendURL: BENCH_BACKEND_URL,
			manifestURL: getBenchManifestURL(),
			proxy: true,
		}),
	},
});
