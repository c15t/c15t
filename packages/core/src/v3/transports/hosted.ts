/**
 * Hosted transport — talks to a c15t backend's `/init` and `/consent`
 * endpoints.
 *
 * Isomorphic: works in Node, RSC, edge, and browser. No top-level
 * `window` / `document` access. `fetch` is injectable for tests and
 * for consumers whose runtime has a specific fetch (Node 18 is fine
 * globally; Cloudflare Workers is fine globally; some edge hosts may
 * require a specific binding).
 *
 * Out of scope for this MVP (deferred to follow-ups):
 * - Response caching / revalidation
 * - Policy-pack evaluation on the client (server returns effective
 *   jurisdiction + banner visibility, full pack logic stays server-side)
 * - Translation bundle fetching
 * - GVL fetching for IAB TCF
 * - Retry / backoff
 *
 * The response shape is narrow on purpose: anything the transport
 * returns is applied directly to the snapshot. Extending this shape in a
 * backwards-compatible way means adding optional fields; the kernel
 * ignores unknown fields.
 */
import type {
	InitContext,
	InitResponse,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';

export interface HostedTransportOptions {
	/**
	 * Backend URL. Can be relative (`/api/c15t`) or absolute.
	 * Trailing slashes are stripped.
	 */
	backendURL: string;

	/**
	 * Fetch implementation. Defaults to `globalThis.fetch`.
	 * Inject for tests, or to wire Cloudflare Worker bindings.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Additional headers to include on every request. Useful for
	 * propagating `authorization`, `cookie`, `x-forwarded-*` on the
	 * server side.
	 */
	headers?: Record<string, string>;

	/**
	 * Fetch credentials mode. Defaults to `'include'` so that the
	 * backend can set/read consent cookies. Set `'omit'` for
	 * cookie-less modes.
	 */
	credentials?: RequestCredentials;
}

function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Build a hosted transport. The returned object is plain — no listeners,
 * no caches, no state. Safe to create per request.
 */
export function createHostedTransport(
	options: HostedTransportOptions
): KernelTransport {
	const base = trimSlash(options.backendURL);
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error(
			'createHostedTransport: no fetch available. Pass `fetch` in options.'
		);
	}
	const baseHeaders = options.headers ?? {};
	const credentials = options.credentials ?? 'include';

	return {
		async init(ctx: InitContext): Promise<InitResponse> {
			const response = await fetchImpl(`${base}/init`, {
				method: 'POST',
				credentials,
				headers: {
					'content-type': 'application/json',
					accept: 'application/json',
					...baseHeaders,
				},
				body: JSON.stringify({
					overrides: ctx.overrides,
					user: ctx.user,
				}),
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /init responded ${response.status} ${response.statusText}`
				);
			}

			const payload = (await response.json()) as InitResponse;
			return payload;
		},

		async save(payload: SavePayload): Promise<SaveResult> {
			const response = await fetchImpl(`${base}/consent`, {
				method: 'POST',
				credentials,
				headers: {
					'content-type': 'application/json',
					accept: 'application/json',
					...baseHeaders,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /consent responded ${response.status} ${response.statusText}`
				);
			}

			const data = (await response.json()) as SaveResult;
			return data;
		},
	};
}
