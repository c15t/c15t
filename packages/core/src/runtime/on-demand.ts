/**
 * Runtime modules a framework provider loads only when the page configures
 * them: the script loader, the network blocker, data clearing and a
 * `consentSource` connection.
 *
 * Each loads as one self-contained chunk. The module is written against its
 * tools interface (each module's `tools.ts`) and gets the first-load functions it
 * calls from its factory, so its chunk imports nothing the first-load graph has.
 * Bundlers that split shared code (Rolldown in Vite, esbuild) would
 * otherwise move every module a lazy chunk shares with first load into a
 * chunk of its own, and first load would fetch those as extra files.
 *
 * What loading on demand changes, per module:
 *
 * - script loader: consented scripts mount once its chunk lands;
 * - network blocker: matching requests stay held (the runtime holds them
 *   from construction) until it lands and decides them;
 * - data clearing: it sweeps denied categories when it mounts, after a
 *   script loader that loads on demand;
 * - `consentSource`: optional categories stay denied until it connects.
 *
 * A page that configures none of them never downloads them.
 *
 * Each factory is also exported on its own (`scriptLoaderOnDemand`,
 * `networkBlockerOnDemand`, `clearOnRevocationOnDemand`,
 * `connectConsentSourceOnDemand`), each from its own file. A host that
 * imports some modules statically and others on demand takes only the
 * factories it loads on demand: an `import()` of a module the page also
 * imports statically keeps that module in a chunk of its own.
 */
import { clearOnRevocationOnDemand } from './on-demand-clear-on-revocation';
import { connectConsentSourceOnDemand } from './on-demand-consent-source';
import { networkBlockerOnDemand } from './on-demand-network-blocker';
import { scriptLoaderOnDemand } from './on-demand-script-loader';
import type { ConsentRuntimeModules } from './types';

/**
 * The module factories {@link onDemandRuntimeModules} names. Spread them
 * into a provider's modules with the ones it imports statically
 * (persistence, `window.c15t`, the revocation reload) and its iframe
 * blocker.
 */
export type OnDemandRuntimeModules = Pick<
	ConsentRuntimeModules,
	| 'connectConsentSource'
	| 'createClearOnRevocation'
	| 'createNetworkBlocker'
	| 'createScriptLoader'
>;

/**
 * Runtime modules that load on demand, each as one chunk.
 *
 * @example
 * ```ts
 * const runtime = createConsentProviderRuntime(options, {
 *   ...onDemandRuntimeModules,
 *   createIframeBlocker,
 *   createPersistence,
 *   createWindowDebug,
 *   watchRevocationReload,
 * });
 * ```
 */
export const onDemandRuntimeModules: OnDemandRuntimeModules = {
	connectConsentSource: connectConsentSourceOnDemand,
	createClearOnRevocation: clearOnRevocationOnDemand,
	createNetworkBlocker: networkBlockerOnDemand,
	createScriptLoader: scriptLoaderOnDemand,
};
