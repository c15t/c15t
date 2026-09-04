/**
 * `loadConsent` — the `+layout.server.ts` half of the SvelteKit layer.
 *
 * Returns a plain, serializable `KernelConfig` to hand the provider as
 * `prefetch`. With a prefetch in hand the kernel resolves the policy on the
 * server, so the banner is in the first HTML instead of appearing a frame
 * after hydration.
 */
import { mergeInitOutputIntoKernelConfig } from '@c15t/core';
import type { KernelConfig } from '@c15t/core';
import type { InitOutput } from '@c15t/schema/types';
import { headersToRecord } from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import { prefetchInitialConsent, readInitialConsentConfig } from '../server';
import type { C15tLocals, ConsentRequestOptions } from './types';

/** Options for {@link loadConsent}. */
export interface LoadConsentOptions extends ConsentRequestOptions {
	/**
	 * Hosted mode: the c15t backend base URL, absolute or origin-relative.
	 * `loadConsent` calls its `/init` directly.
	 */
	backendURL?: string;

	/**
	 * Manifest mode: the same-origin init route installed with
	 * {@link createSvelteKitConsentRouteHandlers}, e.g. `/api/c15t`.
	 * Takes precedence over `backendURL`.
	 *
	 * Fetched through `event.fetch`, so the request never leaves the process
	 * and SvelteKit forwards the page's cookies and headers for you.
	 */
	initRoute?: string;

	/** Extra request headers to forward upstream in hosted mode. */
	forwardHeaders?: string[];

	/** Fetch implementation for hosted mode. Defaults to the global `fetch`. */
	fetch?: typeof globalThis.fetch;
}

const readLocals = function readLocals(
	event: RequestEvent
): C15tLocals | undefined {
	return (event.locals as { c15t?: C15tLocals }).c15t;
};

/**
 * Resolves the base config: whatever {@link c15tHandle} already computed for
 * this request, or a fresh cookie + header read when the handle is not
 * installed.
 */
const resolveBaseConfig = function resolveBaseConfig(
	event: RequestEvent,
	options: LoadConsentOptions
): Promise<KernelConfig> {
	const locals = readLocals(event);
	if (locals) {
		return Promise.resolve(locals.config);
	}
	return readInitialConsentConfig({
		cookieName: options.cookieName,
		country: options.country,
		headers: event.request.headers,
		language: options.language,
		region: options.region,
	});
};

/**
 * Loads the consent prefetch for a request.
 *
 * ```ts
 * // src/routes/+layout.server.ts
 * import { loadConsent } from '@c15t/svelte/kit';
 *
 * export const load = async (event) => ({
 *   prefetch: await loadConsent(event, { initRoute: '/api/c15t' }),
 * });
 * ```
 *
 * Then pass it straight through:
 *
 * ```svelte
 * <ConsentManagerProvider prefetch={data.prefetch} mode={hosted({ url: '/api/c15t' })}>
 * ```
 *
 * Modes:
 * - `initRoute` — manifest mode. Resolves against the same-origin init route
 *   in-process via `event.fetch`.
 * - `backendURL` — hosted mode. Calls the backend's `/init` directly.
 * - Neither — cookie and request context only. The client still initializes;
 *   the server just has nothing extra to seed.
 *
 * Never throws: a failed upstream call degrades to the cookie-only config
 * rather than taking the page down with it.
 *
 * @param event - The SvelteKit request event from `load`.
 * @param options - Mode selection, cookie name, and geo/language overrides.
 * @returns A serializable `KernelConfig` for the provider's `prefetch` prop.
 */
export const loadConsent = async function loadConsent(
	event: RequestEvent,
	options: LoadConsentOptions = {}
): Promise<KernelConfig> {
	const base = await resolveBaseConfig(event, options);

	if (options.initRoute) {
		try {
			const response = await event.fetch(options.initRoute);
			if (!response.ok) {
				return base;
			}
			const payload = (await response.json()) as InitOutput;
			return mergeInitOutputIntoKernelConfig(
				base,
				payload,
				headersToRecord(event.request.headers)
			);
		} catch {
			// Fail soft: the client re-runs init on hydration.
			return base;
		}
	}

	if (options.backendURL) {
		return prefetchInitialConsent({
			backendURL: options.backendURL,
			cookieName: options.cookieName,
			country: options.country,
			fetch: options.fetch ?? event.fetch,
			forwardHeaders: options.forwardHeaders,
			headers: event.request.headers,
			language: options.language,
			region: options.region,
		});
	}

	return base;
};
