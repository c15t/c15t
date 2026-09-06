import type { KernelOverrides } from '@c15t/core';
import {
	buildPrefetchScript,
	getMatchingPrefetchedInitialData,
} from '@c15t/core';

import type { ConsentPrefetchHead, ConsentPrefetchHeadOptions } from '../types';

/** Same-origin init route the boundary defaults to; mirrored from the boundary. */
const DEFAULT_INIT_ROUTE = '/api/c15t/init';

const DEFAULT_SCRIPT_ID = 'c15t-initial-data-prefetch';

/**
 * Builds a route `head()` fragment that starts the `/init` prefetch before
 * hydration. This is the TanStack Start equivalent of the Next.js
 * `C15tPrefetch` script: the inline script issues the same-origin init
 * request as early as the browser parses `<head>`, and the client runtime
 * consumes the matching response during its first store initialization.
 *
 * Use it on prerendered or `ssr: false` routes where no loader runs on the
 * server, so the banner still resolves as early as possible. Point
 * `backendURL` at the same base the boundary's init route lives under
 * (`/api/c15t` for the default route); `ConsentBoundary` looks the
 * response up by that base and hands it to the provider as its first init.
 *
 * @param options - Prefetch options plus an optional script element id.
 * @returns A fragment with a `scripts` array to spread into `head()`.
 * @example
 * ```tsx
 * import { consentPrefetchHead } from '@c15t/tanstack-start';
 *
 * export const Route = createRootRoute({
 *   head: () => ({
 *     meta: [{ title: 'My app' }],
 *     ...consentPrefetchHead({ backendURL: '/api/c15t' }),
 *   }),
 * });
 * ```
 */
/**
 * Base URL the head prefetch script keyed its request on: the init route
 * without its trailing `/init`, or the backend itself when the boundary
 * calls the backend directly.
 */
const prefetchBaseFor = function prefetchBaseFor(
	backendURL: string,
	initRoute: string | false | undefined
): string | undefined {
	if (initRoute === false) {
		return backendURL;
	}
	const route = initRoute ?? DEFAULT_INIT_ROUTE;
	// The prefetch script always requests `${base}/init`, so only a route of
	// that shape can share a key with it; any other name gets no match and
	// the provider issues its own init.
	return /\/init\/?$/u.test(route)
		? route.replace(/\/init\/?$/u, '')
		: undefined;
};

/**
 * Finds the init response a `consentPrefetchHead()` script started for
 * this boundary's init endpoint, so the provider can consume it instead of
 * issuing a second `/init` request. Client only; `undefined` on the server
 * or when no matching prefetch exists.
 *
 * @param input - The boundary's backend URL, init route, and overrides.
 * @returns The prefetched initial data promise, if one matches.
 */
export const readPrefetchedInitialData =
	function readPrefetchedInitialData(input: {
		backendURL: string | undefined;
		initRoute: string | false | undefined;
		overrides: KernelOverrides | undefined;
	}): ReturnType<typeof getMatchingPrefetchedInitialData> {
		if (!input.backendURL || typeof window === 'undefined') {
			return undefined;
		}
		const backendURL = prefetchBaseFor(input.backendURL, input.initRoute);
		if (!backendURL) {
			return undefined;
		}
		return getMatchingPrefetchedInitialData({
			backendURL,
			overrides: input.overrides,
		});
	};

export const consentPrefetchHead = function consentPrefetchHead({
	id = DEFAULT_SCRIPT_ID,
	...options
}: ConsentPrefetchHeadOptions): ConsentPrefetchHead {
	return {
		scripts: [{ children: buildPrefetchScript(options), id }],
	};
};
