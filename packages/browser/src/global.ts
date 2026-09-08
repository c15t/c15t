import { custom, hosted } from '@c15t/core';
import type {
	AllConsentNames,
	ConsentSnapshot,
	ConsentState,
	HasCondition,
	KernelUser,
	Unsubscribe,
} from '@c15t/core';
import type { DevToolsInstance } from '@c15t/dev-tools';

import { readPageOptions } from './auto-init';
import { createConsentClient } from './client';
import type { CreateConsentClientContext } from './client';
import { createDeferred } from './deferred';
import { manifest } from './transports/manifest';
import { offline } from './transports/offline';
import type {
	ConsentClient,
	ConsentClientEventMap,
	ConsentClientOptions,
	ConsentUIHandle,
	ConsentUIOptions,
} from './types';
import { version } from './version';

/** The name the script-tag build installs itself under. */
export const GLOBAL_NAME = 'c15t';

/** A call queued before the script loaded: `[method, ...args]`. */
export type QueuedCall = [method: string, ...args: unknown[]];

/**
 * `window.c15t` in the script-tag builds.
 *
 * Before `init()` the read methods throw and `on()`/`ready()` wait; after
 * it everything proxies to the page's client. `version`, `pkg` and `mode`
 * keep the shape `@c15t/core` installs for devtools.
 */
export interface C15tGlobal {
	/** Package version. */
	readonly version: string;
	/** Package name. */
	readonly pkg: string;
	/** Transport kind, once initialised. */
	readonly mode: string | null;
	/** The page's client, once initialised. */
	readonly client: ConsentClient | null;
	/**
	 * Create and start the page's client. A second call returns the
	 * existing one.
	 *
	 * @param options - Client options; defaults to what the script tag
	 * and `window.c15tConfig` declare.
	 */
	init: (options?: ConsentClientOptions) => ConsentClient;
	/**
	 * Run once the client exists, immediately if it already does. Safe to
	 * call before `init()`; `c15t.devtools.js` mounts through this.
	 */
	onInit: (listener: (client: ConsentClient) => void) => Unsubscribe;
	/** The DevTools panel, once `c15t.devtools.js` has mounted it. */
	devtools: DevToolsInstance | null;
	/** Resolves once the policy is resolved. Safe to call before `init()`. */
	ready: () => Promise<ConsentSnapshot>;
	/** Listen for a client event. Safe to call before `init()`. */
	on: <EventName extends keyof ConsentClientEventMap>(
		event: EventName,
		listener: (payload: ConsentClientEventMap[EventName]) => void
	) => Unsubscribe;
	getSnapshot: () => ConsentSnapshot;
	subscribe: (listener: (snapshot: ConsentSnapshot) => void) => Unsubscribe;
	has: (condition: HasCondition<AllConsentNames>) => boolean;
	hasConsented: () => boolean;
	acceptAll: () => Promise<void>;
	rejectAll: () => Promise<void>;
	save: (consents: Partial<ConsentState>) => Promise<void>;
	showBanner: () => void;
	openDialog: () => void;
	closeDialog: () => void;
	setLanguage: (code: string) => void;
	identify: (user: KernelUser) => Promise<void>;
	mountUI: (options?: ConsentUIOptions) => ConsentUIHandle;
	dispose: () => void;
	/** Transport factories, for `init({ mode: c15t.hosted({ url }) })`. */
	hosted: typeof hosted;
	offline: typeof offline;
	custom: typeof custom;
	manifest: typeof manifest;
}

type GlobalWindow = Window & {
	[GLOBAL_NAME]?: C15tGlobal | QueuedCall[] | unknown;
};

/**
 * Put the API on `window.c15t`, replaying any calls a page queued as
 * `window.c15t = [['on', 'consent', fn]]` before the script loaded.
 *
 * @param api - The API object.
 */
export const installGlobal = function installGlobal(api: C15tGlobal): void {
	if (typeof window === 'undefined') {
		return;
	}
	const target = window as GlobalWindow;
	const existing = target[GLOBAL_NAME];
	target[GLOBAL_NAME] = api;
	if (!Array.isArray(existing)) {
		return;
	}
	for (const call of existing as QueuedCall[]) {
		const [method, ...args] = call;
		const fn = (api as unknown as Record<string, unknown>)[method];
		if (typeof fn === 'function') {
			(fn as (...params: unknown[]) => unknown)(...args);
		}
	}
};

/**
 * Build the global API object.
 *
 * @param context - Entry-point wiring (UI mounter, package name).
 * @returns The API, not yet installed on `window`.
 */
// oxlint-disable-next-line max-lines-per-function -- The API surface is one object.
export const createGlobal = function createGlobal(
	context: CreateConsentClientContext
): C15tGlobal {
	let client: ConsentClient | null = null;
	const clientReady = createDeferred<ConsentClient>();

	const require = function require(): ConsentClient {
		if (!client) {
			throw new Error(
				'@c15t/browser: call c15t.init() first, or wait for c15t.ready().'
			);
		}
		return client;
	};

	const api: C15tGlobal = {
		acceptAll: () => require().acceptAll(),
		get client() {
			return client;
		},
		closeDialog: () => {
			require().closeDialog();
		},
		custom,
		devtools: null,
		dispose: () => {
			api.devtools?.destroy();
			api.devtools = null;
			client?.dispose();
			client = null;
		},
		getSnapshot: () => require().getSnapshot(),
		has: (condition) => require().has(condition),
		hasConsented: () => require().hasConsented(),
		hosted,
		identify: (user) => require().identify(user),
		init(options) {
			if (client) {
				return client;
			}
			const resolved =
				options ??
				readPageOptions(
					typeof document === 'undefined' ? null : document.currentScript
				).options;
			const created = createConsentClient(resolved, context);
			client = created;
			created.start();
			clientReady.resolve(created);
			return created;
		},
		manifest,
		get mode() {
			return client?.mode ?? null;
		},
		mountUI: (options) => require().mountUI(options),
		offline,
		on(event, listener) {
			let unsubscribe: Unsubscribe | null = null;
			let cancelled = false;
			const attach = async function attach(): Promise<void> {
				const resolvedClient = await clientReady.promise;
				if (!cancelled) {
					unsubscribe = resolvedClient.on(event, listener);
				}
			};
			void attach();
			return function off() {
				cancelled = true;
				unsubscribe?.();
			};
		},
		onInit(listener) {
			let cancelled = false;
			const attach = async function attach(): Promise<void> {
				const resolvedClient = await clientReady.promise;
				if (!cancelled) {
					listener(resolvedClient);
				}
			};
			void attach();
			return function off() {
				cancelled = true;
			};
		},
		openDialog: () => {
			require().openDialog();
		},
		pkg: context.pkg ?? '@c15t/browser',
		async ready() {
			const resolvedClient = await clientReady.promise;
			return resolvedClient.ready();
		},
		rejectAll: () => require().rejectAll(),
		save: (consents) => require().save(consents),
		setLanguage: (code) => {
			require().setLanguage(code);
		},
		showBanner: () => {
			require().showBanner();
		},
		subscribe: (listener) => require().subscribe(listener),
		version,
	};
	return api;
};

/**
 * Initialise from the script tag unless the page opted out.
 *
 * @param api - The installed API.
 * @returns The client, or `null` when the page asked to init itself.
 */
export const autoInit = function autoInit(
	api: C15tGlobal
): ConsentClient | null {
	if (typeof document === 'undefined') {
		return null;
	}
	const { manual, options } = readPageOptions(document.currentScript);
	if (manual || api.client) {
		return api.client;
	}
	return api.init(options);
};
