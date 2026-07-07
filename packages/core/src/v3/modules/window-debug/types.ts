/**
 * Shared types for the window-debug module.
 */

export type WindowDebugMode = 'hosted' | 'offline' | 'custom' | 'manifest';

export interface WindowDebugOptions {
	/** Adapter package name, e.g. `@c15t/react`. */
	pkg: string;
	mode: WindowDebugMode;
}

export interface WindowDebugHandle {
	dispose(): void;
}

export interface C15tWindowDebug {
	readonly version: string;
	readonly pkg: string;
	readonly mode: WindowDebugMode;
}
