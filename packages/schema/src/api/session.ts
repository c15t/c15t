import * as v from 'valibot';

import { jurisdictionCodeSchema } from '~/shared/jurisdiction';

/**
 * Where an init resolution happened.
 *
 * - `render`: a host's server or edge render resolved init from a cached
 *   manifest before the page was sent.
 * - `route`: a host's same-origin init route resolved it for the browser.
 * - `init`: the backend's own `GET /init` resolved it.
 *
 * A page load can produce a `render` report and, on a later client
 * re-init, a `route` one, so the value is what lets a consumer dedupe.
 */
export const consentSessionSourceSchema = v.picklist([
	'render',
	'route',
	'init',
]);

export type ConsentSessionSource = v.InferOutput<
	typeof consentSessionSourceSchema
>;

/** The matched policy a session resolved to. */
export const consentSessionPolicySchema = v.object({
	fingerprint: v.string(),
	id: v.string(),
	matchedBy: v.picklist(['region', 'country', 'default', 'fallback']),
	model: v.picklist(['opt-in', 'opt-out', 'iab', 'none']),
});

/**
 * `POST /sessions` body: one init resolution for one visitor request.
 *
 * Hosts that resolve init from a cached manifest never call `/init`, so the
 * backend would otherwise never learn a visitor was served. The report is
 * the same per-request signal, sent server-to-server after the fact. It
 * carries what the resolution decided and the request inputs it decided
 * on; the visitor's IP and user agent travel as forwarded request headers,
 * never in the body, so the backend's IP handling applies unchanged.
 */
export const consentSessionReportSchema = v.object({
	/** Package that resolved init, for example `@c15t/nextjs`. */
	adapter: v.optional(v.string()),
	country: v.nullable(v.string()),
	gpc: v.boolean(),
	jurisdiction: jurisdictionCodeSchema,
	/** The language the resolution served, not the raw `Accept-Language`. */
	language: v.string(),
	/** `null` unless a policy rule matched. */
	policy: v.nullable(consentSessionPolicySchema),
	region: v.nullable(v.string()),
	resolution: v.picklist(['matched', 'no-match', 'unconfigured', 'failed']),
	/** Revision of the manifest the resolution ran against. */
	revision: v.string(),
	source: consentSessionSourceSchema,
	tenantId: v.optional(v.nullable(v.string())),
});

export type ConsentSessionReport = v.InferOutput<
	typeof consentSessionReportSchema
>;
