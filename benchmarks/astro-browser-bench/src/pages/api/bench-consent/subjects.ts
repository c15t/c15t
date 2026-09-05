import type { APIRoute } from 'astro';

import { recordBenchConsentFixtureExecution } from '../../../lib/fixture';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	recordBenchConsentFixtureExecution('subjects');
	const body = (await request.json().catch(() => ({}))) as {
		subjectId?: string;
	};
	return Response.json(
		{
			ok: true,
			subjectId: body.subjectId ?? 'benchmark-subject',
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
