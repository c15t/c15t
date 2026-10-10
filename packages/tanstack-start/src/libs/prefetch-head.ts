import type { KernelOverrides } from '@c15t/core';
import {
	buildPrefetchScript,
	getMatchingPrefetchedInitialData,
} from '@c15t/core';

import type { ConsentPrefetchHead, ConsentPrefetchHeadOptions } from '../types';
import { trimTrailingSlashes } from './path';

const DEFAULT_SCRIPT_ID = 'c15t-initial-data-prefetch';

/**
 * Base URL the head prefetch script keyed its request on: the route prefix
 * when the root sends init through the consent route, or the backend itself
 * when it calls the backend directly. The script requests `${base}/init`.
 */
const prefetchBaseFor = function prefetchBaseFor(
	backendURL: string,
	routePrefix: string | undefined
): string {
	return routePrefix ? trimTrailingSlashes(routePrefix) : backendURL;
};

/**
 * Finds the init response a `consentPrefetchHead()` script started for
 * this root's init endpoint, so the provider can consume it instead of
 * issuing a second `/init` request. Client only; `undefined` on the server
 * or when no matching prefetch exists.
 *
 * @param input - The root's backend URL, route prefix, and overrides.
 * @returns The prefetched initial data promise, if one matches.
 */
export const readPrefetchedInitialData =
	function readPrefetchedInitialData(input: {
		backendURL: string | undefined;
		overrides: KernelOverrides | undefined;
		routePrefix: string | undefined;
	}): ReturnType<typeof getMatchingPrefetchedInitialData> {
		if (!input.backendURL || typeof window === 'undefined') {
			return undefined;
		}
		return getMatchingPrefetchedInitialData({
			backendURL: prefetchBaseFor(input.backendURL, input.routePrefix),
			overrides: input.overrides,
		});
	};

/**
 * Builds a route `head()` fragment that starts the `/init` prefetch before
 * hydration. This is the TanStack Start equivalent of the Next.js
 * `C15tPrefetch` script: the inline script issues the init request as
 * early as the browser parses `<head>`, and the client runtime consumes
 * the matching response during its first store initialization.
 *
 * Use it on prerendered or `ssr: false` routes where no loader runs on the
 * server, so the banner still resolves as early as possible. Point
 * `backendURL` at the base the root's init request goes to: the
 * `routePrefix` the state carries when it has one, such as `/api/c15t`,
 * otherwise the backend URL. `ConsentRoot` looks the response up by that
 * base and hands it to the provider as its first init.
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
 *     ...consentPrefetchHead({ backendURL: 'https://consent.example.com' }),
 *   }),
 * });
 * ```
 */
export const consentPrefetchHead = function consentPrefetchHead({
	id = DEFAULT_SCRIPT_ID,
	...options
}: ConsentPrefetchHeadOptions): ConsentPrefetchHead {
	return {
		scripts: [{ children: buildPrefetchScript(options), id }],
	};
};
