import { createFileRoute } from '@tanstack/react-router';

import { recordBenchConsentFixtureExecution } from '../../../bench/fixture';

export const Route = createFileRoute('/api/bench-consent/subjects')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				recordBenchConsentFixtureExecution('subjects');
				const parsed: unknown = await request.json().catch(() => undefined);
				const subjectId =
					parsed !== null &&
					typeof parsed === 'object' &&
					'subjectId' in parsed &&
					typeof parsed.subjectId === 'string'
						? parsed.subjectId
						: 'benchmark-subject';
				return Response.json(
					{
						ok: true,
						subjectId,
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
