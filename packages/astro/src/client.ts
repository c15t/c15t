/**
 * `@c15t/astro/client` — the page-level consent runtime.
 *
 * Astro is an MPA and islands do not share a component tree, so there is
 * nothing for a provider to hang off. Instead the integration injects a
 * boot script that creates exactly one runtime per page; islands, plain
 * `<script>` tags and any framework on the page all read that one object.
 *
 * The runtime survives ClientRouter navigation: the module is evaluated
 * once and re-attaches to the swapped DOM on `astro:page-load` and
 * `astro:after-swap`, so consent state does not reset when a visitor moves
 * between pages.
 *
 * ```ts
 * import { getConsentClient } from '@c15t/astro/client';
 *
 * const c15t = getConsentClient();
 * c15t?.subscribe((snapshot) => console.log(snapshot.consents));
 * ```
 */

import type {
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	KernelUser,
	Unsubscribe,
} from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type {
	ConsentRuntime,
	ConsentRuntimeOptions,
	RuntimeIABOptions,
} from '@c15t/core/runtime';
import { setupColorScheme } from '@c15t/ui/utils/dom';

import { lazyCreateIAB, whenIABReady } from './browser/iab';
import { activateGatedScripts } from './browser/inline-scripts';
import { resolveTransportFactory } from './mode';
import type { C15tClientOptionsExtension, C15tResolvedOptions } from './types';
import { loadDialogAdapter } from './ui/adapter';
import type { ConsentDialogHandle, ConsentDialogKind } from './ui/adapter';

const GLOBAL_KEY = '__c15tAstro';

/**
 * Removes the page-swap listeners `boot()` installed, if any.
 *
 * A module-level slot rather than client state: there is one client per page
 * (`GLOBAL_KEY`), and `dispose()` is defined before `boot()` registers them.
 */
const NO_PAGE_SWAP_LISTENERS = (): void => {
	// Nothing booted, so nothing to remove.
};

let detachPageSwapListeners: () => void = NO_PAGE_SWAP_LISTENERS;
const COLOR_SCHEME_KEY = '__c15tAstroColorScheme';
const CONFIG_KEY = '__c15tAstroConfig';
const DIALOG_HOST_ID = 'c15t-dialog-host';

/** Attribute the server-rendered banner puts on its action buttons. */
export const ACTION_ATTRIBUTE = 'data-c15t-action';

/** Attribute selecting which dialog a `customize` action opens. */
export const DIALOG_ATTRIBUTE = 'data-c15t-dialog';

/** Actions the banner can trigger. */
export type ConsentAction = 'accept' | 'reject' | 'customize' | 'close';

/** The page-level consent client. */
export interface AstroConsentClient {
	/** The runtime that owns this page's kernel. */
	readonly runtime: ConsentRuntime;
	/** The resolved integration options. */
	readonly options: C15tResolvedOptions;
	/** The current consent snapshot. */
	getConsent: () => ConsentSnapshot;
	/**
	 * Observe consent changes.
	 *
	 * @param listener - Called with every new snapshot.
	 * @returns An unsubscribe function.
	 */
	subscribe: (listener: (snapshot: ConsentSnapshot) => void) => Unsubscribe;
	/**
	 * Open a dialog, mounting its island on first use.
	 *
	 * @param kind - `'preferences'` (default) or `'iab'`.
	 */
	openDialog: (kind?: ConsentDialogKind) => Promise<void>;
	/** Close the open dialog. */
	closeDialog: () => void;
	/** Accept every configured category. */
	acceptAll: () => Promise<void>;
	/** Reject everything but strictly necessary. */
	rejectAll: () => Promise<void>;
	/**
	 * Save a specific set of consents.
	 *
	 * @param consents - The categories to persist.
	 */
	save: (consents: Partial<ConsentState>) => Promise<void>;
	/**
	 * Associate this consent record with an external identity.
	 *
	 * @param user - The external user.
	 */
	identify: (user: KernelUser) => Promise<void>;
	/** Tear the runtime down. Mainly for tests. */
	dispose: () => void;
}

type ClientWindow = Window &
	typeof globalThis & {
		[GLOBAL_KEY]?: AstroConsentClient;
		[CONFIG_KEY]?: KernelConfig;
		[COLOR_SCHEME_KEY]?: () => void;
	};

const getWindow = function getWindow(): ClientWindow | undefined {
	return typeof window === 'undefined' ? undefined : (window as ClientWindow);
};

const readInlinedConfig = function readInlinedConfig(): KernelConfig {
	return getWindow()?.[CONFIG_KEY] ?? {};
};

/**
 * Apply the configured colour scheme, replacing any previous application.
 *
 * `setupColorScheme` is what toggles `c15t-dark` on `<html>` — the
 * stylesheet has no `prefers-color-scheme` block, so nothing is dark until
 * something sets that class. The inline `<head>` script gets the first
 * paint right; this keeps it right afterwards, following the system
 * setting as the visitor changes it.
 *
 * The disposer lives on `window` rather than in a module variable because
 * ClientRouter re-runs `boot()` against a document whose `<html>` class
 * list the swap may have replaced: re-applying needs to drop the previous
 * listener first, or every navigation leaks one.
 *
 * @param colorScheme - The resolved colour scheme.
 */
const applyColorScheme = function applyColorScheme(
	colorScheme: C15tResolvedOptions['colorScheme']
): void {
	const browserWindow = getWindow();
	if (!browserWindow) {
		return;
	}
	browserWindow[COLOR_SCHEME_KEY]?.();
	browserWindow[COLOR_SCHEME_KEY] = undefined;

	// `setupColorScheme` reaches for `matchMedia` whichever scheme it is
	// given, and a few embedded webviews do not have it. The boot is the
	// page's only entry point, so a throw here would take consent with it:
	// set the class by hand instead. `system` falls back to light, and it
	// has to say so — leaving the class alone would keep whatever a previous
	// scheme or a swapped-in dark shell had put there.
	if (typeof browserWindow.matchMedia !== 'function') {
		document.documentElement.classList.toggle(
			'c15t-dark',
			colorScheme === 'dark'
		);
		return;
	}

	browserWindow[COLOR_SCHEME_KEY] = setupColorScheme(colorScheme);
};

const ensureDialogHost = function ensureDialogHost(): HTMLElement {
	const existing = document.getElementById(DIALOG_HOST_ID);
	if (existing) {
		return existing;
	}
	const host = document.createElement('div');
	host.id = DIALOG_HOST_ID;
	document.body.appendChild(host);
	return host;
};

/**
 * Show or hide the server-rendered banner to match the kernel.
 *
 * The server already decided the initial state, so this only has to keep
 * the DOM honest afterwards — after a save, or after a ClientRouter
 * navigation replaced the markup.
 *
 * @param snapshot - The current kernel snapshot.
 */
export const syncBannerVisibility = function syncBannerVisibility(
	snapshot: ConsentSnapshot
): void {
	const banner = document.querySelector<HTMLElement>(
		'[data-testid="consent-banner-root"]'
	);
	if (!banner) {
		return;
	}
	const shouldShow = snapshot.activeUI === 'banner';
	banner.hidden = !shouldShow;
	banner.setAttribute('data-c15t-visible', shouldShow ? 'true' : 'false');
};

interface ResolvedAction {
	action: ConsentAction;
	dialog: ConsentDialogKind;
}

const resolveAction = function resolveAction(
	target: EventTarget | null
): ResolvedAction | null {
	if (!(target instanceof Element)) {
		return null;
	}
	const element = target.closest(`[${ACTION_ATTRIBUTE}]`);
	const action = element?.getAttribute(ACTION_ATTRIBUTE);
	if (
		action !== 'accept' &&
		action !== 'reject' &&
		action !== 'customize' &&
		action !== 'close'
	) {
		return null;
	}
	const dialog = element?.getAttribute(DIALOG_ATTRIBUTE);
	return { action, dialog: dialog === 'iab' ? 'iab' : 'preferences' };
};

const createClient = function createClient(
	options: C15tResolvedOptions,
	extension: C15tClientOptionsExtension = {}
): AstroConsentClient {
	const config = readInlinedConfig();
	const scripts = [...(options.scripts ?? []), ...(extension.scripts ?? [])];

	// The server already resolved translations into `prefetch`, which the
	// runtime prefers over anything it would derive from `i18n`.
	const runtime = createConsentRuntime({
		consentCategories: options.consentCategories,
		createIAB: lazyCreateIAB,
		i18n: options.i18n as ConsentRuntimeOptions['i18n'],
		// `RuntimeIABOptions` is the runtime's open-ended shape; the
		// integration option is the closed, documented subset of it.
		iab:
			options.iab === false
				? false
				: (options.iab as RuntimeIABOptions | undefined),
		mode: resolveTransportFactory(options.mode, {
			backendURL:
				options.mode.type === 'manifest' ? options.mode.backendURL : undefined,
			initPath: options.endpoints.initPath,
		}),
		pkg: '@c15t/astro',
		policies:
			options.mode.type === 'offline' ? options.mode.policyPacks : undefined,
		prefetch: config,
		scripts,
		storageConfig: options.storageConfig,
	});

	let dialog: ConsentDialogHandle | null = null;
	let dialogKind: ConsentDialogKind | null = null;
	let opening: Promise<void> | null = null;
	// `openDialog()` awaits an adapter import, IAB readiness and the mount
	// itself. `dispose()` can land in any of those gaps, and only destroys
	// the handle it can already see — so the open path checks this after
	// every await and cleans up anything it mounted too late.
	let disposed = false;

	const client: AstroConsentClient = {
		async acceptAll() {
			await runtime.kernel.commands.save('all');
		},
		closeDialog() {
			runtime.kernel.set.activeUI('none');
			dialog?.close();
		},
		dispose() {
			disposed = true;
			detachPageSwapListeners();
			void dialog?.destroy();
			dialog = null;
			dialogKind = null;
			runtime.dispose();
			const browserWindow = getWindow();
			if (browserWindow) {
				browserWindow[COLOR_SCHEME_KEY]?.();
				browserWindow[COLOR_SCHEME_KEY] = undefined;
				browserWindow[GLOBAL_KEY] = undefined;
			}
		},
		getConsent() {
			return runtime.kernel.getSnapshot();
		},
		async identify(user: KernelUser) {
			await runtime.identify(user);
		},
		async openDialog(kind: ConsentDialogKind = 'preferences') {
			if (disposed) {
				return;
			}
			if (opening) {
				await opening;
			}
			if (disposed) {
				return;
			}
			if (dialog && dialogKind !== kind) {
				await dialog.destroy();
				dialog = null;
			}
			if (!dialog) {
				opening = (async () => {
					const adapter = await loadDialogAdapter(options.ui);
					if (disposed) {
						return;
					}
					if (kind === 'iab') {
						// The IAB surface renders against `runtime.iab`, which is
						// a lazy proxy until `@c15t/iab` lands.
						await whenIABReady();
						if (disposed) {
							return;
						}
					}
					const handle = await adapter.mount({
						kind,
						options,
						runtime,
						target: ensureDialogHost(),
					});
					if (disposed) {
						// Disposal happened during the mount, so nothing will
						// ever ask for this handle again — tear it down here.
						await handle.destroy();
						return;
					}
					dialog = handle;
					dialogKind = kind;
				})();
				try {
					await opening;
				} finally {
					opening = null;
				}
			}
			if (disposed) {
				return;
			}
			runtime.kernel.set.activeUI('dialog');
		},
		options,
		async rejectAll() {
			await runtime.kernel.commands.save('none');
		},
		runtime,
		async save(consents: Partial<ConsentState>) {
			await runtime.kernel.commands.save(consents);
		},
		subscribe(listener) {
			return runtime.kernel.subscribe(listener);
		},
	};

	return client;
};

const attach = function attach(client: AstroConsentClient): void {
	const snapshot = client.getConsent();
	syncBannerVisibility(snapshot);
	activateGatedScripts(snapshot);
};

/**
 * The page's consent client, if the integration has booted.
 *
 * @returns The client, or `null` outside the browser or before boot.
 */
export const getConsentClient =
	function getConsentClient(): AstroConsentClient | null {
		return getWindow()?.[GLOBAL_KEY] ?? null;
	};

/**
 * Wire the delegated handler for the server-rendered banner's buttons.
 *
 * The banner ships zero framework JavaScript: the buttons carry
 * `data-c15t-action` and one document-level listener turns them into
 * runtime calls. Calling this more than once is a no-op.
 */
export const attachBannerActions = function attachBannerActions(): void {
	const browserWindow = getWindow() as
		| (ClientWindow & { __c15tAstroActions?: boolean })
		| undefined;
	if (!browserWindow || browserWindow.__c15tAstroActions) {
		return;
	}
	browserWindow.__c15tAstroActions = true;

	document.addEventListener('click', (event) => {
		const resolved = resolveAction(event.target);
		if (!resolved) {
			return;
		}
		const client = getConsentClient();
		if (!client) {
			return;
		}
		event.preventDefault();
		if (resolved.action === 'accept') {
			void client.acceptAll();
			return;
		}
		if (resolved.action === 'reject') {
			void client.rejectAll();
			return;
		}
		if (resolved.action === 'customize') {
			void client.openDialog(resolved.dialog);
			return;
		}
		client.closeDialog();
	});
};

/**
 * Create the page's consent runtime, or return the existing one.
 *
 * The integration calls this from the script it injects into every page;
 * application code uses {@link getConsentClient} instead.
 *
 * @param options - The serialized integration options.
 * @param extension - Non-serializable additions from `clientEntrypoint`.
 * @returns The page-level consent client.
 */
export const boot = function boot(
	options: C15tResolvedOptions,
	extension: C15tClientOptionsExtension = {}
): AstroConsentClient {
	const browserWindow = getWindow();
	if (!browserWindow) {
		throw new Error('@c15t/astro: boot() requires a browser environment.');
	}
	const existing = browserWindow[GLOBAL_KEY];
	if (existing) {
		return existing;
	}

	const client = createClient(options, extension);
	browserWindow[GLOBAL_KEY] = client;
	client.runtime.start();
	applyColorScheme(options.colorScheme);
	attachBannerActions();

	client.subscribe((snapshot) => {
		syncBannerVisibility(snapshot);
		activateGatedScripts(snapshot);
	});

	// The ClientRouter replaces the document without re-evaluating modules,
	// so the runtime survives but its DOM does not. Re-attach to the new
	// markup instead of rebuilding consent state. The swap also replaces the
	// `<html>` attributes, taking `c15t-dark` with them, so the colour
	// scheme is applied again against the new document.
	const onAfterSwap = function onAfterSwap(): void {
		applyColorScheme(options.colorScheme);
		attach(client);
	};
	const onPageLoad = function onPageLoad(): void {
		attach(client);
	};
	document.addEventListener('astro:after-swap', onAfterSwap);
	document.addEventListener('astro:page-load', onPageLoad);
	// Without this, a dispose-then-boot leaves the old handlers on the
	// document, and the next swap reattaches a client that is already gone.
	detachPageSwapListeners = (): void => {
		document.removeEventListener('astro:after-swap', onAfterSwap);
		document.removeEventListener('astro:page-load', onPageLoad);
		detachPageSwapListeners = NO_PAGE_SWAP_LISTENERS;
	};

	attach(client);
	return client;
};

/**
 * The current consent snapshot.
 *
 * @returns The snapshot, or `null` before boot.
 */
export const getConsent = function getConsent(): ConsentSnapshot | null {
	return getConsentClient()?.getConsent() ?? null;
};

/**
 * Observe consent changes.
 *
 * @param listener - Called with every new snapshot.
 * @returns An unsubscribe function. A no-op before boot.
 */
export const subscribe = function subscribe(
	listener: (snapshot: ConsentSnapshot) => void
): Unsubscribe {
	const client = getConsentClient();
	if (!client) {
		return () => {
			/* not booted */
		};
	}
	return client.subscribe(listener);
};

/**
 * Open a consent dialog.
 *
 * @param kind - `'preferences'` (default) or `'iab'`.
 */
export const openDialog = async function openDialog(
	kind: ConsentDialogKind = 'preferences'
): Promise<void> {
	await getConsentClient()?.openDialog(kind);
};

/**
 * Download the dialog surface's chunks without mounting it.
 *
 * Use it from an idle callback when the first open needs to feel instant;
 * skip it when you would rather not spend the bytes on visitors who never
 * open the preference centre.
 */
export const preloadDialog = async function preloadDialog(): Promise<void> {
	const client = getConsentClient();
	if (!client) {
		return;
	}
	const adapter = await loadDialogAdapter(client.options.ui);
	await adapter.preload?.();
};

export { activateGatedScripts } from './browser/inline-scripts';
export type { ConsentRuntime } from '@c15t/core/runtime';
export type { ConsentDialogKind } from './ui/adapter';
export { registerDialogAdapter, registerDialogSurface } from './ui/adapter';
export type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
	ConsentDialogSurfaceLoader,
} from './ui/adapter';
