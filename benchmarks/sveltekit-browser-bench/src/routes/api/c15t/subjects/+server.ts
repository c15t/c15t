/**
 * `POST /api/c15t/subjects`.
 *
 * `@c15t/svelte/kit` ships init and manifest only — saving consent is a
 * backend write, so the manifest arms post to the same fixture the direct
 * arms do. Kept same-origin so the browser sees one backend host.
 */
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
