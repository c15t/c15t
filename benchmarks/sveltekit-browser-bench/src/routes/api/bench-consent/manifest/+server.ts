import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
	recordBenchConsentFixtureExecution,
} from '$lib/server/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const MANIFEST_ETAG = '"sveltekit-browser-bench-manifest"';

/** `GET /manifest` — CDN-cacheable, geo-independent, ETag-validated. */
export const GET: RequestHandler = async ({ request }) => {
	recordBenchConsentFixtureExecution('manifest');
	await applyBenchConsentLatency();

	const headers = {
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
		etag: MANIFEST_ETAG,
	};

	if (request.headers.get('if-none-match') === MANIFEST_ETAG) {
		return new Response(null, { headers, status: 304 });
	}

	return json(benchConsentManifestResponse, { headers });
};
