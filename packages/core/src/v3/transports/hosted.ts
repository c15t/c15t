/**
 * Hosted transport — talks to a c15t backend's `/init` and `/subjects`
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
 * - Policy-pack evaluation on the client (server returns the effective
 *   policy, full pack logic stays server-side)
 * - Translation bundle fetching
 * - GVL fetching for IAB TCF
 * - Retry / backoff
 *
 * The response shape is narrow on purpose: anything the transport
 * returns is applied directly to the snapshot. Extending this shape in a
 * backwards-compatible way means adding optional fields; the kernel
 * ignores unknown fields.
 */
import {
	CONSENT_REQUEST_HEADER_NAMES,
	type InitOutput,
} from '@c15t/schema/types';
import type {
	InitContext,
	InitResponse,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';
import { mapInitOutputToInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';

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
	 * Request headers that may be passed through to `GET /init`.
	 *
	 * Only the backend-recognized init headers are forwarded:
	 * `accept-language`, supported geo CDN headers, and `sec-gpc`.
	 * Other names are ignored so callers do not accidentally forward
	 * arbitrary request header bags.
	 */
	headers?: Record<string, string>;

	/**
	 * Fetch credentials mode. Defaults to `'include'` so that the
	 * backend can set/read consent cookies. Set `'omit'` for
	 * cookie-less modes.
	 */
	credentials?: RequestCredentials;

	/**
	 * Domain sent to POST /subjects. Defaults to the browser hostname, or
	 * the backend URL hostname for absolute URLs in server runtimes.
	 */
	domain?: string;
}

/** Strip a single trailing slash so `${base}/init` doesn't double up. */
function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Resolve the `domain` field sent on `POST /subjects`.
 *
 * Resolution order:
 * 1. Explicit `options.domain` if supplied.
 * 2. `window.location.hostname` in the browser.
 * 3. Hostname parsed from `backendURL` for absolute URLs in server
 *    runtimes.
 * 4. `'localhost'` as a final fallback.
 */
function resolveDomain(
	backendURL: string,
	explicit: string | undefined
): string {
	if (explicit) return explicit;
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return window.location.hostname;
	}
	try {
		return new URL(backendURL).hostname;
	} catch {
		return 'localhost';
	}
}

const INIT_HEADER_ALLOWLIST = new Set<string>(CONSENT_REQUEST_HEADER_NAMES);

function buildAllowedInitHeaders(
	headers: Record<string, string> | undefined
): Record<string, string> {
	const allowed: Record<string, string> = {};
	if (!headers) return allowed;
	for (const [name, value] of Object.entries(headers)) {
		const normalizedName = name.toLowerCase();
		if (INIT_HEADER_ALLOWLIST.has(normalizedName)) {
			allowed[normalizedName] = value;
		}
	}
	return allowed;
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
	const initHeaders = buildAllowedInitHeaders(options.headers);
	const credentials = options.credentials ?? 'include';
	const domain = resolveDomain(base, options.domain);

	return {
		async init(_ctx: InitContext): Promise<InitResponse> {
			const response = await fetchImpl(`${base}/init`, {
				method: 'GET',
				credentials,
				headers: {
					accept: 'application/json',
					...initHeaders,
				},
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /init responded ${response.status} ${response.statusText}`
				);
			}

			const payload = (await response.json()) as InitOutput;
			return mapInitOutputToInitResponse(payload, initHeaders);
		},

		async save(payload: SavePayload): Promise<SaveResult> {
			const response = await fetchImpl(`${base}/subjects`, {
				method: 'POST',
				credentials,
				headers: {
					'content-type': 'application/json',
					accept: 'application/json',
				},
				body: JSON.stringify(buildSubjectPostBody(payload, { domain })),
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}

			const data = (await response.json()) as SaveResult;
			return data;
		},
	};
}
