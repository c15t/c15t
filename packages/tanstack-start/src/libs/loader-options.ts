/**
 * `consentLoaderOptions`, shared by the server entry and its browser build.
 * Imports nothing, so a route file that spreads it into its route options
 * adds nothing else to the client graph.
 */

/**
 * Root route options that keep the consent loader from re-running on
 * client-side navigation. Spread them into `createRootRoute()` next to
 * the loader. The state only changes when the request changes, and a
 * client navigation reuses the same request context, so re-running would
 * only re-serialize the same value.
 *
 * @example
 * ```ts
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => getConsentState(),
 * });
 * ```
 */
export const consentLoaderOptions = {
	shouldReload: false,
	staleTime: Number.POSITIVE_INFINITY,
} as const;
