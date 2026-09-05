import { createFileRoute } from '@tanstack/react-router';

import { recordBenchConsentFixtureExecution } from '../../../bench/fixture';

export const Route = createFileRoute('/api/bench-consent/subjects')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				recordBenchConsentFixtureExecution('subjects');
				const body = (await request.json()) as { subjectId?: string };
				return Response.json(
					{
						ok: true,
						subjectId: body.subjectId ?? 'benchmark-subject',
					},
					{
						headers: {
							'cache-control': 'no-store',
						},
					}
				);
			},
		},
	},
});
