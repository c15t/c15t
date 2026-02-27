import { recordInitRequest } from '@/lib/init-log';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	const url = new URL(request.url);
	const entry = recordInitRequest(request.headers, url.pathname);

	const marker =
		entry.purpose ||
		entry.secPurpose ||
		entry.nextRouterPrefetch ||
		entry.middlewarePrefetch ||
		'none';

	console.log(
		`[prefetch-stress] /api/c15t/init #${entry.id} prefetch-marker=${marker} ua=${entry.userAgent ?? 'n/a'}`
	);

	return Response.json({
		ok: true,
		id: entry.id,
		marker,
		at: entry.at,
	});
}
