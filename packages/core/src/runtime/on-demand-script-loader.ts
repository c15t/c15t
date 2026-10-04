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
 * Consented scripts mount once its chunk lands. One of
 * {@link onDemandRuntimeModules}.
 *
 * @param options - The script loader options the runtime passes.
 * @returns A handle that queues calls until the module has loaded.
 */
export const scriptLoaderOnDemand = function scriptLoaderOnDemand(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/script-loader/loader');
		return (loaded: ScriptLoaderOptions) =>
			module.createScriptLoaderWith(loaded, scriptLoaderTools);
	})(options);
};
