/**
 * A manifest captured from a seeded alpha.2 gateway (Europe opt-in rule,
 * identifiers replaced). `resolveConsent` reads it on the server.
 */
import manifest from './manifest.json';

export const dynamic = 'force-static';

export const GET = () =>
	Response.json(manifest, {
		headers: { 'cache-control': 'public, max-age=300' },
	});
