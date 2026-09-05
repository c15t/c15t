import type { RequestEvent } from '@sveltejs/kit';

/**
 * A minimal `RequestEvent` — enough surface for the pieces of SvelteKit the
 * consent layer actually touches (`request`, `url`, `locals`, `fetch`).
 * Built from real `Request`/`Headers`, so header precedence and cookie
 * parsing are exercised for real rather than against a stub.
 */
export const createEvent = function createEvent(
	input: {
		url?: string;
		headers?: Record<string, string>;
		locals?: Record<string, unknown>;
		fetch?: typeof globalThis.fetch;
	} = {}
): RequestEvent {
	const url = new URL(input.url ?? 'http://localhost:5173/');
	const request = new Request(url, { headers: input.headers ?? {} });
	return {
		fetch: input.fetch ?? globalThis.fetch,
		locals: input.locals ?? {},
		request,
		url,
	} as unknown as RequestEvent;
};

/**
 * A stored-consent cookie in the persistence module's v2-compatible compact
 * format: `c.<category>:<0|1>` pairs plus an `i.t` consent timestamp, which is
 * what makes the read count as "has consented".
 */
export const CONSENTED_COOKIE =
	'c15t=c.necessary:1,c.marketing:1,i.t:1234567890';
