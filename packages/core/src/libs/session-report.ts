/**
 * Session reports: the per-visitor signal manifest mode otherwise loses.
 *
 * A backend counts visitors by the `/init` requests it serves. A host that
 * resolves init from a cached manifest never sends one, so the backend
 * cannot tell one visitor from a million. This module sends the equivalent
 * after the fact: one `POST /sessions` per resolution, from the host's
 * server to the backend, detached from the response. The visitor's browser
 * makes no request and the page waits on nothing.
 *
 * The report is best effort by design. A failed or dropped report changes
 * no consent decision, so it is never awaited on the request path and never
 * rejects. Hosts on runtimes that stop work once the response is sent hand
 * the promise to `waitUntil` (or Next's `after`) the way they do for a
 * background manifest refresh.
 *
 * Server-only: it forwards the visitor's IP and user agent to the backend,
 * which a browser could not do and must not try to.
 */

import {
	buildConsentSessionReport,
	CONSENT_SESSION_CLIENT_IP_HEADER,
	getIpAddress,
	isSpeculativeRequest as isSpeculativeHeaders,
} from '@c15t/schema/types';
import type { BuildConsentSessionReportOptions } from '@c15t/schema/types';

import { c15tProtocolHeaders } from '../transports/version-header';

/**
 * The only request headers a report carries about the visitor: the user
 * agent, and the client IP on {@link SESSION_REPORT_CLIENT_IP_HEADER}.
 *
 * The IP travels on a dedicated header rather than as the forwarded chain.
 * A platform in front of the backend rewrites `x-forwarded-for` to the
 * connecting server, which would make every report look like the host, and
 * the backend's proxy-header precedence was written for a visitor's own
 * request, not a server-to-server one. Cookies are never forwarded: the
 * report carries no identity.
 */
export const SESSION_REPORT_FORWARD_HEADERS = [
	'user-agent',
	CONSENT_SESSION_CLIENT_IP_HEADER,
] as const;

/** Header carrying the visitor's IP on a report. */
export const SESSION_REPORT_CLIENT_IP_HEADER = CONSENT_SESSION_CLIENT_IP_HEADER;

/** How long a report may take before it is abandoned. */
const SESSION_REPORT_TIMEOUT_MS = 3000;

export type {
	BuildConsentSessionReportOptions,
	SessionReportInputs,
} from '@c15t/schema/types';
export { buildConsentSessionReport } from '@c15t/schema/types';

/** Headers as any server runtime hands them over. */
export type SessionReportHeaders =
	| Headers
	| Record<string, string | string[] | undefined>;

const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

const ABSOLUTE_URL = /^https?:\/\//iu;

/**
 * Where a session report is sent, or `undefined` to send none.
 *
 * Only an explicit, absolute `http(s)` backend qualifies. A relative URL
 * cannot be fetched from a server, and resolved against the request it is
 * the app's own proxy route, which would count the visitor twice. Nothing
 * is ever inferred from a manifest URL: a manifest may be served from a CDN
 * that exists only to hand out public policy data, and a report carries the
 * visitor's address and user agent.
 *
 * @param source - The backend URL as configured, not resolved against the request.
 * @returns The backend base URL without a trailing slash.
 */
export const resolveSessionReportBackendURL =
	function resolveSessionReportBackendURL(source: {
		backendURL?: string | null;
	}): string | undefined {
		return source.backendURL && ABSOLUTE_URL.test(source.backendURL)
			? trimSlash(source.backendURL)
			: undefined;
	};

const readHeader = function readHeader(
	headers: SessionReportHeaders | undefined,
	name: string
): string | undefined {
	if (!headers) {
		return undefined;
	}
	if (headers instanceof Headers) {
		return headers.get(name) ?? undefined;
	}
	const direct = headers[name] ?? headers[name.toLowerCase()];
	if (direct !== undefined) {
		return Array.isArray(direct) ? direct[0] : direct;
	}
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === name) {
			return Array.isArray(value) ? value[0] : value;
		}
	}
	return undefined;
};

const toHeaders = function toHeaders(
	headers: SessionReportHeaders | undefined
): Headers {
	if (!headers) {
		return new Headers();
	}
	if (headers instanceof Headers) {
		return headers;
	}
	const result = new Headers();
	for (const [key, value] of Object.entries(headers)) {
		const single = Array.isArray(value) ? value[0] : value;
		if (single) {
			result.set(key, single);
		}
	}
	return result;
};

/**
 * Whether a request is a prefetch or prerender the visitor may never open.
 * The shared check from `@c15t/schema`, accepting any header shape a server
 * runtime hands over.
 *
 * @param headers - The incoming request's headers.
 * @returns `true` for a speculative request.
 */
export const isSpeculativeRequest = function isSpeculativeRequest(
	headers: SessionReportHeaders | undefined
): boolean {
	return isSpeculativeHeaders(toHeaders(headers));
};

/**
 * The visitor headers a report forwards, read from any header shape.
 *
 * The client IP is the address the shared derivation recovers from the
 * request's proxy headers, unmasked: masking is the backend's decision and
 * happens there. An `x-c15t-client-ip` already on the incoming request is
 * ignored on purpose: a visitor can send that header to a public init
 * route, and honouring it would let them choose the address the backend
 * attributes to them.
 *
 * @param headers - The incoming request's headers.
 * @returns The user agent and client IP that were present.
 */
export const forwardSessionReportHeaders = function forwardSessionReportHeaders(
	headers: SessionReportHeaders | undefined
): Record<string, string> {
	const forwarded: Record<string, string> = {};
	const userAgent = readHeader(headers, 'user-agent');
	if (userAgent) {
		forwarded['user-agent'] = userAgent;
	}
	const ip = getIpAddress(toHeaders(headers), { masking: false });
	if (ip) {
		forwarded[CONSENT_SESSION_CLIENT_IP_HEADER] = ip;
	}
	return forwarded;
};

export interface ReportConsentSessionOptions extends BuildConsentSessionReportOptions {
	/**
	 * Backend base URL as configured. Relative or absent means no report is
	 * sent; see {@link resolveSessionReportBackendURL}.
	 */
	backendURL?: string | null;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
	/**
	 * The visitor's request headers. Only the user agent and the client IP
	 * the shared derivation recovers from them are forwarded; see
	 * {@link forwardSessionReportHeaders}.
	 */
	headers?: SessionReportHeaders;
	/**
	 * Receives the report's promise so a runtime that stops detached work
	 * once the response is sent can keep it alive. The promise never
	 * rejects.
	 */
	waitUntil?: (task: Promise<void>) => void;
}

/**
 * Sends one session report to `POST /sessions`, detached.
 *
 * Never throws and never rejects: the report is telemetry, and a backend
 * that is down or a URL that is relative must not fail the request that
 * produced the resolution. A prefetch or prerender request sends nothing;
 * see {@link isSpeculativeRequest}. Returns the in-flight promise so a caller that
 * wants to await it (a test, a CLI) can.
 *
 * @param options - What to report, where to send it, and how to keep it alive.
 * @returns A promise that resolves when the report finishes or fails.
 * @example
 * ```ts
 * reportConsentSession({
 *   adapter: '@c15t/nextjs',
 *   backendURL: 'https://consent.example.com',
 *   headers: request.headers,
 *   init: payload,
 *   inputs,
 *   manifest,
 *   source: 'route',
 *   waitUntil: (task) => after(() => task),
 * });
 * ```
 */
export const reportConsentSession = function reportConsentSession(
	options: ReportConsentSessionOptions
): Promise<void> {
	const backendURL = resolveSessionReportBackendURL(options);
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!backendURL || !fetchImpl || isSpeculativeRequest(options.headers)) {
		return Promise.resolve();
	}

	const task = (async () => {
		try {
			const body = buildConsentSessionReport(options);
			const response = await fetchImpl(`${backendURL}/sessions`, {
				body: JSON.stringify(body),
				headers: {
					'content-type': 'application/json',
					...c15tProtocolHeaders,
					...forwardSessionReportHeaders(options.headers),
				},
				method: 'POST',
				// A backend that hangs must not hold a `waitUntil` slot open.
				signal:
					typeof AbortSignal !== 'undefined' &&
					typeof AbortSignal.timeout === 'function'
						? AbortSignal.timeout(SESSION_REPORT_TIMEOUT_MS)
						: undefined,
			});
			// Nothing in the answer is read; release the connection.
			await response.body?.cancel();
		} catch {
			// Telemetry. The decision already happened; nothing to recover.
		}
	})();
	try {
		options.waitUntil?.(task);
	} catch {
		// A lifetime hook invoked outside its request scope throws
		// synchronously; that is the host's telemetry plumbing, not the
		// visitor's consent decision.
	}
	return task;
};
