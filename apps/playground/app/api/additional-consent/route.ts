/**
 * Google Additional Consent provider list as JSON, filtered by
 * `?providerIds=1,2,3`, in the shape `@c15t/iab` reads from
 * `https://gvl.inth.app/additional-consent`. See `lib/additional-consent.ts`.
 */

import {
	GOOGLE_PROVIDER_LIST,
	parseProviderCsv,
	parseProviderIds,
	selectProviders,
} from '../../../lib/additional-consent';

const CORS_HEADERS = {
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Origin': '*',
};

export const OPTIONS = function OPTIONS(): Response {
	return new Response(null, { headers: CORS_HEADERS, status: 204 });
};

export const GET = async function GET(request: Request): Promise<Response> {
	const ids = parseProviderIds(
		new URL(request.url).searchParams.get('providerIds')
	);
	const response = await fetch(GOOGLE_PROVIDER_LIST, {
		next: { revalidate: 3600 },
		signal: request.signal,
	}).catch(() => null);
	const listed = response?.ok ? parseProviderCsv(await response.text()) : null;
	if (!listed) {
		return Response.json(
			{ error: 'Google provider list unavailable' },
			{ headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' }, status: 502 }
		);
	}
	const providers = selectProviders(listed, ids);
	return Response.json(
		{ providers },
		{ headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' } }
	);
};
