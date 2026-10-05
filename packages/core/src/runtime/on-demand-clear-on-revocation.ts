/**
 * Data clearing as an on-demand runtime module. Its own file for the
 * reason `on-demand-script-loader.ts` gives.
 */
import { clearOnRevocationTools } from '../modules/clear-on-revocation/tools';
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from '../modules/clear-on-revocation/types';
import { lazyRuntimeModule } from './lazy-module';

/**
 * The `createClearOnRevocation` module, loaded on first use.
 *
 * It sweeps denied categories when it mounts, after a script loader that
 * loads on demand. One of {@link onDemandRuntimeModules}; exported on its
 * own from `@c15t/core/runtime/on-demand-factories`.
 *
 * @param options - The data clearing options the runtime passes.
 * @returns A handle that queues calls until the module has loaded.
 */
export const clearOnRevocationOnDemand = function clearOnRevocationOnDemand(
	options: ClearOnRevocationOptions
): ClearOnRevocationHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/clear-on-revocation/clear');
		return (loaded: ClearOnRevocationOptions) =>
			module.createClearOnRevocationWith(loaded, clearOnRevocationTools);
	})(options);
};
