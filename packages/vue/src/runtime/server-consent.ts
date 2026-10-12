import type { ServerExperiment } from '@c15t/core';
/**
 * Server-side consent resolution for the Nuxt plugin. Server-only: the
 * plugin loads it behind `import.meta.server`, so the resolver, its
 * translations and the server snapshot never reach the client bundle.
 *
 * The rules (request read, forwarding, budget, merge, experiment arm) live
 * in `resolveRequestConsent` from `@c15t/core/server`, shared with every
 * other adapter. This module supplies what Nuxt knows about the request.
 */
import { readWaitUntil, resolveRequestConsent } from '@c15t/core/server';
import type {
	ManifestFetch,
	RequestConsentState,
	ResolveRequestConsentOptions,
} from '@c15t/core/server';

import snapshot from '#c15t/server-manifest-snapshot';

import type { RuntimeConsentConfig } from './kernel';
import { readNuxtMode, readNuxtRoutePrefix } from './nuxt-mode';
import type { NuxtConsentModeConfig } from './nuxt-mode';

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

type ModeOptions = Pick<
	ResolveRequestConsentOptions,
	'backendURL' | 'initHeaders' | 'initURL' | 'manifest' | 'manifestURL' | 'mode'
>;

/**
 * Where the render asks for the policy. `manifest()` with a consent route
 * resolves through that route in-process, which keeps its fallback to the
 * backend's `/init`. Without the route it resolves from the snapshot, or
 * the manifest read at runtime. `hosted()` asks the backend's `/init`.
 */
const readModeOptions = function readModeOptions(
	config: Partial<RuntimeConsentConfig> & NuxtConsentModeConfig
): ModeOptions {
	const mode = readNuxtMode(config);
	if (mode.type === 'hosted') {
		return {
			backendURL: mode.backendURL ?? config.backendURL,
			initHeaders: mode.headers,
			mode: 'hosted',
		};
	}
	const routePrefix = readNuxtRoutePrefix(config);
	if (routePrefix !== undefined) {
		return { initURL: `${routePrefix}/init`, mode: 'hosted' };
	}
	return {
		backendURL: config.backendURL,
		manifest: snapshot,
		manifestURL: mode.type === 'manifest' ? mode.manifestURL : undefined,
		mode: 'manifest',
	};
};

/**
 * Resolves the visitor's consent state for a Nuxt server render.
 *
 * @param config - The merged c15t runtime config.
 * @param request - The request facts from Nuxt's composables.
 * @returns The serializable state the client hydrates from.
 */
export const resolveNuxtConsent = async function resolveNuxtConsent(
	config: Partial<RuntimeConsentConfig> & NuxtConsentModeConfig,
	request: NuxtConsentRequest
): Promise<RequestConsentState> {
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
		...readModeOptions(config),
		adapter: '@c15t/vue',
		experiment,
		localFetch,
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
