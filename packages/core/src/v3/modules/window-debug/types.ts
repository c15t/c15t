/**
 * Shared types for the window-debug module.
 */

/**
 * The transport kind reported on `window.c15t`. Reflects what the
 * adapter actually built.
 */
export type WindowDebugMode = 'hosted' | 'offline' | 'custom' | 'manifest';

/**
 * Options for {@link createWindowDebug}.
 */
export interface WindowDebugOptions {
	/** Adapter package name, e.g. `@c15t/react`. */
	pkg: string;
	/** Resolved transport kind the adapter is running with. */
	mode: WindowDebugMode;
}

/**
 * Lifecycle handle returned by {@link createWindowDebug}.
 */
export interface WindowDebugHandle {
	/**
	 * Removes `window.c15t` — only when it is still the exact object this
	 * handle installed, so an unmounting older provider cannot clobber a
	 * newer provider's debug object.
	 */
	dispose: () => void;
}

/**
 * The frozen object installed at `window.c15t`. Public, read-only
 * metadata for debugging and for detecting c15t on a page — never the
 * store, consent state, or backend configuration.
 */
export interface C15tWindowDebug {
	/** The `c15t` core package version. */
	readonly version: string;
	/** The installed adapter package name, e.g. `@c15t/nextjs`. */
	readonly pkg: string;
	/** The resolved transport kind. */
	readonly mode: WindowDebugMode;
}

/**
 * Provider transport factory metadata used by
 * {@link resolveWindowDebugMode}.
 */
export interface WindowDebugModeInput {
	/** Transport kind declared by the factory. */
	readonly kind: Exclude<WindowDebugMode, 'manifest'>;
}
