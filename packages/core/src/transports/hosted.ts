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
 * Every request declares the policy contract this client reads, and
 * `/init` responses are interpreted by what the producer declared back: a
 * negotiated producer's `policyResolution` is passed through raw for the
 * kernel's strict reader. Producers without a versioned wire fail safely. A negotiated producer
 * whose response lacks the field is a failed payload, never a permissive
 * fallback.
 *
 * Beyond `init`, `save` and `identify`, two optional methods carry the v3
 * record boundary: `loadSubjectRecord` reads the backend's merged receipts
 * and standing privacy directives for a subject as hydration records, and
 * `recordPrivacyOptOut` records a directive against the subject's own
 * server record through the privacy route, never the consent-saving one.
 *
 * Identity before a server subject exists is kernel-local. `identify`
 * without a subject resolves at once and sends nothing: the transport keeps
 * no pending promise for a subject that may never be created, and never
 * manufactures a consent to create one. The next legitimate save carries
 * the identity in its body, the backend links it when it creates the
 * subject, and the kernel then forwards its standing directives to that
 * subject's privacy route with their original times. Local identification
 * is not server persistence and not trusted cross-profile authority; only
 * an authenticated link is.
 *
 * The subject id the kernel passes is the only subject this transport acts
 * on. It remembers no subject of its own: after the kernel clears its data a
 * later identify or directive with no subject must not reach the subject an
 * earlier save established.
 *
 * Out of scope for this MVP (deferred to follow-ups):
 * - Response caching / revalidation
 * - Translation bundle fetching
 * - Retry / backoff
 */
import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';

import type { PrivacyOptOut } from '../consent-record/types';
import { consumePrefetchedInitialData } from '../libs/prefetch/prefetch';
import type {
	InitContext,
	KernelTransport,
	KernelUser,
	SaveResult,
} from '../types';
import {
	buildDecisionAssertion,
	gpcFromHeaders,
	rememberDecisionInputs,
} from './decision-inputs';
import type { RememberedDecisionInputs } from './decision-inputs';
import { mapInitOutputToInitResponse } from './init-output';
import type { TransportInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';
import type { SubjectSavePayload } from './subject-body';
import {
	mapSubjectRecordToHydrationRecords,
	reviveSubjectRecord,
} from './subject-record';
import type { TransportHydrationRecords } from './subject-record';
import {
	c15tProtocolHeaders,
	readProducerPolicyContract,
} from './version-header';

export interface HostedTransportOptions {
	/**
	 * Backend URL. Can be relative (`/api/c15t`) or absolute.
	 * Trailing slashes are stripped.
	 */
	backendURL: string;

	/**
	 * URL used for `GET /init`. Defaults to `${backendURL}/init`.
	 *
	 * Use this to point initialization at a same-origin server route while
	 * keeping consent saves on `${backendURL}/subjects`.
	 */
	initURL?: string;

	/**
	 * Assert the resolved policy decision on `POST /subjects`.
	 *
	 * When enabled, `init` remembers the policy id, fingerprint, geo,
	 * language, and GPC signal it resolved, and `save` sends them whenever
	 * the payload has no signed `policySnapshotToken`, so the backend can
	 * reject a save made against a stale policy instead of recording it
	 * unbound. Enable this when `initURL` points at a same-origin route that
	 * resolves init from a manifest: manifest resolution never issues a
	 * snapshot token.
	 *
	 * @defaultValue false
	 */
	assertDecisionInputs?: boolean;

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

	/**
	 * Clock used to validate records read from the backend. Defaults to
	 * `Date.now`. Inject for deterministic tests.
	 */
	now?: () => number;
}

/**
 * The hosted transport's full surface.
 *
 * `loadSubjectRecord` and `recordPrivacyOptOut` are the record boundary a
 * v3 kernel calls; both names match the kernel's optional transport methods
 * and the interface collapses into `KernelTransport` once those land.
 */
export interface HostedKernelTransport extends KernelTransport {
	init: (ctx: InitContext) => Promise<TransportInitResponse>;
	save: (payload: SubjectSavePayload) => Promise<SaveResult>;
	identify: (user: KernelUser, subjectId: string | null) => Promise<void>;
	/**
	 * Reads the backend's merged receipts and standing privacy directives for
	 * a subject. `null` when the backend has no such subject.
	 */
	loadSubjectRecord: (
		subjectId: string
	) => Promise<TransportHydrationRecords | null>;
	/**
	 * Records a standing privacy directive against the subject's own server
	 * record. Resolves without a request when there is no server subject yet;
	 * the directive stays local until one exists.
	 */
	recordPrivacyOptOut: (
		directive: PrivacyOptOut,
		subjectId: string | null
	) => Promise<void>;
}

/** Strip a single trailing slash so `${base}/init` doesn't double up. */
const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

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
const resolveDomain = function resolveDomain(
	backendURL: string,
	explicit: string | undefined
): string {
	if (explicit) {
		return explicit;
	}
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return window.location.hostname;
	}
	try {
		return new URL(backendURL).hostname;
	} catch {
		return 'localhost';
	}
};

const INIT_HEADER_ALLOWLIST = new Set<string>(CONSENT_REQUEST_HEADER_NAMES);

const buildAllowedInitHeaders = function buildAllowedInitHeaders(
	headers: Record<string, string> | undefined
): Record<string, string> {
	const allowed: Record<string, string> = {};
	if (!headers) {
		return allowed;
	}
	for (const [name, value] of Object.entries(headers)) {
		const normalizedName = name.toLowerCase();
		if (INIT_HEADER_ALLOWLIST.has(normalizedName)) {
			allowed[normalizedName] = value;
		}
	}
	return allowed;
};

/**
 * A `SaveResult` from the backend's answer.
 *
 * The backend's 2.x response shape has no `ok`; success is the HTTP status.
 * Reading the body as a `SaveResult` made every successful save look failed
 * and queued it for replay forever.
 */
const toSaveResult = function toSaveResult(data: unknown): SaveResult {
	const subjectId =
		typeof data === 'object' &&
		data !== null &&
		typeof (data as { subjectId?: unknown }).subjectId === 'string'
			? (data as { subjectId: string }).subjectId
			: undefined;
	return subjectId === undefined ? { ok: true } : { ok: true, subjectId };
};

/**
 * Build a hosted transport. The returned object is plain — no listeners,
 * no caches, and no state beyond the decision inputs remembered when
 * `assertDecisionInputs` is set. Safe to create per request.
 */
export const createHostedTransport = function createHostedTransport(
	options: HostedTransportOptions
): HostedKernelTransport {
	const base = trimSlash(options.backendURL);
	const initURL = options.initURL ?? `${base}/init`;
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error(
			'createHostedTransport: no fetch available. Pass `fetch` in options.'
		);
	}
	const initHeaders = buildAllowedInitHeaders(options.headers);
	const credentials = options.credentials ?? 'include';
	const domain = resolveDomain(base, options.domain);
	const now = options.now ?? Date.now;
	let lastDecisionInputs: RememberedDecisionInputs | undefined;

	const jsonHeaders = {
		accept: 'application/json',
		'content-type': 'application/json',
		...c15tProtocolHeaders,
	};

	const subjectURL = (subjectId: string): string =>
		`${base}/subjects/${encodeURIComponent(subjectId)}`;

	const patchIdentity = async function patchIdentity(
		user: KernelUser,
		subjectId: string
	): Promise<void> {
		const response = await fetchImpl(subjectURL(subjectId), {
			body: JSON.stringify({
				externalId: user.externalId,
				identityProvider: user.identityProvider,
			}),
			credentials,
			headers: jsonHeaders,
			method: 'PATCH',
		});

		if (!response.ok) {
			throw new Error(
				`c15t hosted transport: /subjects/:id responded ${response.status} ${response.statusText}`
			);
		}
	};

	return {
		async identify(user, subjectId): Promise<void> {
			if (!subjectId) {
				// No server subject to link. The identity stays in the kernel and
				// travels with the next save; nothing is owed to the network.
				return;
			}
			await patchIdentity(user, subjectId);
		},

		async init(ctx: InitContext): Promise<TransportInitResponse> {
			const prefetched = options.initURL
				? undefined
				: await consumePrefetchedInitialData({
						backendURL: base,
						credentials,
						overrides: {
							...extractConsentRequestInputs(new Headers(initHeaders)),
							...ctx.overrides,
						},
					});
			if (prefetched?.init) {
				const headers = {
					...initHeaders,
					'sec-gpc': prefetched.metadata?.requestContext?.gpc ? '1' : '0',
				};
				if (options.assertDecisionInputs) {
					lastDecisionInputs = rememberDecisionInputs(
						prefetched.init,
						gpcFromHeaders(headers)
					);
				}
				const producerHeaders = new Headers();
				if (typeof prefetched.producerPolicyContract === 'string') {
					producerHeaders.set(
						'x-c15t-policy-contract',
						prefetched.producerPolicyContract
					);
				}
				return mapInitOutputToInitResponse(prefetched.init, headers, {
					producerContract: readProducerPolicyContract(producerHeaders),
				});
			}
			const response = await fetchImpl(initURL, {
				credentials,
				headers: {
					accept: 'application/json',
					...c15tProtocolHeaders,
					...initHeaders,
				},
				method: 'GET',
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /init responded ${response.status} ${response.statusText}`
				);
			}

			const payload = (await response.json()) as InitOutput;
			if (options.assertDecisionInputs) {
				lastDecisionInputs = rememberDecisionInputs(
					payload,
					gpcFromHeaders(initHeaders)
				);
			}
			return mapInitOutputToInitResponse(payload, initHeaders, {
				producerContract: readProducerPolicyContract(response.headers),
			});
		},

		async loadSubjectRecord(
			subjectId
		): Promise<TransportHydrationRecords | null> {
			const response = await fetchImpl(subjectURL(subjectId), {
				credentials,
				headers: { accept: 'application/json', ...c15tProtocolHeaders },
				method: 'GET',
			});
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /subjects/:id responded ${response.status} ${response.statusText}`
				);
			}
			const record = reviveSubjectRecord(await response.json());
			if (!record) {
				throw new Error(
					'c15t hosted transport: /subjects/:id returned an unreadable record'
				);
			}
			return mapSubjectRecordToHydrationRecords(record, { now: now() });
		},

		async recordPrivacyOptOut(directive, subjectId): Promise<void> {
			if (!subjectId) {
				// No server record exists for this device yet. The kernel keeps the
				// directive locally; it is never sent through the consent route.
				return;
			}
			const response = await fetchImpl(
				`${subjectURL(subjectId)}/privacy-directives`,
				{
					body: JSON.stringify({
						categories: [...directive.categories],
						recordedAt: directive.recordedAt,
						source: directive.source,
					}),
					credentials,
					headers: jsonHeaders,
					method: 'POST',
				}
			);
			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /subjects/:id/privacy-directives responded ${response.status} ${response.statusText}`
				);
			}
		},

		async save(payload): Promise<SaveResult> {
			const response = await fetchImpl(`${base}/subjects`, {
				body: JSON.stringify({
					...buildSubjectPostBody(payload, { domain }),
					...buildDecisionAssertion(payload, lastDecisionInputs),
				}),
				credentials,
				headers: jsonHeaders,
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}

			return toSaveResult(await response.json());
		},
	};
};
