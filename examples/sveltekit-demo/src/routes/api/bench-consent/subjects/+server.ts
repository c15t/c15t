import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const subjectId =
		typeof body.subjectId === 'string' && body.subjectId.length > 0
			? body.subjectId
			: 'bench-subject';
	const now = new Date().toISOString();

	return json(
		{
			appliedPreferences:
				typeof body.preferences === 'object' && body.preferences !== null
					? body.preferences
					: undefined,
			consentId: 'bench-consent',
			domain: 'localhost',
			domainId: 'bench-domain',
			givenAt: now,
			subjectId,
			type: 'cookie_banner',
			uiSource: typeof body.uiSource === 'string' ? body.uiSource : undefined,
		},
		{
			headers: {
				'cache-control': 'no-store',
			},
		}
	);
};
