/**
 * Nitro server routes for manifest mode: h3 event handlers around the
 * consent route handler in `@c15t/core/server`, which owns the `/manifest`
 * and `/init` behaviour for every adapter (including the fallback to the
 * backend's own `/init` and the render budget the SSR plugin sends in
 * `x-c15t-timeout-ms`). This module only converts between h3 and the Web
 * `Request`/`Response`, reads the c15t runtime config, sends relative
 * backend URLs through Nitro's in-process fetch, and hands detached work to
 * the preset's `waitUntil`.
 */
import { createConsentRouteHandler, readWaitUntil } from '@c15t/core/server';
import type {
	ConsentRouteHandler,
	ConsentRouteName,
	ManifestFetch,
} from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';
import { defineEventHandler, sendWebResponse, toWebRequest } from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';

import type { ConsentConfig } from '../config';

interface C15TNitroRuntimeConfig {
	c15t?: Record<string, unknown>;
	public?: {
		c15t?: Record<string, unknown>;
	};
}

type RuntimeConfigReader = (event?: H3Event<EventHandlerRequest>) => unknown;

interface RouteDependencies {
	/**
	 * Nitro's fetch: dispatches a path in-process and an absolute URL over
	 * the network, so a relative `backendURL` such as `/api/self-host`
	 * resolves without a host.
	 */
	fetch: ManifestFetch;
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

const readConsentConfig = function readConsentConfig(
	runtimeConfig: unknown
): ConsentConfig & { manifestSnapshot?: ConsentManifest } {
	const config =
		typeof runtimeConfig === 'object' && runtimeConfig !== null
			? (runtimeConfig as C15TNitroRuntimeConfig)
			: {};
	return {
		...(config.public?.c15t ?? {}),
		...(config.c15t ?? {}),
	} as ConsentConfig & { manifestSnapshot?: ConsentManifest };
};

/**
 * One h3 handler for a consent route. The core handler is rebuilt only when
 * Nitro hands back a different runtime config object.
 */
const createRoute = function createRoute(
	dependencies: RouteDependencies,
	route: ConsentRouteName
) {
	const built: {
		current?: { runtimeConfig: unknown; handle: ConsentRouteHandler };
	} = {};
	const handlerFor = function handlerFor(
		runtimeConfig: unknown
	): ConsentRouteHandler {
		const { current } = built;
		if (current && current.runtimeConfig === runtimeConfig) {
			return current.handle;
		}
		const config = readConsentConfig(runtimeConfig);
		const handle = createConsentRouteHandler({
			adapter: '@c15t/vue',
			backendURL: config.backendURL,
			fetch: dependencies.fetch,
			manifest: config.manifestSnapshot,
			manifestURL: config.manifestURL,
			reportSessions: config.reportSessions,
		});
		built.current = { handle, runtimeConfig };
		return handle;
	};
	return defineEventHandler(async (event) => {
		const handle = handlerFor(dependencies.useRuntimeConfig(event));
		const onBackgroundRevalidate =
			dependencies.onBackgroundRevalidate ?? waitUntilFromEvent;
		const response = await handle(toWebRequest(event), {
			localFetch: dependencies.fetch,
			route,
			waitUntil: (task) => onBackgroundRevalidate(task, event),
		});
		return sendWebResponse(event, response);
	});
};

/**
 * `GET /api/c15t/manifest`: the backend manifest with its cache headers.
 * A plain handler, not `defineCachedEventHandler`: the manifest is geo- and
 * language-independent, so the backend's cache headers are forwarded
 * verbatim.
 */
export const createManifestRoute = function createManifestRoute(
	dependencies: RouteDependencies
) {
	return createRoute(dependencies, 'manifest');
};

/** `GET /api/c15t/init`: the visitor's init, resolved from the manifest. */
export const createInitRoute = function createInitRoute(
	dependencies: RouteDependencies
) {
	return createRoute(dependencies, 'init');
};
