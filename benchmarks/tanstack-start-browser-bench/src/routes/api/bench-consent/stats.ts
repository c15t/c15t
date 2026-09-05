import { clearManifestCache } from '@c15t/core/transports/manifest-cache';
import { createFileRoute } from '@tanstack/react-router';

import {
	getBenchConsentFixtureCounts,
	resetBenchConsentFixtureCounts,
} from '../../../bench/fixture';

const noStore = { 'cache-control': 'no-store' };

export const Route = createFileRoute('/api/bench-consent/stats')({
	server: {
		handlers: {
			GET: () =>
				Response.json(getBenchConsentFixtureCounts(), { headers: noStore }),
			POST: () => {
				// The runner resets before each scenario; dropping the shared
				// manifest cache too keeps a `--cold-manifest` sample genuinely
				// cold instead of a hit on the previous scenario's fill.
				clearManifestCache();
				return Response.json(resetBenchConsentFixtureCounts(), {
					headers: noStore,
				});
			},
		},
	},
});
