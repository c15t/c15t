import { c15tProtocolHeaders } from '@c15t/core';
import { createConsentRouteHandler } from '@c15t/core/server';
import type { ConsentRouteFetchGvl } from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';

import type { ConsentConfig } from './config';
import { isConsentConfig } from './config';

const DEFAULT_MANIFEST_REVALIDATE_SECONDS = 300;

type NextFetchInit = RequestInit & {
	next?: {
		revalidate?: number | false;
		tags?: string[];
	};
};

export interface NextConsentManifestHandlersOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://your-project.inth.app`. Pass this or `manifestURL`.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `backendURL + "/manifest"`. Pass this or
	 * `backendURL`.
	 */
	manifestURL?: string;
	/** Deployment-bound manifest. Takes precedence over upstream URLs. */
	manifest?: ConsentManifest;

	/**
	 * A `defineConsentConfig` result. Only its `backendURL` is read, and an
	 * explicit `backendURL` wins. Its `manifestURL` and `initURL` are the
	 * routes these handlers serve, so they are never fetched.
	 */
	config?: ConsentConfig;

	/**
	 * Resolve a relative `backendURL` or `manifestURL` against the request's
	 * `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers instead
	 * of the request URL. Any client can send those headers, so set this
	 * only behind a proxy that sets them and drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Next.js Data Cache lifetime for the manifest fetch, in seconds, or
	 * `false` to skip the Data Cache.
	 *
	 * @default 300
	 */
	manifestRevalidateSeconds?: number | false;

	fetch?: typeof globalThis.fetch;

	/**
	 * Receives the promise of detached work a request started (a background
	 * manifest revalidation, a session report, or the rest of a request
	 * whose client went away), so the host can keep it alive past the
	 * response on runtimes that stop detached work once a response is sent.
	 * Called inside the handler, so `after` from `next/server` (Next 15.1
	 * and later; 15.0 exposes it as `unstable_after`) can be used directly.
	 * The promise never rejects.
	 *
	 * @example
	 * ```ts
	 * import { after } from 'next/server';
	 *
	 * createNextConsentRouteHandlers({
	 *   ...consentConfig,
	 *   onBackgroundRevalidate: (refresh) => after(() => refresh),
	 * });
	 * ```
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;

	/**
	 * Report each init the route resolves to the backend's `POST /sessions`,
	 * server-to-server and detached from the response, so the backend still
	 * counts visitors it never served `/init` to. The report is handed to
	 * `onBackgroundRevalidate` like a manifest refresh. Set `false` to send
	 * none.
	 *
	 * @default true
	 */
	reportSessions?: boolean;

	/**
	 * Loads the Global Vendor List for IAB policies. Defaults to the shared
	 * server cache, with a deadline on the upstream request.
	 */
	fetchGvl?: ConsentRouteFetchGvl;
}

/**
 * The upstream manifest request as the App Router sees it: JSON with the
 * c15t protocol headers, and a `next.revalidate` hint for the Data Cache.
 *
 * @param options - Handler options; reads `manifestRevalidateSeconds`.
 * @returns The `fetch` init for the manifest request.
 */
export const createManifestFetchInit = function createManifestFetchInit(
	options: NextConsentManifestHandlersOptions = {}
): NextFetchInit {
	return {
		headers: { accept: 'application/json', ...c15tProtocolHeaders },
		method: 'GET',
		next: {
			revalidate:
				options.manifestRevalidateSeconds === false
					? 0
					: (options.manifestRevalidateSeconds ??
						DEFAULT_MANIFEST_REVALIDATE_SECONDS),
		},
	};
};

/**
 * Handler options from either the explicit options bag or a
 * `defineConsentConfig` result.
 *
 * A config's `manifestURL` and `initURL` name the same-origin routes these
 * handlers serve, so only `backendURL` carries over; forwarding
 * `manifestURL` would make the manifest route fetch itself.
 */
const toHandlerOptions = function toHandlerOptions(
	options: NextConsentManifestHandlersOptions | ConsentConfig
): NextConsentManifestHandlersOptions {
	if (!isConsentConfig(options)) {
		return options;
	}
	const { initURL, manifestURL, ...rest } = options as ConsentConfig &
		NextConsentManifestHandlersOptions;
	void initURL;
	void manifestURL;
	return rest;
};

/**
 * Build the App Router route handlers for the consent routes.
 *
 * @param optionsOrConfig - Handler options with `backendURL`, `config` or
 * `manifestURL`, or a `defineConsentConfig` result. From a config only
 * `backendURL` is used: its `manifestURL` and `initURL` are the routes these
 * handlers serve. Accepts the same `ConsentManifestOptions` object as
 * `resolveConsent`.
 * @returns `GET` for the init route and `manifestGET` for the manifest route.
 * Each handler throws when no `manifest`, backend URL or `manifestURL` is set.
 * @example
 * ```ts
 * // app/api/consent/manifest/route.ts
 * import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/consent.config';
 *
 * export const { manifestGET: GET } =
 *   createNextConsentRouteHandlers(consentConfig);
 * ```
 */
export const createNextConsentRouteHandlers =
	function createNextConsentRouteHandlers(
		optionsOrConfig: NextConsentManifestHandlersOptions | ConsentConfig
	) {
		const options = toHandlerOptions(optionsOrConfig);
		// Two cache layers on purpose. `next.revalidate` reaches the App Router
		// Data Cache; the shared in-process cache covers the Pages Router and
		// any runtime without one, and adds ETag revalidation on top. The
		// in-process cache sends the headers itself, so only the hint goes.
		const { next } = createManifestFetchInit(options);
		const handle = createConsentRouteHandler({
			adapter: '@c15t/nextjs',
			backendURL: options.backendURL ?? options.config?.backendURL,
			fetch: options.fetch,
			fetchGvl: options.fetchGvl,
			manifest: options.manifest,
			manifestFetchInit: { next } as NextFetchInit,
			manifestURL: options.manifestURL,
			reportSessions: options.reportSessions,
			trustForwardedHeaders: options.trustForwardedHeaders,
		});
		const waitUntil = options.onBackgroundRevalidate;
		return {
			GET(request: Request): Promise<Response> {
				return handle(request, { route: 'init', waitUntil });
			},
			manifestGET(request: Request): Promise<Response> {
				return handle(request, { route: 'manifest', waitUntil });
			},
		};
	};

export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';
export type { ConsentManifestOptions } from './server';
