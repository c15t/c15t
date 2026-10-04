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
 * until its chunk lands and decides them. One of
 * {@link onDemandRuntimeModules}.
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
