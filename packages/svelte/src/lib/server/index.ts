import { resolveRequestConsent } from '@c15t/core/server';

import type {
	ConsentRequestOptions,
	ConsentState,
	ResolveConsentOptions,
} from './types';

/**
 * Resolves the visitor's consent state from a SvelteKit request.
 *
 * 1. Reads the consent cookie, the CDN geo headers, `accept-language`, and
 *    the GPC signal. Without a `backendURL` this is the whole result, and no
 *    network call is made.
 * 2. With a `backendURL`, calls `${backendURL}/init` with the request
 *    context and folds the response into the state, so first paint is
 *    correct without waiting for a client roundtrip.
 *
 * The rules (what is forwarded, the self-route guard, how the response is
 * merged) live in `resolveRequestConsent` from `@c15t/core/server`, shared
 * with every other adapter. Never throws: if the backend URL cannot be
 * resolved or the call fails, the request-only state is returned and the
 * client runs init on mount.
 *
 * @param options - Request headers, cookie name, geo/language overrides,
 * and the backend location.
 * @returns A serializable state for the provider's `prefetch` prop.
 * @example
 * ```ts
 * import { resolveConsent } from '@c15t/svelte/server';
 *
 * const state = await resolveConsent({
 *   backendURL: 'https://consent.example.com',
 *   headers: request.headers,
 * });
 * ```
 */
export const resolveConsent = function resolveConsent(
	options: ResolveConsentOptions
): Promise<ConsentState> {
	return resolveRequestConsent({
		adapter: '@c15t/svelte',
		backendURL: options.backendURL,
		experiment: options.experiment,
		fetch: options.fetch,
		forwardHeaders: options.forwardHeaders,
		localFetch: options.frameworkFetch,
		mode: options.backendURL ? 'hosted' : undefined,
		now: options.now,
		overrides: {
			country: options.country,
			language: options.language,
			region: options.region,
		},
		request: {
			cookie: options.cookieHeader,
			headers: options.headers,
			url: options.requestURL,
		},
		storage: options.cookieName
			? { storageKey: options.cookieName }
			: undefined,
		timeoutMs: options.timeoutMs,
		trustForwardedHeaders: options.trustForwardedHeaders,
	});
};

export type { KernelConfig } from '@c15t/core';
export type { ConsentRequestOptions, ConsentState, ResolveConsentOptions };
export { custom, hosted } from '@c15t/core';
export { offline } from '../transports/offline';
