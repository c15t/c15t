import type { Theme, UIOptions } from '@c15t/ui/theme';
import type { InitOutput, Overrides, SSRInitialData } from 'c15t';

export type EmbedUIOptions = Pick<
	UIOptions,
	'noStyle' | 'disableAnimation' | 'scrollLock' | 'trapFocus' | 'colorScheme'
>;

export interface EmbedComponentHints {
	preload?: Array<'banner' | 'dialog' | 'widget' | 'iabBanner' | 'iabDialog'>;
}

export interface EmbedStoreOptions {
	namespace?: string;
	storageKey?: string;
}

export interface EmbedOptions {
	ui?: EmbedUIOptions;
	theme?: Theme;
	componentHints?: EmbedComponentHints;
	store?: EmbedStoreOptions;
	overrides?: Overrides;
}

export interface EmbedBootstrapPayload {
	init: InitOutput;
	options?: EmbedOptions;
	revision?: string;
}

export interface EmbedMountOptions {
	backendURL?: string;
	mountTarget?: string | HTMLElement;
	storeNamespace?: string;
	storageKey?: string;
	overrides?: Overrides;
	devToolsOverridesStorageKey?: string;
}

export interface EmbedIABComponents {
	Banner: unknown;
	Dialog: unknown;
}

export interface EmbedRuntime {
	version: string;
	mount: (payload: EmbedBootstrapPayload, options?: EmbedMountOptions) => void;
	bootstrap: (options?: EmbedMountOptions) => boolean;
	unmount: () => void;
	getPayload: () => EmbedBootstrapPayload | undefined;
	registerIABComponents?: (components: EmbedIABComponents) => void;
}

export type EmbedDevToolsPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

export interface EmbedDevToolsOptions {
	namespace?: string;
	position?: EmbedDevToolsPosition;
	defaultOpen?: boolean;
}

export interface EmbedDevToolsRuntime {
	version: string;
	mount: (options?: EmbedDevToolsOptions) => void;
	unmount: () => void;
}

export type EmbedSSRData = Promise<SSRInitialData | undefined>;
