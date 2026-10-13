/**
 * The Nitro v2 consent route: converts between h3 v1 events and the Web
 * `Request`/`Response` the shared consent route handles.
 */
import type { ManifestFetch } from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';
import { defineEventHandler, sendWebResponse, toWebRequest } from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';

import { createConsentRouteResponder } from './consent-route-handler';

interface RouteDependencies {
	/**
	 * Nitro's fetch: dispatches a path in-process and an absolute URL over
	 * the network, so a relative `backendURL` such as `/api/self-host`
	 * resolves without a host.
	 */
	fetch: ManifestFetch;
	manifest?: ConsentManifest;
	useRuntimeConfig: (event?: H3Event<EventHandlerRequest>) => unknown;
	onBackgroundRevalidate?: (
		revalidation: Promise<void>,
		event: H3Event<EventHandlerRequest>
	) => void;
}

/**
 * The h3 v1 handler the module mounts at `${routePrefix}/**` on Nitro v2.
 *
 * @param dependencies - Nitro's fetch and runtime config, and the snapshot.
 * @returns The h3 handler.
 * @internal
 */
export const createConsentRoute = function createConsentRoute(
	dependencies: RouteDependencies
) {
	const respond = createConsentRouteResponder(dependencies);
	return defineEventHandler(async (event) => {
		const response = await respond(event, toWebRequest(event));
		return sendWebResponse(event, response);
	});
};
