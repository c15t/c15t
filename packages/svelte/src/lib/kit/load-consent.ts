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
import type {
	ConsentRequestHeaderInputs,
	InitOutput,
} from '@c15t/schema/types';
import {
	extractConsentRequestInputs,
	headersToRecord,
} from '@c15t/schema/types';
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
 * Resolves the base config and request inputs: whatever {@link c15tHandle}
 * already computed for this request, or a fresh cookie + header read when the
 * handle is not installed.
 *
 * Per-call inputs beat the handle's. A route that passes `country` is naming
 * the country for that page, and silently keeping the handle's would render
 * one jurisdiction and forward another.
 */
const resolveBase = async function resolveBase(
	event: RequestEvent,
	options: LoadConsentOptions
): Promise<{
	config: KernelConfig;
	inputs: ConsentRequestHeaderInputs;
	cookieName: string | undefined;
}> {
	const overridesPerCall =
		options.cookieName !== undefined ||
		options.country !== undefined ||
		options.language !== undefined ||
		options.region !== undefined;
	const locals = readLocals(event);
	// The handle's cookie name is part of the request context, not an
	// override: a per-call `country` must not silently move the read back
	// to the default `c15t` key and lose the persisted consent.
	const cookieName = options.cookieName ?? locals?.cookieName;
	if (locals && !overridesPerCall) {
		return { ...locals, cookieName };
	}
	const inputs = extractConsentRequestInputs(event.request.headers, {
		country: options.country,
		language: options.language,
		region: options.region,
	});
	const config = await readInitialConsentConfig({
		cookieName,
		country: inputs.country,
		headers: event.request.headers,
		language: inputs.language,
		region: inputs.region,
	});
	return { config, cookieName, inputs };
};

/**
 * Request headers for the same-origin init call.
 *
 * `event.fetch` only inherits `cookie` and `authorization`, so the geo,
 * language and GPC context has to be restated explicitly — otherwise the init
 * route resolves a different policy than the page did, and hydration corrects
 * a banner the server already painted.
 */
const initRequestHeaders = function initRequestHeaders(
	inputs: ConsentRequestHeaderInputs
): Record<string, string> {
	const headers: Record<string, string> = {};
	if (inputs.country) {
		headers['x-c15t-country'] = inputs.country;
	}
	if (inputs.region) {
		headers['x-c15t-region'] = inputs.region;
	}
	if (inputs.language) {
		headers['accept-language'] = inputs.language;
	}
	if (inputs.gpc !== undefined) {
		headers['sec-gpc'] = inputs.gpc ? '1' : '0';
	}
	return headers;
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
	const { config, inputs, cookieName } = await resolveBase(event, options);

	if (options.initRoute) {
		const forwarded = initRequestHeaders(inputs);
		try {
			const response = await event.fetch(options.initRoute, {
				headers: forwarded,
			});
			if (!response.ok) {
				return config;
			}
			const payload = (await response.json()) as InitOutput;
			return mergeInitOutputIntoKernelConfig(config, payload, {
				...headersToRecord(event.request.headers),
				...forwarded,
			});
		} catch {
			// Fail soft: the client re-runs init on hydration.
			return config;
		}
	}

	if (options.backendURL) {
		return prefetchInitialConsent({
			backendURL: options.backendURL,
			cookieName,
			country: inputs.country,
			fetch: options.fetch ?? event.fetch,
			forwardHeaders: options.forwardHeaders,
			headers: event.request.headers,
			language: inputs.language,
			region: inputs.region,
		});
	}

	return config;
};
