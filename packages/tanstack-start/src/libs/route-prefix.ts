import { trimTrailingSlashes } from './path';

/**
 * The same-origin init route under a consent route prefix, or `undefined`
 * when no prefix is set and init goes to `${backendURL}/init`. Same rule as
 * Next.js `defineConsentConfig({ routePrefix })`.
 *
 * @param routePrefix - Where `createConsentServerRoute()` is mounted, such
 * as `/api/c15t` for `src/routes/api/c15t/$.ts`.
 * @returns `${routePrefix}/init`, or `undefined`.
 * @internal
 */
export const initURLFor = function initURLFor(
	routePrefix: string | undefined
): string | undefined {
	return routePrefix ? `${trimTrailingSlashes(routePrefix)}/init` : undefined;
};
