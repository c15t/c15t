import { trimTrailingSlashes } from './path';

/**
 * Path `createConsentServerRoute()` serves init under when it is mounted as
 * the splat route `/api/c15t/$`.
 */
export const DEFAULT_INIT_ROUTE = '/api/c15t/init';

/**
 * Whether a backend URL is a path on the app's own origin. A
 * protocol-relative `//host` names another origin.
 */
const isSameOriginPath = function isSameOriginPath(url: string): boolean {
	return url.startsWith('/') && !url.startsWith('//');
};

/**
 * Resolves the same-origin init route `ConsentRoot` resolves init through,
 * or `undefined` when init goes to `${backendURL}/init` on the backend.
 *
 * - A string `initRoute` is used as-is.
 * - `false` always calls the backend.
 * - Omitted, an absolute `backendURL` calls the backend, which is all the
 *   quickstart mounts. A same-origin path such as `/api/c15t` can only be
 *   the consent server route (`createConsentServerRoute({ proxy: true })`),
 *   which resolves init from the manifest, so `${backendURL}/init` is
 *   treated as that route.
 *
 * @param backendURL - The root's backend URL.
 * @param initRoute - The root's `initRoute` prop.
 * @returns The init route, or `undefined` to call the backend directly.
 * @internal
 */
export const resolveInitRoute = function resolveInitRoute(
	backendURL: string,
	initRoute: string | false | undefined
): string | undefined {
	if (initRoute !== undefined) {
		return initRoute === false ? undefined : initRoute;
	}
	return isSameOriginPath(backendURL)
		? `${trimTrailingSlashes(backendURL)}/init`
		: undefined;
};
