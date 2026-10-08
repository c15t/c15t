/**
 * Server-side consent resolution for one request, written once for every
 * server adapter.
 *
 * A server render needs the visitor's consent state before it can decide
 * whether the banner is in the HTML. This module turns the facts an adapter
 * reads natively (headers, the cookie, the request URL, whether the render
 * is shared) into the JSON-serializable state the client hydrates from:
 *
 * 1. **Request read.** Stored records from the consent cookie, and geo,
 *    language and GPC through the one shared extractor, so every adapter
 *    reads `x-c15t-gpc` before `sec-gpc` and leaves an absent signal
 *    `undefined`.
 * 2. **Mode.** An inline manifest or a manifest URL resolves `/init`
 *    locally with {@link resolveConsentInit}; hosted mode asks a backend
 *    `/init`; offline mode resolves bundled policy rules.
 * 3. **Target.** A relative URL resolves against the request with the one
 *    trust rule in `request-origin.ts`. A render never fetches the app's own
 *    consent routes over the network (the self-route guard); an adapter
 *    with an in-process fetch reaches them through it instead.
 * 4. **Forwarding.** Upstream requests carry only what the backend needs.
 *    See {@link ResolveRequestConsentOptions.forwardHeaders} for the rule.
 * 5. **Budget.** One deadline for the whole resolution. Past it the render
 *    gets the request-only state and the browser resolves the policy.
 * 6. **Merge.** The init folds into the request-only state, with the full
 *    vendor list deferred to a reference wherever the browser can fetch it.
 *
 * A shared render (prerendered or cached HTML served to every visitor)
 * reads no visitor facts, carries no records, clock, privacy signal or
 * experiment arm, and skips the hosted and manifest prefetch. Offline mode
 * still resolves, because it resolves without visitor input in the browser
 * too.
 *
 * Server-only: it resolves init with every bundled translation.
 */

import {
	appendJourneyParams,
	CONSENT_EXPERIMENT_HEADER,
	CONSENT_REQUEST_HEADER_NAMES,
	consentInputsToOverrides,
	extractConsentRequestInputs,
	formatExperimentHeader,
	getIpAddress,
	isSpeculativeRequest,
	journeyDomainFrom,
	POLICY_CONTRACT_VERSION,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	ConsentRequestHeaderInputs,
	InitOutput,
	ResolveInitFromManifestInputs,
	SessionJourney,
} from '@c15t/schema/types';

import type { StorageConfig } from '../libs/cookie/types';
import { experimentArmRef } from '../libs/experiment';
import type { ExperimentState, ServerExperiment } from '../libs/experiment';
import { createJourneyId } from '../libs/journey';
import type { ConsentJourneyOption, JourneyState } from '../libs/journey';
import {
	DEFAULT_RESOLVE_TIMEOUT_MS,
	fetchCachedManifest,
	ManifestUnavailableError,
	withResolutionBudget,
} from '../libs/manifest-cache-runtime';
import type {
	ManifestCache,
	ManifestFetch,
} from '../libs/manifest-cache-runtime';
import { resolveSessionReportBackendURL } from '../libs/session-report';
import { readStoredRecordsFromCookieHeader } from '../modules/persistence/hydrate';
import { resolveStorageKeys } from '../modules/persistence/record-storage';
import { deferInitGvl, deferInitGvlToRoute } from '../transports/gvl-reference';
import {
	mapInitOutputToInitResponse,
	mergeInitResponseIntoKernelConfig,
} from '../transports/init-output';
import { createOfflineTransport } from '../transports/offline';
import type { OfflineTransportOptions } from '../transports/offline';
import {
	c15tProtocolHeaders,
	readProducerPolicyContract,
} from '../transports/version-header';
import type { KernelConfig } from '../types';
import {
	CONSENT_PROXY_FORWARDING_HEADERS,
	filterCookieHeader,
	isCleartextRemoteURL,
	stripIdentityForCleartext,
} from './consent-proxy';
import {
	CONSENT_ROUTE_TIMEOUT_HEADER,
	resolveConsentInit,
} from './consent-route';
import type { ConsentRouteFetchGvl } from './consent-route';
import { fetchCachedGvl } from './gvl-cache';
import {
	resolveRequestBackendURL,
	resolveRequestOrigin,
} from './request-origin';
import type { RequestHeaderSource } from './request-origin';

/**
 * Where every adapter mounts its consent routes unless told otherwise. A
 * render treats URLs under it on its own origin as its own routes.
 */
export const DEFAULT_CONSENT_ROUTE_PREFIX = '/api/c15t';

/**
 * Marks a hosted request a render sends to its own origin. If a page answers
 * it (an unmounted backend prefix, say) and that page resolves consent too,
 * the second render sees the marker and does not fetch its origin again, so
 * a self-fetch stops after one hop instead of recursing.
 */
const RENDER_REQUEST_HEADER = 'x-c15t-render-request';

/**
 * The state a server render hands the client: a `KernelConfig` without the
 * transport (functions do not serialize), plus the experiment it ran and
 * the consent journey it started.
 */
export type RequestConsentState = Omit<KernelConfig, 'transport'> &
	ExperimentState &
	JourneyState;

/** What the adapter read from the request with its framework's own API. */
export interface ConsentRequestFacts {
	/**
	 * The URL the framework resolved the request under (`event.url`,
	 * `request.url`, `Astro.url`). A relative backend URL resolves against
	 * its origin. Without it, the `host` header decides.
	 */
	url?: string | URL;
	/** The request headers. */
	headers?: RequestHeaderSource;
	/**
	 * The `Cookie` header, when the framework reads cookies apart from the
	 * headers (Next.js `cookies()`). Defaults to the `cookie` header.
	 */
	cookie?: string | null;
	/**
	 * Geo, language and GPC an adapter's middleware already normalized for
	 * this request. Used instead of reading the headers again; explicit
	 * {@link ResolveRequestConsentOptions.overrides} still win.
	 */
	inputs?: ConsentRequestHeaderInputs;
}

/** How the visitor's policy is resolved. */
export type RequestConsentMode = 'hosted' | 'manifest' | 'offline';

/** Configuration for {@link resolveRequestConsent}. */
export interface ResolveRequestConsentOptions {
	/**
	 * Package name of the adapter, such as `@c15t/nextjs`. Names the adapter
	 * in session reports and prefixes errors.
	 */
	adapter: string;
	/** The facts the adapter read from the request. */
	request: ConsentRequestFacts;
	/**
	 * Country, region or language that replace what the request says, from
	 * the adapter's options or configuration. They apply to shared renders
	 * too, because they come from the site rather than the visitor.
	 */
	overrides?: Pick<
		ConsentRequestHeaderInputs,
		'country' | 'language' | 'region'
	>;
	/**
	 * Storage settings the browser persists consent with. Only `storageKey`
	 * matters here: it names the cookie the records are read from, and the
	 * one cookie hosted mode may forward.
	 */
	storage?: StorageConfig;
	/** Request clock reused for record validation and hydration. */
	now?: number;
	/**
	 * The HTML this render produces is served to more than one visitor
	 * (prerendered, or cached by a route rule). No visitor fact is read, the
	 * state carries no records, clock, privacy signal or experiment, and the
	 * hosted and manifest prefetch is skipped so the browser resolves the
	 * visitor itself. Offline mode still resolves.
	 */
	shared?: boolean;
	/**
	 * Fields the adapter adds to the request-only state before the init
	 * folds in (Astro's translations and pending flag, for example).
	 */
	seed?: Partial<RequestConsentState>;
	/**
	 * How to resolve the policy. Defaults to `offline` with
	 * {@link offline}, `manifest` with {@link manifest} or
	 * {@link manifestURL}, `hosted` with {@link initURL} or
	 * {@link backendURL}, and the request-only state otherwise.
	 */
	mode?: RequestConsentMode;
	/**
	 * Backend base URL, absolute or `/`-relative. Manifest mode reads
	 * `${backendURL}/manifest` without a {@link manifestURL}; hosted mode
	 * asks `${backendURL}/init` without an {@link initURL}. Session reports
	 * go here only when it is absolute.
	 */
	backendURL?: string;
	/** Full manifest URL. Takes precedence over `${backendURL}/manifest`. */
	manifestURL?: string;
	/** An inline manifest: no manifest is fetched. */
	manifest?: ConsentManifest;
	/**
	 * Hosted mode: the `/init` endpoint to ask. Defaults to
	 * `${backendURL}/init`. Pass the app's own init route together with
	 * {@link localFetch} to resolve through it in-process.
	 */
	initURL?: string;
	/** Offline mode: the policy rules and copy to resolve with. */
	offline?: OfflineTransportOptions;
	/**
	 * Path prefixes (or absolute URLs) of this app's own consent routes. A
	 * target on the request's origin under one of them is never fetched over
	 * the network: the render would wait on the server that is rendering it,
	 * which deadlocks dev servers, costs a second function invocation on
	 * serverless hosts, and fails behind deployment protection. The render
	 * then gets the request-only state and `onError` hears why. With
	 * {@link localFetch}, a `/`-relative target goes in-process instead.
	 *
	 * Other same-origin targets (a backend mounted in the app, or a rewrite
	 * to one) are fetched. A hosted request to the request's origin is
	 * marked, and a render whose own request carries that mark does not
	 * fetch its origin again, so a prefix that answers with a page cannot
	 * loop.
	 *
	 * @default ['/api/c15t']
	 */
	ownRoutes?: readonly string[];
	/**
	 * Fetch that answers this app's own routes in-process when given a path
	 * (SvelteKit `event.fetch`, Nitro `localFetch`). A `/`-relative target is
	 * fetched through it and the request's host never decides the target.
	 */
	localFetch?: ManifestFetch;
	/**
	 * Fetch for absolute upstream URLs. Defaults to `globalThis.fetch`. A
	 * custom fetch keeps the vendor list inline, since the browser cannot
	 * replay it.
	 */
	fetch?: typeof globalThis.fetch;
	/**
	 * Per-framework fetch hint for the manifest request, such as Next.js
	 * `{ next: { revalidate: 300 } }`. Not part of the cache key.
	 */
	manifestFetchInit?: Omit<RequestInit, 'headers' | 'method'>;
	/**
	 * Consent request headers configured on the browser's own `/init`
	 * (`x-c15t-country`, ...), applied to the hosted request so server and
	 * browser resolve one policy. Anything outside the consent request
	 * headers is ignored.
	 */
	initHeaders?: Record<string, string>;
	/**
	 * Extra request headers to forward upstream, such as a token a private
	 * backend needs. The forwarding rule:
	 *
	 * - Always: the c15t protocol headers, the resolved country, region,
	 *   language and GPC signal, the `user-agent`, and the experiment arm
	 *   while the visitor has no stored choice.
	 * - Hosted mode, only over `https`, to a loopback host, or in-process:
	 *   these headers and, when {@link trustForwardedHeaders} is set, the
	 *   visitor IP as `x-forwarded-for`. A remote backend (not an in-process
	 *   route) also gets the consent cookie ({@link storage}`.storageKey`),
	 *   never the rest of the jar.
	 * - Manifest mode: nothing about the visitor. The manifest is public
	 *   policy data; only these headers and {@link cookieNames} travel, and
	 *   not over cleartext.
	 * - Never: `cookie` or any `forwarded`/`x-forwarded-*` header named
	 *   here.
	 */
	forwardHeaders?: readonly string[];
	/**
	 * Manifest mode: cookies to send with the manifest request, for a
	 * backend that gates `/manifest` on one. None by default.
	 */
	cookieNames?: readonly string[];
	/**
	 * Resolve a relative URL against the request's forwarding headers, and
	 * believe the client IP chain. Only behind a proxy that sets those
	 * headers and drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;
	/**
	 * Longest the render waits for the policy, in milliseconds, counted
	 * from the start of the resolution. `false` or `Infinity` waits for the
	 * upstream's own timeout. Any other value that is not a finite,
	 * non-negative number uses the default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
	/**
	 * Keeps work that outlives the render alive: session reports, manifest
	 * refreshes, and a resolution the budget stopped waiting for. The
	 * promise never rejects.
	 */
	waitUntil?: (task: Promise<void>) => void;
	/**
	 * Manifest mode: report the resolved init to the backend's
	 * `POST /sessions`, detached from the render. Needs an absolute
	 * {@link backendURL}. Hosted mode never reports: the backend's own
	 * `/init` already counted the visitor.
	 *
	 * @default true
	 */
	reportSessions?: boolean;
	/**
	 * The journey scope this render reports; pass the provider's `journey`.
	 * When the render starts none, the state's `journey` is `null` so the
	 * browser sends none either.
	 *
	 * @default 'page'
	 */
	journey?: ConsentJourneyOption;
	/**
	 * The banner experiment with this request's arm. While the visitor has
	 * no stored choice, the hosted `/init` or the session report carries the
	 * arm. The state carries the experiment either way, except in a shared
	 * render.
	 */
	experiment?: ServerExperiment;
	/**
	 * Manifest mode: same-origin init route that serves versioned public
	 * vendor lists. A deferred list points there; without it, at the
	 * public list URL.
	 */
	gvlRoute?: string;
	/** Replaces the default vendor-list loader in manifest mode. */
	fetchGvl?: ConsentRouteFetchGvl;
	/** Manifest cache to read through. Defaults to the process cache. */
	cache?: ManifestCache;
	/**
	 * Hears every failure the render recovered from, with the URL involved.
	 * The resolution itself never throws.
	 */
	onError?: (error: unknown, url: string | undefined) => void;
}

/** What {@link readRequestConsent} derives from the request alone. */
export interface RequestConsentRead {
	/** The request-only state: records, overrides, privacy signal, clock. */
	state: RequestConsentState;
	/** Geo, language and GPC for this request. */
	inputs: ConsentRequestHeaderInputs;
}

/** A failure the resolution recovered from, with the URL it involved. */
class RequestConsentError extends Error {
	readonly url: string | undefined;

	constructor(message: string, url: string | undefined, cause?: unknown) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = 'RequestConsentError';
		this.url = url;
	}
}

const readHeader = function readHeader(
	headers: RequestHeaderSource | undefined,
	name: string
): string | undefined {
	if (!headers) {
		return undefined;
	}
	if (typeof (headers as Headers).get === 'function') {
		return (headers as Headers).get(name) ?? undefined;
	}
	const record = headers as Record<string, string | string[] | undefined>;
	const value = record[name] ?? record[name.toLowerCase()];
	return Array.isArray(value) ? value[0] : value;
};

const toHeaders = function toHeaders(
	headers: RequestHeaderSource | undefined
): Headers {
	if (headers instanceof Headers) {
		return headers;
	}
	const result = new Headers();
	for (const [name, value] of Object.entries(headers ?? {})) {
		const first = Array.isArray(value) ? value[0] : value;
		if (first !== undefined) {
			result.set(name, first);
		}
	}
	return result;
};

/** `country`, `region` and `language` set on `overrides`, dropping the rest. */
const configuredOverrides = function configuredOverrides(
	overrides: ResolveRequestConsentOptions['overrides']
): ConsentRequestHeaderInputs {
	const inputs: ConsentRequestHeaderInputs = {};
	if (overrides?.country) {
		inputs.country = overrides.country;
	}
	if (overrides?.region) {
		inputs.region = overrides.region;
	}
	if (overrides?.language) {
		inputs.language = overrides.language;
	}
	return inputs;
};

const readInputs = function readInputs(
	options: ResolveRequestConsentOptions
): ConsentRequestHeaderInputs {
	const configured = configuredOverrides(options.overrides);
	if (options.shared) {
		return configured;
	}
	const { request } = options;
	if (request.inputs) {
		return { ...request.inputs, ...configured };
	}
	return extractConsentRequestInputs(
		(request.headers ?? {}) as Headers,
		configured
	);
};

/**
 * The request-only half of {@link resolveRequestConsent}: stored records
 * from the consent cookie, and geo, language and GPC from the headers, with
 * no network work. A shared render reads none of it.
 *
 * @param options - The request facts, overrides, storage key and clock.
 * @returns The request-only state and the inputs it was derived from.
 * @example
 * ```ts
 * const { state } = readRequestConsent({ adapter, request: { headers } });
 * ```
 */
export const readRequestConsent = function readRequestConsent(
	options: ResolveRequestConsentOptions
): RequestConsentRead {
	const inputs = readInputs(options);
	const state: RequestConsentState = { ...options.seed };
	if (!options.shared) {
		const now = options.now ?? Date.now();
		const cookie =
			options.request.cookie ?? readHeader(options.request.headers, 'cookie');
		state.initialRecords = readStoredRecordsFromCookieHeader(
			cookie ?? undefined,
			options.storage,
			now
		);
		state.initialPrivacySignals = { gpc: inputs.gpc };
		state.now = now;
	}
	const overrides = consentInputsToOverrides({ ...inputs, gpc: undefined });
	if (Object.keys(overrides).length > 0) {
		state.initialOverrides = {
			...state.initialOverrides,
			...overrides,
		};
	}
	return { inputs, state };
};

/**
 * The render budget in milliseconds, or `undefined` for none. Only `false`
 * and `Infinity` turn it off; a value that is not a finite, non-negative
 * number must not do it silently, nor make the budget zero, so it gets the
 * 500 ms default.
 *
 * @param value - A configured `timeoutMs`.
 * @returns The budget, or `undefined` when there is none.
 */
export const resolveRenderBudgetMs = function resolveRenderBudgetMs(
	value: number | false | undefined
): number | undefined {
	if (value === false || value === Number.POSITIVE_INFINITY) {
		return undefined;
	}
	if (value === undefined || !Number.isFinite(value) || value < 0) {
		return DEFAULT_RESOLVE_TIMEOUT_MS;
	}
	return value;
};

const resolveMode = function resolveMode(
	options: ResolveRequestConsentOptions
): RequestConsentMode | undefined {
	if (options.mode) {
		return options.mode;
	}
	if (options.offline) {
		return 'offline';
	}
	if (options.manifest || options.manifestURL) {
		return 'manifest';
	}
	if (options.initURL || options.backendURL) {
		return 'hosted';
	}
	return undefined;
};

/**
 * The consent journey a render starts, or `undefined` for none. See
 * {@link ResolveRequestConsentOptions.journey}.
 *
 * @param options - The resolution options.
 * @param mode - How the policy is resolved.
 * @param base - The request-only state, for the stored choice.
 * @param read - The request facts, read only when a journey may start.
 * @returns The journey, with the site's hostname when known; `null` when
 *   this render resolves the page without one, so the browser must send
 *   none; `undefined` when the browser resolves the page itself and starts
 *   its own.
 */
const startServerJourney = function startServerJourney(
	options: ResolveRequestConsentOptions,
	mode: RequestConsentMode | undefined,
	base: RequestConsentState,
	read: () => { domain: string | undefined; speculative: boolean }
): SessionJourney | null | undefined {
	if (options.shared || !mode || mode === 'offline') {
		return undefined;
	}
	const scope = options.journey ?? 'page';
	// A manifest render reports only to an absolute backend; without one no
	// report would carry the id, and a save carrying it would link to nothing.
	const unreported =
		mode === 'manifest' &&
		!resolveSessionReportBackendURL({ backendURL: options.backendURL });
	if (scope === false || options.reportSessions === false || unreported) {
		return null;
	}
	const { domain, speculative } = read();
	// A prefetch or prerender is not reported either.
	const id = speculative ? undefined : createJourneyId();
	if (!id) {
		return null;
	}
	const journey: SessionJourney = {
		id,
		scope,
		// A persisted answer: a choice or a notice dismissal.
		storedChoice: Boolean(
			base.initialRecords?.choice || base.initialRecords?.noticeDismissal
		),
	};
	if (domain) {
		journey.domain = domain;
	}
	return journey;
};

/** Swallows a promise's outcome, for work handed to the platform. */
const settle = async function settle(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// The render already fell back; nothing waits on this result.
	}
};

const keepAlive = function keepAlive(
	waitUntil: ((task: Promise<void>) => void) | undefined,
	task: Promise<unknown>
): void {
	const settled = settle(task);
	try {
		waitUntil?.(settled);
	} catch {
		// Registration is best effort; the work runs either way.
	}
};

const isPath = (url: string): boolean =>
	url.startsWith('/') && !url.startsWith('//');

const trimSlash = (url: string): string =>
	url.endsWith('/') ? url.slice(0, -1) : url;

/** Whether `pathname` is `prefix` or below it, segment-aware. */
const isBelow = function isBelow(pathname: string, prefix: string): boolean {
	const normalized = trimSlash(prefix);
	return (
		normalized !== '' &&
		(pathname === normalized || pathname.startsWith(`${normalized}/`))
	);
};

/**
 * Origin an in-process path is placed on so the manifest cache can key it.
 * Never contacted; loopback so the cleartext rules treat it as local.
 */
const IN_PROCESS_ORIGIN = 'http://localhost';

/** Sends {@link IN_PROCESS_ORIGIN} URLs to an in-process fetch as paths. */
const toPathFetch = function toPathFetch(
	localFetch: ManifestFetch
): ManifestFetch {
	return (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		return localFetch(`${url.pathname}${url.search}`, init);
	};
};

/** A resolved upstream target and the fetch that reaches it. */
interface Target {
	/** Absolute URL, or the path for an in-process target. */
	url: string;
	fetch: ManifestFetch;
	/** Answered by the adapter's in-process fetch. */
	inProcess: boolean;
	/** Fetched over the network from the request's own origin. */
	sameOrigin: boolean;
}

/**
 * Resolves the server-side consent state for one request.
 *
 * Never throws and never rejects: an unresolvable URL, a target on the
 * app's own consent routes, a failed or slow upstream all return the
 * request-only state, and `onError` hears about it.
 *
 * @param options - The request facts and how to resolve the policy.
 * @returns The JSON-serializable state the client hydrates from.
 * @example
 * ```ts
 * const state = await resolveRequestConsent({
 *   adapter: '@c15t/example',
 *   backendURL: 'https://consent.example.com',
 *   mode: 'manifest',
 *   request: { headers: request.headers, url: request.url },
 * });
 * ```
 */
export const resolveRequestConsent = async function resolveRequestConsent(
	options: ResolveRequestConsentOptions
): Promise<RequestConsentState> {
	const { inputs, state: base } = readRequestConsent(options);
	const mode = resolveMode(options);
	const trust = options.trustForwardedHeaders === true;
	let visitorHeaders: Headers | undefined;
	const readVisitorHeaders = (): Headers => {
		visitorHeaders ??= toHeaders(options.request.headers);
		return visitorHeaders;
	};
	const requestOrigin = (): string | null =>
		resolveRequestOrigin({
			headers: options.request.headers,
			requestURL: options.request.url,
			trustForwardedHeaders: trust,
		});
	const journey = startServerJourney(options, mode, base, () => ({
		domain: journeyDomainFrom(requestOrigin()),
		speculative: isSpeculativeRequest(readVisitorHeaders()),
	}));
	const carry = function carry(
		state: RequestConsentState
	): RequestConsentState {
		const carried: RequestConsentState =
			options.experiment && !options.shared
				? { ...state, experiment: options.experiment }
				: state;
		// The browser adopts this id, even when the render fell back to the
		// request-only state: its own init then carries it. `null` tells it
		// this page has no journey.
		if (journey === undefined) {
			return carried;
		}
		return { ...carried, journey: journey && { id: journey.id } };
	};
	if (!mode || (options.shared && mode !== 'offline')) {
		return carry(base);
	}

	const budgetMs = resolveRenderBudgetMs(options.timeoutMs);
	const startedAt = Date.now();
	const remaining = (): number | undefined =>
		budgetMs === undefined
			? undefined
			: Math.max(0, budgetMs - (Date.now() - startedAt));
	// Set once the render stops waiting. The browser then resolves the view
	// and reports it, so the abandoned resolution must not report it too.
	let abandoned = false;
	const ownRoutes = options.ownRoutes ?? [DEFAULT_CONSENT_ROUTE_PREFIX];
	const configuredFetch = (): typeof globalThis.fetch =>
		options.fetch ?? globalThis.fetch.bind(globalThis);
	// The experiment arm goes along only while the visitor has no stored
	// choice: a visitor who already chose is not shown the banner, so is
	// not counted toward the arm.
	const arm =
		options.experiment && !options.shared && !base.initialRecords?.choice
			? experimentArmRef(options.experiment)
			: undefined;
	const isOwnRoute = function isOwnRoute(absolute: string): boolean {
		const origin = requestOrigin();
		let target: URL;
		try {
			target = new URL(absolute);
		} catch {
			return false;
		}
		return ownRoutes.some((route) => {
			if (isPath(route)) {
				return target.origin === origin && isBelow(target.pathname, route);
			}
			try {
				const own = new URL(route);
				return (
					target.origin === own.origin && isBelow(target.pathname, own.pathname)
				);
			} catch {
				return false;
			}
		});
	};

	const resolveTarget = function resolveTarget(url: string): Target {
		if (options.localFetch && isPath(url)) {
			return {
				fetch: options.localFetch,
				inProcess: true,
				sameOrigin: false,
				url,
			};
		}
		const absolute = resolveRequestBackendURL(url, {
			headers: options.request.headers,
			requestURL: options.request.url,
			trustForwardedHeaders: trust,
		});
		if (absolute && options.localFetch) {
			// A URL on this app's own origin is answered in-process too.
			const parsed = new URL(absolute);
			if (parsed.origin === requestOrigin()) {
				return {
					fetch: options.localFetch,
					inProcess: true,
					sameOrigin: false,
					url: `${parsed.pathname}${parsed.search}`,
				};
			}
		}
		if (!absolute) {
			throw new RequestConsentError(
				`${options.adapter}: ${url} could not be resolved for this request; pass an absolute URL or make sure the request URL or host header reaches the server.`,
				url
			);
		}
		if (isOwnRoute(absolute)) {
			throw new RequestConsentError(
				`${options.adapter}: ${absolute} is this app's own consent route; a server render does not fetch itself. Point the server at the upstream backend or manifest instead.`,
				absolute
			);
		}
		const sameOrigin = new URL(absolute).origin === requestOrigin();
		if (
			sameOrigin &&
			readHeader(options.request.headers, RENDER_REQUEST_HEADER) !== undefined
		) {
			throw new RequestConsentError(
				`${options.adapter}: this request came from a server render on this origin, so the render it started does not fetch ${absolute} again. A page answered that render's request; check that the backend URL reaches the backend.`,
				absolute
			);
		}
		return {
			fetch: configuredFetch() as ManifestFetch,
			inProcess: false,
			sameOrigin,
			url: absolute,
		};
	};

	/** Caller-named headers, minus cookies and hop-chain headers. */
	const namedHeaders = function namedHeaders(): Record<string, string> {
		const named: Record<string, string> = {};
		for (const name of options.forwardHeaders ?? []) {
			const lower = name.toLowerCase();
			if (lower === 'cookie' || CONSENT_PROXY_FORWARDING_HEADERS.has(lower)) {
				continue;
			}
			const value = readHeader(options.request.headers, lower);
			if (value) {
				named[lower] = value;
			}
		}
		return named;
	};

	/** The resolved inputs as the canonical consent request headers. */
	const inputHeaders = function inputHeaders(): Record<string, string> {
		const headers: Record<string, string> = {};
		if (inputs.country) {
			headers['x-c15t-country'] = inputs.country;
		}
		if (inputs.region) {
			headers['x-c15t-region'] = inputs.region;
		}
		if (inputs.language) {
			headers['accept-language'] = inputs.language;
		}
		if (inputs.gpc !== undefined) {
			headers['sec-gpc'] = inputs.gpc ? '1' : '0';
		}
		return headers;
	};

	const resolverInputs = (): ResolveInitFromManifestInputs => ({
		country: inputs.country ?? null,
		gpc: inputs.gpc,
		language: inputs.language ?? 'en',
		region: inputs.region ?? null,
	});

	/**
	 * Credentials for the manifest request: only caller-named headers and
	 * `cookieNames` cookies, and nothing identifying over cleartext.
	 */
	const manifestCredentials = function manifestCredentials(
		source: Target
	): Record<string, string> | undefined {
		const collected = namedHeaders();
		const cookie = readHeader(options.request.headers, 'cookie');
		const scoped =
			cookie && options.cookieNames
				? filterCookieHeader(cookie, options.cookieNames)
				: undefined;
		if (scoped) {
			collected.cookie = scoped;
		}
		const credentials = source.inProcess
			? collected
			: stripIdentityForCleartext(collected, source.url);
		return credentials && Object.keys(credentials).length > 0
			? credentials
			: undefined;
	};

	/** The manifest through the process cache, and what was sent for it. */
	const loadManifest = async function loadManifest(): Promise<{
		manifest: ConsentManifest;
		credentials: Record<string, string> | undefined;
	}> {
		if (options.manifest) {
			return { credentials: undefined, manifest: options.manifest };
		}
		const sourceURL =
			options.manifestURL ??
			(options.backendURL
				? `${trimSlash(options.backendURL)}/manifest`
				: undefined);
		if (!sourceURL) {
			throw new RequestConsentError(
				`${options.adapter}: pass backendURL or manifestURL.`,
				undefined
			);
		}
		const source = resolveTarget(sourceURL);
		const credentials = manifestCredentials(source);
		try {
			const { manifest } = await fetchCachedManifest({
				cache: options.cache,
				fetch: source.inProcess ? toPathFetch(source.fetch) : source.fetch,
				headers: credentials,
				init: options.manifestFetchInit,
				onBackgroundRevalidate: options.waitUntil,
				sourceURL: source.inProcess
					? `${IN_PROCESS_ORIGIN}${source.url}`
					: source.url,
				timeoutMs: remaining(),
			});
			return { credentials, manifest };
		} catch (error) {
			throw new RequestConsentError(
				`${options.adapter}: the manifest at ${source.url} could not be read.`,
				source.url,
				error
			);
		}
	};

	const loadGvlFor = function loadGvlFor(manifest: ConsentManifest) {
		const reference = manifest.iab?.gvl;
		if (!reference) {
			return undefined;
		}
		return (language: string) =>
			options.fetchGvl
				? options.fetchGvl({ fetch: configuredFetch(), language, reference })
				: fetchCachedGvl({
						fetch: options.fetch as ManifestFetch | undefined,
						headers: c15tProtocolHeaders,
						label: options.adapter,
						language,
						url: reference.url,
					});
	};

	const deferList = function deferList(
		payload: InitOutput,
		listURL: string
	): InitOutput {
		return options.gvlRoute
			? deferInitGvlToRoute(payload, options.gvlRoute)
			: (deferInitGvl(payload, listURL) as InitOutput);
	};

	const resolveFromManifest =
		async function resolveFromManifest(): Promise<RequestConsentState> {
			const { credentials, manifest } = await loadManifest();
			const reference = manifest.iab?.gvl;
			const payload = await resolveConsentInit({
				inputs: resolverInputs(),
				loadGvl: loadGvlFor(manifest),
				manifest,
				report:
					options.reportSessions === false
						? undefined
						: {
								abandoned: () => abandoned,
								adapter: options.adapter,
								// As configured, not request-resolved: a relative backend
								// is this app's proxy, which means no report.
								backendURL: options.backendURL,
								experiment: arm,
								fetch: options.fetch,
								headers: readVisitorHeaders(),
								journey: journey ?? undefined,
								source: 'render',
								waitUntil: options.waitUntil,
							},
			});
			// The list stays inline when the browser could not fetch it the same
			// way: a caller's own fetch, or a manifest read with credentials.
			const deferred =
				reference && !options.fetch && !options.fetchGvl && !credentials
					? deferList(payload, reference.url)
					: payload;
			return mergeInitResponseIntoKernelConfig(
				base,
				mapInitOutputToInitResponse(
					deferred,
					inputs.gpc === undefined ? {} : { 'sec-gpc': inputs.gpc ? '1' : '0' },
					{ producerContract: POLICY_CONTRACT_VERSION }
				)
			);
		};

	/**
	 * What identifies the visitor on a hosted `/init`, only over a secure
	 * hop: caller-named headers, the consent cookie for a remote backend
	 * (the app's own routes read none), and the trusted client IP.
	 */
	const identityHeaders = function identityHeaders(
		target: Target
	): Record<string, string> {
		if (!(target.inProcess || !isCleartextRemoteURL(target.url))) {
			return {};
		}
		const headers = namedHeaders();
		const cookie = target.inProcess
			? undefined
			: (options.request.cookie ??
				readHeader(options.request.headers, 'cookie'));
		const consentCookie = cookie
			? filterCookieHeader(cookie, [
					resolveStorageKeys(options.storage).consent,
				])
			: undefined;
		if (consentCookie) {
			headers.cookie = consentCookie;
		}
		const clientIp = trust
			? getIpAddress(readVisitorHeaders(), { masking: false })
			: null;
		if (clientIp) {
			headers['x-forwarded-for'] = clientIp;
		}
		return headers;
	};

	/**
	 * A network `/init` names the page's origin, as the browser's own would,
	 * so the backend's session report gets the journey's domain. An Origin
	 * the request already sets is kept, and an in-process route reads the
	 * host from the request itself.
	 */
	const nameThePage = function nameThePage(
		headers: Record<string, string>,
		target: Target
	): void {
		if (!journey || target.inProcess || headers.origin !== undefined) {
			return;
		}
		const origin = requestOrigin();
		if (origin) {
			headers.origin = origin;
		}
	};

	const resolveFromHosted =
		async function resolveFromHosted(): Promise<RequestConsentState> {
			const initURL =
				options.initURL ??
				(options.backendURL ? `${trimSlash(options.backendURL)}/init` : '');
			const target = resolveTarget(initURL);
			const headers: Record<string, string> = { accept: 'application/json' };
			const userAgent = readHeader(options.request.headers, 'user-agent');
			if (userAgent) {
				headers['user-agent'] = userAgent;
			}
			const identity = identityHeaders(target);
			// A remote `x-forwarded-for` is the trusted hop chain, not a
			// credential; the cookie and named headers are.
			const identifying =
				identity.cookie !== undefined ||
				Object.keys(identity).some(
					(name) => name !== 'cookie' && name !== 'x-forwarded-for'
				);
			Object.assign(headers, identity);
			Object.assign(headers, inputHeaders());
			for (const [name, value] of Object.entries(options.initHeaders ?? {})) {
				const lower = name.toLowerCase();
				if (
					(CONSENT_REQUEST_HEADER_NAMES as readonly string[]).includes(lower)
				) {
					headers[lower] = value;
				}
			}
			if (arm) {
				headers[CONSENT_EXPERIMENT_HEADER] = formatExperimentHeader(arm);
			}
			nameThePage(headers, target);
			Object.assign(headers, c15tProtocolHeaders);
			if (target.sameOrigin) {
				headers[RENDER_REQUEST_HEADER] = '1';
			}
			const left = remaining();
			if (target.inProcess && left !== undefined) {
				// An in-process route may not see an abort; it bounds its own
				// upstream waits by this header instead.
				headers[CONSENT_ROUTE_TIMEOUT_HEADER] = String(Math.floor(left));
			}
			const init: RequestInit = { cache: 'no-store', headers, method: 'GET' };
			if (left !== undefined) {
				// `/init` answers one visitor and is never cached, so a request the
				// render gave up on has nothing left to deliver. An in-process
				// route reads the abort as "the render went away" and leaves the
				// session report to the browser's own init.
				init.signal = AbortSignal.timeout(left);
			}
			let response: Response;
			let payload: InitOutput;
			try {
				// The backend's own session report for this `/init` then carries
				// the journey. The deferred list below keeps the plain URL.
				response = await target.fetch(
					journey ? appendJourneyParams(target.url, journey) : target.url,
					init
				);
				if (!response.ok) {
					throw new Error(
						`/init responded ${response.status} ${response.statusText}`
					);
				}
				payload = (await response.json()) as InitOutput;
			} catch (error) {
				throw new RequestConsentError(
					`${options.adapter}: the request to ${target.url} failed (${error instanceof Error ? error.message : String(error)}).`,
					target.url,
					error
				);
			}
			// A reference makes the browser ask the same `/init` for the list;
			// it cannot replay a caller's fetch, cookie or private headers.
			const deferred =
				options.fetch || identifying
					? payload
					: (deferInitGvl(payload, target.url, 'init', headers) as InitOutput);
			return mergeInitResponseIntoKernelConfig(
				base,
				mapInitOutputToInitResponse(deferred, headers, {
					producerContract: readProducerPolicyContract(response.headers),
				})
			);
		};

	const resolveOffline =
		async function resolveOffline(): Promise<RequestConsentState> {
			const transport = createOfflineTransport(options.offline ?? {});
			const response = await transport.init?.({
				overrides: base.initialOverrides ?? {},
				user: base.initialUser ?? null,
			});
			return mergeInitResponseIntoKernelConfig(base, response ?? undefined);
		};

	const run = (): Promise<RequestConsentState> => {
		switch (mode) {
			case 'manifest':
				return resolveFromManifest();
			case 'offline':
				return resolveOffline();
			default:
				return resolveFromHosted();
		}
	};

	let task: Promise<RequestConsentState> | undefined;
	try {
		task = run();
		return carry(await withResolutionBudget(task, remaining()));
	} catch (error) {
		// Out of budget, whether the race or the request's own abort said so.
		const expired =
			(error instanceof ManifestUnavailableError &&
				error.reason === 'timeout') ||
			remaining() === 0;
		if (expired) {
			abandoned = true;
			if (task) {
				// A manifest fill keeps going and serves the next render.
				keepAlive(options.waitUntil, task);
			}
		}
		options.onError?.(
			error,
			error instanceof RequestConsentError ? error.url : undefined
		);
		return carry(base);
	}
};
