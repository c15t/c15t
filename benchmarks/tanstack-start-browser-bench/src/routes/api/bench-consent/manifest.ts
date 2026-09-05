import { createFileRoute } from '@tanstack/react-router';

import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
	recordBenchConsentFixtureExecution,
} from '../../../bench/fixture';

export const Route = createFileRoute('/api/bench-consent/manifest')({
	server: {
		handlers: {
			GET: async () => {
				recordBenchConsentFixtureExecution('manifest');
				await applyBenchConsentLatency();

				return Response.json(benchConsentManifestResponse, {
					headers: {
						'cache-control':
							'public, s-maxage=300, stale-while-revalidate=86400',
						etag: '"nextjs-browser-bench-manifest"',
					},
				});
			},
		},
	},
});
