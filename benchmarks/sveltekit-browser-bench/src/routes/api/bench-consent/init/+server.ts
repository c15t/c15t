import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from '$lib/server/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

/** Direct `/init` — the arm that pays the backend round-trip. */
export const GET: RequestHandler = async () => {
	recordBenchConsentFixtureExecution('init');
	await applyBenchConsentLatency();

	return json(benchConsentInitResponse, {
		headers: { 'cache-control': 'no-store' },
	});
};
