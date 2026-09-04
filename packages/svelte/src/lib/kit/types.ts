import type { KernelConfig } from '@c15t/core';
import type { ManifestFetch, ManifestSourceConfig } from '@c15t/core/server';
import type { ConsentRequestHeaderInputs } from '@c15t/schema/types';

/**
 * What {@link c15tHandle} stores on `event.locals.c15t`.
 *
 * `config` is the serializable {@link KernelConfig} to hand the provider as
 * `prefetch`; `inputs` is the normalized geo/language/GPC context the handle
 * derived from the request, kept so downstream loads and route handlers do
 * not re-parse headers.
 */
export interface C15tLocals {
	/** Kernel config seeded from the consent cookie and request inputs. */
	config: KernelConfig;
	/** Normalized country / region / language / GPC for this request. */
	inputs: ConsentRequestInputs;
}

/** Normalized consent request context. Re-exported for `App.Locals` users. */
export type ConsentRequestInputs = ConsentRequestHeaderInputs;

/** Shared options for reading the consent cookie and request context. */
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

/** Manifest-mode wiring shared by the route handlers and `loadConsent`. */
export interface ConsentManifestOptions extends ManifestSourceConfig {
	/** Fetch implementation. Defaults to the global `fetch`. */
	fetch?: ManifestFetch;
}
