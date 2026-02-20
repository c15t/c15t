import {
	createDevTools,
	type DevToolsInstance,
	type DevToolsOptions,
} from '@c15t/dev-tools';
import type {
	EmbedDevToolsOptions,
	EmbedDevToolsPosition,
	EmbedDevToolsRuntime,
} from './types';
import { version } from './version';

const DEFAULT_STORE_NAMESPACE = 'c15tStore';

let activeDevTools: DevToolsInstance | null = null;

function isValidPosition(
	position: string | undefined
): position is EmbedDevToolsPosition {
	return (
		position === 'bottom-right' ||
		position === 'bottom-left' ||
		position === 'top-right' ||
		position === 'top-left'
	);
}

function getScriptElement(): HTMLScriptElement | null {
	if (typeof document === 'undefined') {
		return null;
	}

	const current = document.currentScript;
	if (current instanceof HTMLScriptElement) {
		return current;
	}

	return (
		document.querySelector<HTMLScriptElement>(
			'script[src$="/embed-devtools.js"]'
		) ??
		document.querySelector<HTMLScriptElement>(
			'script[src$="/c15t-embed.devtools.iife.js"]'
		) ??
		null
	);
}

function readScriptOptions(
	script: HTMLScriptElement | null
): EmbedDevToolsOptions {
	if (!script) {
		return {};
	}

	const namespace = script.dataset.c15tNamespace?.trim();
	const rawPosition = script.dataset.c15tPosition?.trim();
	const defaultOpenRaw = script.dataset.c15tDefaultOpen?.trim();
	const defaultOpen =
		defaultOpenRaw === 'true'
			? true
			: defaultOpenRaw === 'false'
				? false
				: undefined;

	return {
		namespace: namespace || undefined,
		position: isValidPosition(rawPosition) ? rawPosition : undefined,
		defaultOpen,
	};
}

function toDevToolsOptions(
	options: EmbedDevToolsOptions = {}
): DevToolsOptions {
	return {
		namespace: options.namespace ?? DEFAULT_STORE_NAMESPACE,
		position: options.position,
		defaultOpen: options.defaultOpen,
	};
}

export function unmountEmbedDevTools(): void {
	activeDevTools?.destroy();
	activeDevTools = null;
}

export function mountEmbedDevTools(options: EmbedDevToolsOptions = {}): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return;
	}

	unmountEmbedDevTools();
	activeDevTools = createDevTools(toDevToolsOptions(options));
}

export function initializeEmbedDevTools(
	options?: EmbedDevToolsOptions
): EmbedDevToolsRuntime | null {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return null;
	}

	if (window.__c15tEmbedDevToolsInitialized && window.c15tEmbedDevTools) {
		return window.c15tEmbedDevTools;
	}

	const initialOptions = options ?? readScriptOptions(getScriptElement());
	const runtime: EmbedDevToolsRuntime = {
		version,
		mount: mountEmbedDevTools,
		unmount: unmountEmbedDevTools,
	};

	window.c15tEmbedDevTools = runtime;
	window.__c15tEmbedDevToolsInitialized = true;
	runtime.mount(initialOptions);

	return runtime;
}

declare global {
	interface Window {
		c15tEmbedDevTools?: EmbedDevToolsRuntime;
		__c15tEmbedDevToolsInitialized?: boolean;
	}
}
