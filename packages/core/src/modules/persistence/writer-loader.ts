/**
 * Where persistence handles get their write code (`writer/writer.ts`).
 *
 * The page shares one loader, so the chunk is fetched once and every handle
 * created after it landed has its writer from the start. Tests pass their
 * own loader to `createPersistence` to decide when the code lands.
 *
 * @internal
 */
import type { createPersistenceWriter } from './writer/writer';

/** The write code's module. @internal */
export interface WriterModule {
	createPersistenceWriter: typeof createPersistenceWriter;
}

/** Loads the write code once. @internal */
export interface WriterLoader {
	/** The write code, once it has loaded. */
	module?: WriterModule;
	/** Load the write code. A failed load is tried again on the next call. */
	load: () => Promise<WriterModule>;
}

/**
 * Build a loader around an import of the write code.
 *
 * @param importWriter - Imports `writer/writer.ts`.
 * @returns A loader that imports once and remembers the module.
 * @internal
 */
export const createWriterLoader = function createWriterLoader(
	importWriter: () => Promise<WriterModule>
): WriterLoader {
	let loading: Promise<WriterModule> | undefined;
	const loader: WriterLoader = {
		load() {
			loading ??= (async () => {
				try {
					loader.module = await importWriter();
					return loader.module;
				} catch (error) {
					loading = undefined;
					throw error;
				}
			})();
			return loading;
		},
	};
	return loader;
};

/** The page's loader: the write code as its own chunk. @internal */
export const pageWriterLoader = createWriterLoader(
	() => import('./writer/writer')
);
