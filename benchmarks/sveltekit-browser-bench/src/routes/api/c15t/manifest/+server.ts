import { benchConsentManifestResponse } from '$lib/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const MANIFEST_ETAG = '"sveltekit-browser-bench-manifest"';

export const GET: RequestHandler = async ({ request }) => {
	const headers = {
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
		etag: MANIFEST_ETAG,
	};

	if (request.headers.get('if-none-match') === MANIFEST_ETAG) {
		return new Response(null, { headers, status: 304 });
	}

	return json(await benchConsentManifestResponse, { headers });
};
