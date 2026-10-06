/**
 * The script loader as an on-demand runtime module.
 *
 * Its own file, so a host that imports only this factory, or only another
 * one, keeps the other modules' `import()` out of its chunk. A bundler
 * that sees an `import()` of a module the page also imports statically
 * keeps that module in a chunk of its own.
 */
import { scriptLoaderTools } from '../modules/script-loader/tools';
import type {
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from '../modules/script-loader/types';
import { lazyRuntimeModule } from './lazy-module';

/**
 * The `createScriptLoader` module, loaded on first use.
 *
 * Consented scripts mount once its chunk lands. The chunk holds only the
 * loader: for a host that imports the network blocker statically.
 * {@link onDemandRuntimeModules} loads the loader and the blocker as one
 * chunk instead. Exported from `@c15t/core/runtime/on-demand-factories`.
 *
 * A provider runtime starts the load before it mounts the loader when
 * consent already lets a script run.
 */
export const scriptLoaderOnDemand: (
	options: ScriptLoaderOptions
) => ScriptLoaderHandle = lazyRuntimeModule(async () => {
	const module = await import('../modules/script-loader/loader');
	return (loaded: ScriptLoaderOptions) =>
		module.createScriptLoaderWith(loaded, scriptLoaderTools);
});
