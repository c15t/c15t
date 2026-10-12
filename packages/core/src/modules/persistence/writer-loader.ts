/**
 * Where persistence handles get their write code (`writer/writer.ts`).
 *
 * The page shares one loader, so the chunk is fetched once and every handle
 * created after it landed has its writer from the start. Tests pass their
 * own loader to `createPersistence` to decide when the code lands.
 *
 * @internal
 */
import type { InternalKernel } from '../../kernel/internals';
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

// How long after the load event the write code waits before loading in
// idle time, so it stays out of first-load JavaScript.
const PRELOAD_DELAY_MS = 3000;
// A press, key or focus that lands in one of these loads it at once.
const SURFACE_ROOT = /consent-(?:banner|dialog)-root$/u;
const INTENT_EVENTS = ['pointerdown', 'keydown', 'focusin'] as const;

/**
 * Load the write code before the visitor acts on a banner or dialog, so the
 * first save rarely waits for it. Only once one has been shown: it never
 * competes with showing it, and a visitor with nothing to answer downloads
 * it only if they act. Then whichever comes first starts the load: a press,
 * key or focus inside the banner or dialog, or idle time three seconds after
 * the load event (Safari, without `requestIdleCallback`, loads after the
 * delay). The loader imports once.
 *
 * @param kernel - Emits `surface:shown`.
 * @param load - Starts loading the write code.
 * @returns Stops listening.
 * @internal
 */
export const preloadWriter = function preloadWriter(
	kernel: InternalKernel,
	load: () => void
): () => void {
	let listening = false;
	const listen = (add: boolean) => {
		if (listening === add) {
			return;
		}
		listening = add;
		for (const type of INTENT_EVENTS) {
			document[add ? 'addEventListener' : 'removeEventListener'](
				type,
				// oxlint-disable-next-line no-use-before-define -- Called after assembly.
				onIntent,
				true
			);
		}
	};
	const preload = () => {
		listen(false);
		load();
	};
	const onIntent = (event: Event) => {
		// `composedPath()` reaches into the script tag's open shadow root.
		if (
			event
				.composedPath()
				.some((node) =>
					SURFACE_ROOT.test((node as HTMLElement).dataset?.testid as string)
				)
		) {
			preload();
		}
	};
	const stop = kernel.events.on('surface:shown', () => {
		stop();
		listen(true);
		const idle = () =>
			setTimeout(
				() => (globalThis.requestIdleCallback ?? setTimeout)(preload),
				PRELOAD_DELAY_MS
			);
		if (document.readyState === 'complete') {
			idle();
		} else {
			window.addEventListener('load', idle, { once: true });
		}
	});
	return () => {
		stop();
		listen(false);
	};
};
