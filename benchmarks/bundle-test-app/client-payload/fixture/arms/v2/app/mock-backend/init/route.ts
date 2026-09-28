/**
 * A v2 `/init` response for a visitor in Germany. The browser calls this on
 * load, as it would call a hosted backend.
 */
export const GET = () =>
	Response.json({
		branding: 'c15t',
		gvl: null,
		jurisdiction: 'GDPR',
		location: { countryCode: 'DE', regionCode: null },
	});
