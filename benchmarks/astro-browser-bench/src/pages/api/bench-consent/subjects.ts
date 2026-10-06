import type { APIRoute } from 'astro';

import {
	applyBenchConsentLatency,
	recordBenchConsentFixtureExecution,
} from '../../../lib/fixture';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	recordBenchConsentFixtureExecution('subjects');
	await applyBenchConsentLatency();
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
