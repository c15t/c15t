import { clearOnRevocationTools } from '../modules/clear-on-revocation/tools';
/**
 * Runtime modules a framework provider loads only when the page configures
 * them: the script loader, the network blocker, data clearing and a
 * `consentSource` connection.
 *
 * Each loads as one self-contained chunk. The module is written against its
 * tools interface (each module's `tools.ts`) and gets the first-load functions it
 * calls from here, so its chunk imports nothing the first-load graph has.
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
 */
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from '../modules/clear-on-revocation/types';
import { networkBlockerTools } from '../modules/network-blocker/tools';
import type {
	NetworkBlockerHandle,
	NetworkBlockerOptions,
} from '../modules/network-blocker/types';
import { scriptLoaderTools } from '../modules/script-loader/tools';
import type {
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from '../modules/script-loader/types';
import { lazyRuntimeModule } from './lazy-module';
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

/** Connects a `consentSource` once its module has loaded. */
const connectConsentSourceOnDemand: ConsentRuntimeModules['connectConsentSource'] =
	(kernel, source) => {
		let disconnect: (() => void) | undefined;
		let stopped = false;
		void (async () => {
			try {
				const controls = await import('./controls');
				if (!stopped) {
					disconnect = controls.connectConsentSource(kernel, source);
				}
			} catch {
				// Not connected: optional categories stay denied.
			}
		})();
		return () => {
			stopped = true;
			disconnect?.();
		};
	};

/** Data clearing, loaded on first use. */
const clearOnRevocationOnDemand = function clearOnRevocationOnDemand(
	options: ClearOnRevocationOptions
): ClearOnRevocationHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/clear-on-revocation/clear');
		return (loaded: ClearOnRevocationOptions) =>
			module.createClearOnRevocationWith(loaded, clearOnRevocationTools);
	})(options);
};

/** The network blocker, loaded on first use. */
const networkBlockerOnDemand = function networkBlockerOnDemand(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/network-blocker/blocker');
		return (loaded: NetworkBlockerOptions) =>
			module.createNetworkBlockerWith(loaded, networkBlockerTools);
	})(options);
};

/** The script loader, loaded on first use. */
const scriptLoaderOnDemand = function scriptLoaderOnDemand(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/script-loader/loader');
		return (loaded: ScriptLoaderOptions) =>
			module.createScriptLoaderWith(loaded, scriptLoaderTools);
	})(options);
};

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
