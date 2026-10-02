import type { ManifestFetch, ManifestSourceConfig } from '@c15t/core/server';
import type { ConsentRequestHeaderInputs } from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import type { ConsentState } from '../server/types';

export type { ConsentRequestOptions, ConsentState } from '../server/types';

/**
 * What {@link c15tHandle} stores on `event.locals.c15t`.
 *
 * `config` is the serializable {@link ConsentState} to hand the provider as
 * `prefetch`; `inputs` is the normalized geo/language/GPC context the handle
 * derived from the request, kept so downstream loads and route handlers do
 * not re-parse headers.
 */
export interface C15tLocals {
	/** Consent state seeded from the consent cookie and request inputs. */
	config: ConsentState;
	/** Normalized country / region / language / GPC for this request. */
	inputs: ConsentRequestInputs;
	/**
	 * The cookie name the handle actually read, when it was given one.
	 * `loadConsent` falls back to it so a per-call geo override does not
	 * silently re-read the default `c15t` key and lose persisted consent.
	 */
	cookieName?: string;
}

/** Normalized consent request context. Re-exported for `App.Locals` users. */
export type ConsentRequestInputs = ConsentRequestHeaderInputs;

/** Manifest-mode wiring shared by the route handlers and `loadConsent`. */
export interface ConsentManifestOptions extends ManifestSourceConfig {
	/**
	 * Fetch implementation for an absolute `backendURL` or `manifestURL`.
	 * Defaults to the global `fetch`. The route handlers fetch a relative
	 * one, such as `/api/self-host`, through `event.fetch` instead.
	 */
	fetch?: ManifestFetch;
	/**
	 * Receives the promise of a background manifest revalidation started by
	 * this request, with the request event, so the host can keep it alive
	 * past the response on runtimes that stop detached work once a response
	 * is sent. Defaults to handing it to `event.platform.context.waitUntil`
	 * when the adapter provides one (Netlify, and Cloudflare and Vercel edge
	 * on SvelteKit 2); nothing is registered otherwise. SvelteKit 3's
	 * Cloudflare and Vercel adapters provide none, so pass the platform's
	 * `waitUntil` there. The promise never rejects. Not called when the
	 * manifest is fresh or the request itself waits on the upstream.
	 *
	 * @example
	 * ```ts
	 * import { waitUntil } from 'cloudflare:workers';
	 *
	 * export const { GET } = createSvelteKitConsentRouteHandlers({
	 *   backendURL: 'https://your-project.inth.app',
	 *   onBackgroundRevalidate: (promise) => waitUntil(promise),
	 * });
	 * ```
	 */
	onBackgroundRevalidate?: (
		revalidation: Promise<void>,
		event: RequestEvent
	) => void;
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
}
