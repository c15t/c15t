/**
 * The dialog surface seam.
 *
 * The banner is server-rendered `.astro` with no framework at all, but the
 * preference centre and the IAB dialog need real component state. Rather
 * than hard-wiring one framework through the whole package, dialogs go
 * through this adapter: `svelte`, `react` and `vue` each implement it, and
 * a site downloads exactly the one its `ui` option names.
 *
 * Nothing framework-specific is named here, and the registry starts empty
 * on purpose. A built-in entry pointing at the React adapter would make
 * every build resolve `@c15t/react` and `react-dom`, which a Svelte-only
 * site does not install. The integration knows `ui` at config time, so it
 * registers the one adapter and the one surface into the page boot script;
 * that is the only place a framework specifier appears.
 */

import type { ConsentRuntime } from '@c15t/core/runtime';

import type { C15tResolvedOptions, C15tUIAdapterName } from '../types';

/** Which dialog a caller asked for. */
export type ConsentDialogKind = 'preferences' | 'iab';

/** Context handed to an adapter when a dialog opens. */
export interface ConsentDialogContext {
	/** The page-level runtime that owns the kernel. */
	runtime: ConsentRuntime;
	/** The resolved integration options. */
	options: C15tResolvedOptions;
	/** The element the surface mounts into. */
	target: HTMLElement;
	/** Which dialog to show. */
	kind: ConsentDialogKind;
}

/**
 * Loads the component a dialog adapter mounts.
 *
 * The loader is registered by the `.astro` dialog component rather than
 * imported here, so the specifier is resolved by the consuming app's build
 * — which is the only build that knows how to compile a `.svelte` file —
 * and the chunk stays out of the page until someone opens a dialog.
 */
export type ConsentDialogSurfaceLoader = () => Promise<{ default: unknown }>;

const surfaces = new Map<C15tUIAdapterName, ConsentDialogSurfaceLoader>();

/**
 * Register the component a dialog adapter should mount.
 *
 * @param name - The adapter the surface belongs to.
 * @param load - Loader returning the surface module.
 * @example
 * ```ts
 * registerDialogSurface('svelte', () =>
 *   import('@c15t/astro/islands/consent-dialog-surface.svelte')
 * );
 * ```
 */
export const registerDialogSurface = function registerDialogSurface(
	name: C15tUIAdapterName,
	load: ConsentDialogSurfaceLoader
): void {
	surfaces.set(name, load);
};

/**
 * The registered surface loader for an adapter.
 *
 * @param name - The adapter name.
 * @returns The loader.
 * @throws {Error} When no surface has been registered for that adapter.
 */
export const requireDialogSurface = function requireDialogSurface(
	name: C15tUIAdapterName
): ConsentDialogSurfaceLoader {
	const load = surfaces.get(name);
	if (!load) {
		throw new Error(
			`@c15t/astro: no ${name} dialog surface registered. The integration registers it from the injected page script, so this usually means c15t() is missing from astro.config, or the page was rendered with \`middleware: false\` and no boot script.`
		);
	}
	return load;
};

/** A mounted dialog surface. */
export interface ConsentDialogHandle {
	/** Hide the dialog without destroying the surface. */
	close: () => void;
	/** Unmount and release everything. */
	destroy: () => Promise<void> | void;
}

/** A dialog surface implementation. */
export interface ConsentDialogAdapter {
	/** Adapter name, matching the `ui` integration option. */
	readonly name: C15tUIAdapterName;
	/**
	 * Mount the surface. Called on the first open only; later opens reuse
	 * the returned handle.
	 *
	 * @param context - Runtime, options and mount target.
	 * @returns A handle controlling the mounted surface.
	 */
	mount: (context: ConsentDialogContext) => Promise<ConsentDialogHandle>;
	/**
	 * Warm the surface's chunks without mounting anything, so the first
	 * open does not wait on a download.
	 */
	preload?: () => Promise<void>;
}

const registry = new Map<
	C15tUIAdapterName,
	() => Promise<ConsentDialogAdapter>
>();

/** First `load()` call per adapter, so a loader runs at most once. */
const pending = new Map<C15tUIAdapterName, Promise<ConsentDialogAdapter>>();

/**
 * Register a dialog surface implementation.
 *
 * @param name - The adapter name, matched against the `ui` option.
 * @param load - Loader returning the adapter. Called at most once.
 */
export const registerDialogAdapter = function registerDialogAdapter(
	name: C15tUIAdapterName,
	load: () => Promise<ConsentDialogAdapter>
): void {
	registry.set(name, load);
	// A replacement loader has to be reachable: the memo below would
	// otherwise keep handing out the adapter the old loader produced.
	pending.delete(name);
};

/**
 * Load the adapter named by the `ui` option.
 *
 * The import is dynamic so a page that never opens a dialog never
 * downloads the framework behind it.
 *
 * @param name - The adapter name.
 * @returns The adapter.
 * @throws {Error} When no adapter is registered under that name.
 */
export const loadDialogAdapter = async function loadDialogAdapter(
	name: C15tUIAdapterName
): Promise<ConsentDialogAdapter> {
	const memo = pending.get(name);
	if (memo) {
		return await memo;
	}
	const load = registry.get(name);
	if (!load) {
		throw new Error(
			`@c15t/astro: no dialog adapter registered for ui: ${JSON.stringify(name)}. The integration registers the configured adapter from the injected page script; register your own with registerDialogAdapter().`
		);
	}
	// `registerDialogAdapter` promises the loader runs at most once, and
	// `preloadDialog()` plus a later open would otherwise run it twice.
	// A rejection is not cached: a failed load should be retryable.
	const loading = (async () => {
		try {
			return await load();
		} catch (error) {
			pending.delete(name);
			throw error;
		}
	})();
	pending.set(name, loading);
	return await loading;
};
