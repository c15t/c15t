/** A deterministic backend failure for the dev prerender regression. */
export const GET = () =>
	Response.json({ error: 'Manifest unavailable' }, { status: 503 });
