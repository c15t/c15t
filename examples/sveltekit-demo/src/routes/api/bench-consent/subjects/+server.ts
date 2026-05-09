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
			subjectId,
			consentId: 'bench-consent',
			domainId: 'bench-domain',
			domain: 'localhost',
			type: 'cookie_banner',
			appliedPreferences:
				typeof body.preferences === 'object' && body.preferences !== null
					? body.preferences
					: undefined,
			uiSource: typeof body.uiSource === 'string' ? body.uiSource : undefined,
			givenAt: now,
		},
		{
			headers: {
				'cache-control': 'no-store',
			},
		}
	);
};
