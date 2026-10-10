/**
 * The Nitro consent route for `manifest()` mode: one h3 handler, mounted at
 * `${routePrefix}/**`, around the consent route handler in
 * `@c15t/core/server`. Core owns the `/manifest` and `/init` behaviour for
 * every adapter (including the fallback to the backend's own `/init` and
 * the render budget the SSR plugin sends in `x-c15t-timeout-ms`). This
 * module only converts between h3 and the Web `Request`/`Response`, reads
 * the c15t runtime config, sends relative backend URLs through Nitro's
 * in-process fetch, and hands detached work to the preset's `waitUntil`.
 */
import { createConsentRouteHandler, readWaitUntil } from '@c15t/core/server';
import type { ConsentRouteHandler, ManifestFetch } from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';
import { defineEventHandler, sendWebResponse, toWebRequest } from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';

import type { ConsentConfig } from '../config';
import { readNuxtMode, readNuxtRoutePrefix } from '../nuxt-mode';
import type { NuxtConsentModeConfig } from '../nuxt-mode';

interface C15TNitroRuntimeConfig {
	c15t?: Record<string, unknown>;
	public?: {
		c15t?: Record<string, unknown>;
	};
}

type RuntimeConfigReader = (event?: H3Event<EventHandlerRequest>) => unknown;

type RouteConfig = ConsentConfig & NuxtConsentModeConfig;

interface RouteDependencies {
	/**
	 * Nitro's fetch: dispatches a path in-process and an absolute URL over
	 * the network, so a relative `backendURL` such as `/api/self-host`
	 * resolves without a host.
	 */
	fetch: ManifestFetch;
	/**
	 * The manifest the build downloaded, or the `snapshot` the mode names.
	 * Without one the route reads the manifest at runtime.
	 */
	manifest?: ConsentManifest;
	useRuntimeConfig: RuntimeConfigReader;
	/**
	 * Receives the promise of detached work started by a request (a
	 * background manifest revalidation, a session report, a fill the render
	 * budget stopped waiting for), with that request's event. Defaults to
	 * {@link waitUntilFromEvent}: Nitro attaches the platform's `waitUntil`
	 * to the event on request-scoped presets (Vercel, Cloudflare, Netlify),
	 * and nothing is registered where there is none. The promise never
	 * rejects.
	 */
	onBackgroundRevalidate?: (
		revalidation: Promise<void>,
		event: H3Event<EventHandlerRequest>
	) => void;
}

/**
 * Hands a promise to the `waitUntil` Nitro places on the event when the
 * deployment preset provides one, so a background refresh outlives the
 * response on runtimes that would otherwise cancel it.
 */
export const waitUntilFromEvent = function waitUntilFromEvent(
	revalidation: Promise<void>,
	event: H3Event<EventHandlerRequest>
): void {
	readWaitUntil(event)?.(revalidation);
};

/**
 * The public `c15t` config with the private one over it. A private value
 * that is empty or unset leaves the public one: the module writes an empty
 * private `backendURL`, so `NUXT_PUBLIC_C15T_BACKEND_URL` alone moves this
 * route, and `NUXT_C15T_BACKEND_URL` gives it a server-only address.
 */
const readConsentConfig = function readConsentConfig(
	runtimeConfig: unknown
): RouteConfig {
	const config =
		typeof runtimeConfig === 'object' && runtimeConfig !== null
			? (runtimeConfig as C15TNitroRuntimeConfig)
			: {};
	const serverOnly = Object.fromEntries(
		Object.entries(config.c15t ?? {}).filter(
			([, value]) => value !== '' && value !== undefined && value !== null
		)
	);
	return {
		...(config.public?.c15t ?? {}),
		...serverOnly,
	} as RouteConfig;
};

/**
 * The path below the route prefix (`init`, `manifest`), or `undefined` to
 * let the core handler read the last URL segment.
 */
const readSubpath = function readSubpath(
	event: H3Event<EventHandlerRequest>,
	request: Request,
	prefix: string | undefined
): string | undefined {
	const wildcard = (event.context.params as Record<string, string> | undefined)
		?._;
	if (typeof wildcard === 'string') {
		return wildcard;
	}
	const { pathname } = new URL(request.url);
	if (prefix && pathname.startsWith(`${prefix}/`)) {
		return pathname.slice(prefix.length + 1);
	}
	return undefined;
};

/**
 * `GET ${routePrefix}/manifest` and `GET ${routePrefix}/init`: the backend
 * manifest with its cache headers, and the visitor's init resolved from
 * it. The core handler is rebuilt only when Nitro hands back a different
 * runtime config object.
 *
 * @param dependencies - Nitro's fetch and runtime config, and the snapshot.
 * @returns The h3 handler the module mounts at `${routePrefix}/**`.
 * @internal
 */
export const createConsentRoute = function createConsentRoute(
	dependencies: RouteDependencies
) {
	const built: {
		current?: {
			runtimeConfig: unknown;
			handle: ConsentRouteHandler;
			prefix: string | undefined;
		};
	} = {};
	const handlerFor = function handlerFor(runtimeConfig: unknown) {
		const { current } = built;
		if (current && current.runtimeConfig === runtimeConfig) {
			return current;
		}
		const config = readConsentConfig(runtimeConfig);
		const mode = readNuxtMode(config);
		const handle = createConsentRouteHandler({
			adapter: '@c15t/vue',
			backendURL: config.backendURL,
			fetch: dependencies.fetch,
			manifest: dependencies.manifest,
			// With browser resolution, `manifestURL` is what the browser
			// fetches instead of this route.
			manifestURL:
				mode.type === 'manifest' && mode.resolve !== 'browser'
					? mode.manifestURL
					: undefined,
			reportSessions: config.reportSessions,
		});
		const next = { handle, prefix: readNuxtRoutePrefix(config), runtimeConfig };
		built.current = next;
		return next;
	};
	return defineEventHandler(async (event) => {
		const { handle, prefix } = handlerFor(dependencies.useRuntimeConfig(event));
		const onBackgroundRevalidate =
			dependencies.onBackgroundRevalidate ?? waitUntilFromEvent;
		const request = toWebRequest(event);
		const response = await handle(request, {
			localFetch: dependencies.fetch,
			path: readSubpath(event, request, prefix),
			waitUntil: (task) => onBackgroundRevalidate(task, event),
		});
		return sendWebResponse(event, response);
	});
};
