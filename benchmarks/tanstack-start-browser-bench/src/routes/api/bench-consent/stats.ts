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
			POST: () =>
				Response.json(resetBenchConsentFixtureCounts(), { headers: noStore }),
		},
	},
});
