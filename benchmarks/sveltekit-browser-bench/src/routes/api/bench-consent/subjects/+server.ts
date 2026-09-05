import { recordBenchConsentFixtureExecution } from '$lib/server/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	recordBenchConsentFixtureExecution('subjects');
	const body = (await request.json().catch(() => ({}))) as {
		subjectId?: string;
	};
	return json(
		{
			ok: true,
			subjectId: body.subjectId ?? 'benchmark-subject',
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
