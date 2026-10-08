import * as v from 'valibot';

/**
 * Where an init resolution happened.
 *
 * - `render`: a host's server or edge render resolved init from a cached
 *   manifest before the page was sent.
 * - `route`: a host's same-origin init route resolved it for the browser.
 * - `init`: the backend's own `GET /init` resolved it.
 *
 * A page load can produce a `render` report and, on a later client
 * re-init, a `route` one. The value says which path resolved; it does not
 * link the two. A report's `journey.id`, when present, does: every report
 * and save of one journey carries the same id.
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
 * The consent journey a resolution belongs to: a random id a client creates
 * per page load or tab and also sends on its save, so a consumer can follow
 * one visitor from the init they were served to the choice they made. Not a
 * subject id; it identifies nothing beyond the journey.
 */
export const consentSessionJourneySchema = v.object({
	/** Hostname of the site, from the request's `Origin` or host. */
	domain: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(253))),
	id: v.pipe(v.string(), v.uuid()),
	/**
	 * The first layer at the start of the journey: `due` (no stored choice
	 * and the policy prompts), `stored` (a stored choice was used), or
	 * `not-required` (the policy shows no prompt, or the resolution failed).
	 */
	prompt: v.picklist(['due', 'stored', 'not-required']),
	scope: v.picklist(['page', 'tab']),
	/** Whether the browser had a stored choice or notice dismissal at the start. */
	storedChoice: v.boolean(),
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
	/**
	 * The banner-experiment arm the visitor runs. Present only while the
	 * visitor has no stored choice, so a session carrying it is one where
	 * the banner was owed under that arm: the denominator of an opt-in rate.
	 */
	experiment: v.optional(
		v.object({
			arm: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
			id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
		})
	),
	gpc: v.boolean(),
	/** The consent journey, when the client sent one. */
	journey: v.optional(consentSessionJourneySchema),
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
