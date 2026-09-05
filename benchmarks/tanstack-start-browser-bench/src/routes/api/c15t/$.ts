import { createConsentServerRoute } from '@c15t/tanstack-start/api';
import { createFileRoute } from '@tanstack/react-router';

import { getBenchManifestURL } from '../../../bench/manifest-url';

/**
 * Plain same-origin consent route: `GET /api/c15t/manifest` passes the
 * cached fixture manifest through, `GET /api/c15t/init` resolves init from
 * it in-process. No proxy, so consent saves go straight to the fixture.
 */
export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({
			manifestURL: getBenchManifestURL(),
		}),
	},
});
