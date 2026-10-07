import type {
	ExperimentState,
	KernelConfig,
	ServerExperiment,
} from '@c15t/core';
import type { ConsentManifest } from '@c15t/schema/types';

/**
 * How the request is read: the consent cookie name and explicit
 * geo/language overrides. Shared by {@link ResolveConsentOptions},
 * `c15tHandle` and `loadConsent`.
 */
export interface ConsentRequestOptions {
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t` — the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
	 */
	cookieName?: string;
	/** Force the resolved country, ignoring geo headers. */
	country?: string;
	/** Force the resolved region, ignoring geo headers. */
	region?: string;
	/** Force the resolved language, ignoring `Accept-Language`. */
	language?: string;
}

/**
 * The visitor's resolved consent state: the JSON-serializable subset of
 * `KernelConfig` the server helpers return and the provider's `prefetch`
 * prop accepts. `transport` is omitted because it holds functions, which a
 * SvelteKit `load` cannot serialize.
 */
export type ConsentState = Omit<KernelConfig, 'transport'> & ExperimentState;

/** Options for `resolveConsent`. */
export interface ResolveConsentOptions extends ConsentRequestOptions {
	/** The incoming request headers. */
	headers: Headers;
	/** Request clock shared with the client seed. */
	now?: number;
	/** Cookie header to read instead of `headers.get('cookie')`. */
	cookieHeader?: string | null;
	/**
	 * c15t backend base URL, absolute or origin-relative. When set, the
	 * helper calls `${backendURL}/init` and folds the response into the
	 * returned state when no manifest is supplied. With a manifest, an
	 * absolute backend URL receives session reports. Without either, only
	 * cookies and headers are read.
	 *
	 * A relative URL resolves against `requestURL`, or the `host` header
	 * when there is none. `x-forwarded-*` headers are ignored unless
	 * `trustForwardedHeaders` is set.
	 */
	backendURL?: string;
	/** Deployment-bound manifest. Resolves locally using this visitor's inputs. */
	manifest?: ConsentManifest;
	/** Report manifest resolutions to the backend. @default true */
	reportSessions?: boolean;
	/**
	 * Hands session reports to the host's `waitUntil` so they outlive the response.
	 * The promise never rejects. Defaults to detached work without registration.
	 */
	onBackgroundRevalidate?: (task: Promise<void>) => void;
	/**
	 * The URL SvelteKit resolved the request under (`event.url`). A
	 * relative `backendURL` resolves against its origin. `loadConsent`
	 * passes it for you.
	 */
	requestURL?: string | URL;
	/**
	 * Resolve a relative `backendURL` against the request's `forwarded`,
	 * `x-forwarded-host` and `x-forwarded-proto` headers. Any client can
	 * send those, so set this only behind a proxy that sets them and drops
	 * incoming ones. Setting the origin where SvelteKit builds `event.url`
	 * is usually the better place to configure this: `paths.origin` in
	 * SvelteKit 3 (adapter-node's `ORIGIN` in SvelteKit 2, which SvelteKit 3
	 * ignores), or the adapter's `HOST_HEADER` and `PROTOCOL_HEADER`. Also
	 * forwards the visitor IP to the backend as `x-forwarded-for`, which is
	 * skipped otherwise.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;
	/** Fetch implementation for `/init`, session reports, and IAB vendor lists. */
	fetch?: typeof globalThis.fetch;
	/**
	 * Default request fetch supplied by the SvelteKit adapter.
	 * @internal
	 */
	frameworkFetch?: typeof globalThis.fetch;
	/**
	 * Extra request headers to forward to the backend, such as a token a
	 * private backend needs. They travel only over `https`, to a loopback
	 * host, or in-process, like the consent cookie (the only cookie that is
	 * ever forwarded). `cookie` and `forwarded`/`x-forwarded-*` cannot be
	 * named here.
	 */
	forwardHeaders?: string[];
	/**
	 * Longest to wait for the backend `/init`, in milliseconds. When it runs
	 * out the request-only state is returned and the browser resolves the
	 * policy after hydration. `false` (or `Infinity`) waits for the upstream;
	 * any other value that is not a finite, non-negative number uses the
	 * default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
	/**
	 * The banner experiment with the arm this request runs, from your
	 * feature flag. While the visitor has no stored choice, the server's
	 * `/init` carries the arm, so the backend counts the visitors each arm's
	 * banner was owed to. The returned state carries the experiment to the
	 * provider, so the client needs no `experiment` option of its own.
	 *
	 * @example
	 * ```ts
	 * resolveConsent({ ...request, experiment: { ...bannerShape, arm } });
	 * ```
	 */
	experiment?: ServerExperiment;
}
