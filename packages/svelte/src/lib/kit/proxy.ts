/**
 * Opt-in same-origin proxy for the SvelteKit consent routes.
 *
 * Lets a SvelteKit app point `hosted({ url: '/api/c15t' })` at its own
 * origin: the browser talks to the app, the app forwards consent writes to
 * the c15t backend. The path allowlist, header shaping and response handling
 * live in `@c15t/core/server`, shared with `@c15t/tanstack-start`. This
 * module adds what is specific to SvelteKit: the upstream path comes from the
 * route's rest parameter, and the forwarding values from
 * `event.getClientAddress()` and `event.url`, which SvelteKit derives from
 * the adapter's trusted configuration (`ADDRESS_HEADER`, `XFF_DEPTH`,
 * `ORIGIN`), so a visitor cannot pick the address or host the backend sees.
 */

import { forwardConsentRequest } from '@c15t/core/server';
import type {
	ConsentProxyForwarding,
	ResolvedConsentProxyOptions,
} from '@c15t/core/server';
import type { RequestEvent } from '@sveltejs/kit';

export type { ConsentProxyOptions } from '@c15t/core/server';
export { resolveConsentProxyOptions as resolveProxyOptions } from '@c15t/core/server';

/** Value of the `x-c15t-proxy` header added to every forwarded request. */
const PROXY_HEADER_VALUE = '@c15t/svelte';

/** Removes surrounding slashes in linear time. */
const trimPathSlashes = function trimPathSlashes(value: string): string {
	let start = 0;
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') {
		end -= 1;
	}
	while (start < end && value[start] === '/') {
		start += 1;
	}
	return value.slice(start, end);
};

const REST_PARAM = /\[\.\.\.(?<name>[^\]=]+)(?:=[^\]]+)?\]/u;

/**
 * The path below the route's rest parameter (`[...path]` in
 * `src/routes/api/c15t/[...path]/+server.ts`), or `undefined` when the route
 * has none.
 *
 * @internal
 * @param event - The request event.
 * @returns The rest path without surrounding slashes, or `undefined`.
 */
export const readRestPath = function readRestPath(
	event: RequestEvent
): string | undefined {
	const name = REST_PARAM.exec(event.route?.id ?? '')?.groups?.name;
	const value = name ? event.params?.[name] : undefined;
	return value === undefined ? undefined : trimPathSlashes(value);
};

/**
 * The upstream path for a proxied request: the rest parameter, or the last
 * path segment for a route file mounted at one fixed path
 * (`api/c15t/subjects/+server.ts`).
 */
const readProxyPath = function readProxyPath(event: RequestEvent): string {
	return (
		readRestPath(event) ??
		trimPathSlashes(event.url.pathname).split('/').pop() ??
		''
	);
};

const readForwarding = function readForwarding(
	event: RequestEvent
): ConsentProxyForwarding {
	let clientAddress: string | undefined;
	try {
		clientAddress = event.getClientAddress();
	} catch {
		// Some adapters and test harnesses cannot tell.
	}
	return {
		for: clientAddress,
		host: event.url.host,
		proto: event.url.protocol.replace(/:$/u, ''),
	};
};

/**
 * Forwards one request to `${backendURL}/${path}${search}` and returns the
 * upstream status and body as a stream, with headers shaped for the browser.
 *
 * @internal
 * @param input - The request event, the absolute backend URL, the resolved
 * options and the fetch to call.
 * @returns The upstream response, or a 404 when the path is not allowed.
 */
export const proxyConsentRequest = function proxyConsentRequest(input: {
	event: RequestEvent;
	backendURL: string;
	options: ResolvedConsentProxyOptions;
	fetch?: typeof globalThis.fetch;
}): Promise<Response> {
	const { event } = input;
	return forwardConsentRequest({
		adapter: PROXY_HEADER_VALUE,
		backendURL: input.backendURL,
		fetch: input.fetch,
		forwarding: readForwarding(event),
		options: input.options,
		path: readProxyPath(event),
		request: event.request,
	});
};
