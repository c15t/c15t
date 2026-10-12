import type { Vendor } from '@c15t/core';
import type { ConsentMode } from '@c15t/core/modes';
import type { Script } from '@c15t/core/modules/script-loader';
import type { ProviderTransportFactory } from '@c15t/react';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/module-hooks';
import type {
	ConsentProviderOptions,
	ConsentProviderPrefetch,
} from '@c15t/react/provider';

/**
 * The visitor's resolved consent state: serializable policy, records, and
 * request clock. Produced server-side by `resolveConsent()` and consumed by
 * `ConsentRoot`, which hands it to the React provider.
 */
export type ConsentState = ConsentProviderPrefetch;

/**
 * Browser options `ConsentRoot` reads. Set them in `c15t.config.ts`, or as
 * `ConsentRoot` props, which win over the config's.
 */
export interface ConsentClientOptions {
	/**
	 * Script tags to manage with the script-loader module.
	 */
	scripts?: Script[];

	/**
	 * Vendors the preference center lists under their category, each with
	 * its own switch, so a visitor can grant a category and still turn one
	 * vendor off. Scripts, network rules and iframes naming a vendor's
	 * `id` follow that choice. Merged with vendors the backend declares.
	 * See the granular consent guide.
	 */
	vendors?: Vendor[];

	/**
	 * Remove configured browser data for initially denied categories after
	 * policy resolution and when consent is later revoked.
	 * Initial-only: remount ConsentRoot to replace the cleanup configuration.
	 */
	clearOnRevocation?: ConsentProviderOptions['clearOnRevocation'];

	/**
	 * Script-loader options.
	 */
	scriptLoader?: UseScriptLoaderOptions;

	/**
	 * Network-blocker configuration.
	 */
	networkBlocker?: UseNetworkBlockerOptions | false;

	/**
	 * Enable client-side persistence. Defaults to true.
	 */
	persistence?: boolean | UsePersistenceOptions;

	/**
	 * Additional React provider options. `options.mode` replaces the
	 * config's `mode`: `manifest()`, `hosted()` or `offline()` from
	 * `c15t/next`, or a transport such as `custom(transport)`.
	 */
	options?: Omit<
		ConsentProviderOptions,
		| 'mode'
		| 'clearOnRevocation'
		| 'networkBlocker'
		| 'persistence'
		| 'prefetch'
		| 'scriptLoader'
		| 'scripts'
		| 'vendors'
		| '__debugPkg'
		| '__preloadScriptLoader'
		| '__resolveStreamedInit'
	> & {
		mode?: ConsentMode | ProviderTransportFactory;
	};
}
