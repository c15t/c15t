import { createFileRoute } from '@tanstack/react-router';

import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from '../../../bench/fixture';

export const Route = createFileRoute('/api/bench-consent/init')({
	server: {
		handlers: {
			GET: async () => {
				recordBenchConsentFixtureExecution('init');
				await applyBenchConsentLatency();

				return Response.json(benchConsentInitResponse, {
					headers: {
						'cache-control': 'no-store',
					},
				});
			},
		},
	},
});
