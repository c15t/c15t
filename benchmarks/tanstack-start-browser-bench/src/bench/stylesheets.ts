import appCss from './app.css?url';
import consentIabCss from './with-consent-iab.css?url';
import consentCss from './with-consent.css?url';

/** Route `head` for the baseline: the app's stylesheet alone. */
export const appStylesheetHead = () => ({
	links: [{ href: appCss, rel: 'stylesheet' }],
});

/**
 * Route `head` for the consent routes: the app's stylesheet with c15t's
 * styles in the same file. `C15T_BENCH_IAB=1` builds add the IAB styles.
 */
export const consentStylesheetHead = () => ({
	links: [
		{
			href: import.meta.env.C15T_BENCH_IAB === '1' ? consentIabCss : consentCss,
			rel: 'stylesheet',
		},
	],
});
