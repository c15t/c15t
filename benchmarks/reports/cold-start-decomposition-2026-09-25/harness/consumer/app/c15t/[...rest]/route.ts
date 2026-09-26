/**
 * Accepts consent writes in-process so the Accept click has somewhere to go.
 * Cold start is measured before any write, so these never touch the origin.
 */
export const dynamic = 'force-dynamic';

export const POST = async (request: Request) => {
	const body = (await request.json().catch(() => ({}))) as {
		subjectId?: string;
	};
	return Response.json(
		{ ok: true, subjectId: body.subjectId ?? 'benchmark-subject' },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

export const PATCH = POST;
export const PUT = POST;
