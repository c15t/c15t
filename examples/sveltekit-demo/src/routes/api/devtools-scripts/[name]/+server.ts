import { setTimeout as delay } from 'node:timers/promises';

import type { RequestHandler } from './$types';

const fixtureNames = new Set([
	'meta-pixel',
	'tiktok-pixel',
	'google-tag',
	'clarity',
	'delayed',
	'failure',
	'iab-vendor',
	'iab-custom',
]);

/** Local SDK stand-ins exercise loading without contacting a vendor account. */
export const GET: RequestHandler = async ({ params }) => {
	if (!fixtureNames.has(params.name)) {
		return new Response('Unknown fixture', { status: 404 });
	}
	if (params.name === 'failure') {
		return new Response('Intentional devtools load failure', { status: 503 });
	}
	if (params.name === 'delayed') {
		await delay(800);
	}
	return new Response(
		`window.dispatchEvent(new CustomEvent('c15t:demo-script-loaded', { detail: ${JSON.stringify(params.name)} }));`,
		{
			headers: {
				'Cache-Control': 'no-store',
				'Content-Type': 'application/javascript',
			},
		}
	);
};
