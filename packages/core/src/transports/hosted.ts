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
import { CONSENT_REQUEST_HEADER_NAMES } from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';

import { buildRequestContextHeaders } from '../libs/request-context';
import type { SSRInitialData } from '../options/ssr';
import type {
	InitContext,
	InitResponse,
	KernelTransport,
	KernelUser,
	SavePayload,
	SaveResult,
} from '../types';
import {
	buildDecisionAssertion,
	gpcFromHeaders,
	rememberDecisionInputs,
} from './decision-inputs';
import type { RememberedDecisionInputs } from './decision-inputs';
import { mapInitOutputToInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';
import { c15tVersionHeaders } from './version-header';

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
	 * An init response that was already requested, for example by an inline
	 * prefetch script that ran before hydration. The first `init()` consumes
	 * it instead of calling `initURL`, and still records the decision inputs
	 * when `assertDecisionInputs` is set, so the first save stays bound to
	 * that decision. A rejected or empty promise falls back to the fetch.
	 */
	initialData?: Promise<SSRInitialData | undefined>;

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

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	reject: (reason?: unknown) => void;
	resolve: (value: Value | PromiseLike<Value>) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * Build a hosted transport. The returned object is plain — no listeners,
 * no caches, and no state beyond the decision inputs remembered when
 * `assertDecisionInputs` is set. Safe to create per request.
 */
export const createHostedTransport = function createHostedTransport(
	options: HostedTransportOptions
): KernelTransport {
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
	let establishedSubjectId: string | null = null;
	let lastDecisionInputs: RememberedDecisionInputs | undefined;
	interface PendingIdentity {
		reject: (error: unknown) => void;
		resolve: () => void;
		user: KernelUser;
	}
	let pendingIdentities: PendingIdentity[] = [];

	const patchIdentity = async function patchIdentity(
		user: KernelUser,
		subjectId: string
	): Promise<void> {
		const response = await fetchImpl(
			`${base}/subjects/${encodeURIComponent(subjectId)}`,
			{
				body: JSON.stringify({
					externalId: user.externalId,
					identityProvider: user.identityProvider,
				}),
				credentials,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					...c15tVersionHeaders,
				},
				method: 'PATCH',
			}
		);

		if (!response.ok) {
			throw new Error(
				`c15t hosted transport: /subjects/:id responded ${response.status} ${response.statusText}`
			);
		}
	};

	const flushPendingIdentities = async function flushPendingIdentities(
		subjectId: string
	): Promise<void> {
		const pending = pendingIdentities;
		pendingIdentities = [];
		const latest = pending.at(-1);
		if (!latest) {
			return;
		}
		try {
			await patchIdentity(latest.user, subjectId);
			for (const item of pending) {
				item.resolve();
			}
		} catch (error) {
			for (const item of pending) {
				item.reject(error);
			}
		}
	};

	let { initialData } = options;

	const resolvedGpc = function resolvedGpc(
		payload: InitOutput
	): boolean | undefined {
		const value = (payload as { resolvedOverrides?: { gpc?: unknown } })
			.resolvedOverrides?.gpc;
		return typeof value === 'boolean' ? value : undefined;
	};

	/** Takes the prefetched init once; `undefined` when absent or failed. */
	const consumeInitialData = async function consumeInitialData(): Promise<
		InitOutput | undefined
	> {
		if (!initialData) {
			return undefined;
		}
		const pending = initialData;
		initialData = undefined;
		const data = await pending.catch(() => undefined);
		if (!data?.init) {
			return undefined;
		}
		return { ...data.init, gvl: data.gvl ?? data.init.gvl } as InitOutput;
	};

	const overrideHeaders = function overrideHeaders(
		ctx: InitContext
	): Record<string, string> {
		const headers = buildRequestContextHeaders(ctx.overrides);
		if (ctx.overrides.gpc !== undefined) {
			// `Sec-*` request headers are forbidden to scripts, so the override
			// travels on the adapter header the shared extractor reads first.
			headers['x-c15t-gpc'] = ctx.overrides.gpc ? '1' : '0';
		}
		return headers;
	};

	const fetchInit = async function fetchInit(
		headers: Record<string, string>
	): Promise<InitOutput> {
		const response = await fetchImpl(initURL, {
			credentials,
			headers: {
				accept: 'application/json',
				...c15tVersionHeaders,
				...headers,
			},
			method: 'GET',
		});

		if (!response.ok) {
			throw new Error(
				`c15t hosted transport: /init responded ${response.status} ${response.statusText}`
			);
		}

		return (await response.json()) as InitOutput;
	};

	const resolvePendingIdentities = function resolvePendingIdentities(): void {
		const pending = pendingIdentities;
		pendingIdentities = [];
		for (const item of pending) {
			item.resolve();
		}
	};

	return {
		async identify(user, subjectId): Promise<void> {
			const resolvedSubjectId = subjectId ?? establishedSubjectId;
			if (!resolvedSubjectId) {
				return createDeferredPromise<undefined>((resolve, reject) => {
					pendingIdentities.push({
						reject,
						resolve: () => resolve(undefined),
						user,
					});
				});
			}
			await patchIdentity(user, resolvedSubjectId);
		},

		async init(ctx: InitContext): Promise<InitResponse> {
			// The kernel's current overrides (country, region, language, GPC)
			// travel as the canonical consent headers so a same-origin init
			// route resolves the requested inputs rather than the CDN's.
			const headers = { ...initHeaders, ...overrideHeaders(ctx) };
			const prefetched = await consumeInitialData();
			const payload = prefetched ?? (await fetchInit(headers));
			if (options.assertDecisionInputs) {
				// Explicit headers first; otherwise the GPC value the resolver
				// saw (the browser sends Sec-GPC itself on a same-origin init),
				// so the assertion carries the input that produced the decision.
				lastDecisionInputs = rememberDecisionInputs(
					payload,
					gpcFromHeaders(headers) ?? resolvedGpc(payload)
				);
			}
			const result = mapInitOutputToInitResponse(payload, headers);
			if (result.subjectId) {
				establishedSubjectId = result.subjectId;
				await flushPendingIdentities(result.subjectId);
			}
			return result;
		},

		async save(payload: SavePayload): Promise<SaveResult> {
			const response = await fetchImpl(`${base}/subjects`, {
				body: JSON.stringify({
					...buildSubjectPostBody(payload, { domain }),
					...buildDecisionAssertion(payload, lastDecisionInputs),
				}),
				credentials,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					...c15tVersionHeaders,
				},
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error(
					`c15t hosted transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}

			const data = (await response.json()) as SaveResult;
			if (data.subjectId) {
				establishedSubjectId = data.subjectId;
			}
			const latestPendingUser = pendingIdentities.at(-1)?.user;
			const savedUser = payload.user;
			if (
				data.subjectId &&
				savedUser &&
				latestPendingUser &&
				savedUser.externalId === latestPendingUser.externalId &&
				savedUser.identityProvider === latestPendingUser.identityProvider
			) {
				// POST /subjects already linked the latest queued identity.
				resolvePendingIdentities();
			} else if (data.subjectId) {
				await flushPendingIdentities(data.subjectId);
			}
			return data;
		},
	};
};
