/**
 * The write code as a static import, for builds with no chunk to load it
 * from, such as `@c15t/browser`'s script-tag files, which swap it in for
 * `writer-loader.ts`. Every handle has its writer from the start, so there
 * is nothing to preload.
 *
 * @internal
 */
import type { WriterLoader } from './writer-loader';
import { createPersistenceWriter } from './writer/writer';

const writerModule = { createPersistenceWriter };

/** The write code, already loaded. @internal */
export const pageWriterLoader: WriterLoader = {
	load: () => Promise.resolve(writerModule),
	module: writerModule,
};

/** Nothing to preload. @internal */
export const preloadWriter = (): (() => void) => () => undefined;
