import { recordBenchConsentFixtureExecution } from '$lib/server/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	recordBenchConsentFixtureExecution('subjects');
	// A body of literal `null` parses fine, so `.catch()` never runs and a
	// property read would throw; a non-string `subjectId` would also travel
	// straight back into the response.
	const body: unknown = await request.json().catch(() => null);
	const subjectId =
		typeof body === 'object' && body !== null
			? (body as { subjectId?: unknown }).subjectId
			: undefined;
	return json(
		{
			ok: true,
			subjectId:
				typeof subjectId === 'string' && subjectId
					? subjectId
					: 'benchmark-subject',
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
