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

import { buildConsentSessionReport } from '@c15t/schema/types';
import type { BuildConsentSessionReportOptions } from '@c15t/schema/types';

import { c15tProtocolHeaders } from '../transports/version-header';

/**
 * Visitor request headers copied onto the report so the backend's client
 * IP derivation and user-agent recording see the visitor, not the host's
 * server. Cookies are never forwarded: the report carries no identity.
 */
export const SESSION_REPORT_FORWARD_HEADERS = [
	'x-forwarded-for',
	'x-real-ip',
	'x-client-ip',
	'cf-connecting-ip',
	'true-client-ip',
	'fastly-client-ip',
	'user-agent',
] as const;

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
 * The backend origin a manifest URL implies, when it implies one.
 *
 * `https://consent.example.com/manifest` came from a backend at
 * `https://consent.example.com`; a manifest served from a CDN path or a
 * file name implies nothing, and the caller must say where the backend is.
 *
 * @param manifestURL - An absolute `GET /manifest` URL.
 * @returns The backend URL, or `undefined` when it cannot be inferred.
 */
export const deriveBackendURLFromManifestURL =
	function deriveBackendURLFromManifestURL(
		manifestURL: string
	): string | undefined {
		const withoutQuery = manifestURL.split(/[?#]/u)[0] ?? manifestURL;
		const trimmed = trimSlash(withoutQuery);
		return trimmed.endsWith('/manifest')
			? trimmed.slice(0, -'/manifest'.length)
			: undefined;
	};

/**
 * Where a session report is sent, or `undefined` to send none.
 *
 * Only an absolute `http(s)` backend qualifies: a server cannot resolve a
 * relative URL, and a report to the app's own proxy route would count the
 * visitor a second time on the way through.
 *
 * @param source - The configured backend URL, or the manifest URL to infer it from.
 * @returns The backend base URL without a trailing slash.
 */
export const resolveSessionReportBackendURL =
	function resolveSessionReportBackendURL(source: {
		backendURL?: string | null;
		manifestURL?: string | null;
	}): string | undefined {
		const candidate =
			source.backendURL ||
			(source.manifestURL
				? deriveBackendURLFromManifestURL(source.manifestURL)
				: undefined);
		if (!candidate || !ABSOLUTE_URL.test(candidate)) {
			return undefined;
		}
		return trimSlash(candidate);
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

/**
 * The visitor headers a report forwards, read from any header shape.
 *
 * @param headers - The incoming request's headers.
 * @returns Only the IP-chain and user-agent headers that were present.
 */
export const forwardSessionReportHeaders = function forwardSessionReportHeaders(
	headers: SessionReportHeaders | undefined
): Record<string, string> {
	const forwarded: Record<string, string> = {};
	for (const name of SESSION_REPORT_FORWARD_HEADERS) {
		const value = readHeader(headers, name);
		if (value) {
			forwarded[name] = value;
		}
	}
	return forwarded;
};

export interface ReportConsentSessionOptions extends BuildConsentSessionReportOptions {
	/**
	 * Backend base URL. Relative or absent means no report is sent; see
	 * {@link resolveSessionReportBackendURL}.
	 */
	backendURL?: string | null;
	/** Manifest URL to infer the backend from when `backendURL` is unset. */
	manifestURL?: string | null;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
	/**
	 * The visitor's request headers. Only the client IP chain and user agent
	 * are forwarded; see {@link SESSION_REPORT_FORWARD_HEADERS}.
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
 * produced the resolution. Returns the in-flight promise so a caller that
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
	if (!backendURL || !fetchImpl) {
		return Promise.resolve();
	}

	const task = (async () => {
		try {
			const body = buildConsentSessionReport(options);
			await fetchImpl(`${backendURL}/sessions`, {
				body: JSON.stringify(body),
				headers: {
					'content-type': 'application/json',
					...c15tProtocolHeaders,
					...forwardSessionReportHeaders(options.headers),
				},
				method: 'POST',
			});
		} catch {
			// Telemetry. The decision already happened; nothing to recover.
		}
	})();
	options.waitUntil?.(task);
	return task;
};
