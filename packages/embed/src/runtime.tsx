import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	type ConsentManagerOptions,
	ConsentManagerProvider,
	IABConsentBanner,
	IABConsentDialog,
} from '@c15t/react';
import { createRoot, type Root } from 'react-dom/client';
import type {
	EmbedBootstrapPayload,
	EmbedMountOptions,
	EmbedRuntime,
	EmbedSSRData,
} from './types';
import { version } from './version';

const DEFAULT_MOUNT_TARGET_ID = 'c15t-embed-root';
const DEFAULT_DEVTOOLS_OVERRIDES_STORAGE_KEY = 'c15t-devtools-overrides';
export const EMBED_PAYLOAD_EVENT = 'c15t:embed:payload';

let activeRoot: Root | null = null;

function getScriptElement(): HTMLScriptElement | null {
	if (typeof document === 'undefined') {
		return null;
	}

	const current = document.currentScript;
	if (current instanceof HTMLScriptElement) {
		return current;
	}

	const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
	for (let i = scripts.length - 1; i >= 0; i -= 1) {
		const script = scripts[i];
		if (!script?.src) {
			continue;
		}

		try {
			const url = new URL(script.src, window.location.href);
			const normalizedPath = url.pathname.replace(/\/+$/, '');
			if (normalizedPath.endsWith('/embed.js')) {
				return script;
			}
		} catch {
			// Ignore invalid URLs and continue scanning.
		}
	}

	return null;
}

function resolveBackendURLFromScript(script: HTMLScriptElement | null): string {
	if (!script?.src) {
		return '';
	}

	const url = new URL(script.src, window.location.href);
	const normalizedPath = url.pathname.replace(/\/+$/, '');

	if (!normalizedPath.endsWith('/embed.js')) {
		return '';
	}

	const basePath = normalizedPath.slice(0, -'/embed.js'.length);

	// Keep relative root fast-path to avoid needless origin prefixes.
	if (!basePath) {
		return '';
	}

	return `${url.origin}${basePath}`;
}

export function resolveBackendURL(explicitBackendURL?: string): string {
	if (explicitBackendURL !== undefined) {
		return explicitBackendURL;
	}

	if (typeof window === 'undefined') {
		return '';
	}

	return resolveBackendURLFromScript(getScriptElement());
}

function resolveMountTarget(
	target: EmbedMountOptions['mountTarget']
): HTMLElement {
	if (target instanceof HTMLElement) {
		return target;
	}

	if (typeof document === 'undefined') {
		throw new Error('Cannot mount c15t/embed outside a browser environment');
	}

	if (typeof target === 'string') {
		const existing = document.querySelector<HTMLElement>(target);
		if (!existing) {
			throw new Error(`Mount target not found: ${target}`);
		}
		return existing;
	}

	const existingDefault = document.getElementById(DEFAULT_MOUNT_TARGET_ID);
	if (existingDefault) {
		return existingDefault;
	}

	const mountEl = document.createElement('div');
	mountEl.id = DEFAULT_MOUNT_TARGET_ID;
	document.body.appendChild(mountEl);
	return mountEl;
}

function buildSSRData(payload: EmbedBootstrapPayload): EmbedSSRData {
	return Promise.resolve({
		init: payload.init,
		gvl: payload.init.gvl ?? undefined,
	});
}

function normalizeOverrideValue(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function normalizeGpcOverride(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function readPersistedDevToolsOverrides(storageKey: string) {
	if (typeof window === 'undefined') {
		return undefined;
	}

	try {
		const persisted = window.localStorage.getItem(storageKey);
		if (!persisted) {
			return undefined;
		}

		const parsed = JSON.parse(persisted) as unknown;
		if (!parsed || typeof parsed !== 'object') {
			return undefined;
		}

		const source = parsed as Record<string, unknown>;
		const country = normalizeOverrideValue(source.country);
		const region = normalizeOverrideValue(source.region);
		const language = normalizeOverrideValue(source.language);
		const gpc = normalizeGpcOverride(source.gpc);

		if (!country && !region && !language && gpc === undefined) {
			return undefined;
		}

		return {
			...(country !== undefined ? { country } : {}),
			...(region !== undefined ? { region } : {}),
			...(language !== undefined ? { language } : {}),
			...(gpc !== undefined ? { gpc } : {}),
		};
	} catch {
		return undefined;
	}
}

function resolveOverrides(
	payload: EmbedBootstrapPayload,
	runtimeOptions: EmbedMountOptions
) {
	const manualOverrides =
		runtimeOptions.overrides ?? payload.options?.overrides;
	const devToolsOverridesStorageKey =
		runtimeOptions.devToolsOverridesStorageKey ??
		DEFAULT_DEVTOOLS_OVERRIDES_STORAGE_KEY;
	const persistedOverrides = readPersistedDevToolsOverrides(
		devToolsOverridesStorageKey
	);

	if (!manualOverrides && !persistedOverrides) {
		return undefined;
	}

	const normalizedManualOverrides = {
		...(manualOverrides?.country !== undefined
			? { country: manualOverrides.country }
			: {}),
		...(manualOverrides?.region !== undefined
			? { region: manualOverrides.region }
			: {}),
		...(manualOverrides?.language !== undefined
			? { language: manualOverrides.language }
			: {}),
		...(manualOverrides?.gpc !== undefined ? { gpc: manualOverrides.gpc } : {}),
	};

	const mergedOverrides = {
		...normalizedManualOverrides,
		...(persistedOverrides ?? {}),
	};

	if (
		!mergedOverrides.country &&
		!mergedOverrides.region &&
		!mergedOverrides.language &&
		mergedOverrides.gpc === undefined
	) {
		return undefined;
	}

	return mergedOverrides;
}

function buildProviderOptions(
	payload: EmbedBootstrapPayload,
	runtimeOptions: EmbedMountOptions
): ConsentManagerOptions {
	const storeNamespace =
		runtimeOptions.storeNamespace ??
		payload.options?.store?.namespace ??
		'c15tStore';
	const storageKey =
		runtimeOptions.storageKey ?? payload.options?.store?.storageKey;
	const storageConfig = storageKey
		? {
				storageKey,
			}
		: undefined;

	return {
		mode: 'c15t',
		backendURL: resolveBackendURL(runtimeOptions.backendURL),
		store: {
			namespace: storeNamespace,
		},
		storageConfig,
		ssrData: buildSSRData(payload),
		overrides: resolveOverrides(payload, runtimeOptions),
		noStyle: payload.options?.ui?.noStyle,
		disableAnimation: payload.options?.ui?.disableAnimation,
		scrollLock: payload.options?.ui?.scrollLock,
		trapFocus: payload.options?.ui?.trapFocus,
		colorScheme: payload.options?.ui?.colorScheme,
		theme: payload.options?.theme,
	};
}

export function readEmbedPayload(
	source: Window = window
): EmbedBootstrapPayload | undefined {
	return source.__c15tEmbedPayload;
}

export function unmountEmbedRuntime(): void {
	activeRoot?.unmount();
	activeRoot = null;
}

export function mountEmbedRuntime(
	payload: EmbedBootstrapPayload,
	runtimeOptions: EmbedMountOptions = {}
): void {
	const mountTarget = resolveMountTarget(runtimeOptions.mountTarget);
	mountTarget.setAttribute('data-c15t-embed-runtime', 'true');

	unmountEmbedRuntime();

	const providerOptions = buildProviderOptions(payload, runtimeOptions);

	const root = createRoot(mountTarget);
	root.render(
		<ConsentManagerProvider options={providerOptions}>
			<ConsentBanner models={['opt-in', 'opt-out']} />
			<IABConsentBanner />
			<IABConsentDialog />
			<ConsentDialogTrigger />
			<ConsentDialog />
		</ConsentManagerProvider>
	);

	activeRoot = root;
}

export function bootstrapEmbedRuntime(
	runtimeOptions: EmbedMountOptions = {},
	source: Window = window
): boolean {
	const payload = readEmbedPayload(source);
	if (!payload) {
		return false;
	}

	mountEmbedRuntime(payload, runtimeOptions);
	return true;
}

function bootstrapOnReady(runtime: EmbedRuntime): void {
	if (document.readyState === 'loading') {
		document.addEventListener(
			'DOMContentLoaded',
			() => {
				runtime.bootstrap();
			},
			{ once: true }
		);
		return;
	}

	runtime.bootstrap();
}

export function createEmbedRuntime(): EmbedRuntime {
	return {
		version,
		mount: mountEmbedRuntime,
		bootstrap: (options) => bootstrapEmbedRuntime(options),
		unmount: unmountEmbedRuntime,
		getPayload: () => readEmbedPayload(),
	};
}

export function initializeEmbedRuntime(): EmbedRuntime | null {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return null;
	}

	if (window.__c15tEmbedRuntimeInitialized && window.c15tEmbed) {
		return window.c15tEmbed;
	}

	const runtime = createEmbedRuntime();
	window.c15tEmbed = runtime;
	window.__c15tEmbedRuntimeInitialized = true;

	window.addEventListener(EMBED_PAYLOAD_EVENT, () => {
		runtime.bootstrap();
	});

	bootstrapOnReady(runtime);

	return runtime;
}

declare global {
	interface Window {
		__c15tEmbedPayload?: EmbedBootstrapPayload;
		__c15tEmbedRuntimeInitialized?: boolean;
		c15tEmbed?: EmbedRuntime;
	}
}
