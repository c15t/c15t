import { getBenchConsentFixtureVersionHeaders } from './fixture';

/**
 * Exposes the last `x-c15t-version` request header observed by each
 * fixture endpoint. Kept separate from `stats.get` so the bench runner's
 * stats shape stays untouched.
 */
export default defineEventHandler((event) => {
	setHeader(event, 'cache-control', 'no-store');
	return getBenchConsentFixtureVersionHeaders();
});
