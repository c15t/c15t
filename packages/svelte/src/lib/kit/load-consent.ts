import {
	deferInitGvl,
	c15tProtocolHeaders,
	mergeInitOutputIntoKernelConfig,
} from '@c15t/core';
/**
 * `loadConsent` — the `+layout.server.ts` half of the SvelteKit layer.
 *
 * Returns a plain, serializable `ConsentState` to hand the provider as
 * `prefetch`. With a prefetch in hand the kernel resolves the policy on the
 * server, so the banner is in the first HTML instead of appearing a frame
 * after hydration.
 */
import { readProducerPolicyContract } from '@c15t/core/transports';
import {
	extractConsentRequestInputs,
	headersToRecord,
} from '@c15t/schema/types';
import type {
	ConsentRequestHeaderInputs,
	InitOutput,
} from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import { resolveConsent } from '../server';
import { waitUntilFromEvent } from './routes';
import type { C15tLocals, ConsentRequestOptions, ConsentState } from './types';

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

	/** Fetch implementation for hosted mode. Defaults to `event.fetch`. */
	fetch?: typeof globalThis.fetch;

	/**
	 * Longest `loadConsent` waits for the init route or the backend `/init`,
	 * in milliseconds. When it runs out, `loadConsent` returns the
	 * cookie-only config, the same as when the call fails: the page renders
	 * without consent UI in the server HTML, optional categories stay denied,
	 * and the browser resolves the policy after hydration. A hosted-mode
	 * request is aborted. An init route request finishes in the background,
	 * kept alive through the platform's `waitUntil` where it has one, and
	 * fills the manifest cache for the next render; it sends no session
	 * report, because the browser's own init reports the page view.
	 *
	 * `false` waits for the upstream, however long it takes. A value that is
	 * not a finite, non-negative number uses the default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
}

/** Default {@link LoadConsentOptions.timeoutMs}, in milliseconds. */
const DEFAULT_LOAD_CONSENT_TIMEOUT_MS = 500;

const resolveTimeoutMs = function resolveTimeoutMs(
	value: number | false | undefined
): number | undefined {
	if (value === false) {
		return undefined;
	}
	const timeoutMs = value ?? DEFAULT_LOAD_CONSENT_TIMEOUT_MS;
	// Only `false` turns the budget off; a bad number must not do it silently.
	return Number.isFinite(timeoutMs) && timeoutMs >= 0
		? timeoutMs
		: DEFAULT_LOAD_CONSENT_TIMEOUT_MS;
};

/**
 * Settles with the task's result, or with `fallback` if the task fails or
 * `timeoutMs` passes first. The task is not cancelled here; `onTimeout` can
 * do that.
 */
const withinBudget = async function withinBudget<Value>(
	task: () => Promise<Value>,
	timeoutMs: number | undefined,
	fallback: Value,
	onTimeout: () => void
): Promise<Value> {
	const settled = (async () => {
		try {
			return await task();
		} catch {
			return fallback;
		}
	})();
	if (timeoutMs === undefined) {
		return settled;
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	const expired = new Promise<Value>((resolve) => {
		timer = setTimeout(() => {
			onTimeout();
			resolve(fallback);
		}, timeoutMs);
	});
	try {
		return await Promise.race([settled, expired]);
	} finally {
		clearTimeout(timer);
	}
};

/** Swallows a promise's outcome, for work handed to the platform. */
const settle = async function settle(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// The render already fell back; nothing waits on this result.
	}
};

/** Adds `signal` to every request `fetchImpl` sends without one. */
const withSignal = function withSignal(
	fetchImpl: typeof globalThis.fetch | undefined,
	signal: AbortSignal
): typeof globalThis.fetch | undefined {
	if (!fetchImpl) {
		return undefined;
	}
	return ((input, init) =>
		fetchImpl(input, {
			...init,
			signal: init?.signal ?? signal,
		})) as typeof globalThis.fetch;
};

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
	config: ConsentState;
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
	const config = await resolveConsent({
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
	const headers: Record<string, string> = { ...c15tProtocolHeaders };
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
 * rather than taking the page down with it. Neither does a slow one: after
 * `timeoutMs` (500 ms by default) the cookie-only config is returned.
 *
 * @param event - The SvelteKit request event from `load`.
 * @param options - Mode selection, cookie name, geo/language overrides, and
 * the time budget.
 * @returns A serializable `ConsentState` for the provider's `prefetch` prop.
 */
export const loadConsent = async function loadConsent(
	event: RequestEvent,
	options: LoadConsentOptions = {}
): Promise<ConsentState> {
	const { config, inputs, cookieName } = await resolveBase(event, options);
	const timeoutMs = resolveTimeoutMs(options.timeoutMs);

	if (options.initRoute) {
		const { initRoute } = options;
		const forwarded = initRequestHeaders(inputs);
		const controller = new AbortController();
		let routeRequest: Promise<Response> | undefined;
		const resolveFromRoute = async (): Promise<ConsentState> => {
			routeRequest = event.fetch(initRoute, {
				headers: forwarded,
				signal: controller.signal,
			});
			const response = await routeRequest;
			if (!response.ok) {
				return config;
			}
			const payload = (await response.json()) as InitOutput;
			return mergeInitOutputIntoKernelConfig(
				config,
				deferInitGvl(payload, initRoute, 'init', forwarded),
				{
					...headersToRecord(event.request.headers),
					...forwarded,
				},
				{ producerContract: readProducerPolicyContract(response.headers) }
			);
		};
		// Fail soft: the client re-runs init on hydration. A route request
		// that outlives the budget keeps running and fills the manifest cache.
		return withinBudget(resolveFromRoute, timeoutMs, config, () => {
			// The abort tells the route this render gave up, so it leaves the
			// session report to the browser's init. The route itself hands its
			// remaining work to the platform; SvelteKit versions whose internal
			// fetch does not settle on abort are kept alive here as well.
			controller.abort();
			if (routeRequest) {
				waitUntilFromEvent(settle(routeRequest), event);
			}
		});
	}

	if (options.backendURL) {
		const { backendURL } = options;
		const controller = new AbortController();
		return withinBudget(
			() =>
				resolveConsent({
					backendURL,
					cookieName,
					country: inputs.country,
					fetch: withSignal(options.fetch, controller.signal),
					forwardHeaders: options.forwardHeaders,
					frameworkFetch: withSignal(event.fetch, controller.signal),
					headers: event.request.headers,
					language: inputs.language,
					region: inputs.region,
				}),
			timeoutMs,
			config,
			() => controller.abort()
		);
	}

	return config;
};
