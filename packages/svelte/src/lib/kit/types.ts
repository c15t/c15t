import type { ConsentMode } from '@c15t/core/modes';
import type {
	ConsentManifest,
	ConsentRequestHeaderInputs,
} from '@c15t/schema/types';

import type { ConsentState } from '../server/types';

export type { ConsentRequestOptions, ConsentState } from '../server/types';

/**
 * What {@link c15tHandle} stores on `event.locals.c15t`.
 *
 * `config` is the serializable {@link ConsentState} read from the cookie
 * and the request alone; `inputs` is the normalized geo/language/GPC
 * context the handle derived from the request, kept so downstream loads
 * and route handlers do not re-parse headers. `mode`, `routePrefix` and
 * `snapshot` are the handle's options, for `loadConsent`.
 */
export interface C15tLocals {
	/** Consent state seeded from the consent cookie and request inputs. */
	config: ConsentState;
	/** Normalized country / region / language / GPC for this request. */
	inputs: ConsentRequestInputs;
	/** How `loadConsent` resolves the visitor. */
	mode: ConsentMode;
	/** The c15t backend, when the handle was given one. */
	backendURL?: string;
	/** Prefix of the app's consent route, such as `/api/c15t`. */
	routePrefix?: string;
	/** A manifest that replaces the one the build downloaded. */
	snapshot?: ConsentManifest;
	/**
	 * The cookie name the handle actually read, when it was given one.
	 * `loadConsent` falls back to it so a per-call geo override does not
	 * silently re-read the default `c15t` key and lose persisted consent.
	 */
	cookieName?: string;
	/**
	 * Set while SvelteKit prerenders: the page is shared between visitors,
	 * so `loadConsent` makes no upstream call and carries no visitor state.
	 */
	shared?: true;
}

/** Normalized consent request context. Re-exported for `App.Locals` users. */
export type ConsentRequestInputs = ConsentRequestHeaderInputs;
