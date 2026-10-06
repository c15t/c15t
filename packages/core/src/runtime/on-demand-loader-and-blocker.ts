/**
 * The script loader and the network blocker as on-demand runtime modules
 * that share one chunk, for {@link onDemandRuntimeModules}.
 *
 * No file `@c15t/core/runtime/on-demand` reaches may hold an `import()` of
 * either module alone: esbuild emits a chunk for every `import()` in a
 * file it reaches, used or not, and two chunks that start from the same
 * module make it split that module out of both. The single-module
 * factories live behind `@c15t/core/runtime/on-demand-factories` for that
 * reason.
 */
import { networkBlockerTools } from '../modules/network-blocker/tools';
import { scriptLoaderTools } from '../modules/script-loader/tools';
import { lazyRuntimeModule } from './lazy-module';
import type { ConsentRuntimeModules } from './types';

/** One specifier for both factories, so a bundler emits one chunk. */
const loadChunk = () => import('../modules/loader-and-blocker');

/**
 * The `createScriptLoader` and `createNetworkBlocker` modules, loaded on
 * first use from one chunk that holds both.
 *
 * A page that configures either one downloads both, in one request:
 * consented scripts mount, and held requests are decided, as soon as that
 * chunk lands. Preload it with one link instead of two. A page that
 * configures neither downloads nothing.
 *
 * A host that imports the other module statically uses
 * `scriptLoaderOnDemand` or `networkBlockerOnDemand` instead: this chunk
 * would make the bundler move the static module into a chunk of its own.
 *
 * @internal
 */
export const loaderAndBlockerOnDemand: Pick<
	ConsentRuntimeModules,
	'createNetworkBlocker' | 'createScriptLoader'
> = {
	createNetworkBlocker: (options) =>
		lazyRuntimeModule(async () => {
			const chunk = await loadChunk();
			return (loaded: typeof options) =>
				chunk.createNetworkBlockerWith(loaded, networkBlockerTools);
		})(options),
	createScriptLoader: (options) =>
		lazyRuntimeModule(async () => {
			const chunk = await loadChunk();
			return (loaded: typeof options) =>
				chunk.createScriptLoaderWith(loaded, scriptLoaderTools);
		})(options),
};
