/**
 * The network blocker as an on-demand runtime module. Its own file for the
 * reason `on-demand-script-loader.ts` gives.
 */
import { networkBlockerTools } from '../modules/network-blocker/tools';
import type {
	NetworkBlockerHandle,
	NetworkBlockerOptions,
} from '../modules/network-blocker/types';
import { lazyRuntimeModule } from './lazy-module';

/**
 * The `createNetworkBlocker` module, loaded on first use.
 *
 * Matching requests stay held (the runtime holds them from construction)
 * until its chunk lands and decides them. The chunk holds only the
 * blocker: for a host that imports the script loader statically.
 * {@link onDemandRuntimeModules} loads the loader and the blocker as one
 * chunk instead. Exported from `@c15t/core/runtime/on-demand-factories`.
 *
 * @param options - The network blocker options the runtime passes.
 * @returns A handle that queues calls until the module has loaded.
 */
export const networkBlockerOnDemand = function networkBlockerOnDemand(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/network-blocker/blocker');
		return (loaded: NetworkBlockerOptions) =>
			module.createNetworkBlockerWith(loaded, networkBlockerTools);
	})(options);
};
