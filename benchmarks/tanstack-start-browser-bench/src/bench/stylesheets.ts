import appCss from './app.css?url';
import consentIabCss from './with-consent-iab.css?url';
import consentCss from './with-consent.css?url';

/** Route `head` for the baseline: the app's stylesheet alone. */
export const appStylesheetHead = () => ({
	links: [{ href: appCss, rel: 'stylesheet' }],
});

/**
 * Route `head` for the consent routes. c15t's surfaces render their own
 * styles, including IAB, so each build links only the app's stylesheet.
 */
export const consentStylesheetHead = () => ({
	links: [
		{
			href: import.meta.env.C15T_BENCH_IAB === '1' ? consentIabCss : consentCss,
			rel: 'stylesheet',
		},
	],
});
