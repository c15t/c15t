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

import { consumePrefetchedInitialData } from '../libs/prefetch/prefetch';
import { buildRequestContextHeaders } from '../libs/request-context';
import type { SSRInitialData } from '../options/ssr';
import type { KernelOverrides, InitContext } from '../types';
import {
	decisionInputsMatchOverrides,
	gpcFromHeaders,
	rememberDecisionInputs,
} from './decision-inputs';
import type { RememberedDecisionInputs } from './decision-inputs';
import {
	createHostedRecordTransport,
	resolveFetch,
	trimSlash,
} from './hosted-records';
import type { HostedRecordTransport } from './hosted-records';
import { mapInitOutputToInitResponse } from './init-output';
import type { TransportInitResponse } from './init-output';
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
	/**
	 * An init response that was already requested, for example by an inline
	 * prefetch script that ran before hydration. The first `init()` consumes
	 * it instead of calling `initURL`, and still records the decision inputs
	 * when `assertDecisionInputs` is set, so the first save stays bound to
	 * that decision. A rejected or empty promise falls back to the fetch.
	 */
	initialData?: Promise<SSRInitialData | undefined>;

	/**
	 * Decision inputs a server-side prefetch already resolved. Seeds the
	 * assertion `POST /subjects` carries when `assertDecisionInputs` is set,
	 * so a save made before the first client `init()` resolves is still
	 * bound to the policy the server rendered. `init()` replaces the seed.
	 */
	decisionInputs?: RememberedDecisionInputs;

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
 * The hosted transport's full surface: the record methods of
 * {@link HostedRecordTransport} plus `init`.
 */
export interface HostedKernelTransport extends HostedRecordTransport {
	init: (ctx: InitContext) => Promise<TransportInitResponse>;
}

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
 * Build a hosted transport. The returned object is plain — no listeners,
 * no caches, and no state beyond the decision inputs remembered when
 * `assertDecisionInputs` is set. Safe to create per request.
 */
export const createHostedTransport = function createHostedTransport(
	options: HostedTransportOptions
): HostedKernelTransport {
	const base = trimSlash(options.backendURL);
	const initURL = options.initURL ?? `${base}/init`;
	const fetchImpl = resolveFetch(options.fetch);
	const initHeaders = buildAllowedInitHeaders(options.headers);
	const credentials = options.credentials ?? 'include';
	let lastDecisionInputs = options.assertDecisionInputs
		? options.decisionInputs
		: undefined;

	// Overlapping inits: the kernel keeps only the latest response, so only
	// the latest attempt may update the assertion state.
	let initGeneration = 0;
	/** Overrides the previous init ran with; `undefined` before the first. */
	let lastInitOverrides: KernelOverrides | undefined;

	const sameOverrides = function sameOverrides(
		left: KernelOverrides,
		right: KernelOverrides
	): boolean {
		return (
			left.country === right.country &&
			left.region === right.region &&
			left.language === right.language &&
			left.gpc === right.gpc
		);
	};

	let pendingInit: Promise<TransportInitResponse> | undefined;
	let { initialData } = options;

	const prepareInit = (ctx: InitContext) => {
		if (options.assertDecisionInputs && lastDecisionInputs) {
			const stale = lastInitOverrides
				? !sameOverrides(lastInitOverrides, ctx.overrides)
				: !decisionInputsMatchOverrides(lastDecisionInputs, ctx.overrides);
			if (stale) {
				lastDecisionInputs = undefined;
			}
		}
		lastInitOverrides = { ...ctx.overrides };
	};

	const runInit = async (ctx: InitContext): Promise<TransportInitResponse> => {
		initGeneration += 1;
		const generation = initGeneration;
		prepareInit(ctx);
		const requestHeaders = {
			...initHeaders,
			...buildRequestContextHeaders(ctx.overrides),
		};
		const supplied = initialData;
		initialData = undefined;
		let prefetched: SSRInitialData | undefined;
		if (supplied) {
			prefetched = await supplied.catch(() => undefined);
		} else if (!options.initURL) {
			prefetched = await consumePrefetchedInitialData({
				backendURL: base,
				credentials,
				overrides: {
					...extractConsentRequestInputs(new Headers(requestHeaders)),
					...ctx.overrides,
				},
			});
		}
		if (prefetched?.init) {
			const headers = { ...requestHeaders };
			const gpc = prefetched.metadata?.requestContext?.gpc;
			if (gpc !== undefined) {
				headers['sec-gpc'] = gpc ? '1' : '0';
			}
			if (options.assertDecisionInputs && generation === initGeneration) {
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
				...requestHeaders,
			},
			method: 'GET',
		});

		if (!response.ok) {
			throw new Error(
				`c15t hosted transport: /init responded ${response.status} ${response.statusText}`
			);
		}

		const payload = (await response.json()) as InitOutput;
		if (options.assertDecisionInputs && generation === initGeneration) {
			lastDecisionInputs = rememberDecisionInputs(
				payload,
				gpcFromHeaders(requestHeaders) ??
					payload.resolvedPrivacySignals?.gpc ??
					(payload as InitOutput & { resolvedOverrides?: { gpc?: boolean } })
						.resolvedOverrides?.gpc
			);
		}
		return mapInitOutputToInitResponse(payload, requestHeaders, {
			producerContract: readProducerPolicyContract(response.headers),
		});
	};

	const records = createHostedRecordTransport(
		{
			backendURL: base,
			credentials,
			domain: options.domain,
			fetch: fetchImpl,
			now: options.now,
		},
		{
			inputs: () => lastDecisionInputs,
			pending: () => pendingInit,
			required: options.assertDecisionInputs === true,
		}
	);

	return {
		...records,
		async init(ctx: InitContext): Promise<TransportInitResponse> {
			const run = runInit(ctx);
			pendingInit = run;
			try {
				return await run;
			} finally {
				if (pendingInit === run) {
					pendingInit = undefined;
				}
			}
		},
	};
};
