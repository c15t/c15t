/**
 * `GET /api/bench-consent/init` — the fixture backend's direct init.
 *
 * The hosted arm's middleware calls this on the request path, so the
 * injected latency lands in the page's TTFB.
 */
import type { APIRoute } from 'astro';

import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from '../../../lib/fixture';

export const prerender = false;

export const GET: APIRoute = async () => {
	recordBenchConsentFixtureExecution('init');
	await applyBenchConsentLatency();

	return Response.json(benchConsentInitResponse, {
		headers: { 'cache-control': 'no-store' },
	});
};
