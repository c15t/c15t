/**
 * Builds a session report from an init resolution.
 *
 * Shared between the backend, whose `/init` emits one, and the host
 * adapters, which post one after resolving locally, so both describe a
 * resolution the same way and a consumer never has to reconcile two shapes.
 */

import type { InitOutput } from '../api/init';
import type {
	ConsentSessionReport,
	ConsentSessionSource,
} from '../api/session';
import type { ConsentManifest } from './consent-manifest';

/**
 * Request header a host puts the visitor's IP on when it reports a session.
 *
 * A dedicated header rather than `x-forwarded-for`: a platform in front of
 * the backend rewrites the standard chain to the connecting server, and the
 * backend's proxy-header precedence was written for a visitor's own
 * request, not a server-to-server one. The backend applies its `ipAddress`
 * masking and tracking settings to this value exactly as it would to a
 * connection-derived one.
 */
export const CONSENT_SESSION_CLIENT_IP_HEADER = 'x-c15t-client-ip';

/**
 * Request header that carries the banner-experiment arm a visitor runs, as
 * `<id>=<arm>` with both parts URI-encoded. A client sends it on `/init`
 * only while the visitor has no stored choice, so a session that carries it
 * is one where the banner was owed under that arm.
 */
export const CONSENT_EXPERIMENT_HEADER = 'x-c15t-experiment';

/** Longest experiment id or arm name a session report carries. */
const EXPERIMENT_TEXT_MAX = 128;

/** The experiment arm a session ran. */
export interface SessionExperiment {
	id: string;
	arm: string;
}

/**
 * The {@link CONSENT_EXPERIMENT_HEADER} value for an arm.
 *
 * @param experiment - The experiment id and arm.
 * @returns The header value.
 */
export const formatExperimentHeader = function formatExperimentHeader(
	experiment: SessionExperiment
): string {
	return `${encodeURIComponent(experiment.id)}=${encodeURIComponent(experiment.arm)}`;
};

/**
 * Read a {@link CONSENT_EXPERIMENT_HEADER} value. Anything malformed or
 * longer than 128 characters per part reads as no experiment: the header is
 * analytics and never fails a request.
 *
 * @param value - The raw header value, if any.
 * @returns The experiment and arm, or `null`.
 */
export const parseExperimentHeader = function parseExperimentHeader(
	value: string | null | undefined
): SessionExperiment | null {
	if (!value) {
		return null;
	}
	const separator = value.indexOf('=');
	if (separator <= 0 || separator === value.length - 1) {
		return null;
	}
	try {
		const id = decodeURIComponent(value.slice(0, separator));
		const arm = decodeURIComponent(value.slice(separator + 1));
		return id.length <= EXPERIMENT_TEXT_MAX && arm.length <= EXPERIMENT_TEXT_MAX
			? { arm, id }
			: null;
	} catch {
		return null;
	}
};

/**
 * Query parameter that carries the consent journey id: a random UUID a
 * client creates per page load (or per tab, see
 * {@link CONSENT_JOURNEY_SCOPE_PARAM}) and sends on `GET /init` and
 * `POST /subjects`. It links the init a visitor was served to the save that
 * followed. It is not the subject id and never goes into a cookie.
 *
 * Query parameters rather than a header: a new request header would fail
 * the CORS preflight of a backend that does not list it.
 */
export const CONSENT_JOURNEY_PARAM = 'c15tJourney';

/** Query parameter that carries the journey's scope: `page` or `tab`. */
export const CONSENT_JOURNEY_SCOPE_PARAM = 'c15tJourneyScope';

/**
 * Query parameter on `GET /init` that says whether the browser had a stored
 * consent choice when the journey started: `1` or `0`.
 */
export const CONSENT_JOURNEY_STORED_PARAM = 'c15tStored';

/**
 * How long a journey id lives in the browser.
 *
 * - `page`: one page load, in memory only.
 * - `tab`: carried across navigations in the same tab while a prompt is
 *   due, through `sessionStorage`.
 */
export type ConsentJourneyScope = 'page' | 'tab';

/** A journey as it travels on a request. */
export interface ConsentJourneyParams {
	id: string;
	scope: ConsentJourneyScope;
	/** Whether a choice was stored at the start. Sent on `/init` only. */
	storedChoice?: boolean;
}

/** What the visitor's first layer was at the start of a journey. */
export type ConsentJourneyPrompt = 'due' | 'stored' | 'not-required';

const JOURNEY_ID =
	/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

/**
 * Read a journey id. Anything but a UUID reads as none: the parameter is
 * analytics and never fails a request.
 *
 * @param value - The raw parameter value, if any.
 * @returns The id in lower case, or `null`.
 */
export const parseJourneyId = function parseJourneyId(
	value: string | null | undefined
): string | null {
	return typeof value === 'string' && JOURNEY_ID.test(value)
		? value.toLowerCase()
		: null;
};

/**
 * Read a journey scope. Anything but `page` or `tab` reads as none.
 *
 * @param value - The raw parameter value, if any.
 * @returns The scope, or `null`.
 */
export const parseJourneyScope = function parseJourneyScope(
	value: string | null | undefined
): ConsentJourneyScope | null {
	return value === 'page' || value === 'tab' ? value : null;
};

const toSearchParams = function toSearchParams(
	source: string | URL | URLSearchParams
): URLSearchParams | null {
	if (source instanceof URLSearchParams) {
		return source;
	}
	if (source instanceof URL) {
		return source.searchParams;
	}
	const query = source.indexOf('?');
	if (query === -1) {
		return null;
	}
	const hash = source.indexOf('#', query);
	return new URLSearchParams(
		source.slice(query + 1, hash === -1 ? undefined : hash)
	);
};

/**
 * Read the journey a request carries in its query string.
 *
 * Both the id and the scope must be well formed, or there is no journey.
 * `storedChoice` is set only for `c15tStored=1` or `c15tStored=0`.
 *
 * @param source - The request URL, absolute or relative, or its query.
 * @returns The journey, or `null`.
 */
export const readJourneyParams = function readJourneyParams(
	source: string | URL | URLSearchParams | null | undefined
): ConsentJourneyParams | null {
	const params = source ? toSearchParams(source) : null;
	if (!params) {
		return null;
	}
	const id = parseJourneyId(params.get(CONSENT_JOURNEY_PARAM));
	const scope = parseJourneyScope(params.get(CONSENT_JOURNEY_SCOPE_PARAM));
	if (!(id && scope)) {
		return null;
	}
	const stored = params.get(CONSENT_JOURNEY_STORED_PARAM);
	return stored === '1' || stored === '0'
		? { id, scope, storedChoice: stored === '1' }
		: { id, scope };
};

/**
 * Append a journey to a URL's query string. A relative URL stays relative.
 *
 * @param url - The request URL.
 * @param journey - The journey. `storedChoice` is written when set.
 * @returns The URL with the journey parameters.
 */
export const appendJourneyParams = function appendJourneyParams(
	url: string,
	journey: ConsentJourneyParams
): string {
	const params = new URLSearchParams({
		[CONSENT_JOURNEY_PARAM]: journey.id,
		[CONSENT_JOURNEY_SCOPE_PARAM]: journey.scope,
	});
	if (journey.storedChoice !== undefined) {
		params.set(CONSENT_JOURNEY_STORED_PARAM, journey.storedChoice ? '1' : '0');
	}
	const hash = url.indexOf('#');
	const base = hash === -1 ? url : url.slice(0, hash);
	const fragment = hash === -1 ? '' : url.slice(hash);
	let separator = '?';
	if (base.includes('?')) {
		separator = base.endsWith('?') || base.endsWith('&') ? '' : '&';
	}
	return `${base}${separator}${params.toString()}${fragment}`;
};

/**
 * Whether the first layer was owed, already answered, or never part of
 * this resolution.
 *
 * A failed resolution keeps the first layer hidden, and a matched policy
 * whose prompt is `none` (every `none` model) shows none, so both are
 * `not-required`. `no-match` and `unconfigured` still show the safe opt-in
 * fallback, so they are owed like a matched prompt.
 *
 * @param init - The resolved init payload.
 * @param storedChoice - Whether the browser had a stored choice.
 * @returns The prompt state at the start of the journey.
 */
export const deriveJourneyPrompt = function deriveJourneyPrompt(
	init: Pick<InitOutput, 'policyResolution'>,
	storedChoice: boolean
): ConsentJourneyPrompt {
	const resolution = init.policyResolution;
	if (
		!resolution ||
		resolution.status === 'failed' ||
		(resolution.status === 'matched' && resolution.policy.prompt === 'none')
	) {
		return 'not-required';
	}
	return storedChoice ? 'stored' : 'due';
};

/** A journey as a report receives it. */
export interface SessionJourney {
	id: string;
	scope: ConsentJourneyScope;
	/** Whether the browser had a stored choice at the start. */
	storedChoice: boolean;
	/** Hostname of the site the visitor was on, when known. */
	domain?: string;
}

/**
 * The hostname of an `Origin` header or a request URL, or `undefined` for
 * anything that is not an `http(s)` URL (including the opaque `null` origin).
 *
 * @param value - An origin or absolute URL.
 * @returns The hostname, or `undefined`.
 */
export const journeyDomainFrom = function journeyDomainFrom(
	value: string | URL | null | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}
	try {
		const url = value instanceof URL ? value : new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:'
			? url.hostname || undefined
			: undefined;
	} catch {
		return undefined;
	}
};

/** The resolver inputs a report records alongside the decision. */
export interface SessionReportInputs {
	country?: string | null;
	region?: string | null;
	gpc?: boolean;
}

export interface BuildConsentSessionReportOptions {
	/** The resolved init payload. */
	init: InitOutput;
	/** The manifest it was resolved from. Only its identity is read. */
	manifest: Pick<ConsentManifest, 'revision' | 'tenantId'>;
	/** The geo and GPC inputs the resolution ran with. */
	inputs?: SessionReportInputs;
	source: ConsentSessionSource;
	/** Package that resolved init, for example `@c15t/nextjs`. */
	adapter?: string;
	/**
	 * The banner-experiment arm the visitor runs, when they have no stored
	 * choice yet. See {@link CONSENT_EXPERIMENT_HEADER}.
	 */
	experiment?: SessionExperiment | null;
	/**
	 * The consent journey the resolution belongs to. The report adds the
	 * `prompt` it derives from `init`. See {@link CONSENT_JOURNEY_PARAM}.
	 */
	journey?: SessionJourney | null;
}

/**
 * Builds the `POST /sessions` body for one resolution.
 *
 * @param options - The resolved payload, its manifest, and the inputs.
 * @returns The report body.
 */
export const buildConsentSessionReport = function buildConsentSessionReport(
	options: BuildConsentSessionReportOptions
): ConsentSessionReport {
	const resolution = options.init.policyResolution;
	const report: ConsentSessionReport = {
		country: options.inputs?.country ?? null,
		gpc: options.inputs?.gpc === true,
		language: options.init.translations.language,
		policy:
			resolution?.status === 'matched'
				? {
						fingerprint: resolution.fingerprints.policy,
						id: resolution.policyId,
						matchedBy: resolution.matchedBy,
						model: resolution.policy.model,
					}
				: null,
		region: options.inputs?.region ?? null,
		resolution: resolution?.status ?? 'failed',
		revision: options.manifest.revision,
		source: options.source,
	};
	if (options.adapter) {
		report.adapter = options.adapter;
	}
	if (options.experiment) {
		report.experiment = {
			arm: options.experiment.arm,
			id: options.experiment.id,
		};
	}
	if (options.journey) {
		const { domain, id, scope, storedChoice } = options.journey;
		report.journey = {
			id,
			prompt: deriveJourneyPrompt(options.init, storedChoice),
			scope,
			storedChoice,
		};
		if (domain) {
			report.journey.domain = domain;
		}
	}
	if (options.manifest.tenantId !== undefined) {
		report.tenantId = options.manifest.tenantId;
	}
	return report;
};

/**
 * Whether a request is speculative: a browser, CDN, or router prefetching
 * or prerendering a page the visitor may never open. Such a request still
 * resolves consent so the response is right, but it is not a session;
 * reporting it would count visits that never happened.
 *
 * @param headers - The incoming request's headers.
 * @returns `true` for a prefetch or prerender request.
 */
export const isSpeculativeRequest = function isSpeculativeRequest(
	headers: Headers
): boolean {
	const purpose = (
		headers.get('sec-purpose') ??
		headers.get('purpose') ??
		headers.get('x-purpose') ??
		headers.get('x-moz') ??
		''
	).toLowerCase();
	if (purpose.includes('prefetch') || purpose.includes('prerender')) {
		return true;
	}
	return headers.get('next-router-prefetch') === '1';
};
