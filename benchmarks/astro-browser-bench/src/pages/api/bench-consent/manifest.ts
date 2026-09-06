/**
 * `GET /api/bench-consent/manifest` — the fixture backend's manifest.
 *
 * CDN-cacheable and geo-independent, with an ETag so the shipped manifest
 * proxy can revalidate rather than refetch.
 */
import type { APIRoute } from 'astro';

import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
	recordBenchConsentFixtureExecution,
} from '../../../lib/fixture';

const MANIFEST_ETAG = '"astro-browser-bench-manifest"';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	recordBenchConsentFixtureExecution('manifest');
	await applyBenchConsentLatency();

	const headers = {
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
		etag: MANIFEST_ETAG,
	};

	if (request.headers.get('if-none-match') === MANIFEST_ETAG) {
		return new Response(null, { headers, status: 304 });
	}

	return Response.json(benchConsentManifestResponse, { headers });
};
