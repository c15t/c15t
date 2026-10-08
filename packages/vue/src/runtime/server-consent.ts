import type { ServerExperiment } from '@c15t/core';
/**
 * Server-side consent resolution for the Nuxt plugin. Server-only: the
 * plugin loads it behind `import.meta.server`, so the resolver and its
 * translations never reach the client bundle.
 *
 * The rules (request read, forwarding, budget, merge, experiment arm) live
 * in `resolveRequestConsent` from `@c15t/core/server`, shared with every
 * other adapter. This module supplies what Nuxt knows about the request.
 */
import { readWaitUntil, resolveRequestConsent } from '@c15t/core/server';
import type { ManifestFetch, RequestConsentState } from '@c15t/core/server';

import type { RuntimeConsentConfig } from './kernel';
import { isServerManifestModeEnabled, resolveNuxtInitRoute } from './manifest';

/** What the plugin read about the request with Nuxt's own composables. */
export interface NuxtConsentRequest {
	/** `useRequestHeaders()`. */
	headers: Record<string, string | undefined>;
	/** `useRequestURL()`. */
	url?: URL | string;
	/**
	 * `useRequestEvent()`: its `fetch` answers this app's routes in-process
	 * (Nitro's local fetch), and its `waitUntil` keeps detached work alive.
	 */
	event?: { fetch?: unknown; waitUntil?: unknown } | null;
}

/**
 * Resolves the visitor's consent state for a Nuxt server render: through
 * the app's own init route in-process in server manifest mode (which keeps
 * that route's fallback to backend `/init`), otherwise against the backend
 * `/init`.
 *
 * @param config - The merged c15t runtime config.
 * @param request - The request facts from Nuxt's composables.
 * @returns The serializable state the client hydrates from.
 */
export const resolveNuxtConsent = async function resolveNuxtConsent(
	config: Partial<RuntimeConsentConfig>,
	request: NuxtConsentRequest
): Promise<RequestConsentState> {
	const serverManifest = isServerManifestModeEnabled(config);
	const experiment =
		config.experiment?.arm === undefined
			? undefined
			: (config.experiment as ServerExperiment);
	const localFetch =
		typeof request.event?.fetch === 'function'
			? (request.event.fetch as ManifestFetch)
			: undefined;
	// The experiment rides along for the arm rule only; the Vue kernel seeds
	// the experiment from its own config.
	const { experiment: _carried, ...state } = await resolveRequestConsent({
		adapter: '@c15t/vue',
		backendURL: serverManifest ? undefined : config.backendURL,
		experiment,
		initURL: serverManifest
			? resolveNuxtInitRoute(config as RuntimeConsentConfig)
			: undefined,
		localFetch,
		mode: 'hosted',
		// Off here means the page has no journey: the state says so and the
		// browser sends none.
		reportSessions: config.reportSessions,
		request: { headers: request.headers, url: request.url },
		storage: config.storageConfig,
		timeoutMs: config.timeoutMs,
		waitUntil: readWaitUntil(request.event),
	});
	return state;
};
