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
 * c15t?.subscribe((snapshot) => console.log(snapshot.effectivePermissions));
 * ```
 */

import { isVendorAllowed, watchRevocationReload } from '@c15t/core';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	KernelUser,
	LegalLinks,
	ResolvedVendor,
	Unsubscribe,
	VendorChoice,
} from '@c15t/core';
import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
import { createPersistence } from '@c15t/core/modules/persistence';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import type {
	ConsentRuntime,
	ConsentRuntimeOptions,
	RuntimeIABOptions,
} from '@c15t/core/runtime';
import {
	clearOnRevocationOnDemand,
	createConsentRuntimeWith,
	mountRuntimeIAB,
} from '@c15t/core/runtime/provider';
import type { ConsentRuntimeModules } from '@c15t/core/runtime/provider';
import {
	hasConsentPreferences,
	hasConsentUI,
	saveConsentBlanket,
	saveConsentSurface,
	showConsentSurface,
} from '@c15t/core/surface-actions';
import { setupColorScheme } from '@c15t/ui/utils/color-scheme';
import { setupFocusTrap, setupScrollLock } from '@c15t/ui/utils/dom';

import {
	IAB_PROMPT_SLOT_ATTRIBUTE,
	PROMPT_SLOT_ATTRIBUTE,
	readIABSpotModels,
} from './banner/slot';
import { reportUnhashedScripts } from './browser/csp-report';
import {
	keepDialogStylesOnSwap,
	loadDialogStyles,
} from './browser/dialog-styles';
import { lazyCreateIAB, whenIABReady } from './browser/iab';
import { activateGatedScripts } from './browser/inline-scripts';
import type * as PromptRenderer from './browser/render-prompt';
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

/**
 * Attribute selecting which tab the IAB preference centre opens on.
 *
 * The IAB banner's "N partners" link is a `customize` action that should
 * land on the vendors tab rather than purposes, the way the React, Svelte
 * and Vue banners do.
 */
export const DIALOG_TAB_ATTRIBUTE = 'data-c15t-tab';

/** Actions the banner can trigger. */
export type ConsentAction =
	| 'accept'
	| 'reject'
	| 'customize'
	| 'dismiss'
	| 'close';

/**
 * What {@link AstroConsentClient.save} records: categories to grant or
 * deny, and optionally per-vendor grants keyed by vendor id.
 */
export type AstroConsentSaveInput = Partial<ConsentState> & {
	/**
	 * Per-vendor grants keyed by the ids declared in `vendors`. `false` turns
	 * a vendor off inside a granted category. Vendors left out keep their
	 * recorded state. Ignored under an IAB policy.
	 */
	vendors?: Record<string, boolean>;
};

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
	 * @param tab - Which IAB preference-centre tab to land on. Ignored by
	 * the preferences dialog, which has no tabs.
	 */
	openDialog: (
		kind?: ConsentDialogKind,
		tab?: 'purposes' | 'vendors'
	) => Promise<void>;
	/** Close the open dialog. */
	closeDialog: () => void;
	/**
	 * Accept every category the policy offers. Under an IAB policy this
	 * accepts every purpose and vendor through the CMP, so the TC string
	 * records it. The open banner or dialog closes once the choice is
	 * recorded locally, before the backend answers.
	 */
	acceptAll: () => Promise<void>;
	/**
	 * Reject everything but strictly necessary, through the CMP under an IAB
	 * policy. Closes the open surface like {@link AstroConsentClient.acceptAll}.
	 */
	rejectAll: () => Promise<void>;
	/**
	 * Save a specific set of consents. The open banner or dialog closes once
	 * the choice is recorded locally.
	 *
	 * @param consents - The categories to persist, and optionally per-vendor
	 * grants under `vendors`.
	 * @example
	 * ```ts
	 * await getConsentClient()?.save({
	 *   measurement: true,
	 *   vendors: { posthog: false },
	 * });
	 * ```
	 */
	save: (consents: AstroConsentSaveInput) => Promise<void>;
	/**
	 * Vendors declared for vendor-level consent: from the `vendors` option,
	 * the backend manifest, and the slugs on scripts and iframes. Empty under
	 * an IAB policy, where the TC string decides.
	 */
	getDeclaredVendors: () => readonly ResolvedVendor[];
	/**
	 * The visitor's recorded vendor decision: the ids they turned off.
	 *
	 * @returns The decision, whose `denied` list is empty after a bulk action
	 * lifted every denial, or `null` when no vendor decision was recorded.
	 */
	getVendorChoice: () => Readonly<VendorChoice> | null;
	/**
	 * Whether a vendor may load: it is declared, its category condition
	 * passes, and outside an IAB policy the visitor has not turned it off.
	 *
	 * @param vendorId - Vendor id as declared in `vendors`, on a script or by
	 * the backend.
	 * @returns `true` while the vendor may load. An id nothing declares, such
	 * as a typo, returns `false` and logs a development warning.
	 * @example
	 * ```ts
	 * const client = getConsentClient();
	 * client?.subscribe(() => {
	 *   if (client.isVendorAllowed('youtube')) {
	 *     mountVideo();
	 *   }
	 * });
	 * ```
	 */
	isVendorAllowed: (vendorId: string) => boolean;
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

/**
 * The boot payload the server rendered.
 *
 * The components write it as a JSON data block. A page that sets
 * `window.__c15tAstroConfig` itself, with `buildConfigScript()`, still
 * wins, as before the data block existed.
 *
 * @returns The payload, or an empty config when the page has none.
 */
const readInlinedConfig = function readInlinedConfig(): KernelConfig {
	const assigned = getWindow()?.[CONFIG_KEY];
	if (assigned) {
		return assigned;
	}
	const block = document.querySelector(
		'script[type="application/json"][data-c15t-config]'
	);
	if (!block?.textContent) {
		return {};
	}
	try {
		return JSON.parse(block.textContent) as KernelConfig;
	} catch {
		return {};
	}
};

/**
 * The page's Content Security Policy nonce, read once at boot.
 *
 * Module state because the gated-script and stylesheet passes run from
 * document listeners that only see the client. A ClientRouter swap keeps
 * the first document's policy, so the first page's nonce stays the right
 * one for the rest of the visit; {@link adoptPageNonce} moves each incoming
 * page onto it.
 */
let pageNonce: string | undefined;

/**
 * The scripts that carry the boot payload: the config data block, or a
 * page's own `buildConfigScript()` script, which has no marker.
 *
 * @param root - The document to read.
 * @returns The config scripts, in document order.
 */
const configScripts = function configScripts(
	root: Document
): HTMLScriptElement[] {
	return Array.from(root.scripts).filter(
		(element) =>
			element.hasAttribute('data-c15t-config') ||
			element.textContent?.startsWith(`window.${CONFIG_KEY}=`)
	);
};

/** An element's nonce, read the way {@link readPageNonce} explains. */
const nonceOf = function nonceOf(element: HTMLElement): string | undefined {
	return element.nonce || element.getAttribute('nonce') || undefined;
};

/**
 * The nonce the server put on the config data block, from
 * `Astro.locals.c15t.nonce`, or on a page's own `buildConfigScript()`
 * script.
 *
 * Read through the `nonce` property first: browsers hide the attribute's
 * value once a policy has checked it, but keep it on the property.
 *
 * @param root - The document to read. Defaults to the live page.
 * @returns The nonce, or `undefined` when the page was rendered without one.
 */
const readPageNonce = function readPageNonce(
	root: Document = document
): string | undefined {
	// A page that still assigns the payload with `buildConfigScript()` has
	// no `data-c15t-config` element; its own script carries the nonce.
	const scripts = configScripts(root);
	const script =
		scripts.find((element) => element.hasAttribute('data-c15t-config')) ??
		scripts[0];
	return script ? nonceOf(script) : undefined;
};

/**
 * The elements c15t renders with the page's nonce, and the gated tags it
 * activates with it. Nothing else on an incoming page is c15t's to change.
 */
const NONCE_BEARING_SELECTOR = [
	'script[data-c15t-config]',
	'script[data-c15t-inline]',
	'style#c15t-theme',
	'script[data-c15t-category]',
].join(', ');

/**
 * Move a page the ClientRouter is about to swap in onto the live nonce.
 *
 * With a nonce generated per request, the next page arrives with a new
 * nonce while the browser keeps enforcing the first response's policy.
 * Its c15t styles and scripts would be blocked, and its gated tags would
 * fail the nonce check in {@link activateGatedScripts}. The server issued
 * both nonces, so c15t's own elements and the gated tags carrying the
 * incoming one are given the live one.
 *
 * The incoming nonce is read from the page's config scripts, which an
 * HTML-injection hole on that page could also write. A planted config
 * script ahead of c15t's would otherwise name the attacker's nonce, and
 * the attacker's own elements would be handed the live one. So every config
 * script on the page has to agree, and only c15t's elements and gated tags
 * are rewritten: an arbitrary `<script nonce>` never is. A page whose only
 * config script is planted, because c15t rendered none, is not covered.
 *
 * @param incoming - The parsed next page from `astro:before-swap`.
 */
const adoptPageNonce = function adoptPageNonce(incoming: Document): void {
	if (!pageNonce) {
		return;
	}
	const nonces = new Set(configScripts(incoming).map(nonceOf));
	if (nonces.size > 1) {
		console.warn(
			'@c15t/astro: the next page has config scripts with different CSP nonces, so c15t did not move it onto the live nonce. Look for markup injected into that page.'
		);
		return;
	}
	const [incomingNonce] = nonces;
	if (!incomingNonce || incomingNonce === pageNonce) {
		return;
	}
	const elements = [
		...incoming.querySelectorAll<HTMLElement>(NONCE_BEARING_SELECTOR),
		...configScripts(incoming),
	];
	for (const element of new Set(elements)) {
		if (nonceOf(element) === incomingNonce) {
			element.setAttribute('nonce', pageNonce);
			element.nonce = pageNonce;
		}
	}
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
 * `'none'` drops any previous listener and stops there: the site owns the
 * class, so whatever it has put on `<html>` stays.
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
	if (colorScheme === 'none') {
		return;
	}

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
 * The legal links `<ConsentDialog legalLinks>` asked for.
 *
 * Read when the island mounts rather than at boot, so the list follows
 * the page a ClientRouter navigation swapped in.
 *
 * @returns The link keys, or `undefined` when the page asked for none.
 */
const readDialogLegalLinks = function readDialogLegalLinks():
	| (keyof LegalLinks)[]
	| undefined {
	const value = document
		.querySelector('[data-c15t-dialog-host="preferences"]')
		?.getAttribute('data-legal-links');
	if (value === null || value === undefined) {
		return undefined;
	}
	return value.split(/\s+/u).filter(Boolean) as (keyof LegalLinks)[];
};

/**
 * The `disableAnimation` prop of the `<ConsentDialog />` or
 * `<IABConsentDialog />` on the page.
 *
 * Read when the island mounts, like the legal links, so it follows the
 * page a ClientRouter navigation swapped in.
 *
 * @param kind - Which dialog is opening.
 * @returns The prop, or `undefined` when the page left it unset.
 */
const readDialogDisableAnimation = function readDialogDisableAnimation(
	kind: ConsentDialogKind
): boolean | undefined {
	const value = document
		.querySelector(`[data-c15t-dialog-host="${kind}"]`)
		?.getAttribute('data-disable-animation');
	if (value === 'true' || value === 'false') {
		return value === 'true';
	}
	return undefined;
};

/**
 * Undo the scroll lock and focus trap of a blocking banner, if one is
 * active. Module-level because the banner element can be replaced by a
 * ClientRouter swap while the lock is still held.
 */
let releaseBlocking: (() => void) | null = null;

/** A dialog warm-up in flight or done, so repeated hovers cost nothing. */
let warming: Promise<void> | null = null;

/**
 * Download the configured dialog adapter and its surface without mounting.
 *
 * @param client - The page's consent client.
 */
const loadDialogChunks = async function loadDialogChunks(
	client: AstroConsentClient
): Promise<void> {
	await Promise.all([
		(async () => {
			const adapter = await loadDialogAdapter(client.options.ui);
			await adapter.preload?.();
		})(),
		loadDialogStyles(pageNonce),
	]);
};

/**
 * Remounts a dialog that a ClientRouter navigation took off the page.
 * Keyed by client so it stays off the public {@link AstroConsentClient}.
 */
const dialogRecovery = new WeakMap<AstroConsentClient, () => Promise<void>>();

/**
 * Resolve once the initial policy resolution has settled.
 *
 * A page whose server did not inline a resolution boots with the init still
 * in flight, so a synchronous read of the snapshot would report "no policy"
 * for a policy that arrives a moment later. Waiting here lets `openDialog()`
 * calls made on page load (a `#c15t-preferences` link, a storybook, a host
 * script) decide against the settled answer instead of the pending one.
 *
 * @param kernel - The runtime's kernel.
 */
const whenPolicySettled = function whenPolicySettled(
	kernel: ConsentKernel
): Promise<void> {
	if (!kernel.getSnapshot().policyPending) {
		return Promise.resolve();
	}
	// oxlint-disable-next-line promise/avoid-new -- Bridges the kernel's subscription into one awaitable.
	return new Promise<void>((resolve) => {
		const unsubscribe = kernel.subscribe((snapshot) => {
			if (!snapshot.policyPending) {
				unsubscribe();
				resolve();
			}
		});
	});
};

/**
 * Show or hide the persistent consent controls the page rendered on the
 * server (`<ConsentDialogTrigger />`) as the policy resolution changes.
 *
 * With nothing to manage the controls stay hidden: before a rule resolves,
 * and under a `none` rule that owes no rights. They appear on their own once
 * a later init supplies a rule that does.
 *
 * @param snapshot - The current kernel snapshot.
 */
export const syncSurfaceVisibility = function syncSurfaceVisibility(
	snapshot: ConsentSnapshot
): void {
	const owesUi = hasConsentPreferences(snapshot);
	for (const control of document.querySelectorAll<HTMLElement>(
		'[data-c15t-surface="trigger"]'
	)) {
		control.hidden = !owesUi;
	}
};

const BANNER_ROOT_SELECTOR =
	'[data-testid="consent-banner-root"], [data-testid="iab-consent-banner-root"]';

/**
 * Show or hide the server-rendered banner to match the kernel.
 *
 * The server already decided the initial state, so this only has to keep
 * the DOM honest afterwards — after a save, or after a ClientRouter
 * navigation replaced the markup. A banner the server resolved as blocking
 * (`data-blocking="true"`) also locks scroll and traps focus in its card
 * while it is shown.
 *
 * @param snapshot - The current kernel snapshot.
 */
export const syncBannerVisibility = function syncBannerVisibility(
	snapshot: ConsentSnapshot
): void {
	const banner = document.querySelector<HTMLElement>(BANNER_ROOT_SELECTOR);
	if (!banner) {
		releaseBlocking?.();
		return;
	}
	const shouldShow = snapshot.activeUI === 'banner';
	banner.hidden = !shouldShow;
	banner.setAttribute('data-c15t-visible', shouldShow ? 'true' : 'false');

	const blocking = shouldShow && banner.dataset.blocking === 'true';
	for (const overlay of document.querySelectorAll<HTMLElement>(
		'[data-testid="consent-banner-overlay"], [data-testid="iab-consent-banner-overlay"]'
	)) {
		overlay.hidden = !blocking;
	}
	if (!blocking) {
		releaseBlocking?.();
		return;
	}
	if (releaseBlocking) {
		return;
	}
	const card =
		banner.querySelector<HTMLElement>(
			'[data-testid="consent-banner-card"], [data-testid="iab-consent-banner-card"]'
		) ?? banner;
	const unlockScroll = setupScrollLock();
	const releaseFocus = setupFocusTrap(card);
	releaseBlocking = () => {
		releaseFocus();
		unlockScroll();
		releaseBlocking = null;
	};
};

interface ResolvedAction {
	action: ConsentAction;
	dialog: ConsentDialogKind;
	tab?: 'purposes' | 'vendors';
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
		action !== 'dismiss' &&
		action !== 'close'
	) {
		return null;
	}
	const dialog = element?.getAttribute(DIALOG_ATTRIBUTE);
	const tab = element?.getAttribute(DIALOG_TAB_ATTRIBUTE);
	return {
		action,
		dialog: dialog === 'iab' ? 'iab' : 'preferences',
		tab: tab === 'vendors' || tab === 'purposes' ? tab : undefined,
	};
};

const NO_VENDORS: readonly ResolvedVendor[] = [];

/**
 * Stands in for a module the page script did not register.
 *
 * The integration's page script registers the script loader, the network
 * blocker and the `consentSource` connection whenever the site can
 * configure them, so this only runs under `boot()` without the
 * integration, which then fails loudly instead of dropping the option. A
 * fallback `import()` of these modules here would keep a site's
 * statically imported script loader in a chunk of its own.
 *
 * @param option - The option that needs the module.
 * @throws {Error} Always.
 */
const notRegistered = function notRegistered(option: string): never {
	throw new Error(
		`@c15t/astro: \`${option}\` needs the module the integration's page script registers.`
	);
};

/**
 * The runtime modules the page mounts. Data clearing loads on demand;
 * persistence, the iframe blocker and the IAB mount load with the page.
 * The boot script registers the script loader, the network blocker and a
 * `consentSource` connection for a site that can configure them.
 */
let pageRuntimeModules: ConsentRuntimeModules = {
	connectConsentSource: () => notRegistered('consentSource'),
	createClearOnRevocation: clearOnRevocationOnDemand,
	createIframeBlocker,
	createNetworkBlocker: ({ hold }) => {
		// Nothing will decide the held requests: fail them closed.
		hold?.block();
		return notRegistered('networkBlocker');
	},
	createPersistence,
	createScriptLoader: () => notRegistered('scripts'),
	createWindowDebug,
	mountIAB: mountRuntimeIAB,
	watchRevocationReload,
};

/**
 * Mount these module factories.
 *
 * The integration's boot script imports the script loader statically when
 * the site configures `scripts` (or a `clientEntrypoint` that may add
 * some), and the network blocker when it configures rules, so those ship
 * with the page instead of one round trip after it. A `clientEntrypoint`
 * that may add blocker rules gets the on-demand blocker. Call before
 * {@link boot}.
 *
 * @param modules - The module factories to mount.
 * @internal
 */
export const registerRuntimeModules = function registerRuntimeModules(
	modules: Partial<ConsentRuntimeModules>
): void {
	pageRuntimeModules = { ...pageRuntimeModules, ...modules };
};

const createClient = function createClient(
	options: C15tResolvedOptions,
	extension: C15tClientOptionsExtension = {}
): AstroConsentClient {
	const inlined = readInlinedConfig();
	pageNonce = readPageNonce();
	// A prerendered page inlines no clock: the build's would age every
	// stored record against the day the site was built.
	const config: KernelConfig =
		inlined.now === undefined ? { ...inlined, now: Date.now() } : inlined;
	const scripts = [...(options.scripts ?? []), ...(extension.scripts ?? [])];
	// Under Astro's CSP the config could not hash these, so say which ones
	// the policy will block. A page with a nonce runs under the site's own
	// policy, which the loader's nonce satisfies.
	if (options.csp && !pageNonce && extension.scripts?.length) {
		void reportUnhashedScripts(extension.scripts, options.csp);
	}

	// The server already resolved translations into `prefetch`, which the
	// runtime prefers over anything it would derive from `i18n`.
	const runtime = createConsentRuntimeWith(
		{
			callbacks: extension.callbacks,
			clearOnRevocation:
				extension.clearOnRevocation ?? options.clearOnRevocation,
			consentCategories: options.consentCategories,
			consentSource: extension.consentSource,
			createIAB: lazyCreateIAB,
			// The server resolved this request's arm into the prefetch. Without
			// one, no experiment runs: browser assignment would hold a banner
			// the server already rendered.
			experiment: config.initialExperiment ? options.experiment : undefined,
			i18n: options.i18n as ConsentRuntimeOptions['i18n'],
			// `RuntimeIABOptions` is the runtime's open-ended shape; the
			// integration option is the closed, documented subset of it.
			iab:
				options.iab === false
					? false
					: (options.iab as RuntimeIABOptions | undefined),
			mode: resolveTransportFactory(options.mode, {
				backendURL:
					options.mode.type === 'manifest'
						? options.mode.backendURL
						: undefined,
				initPath: options.endpoints.initPath,
			}),
			networkBlocker: extension.networkBlocker ?? options.networkBlocker,
			nonce: pageNonce,
			pkg: '@c15t/astro',
			policyRules:
				options.mode.type === 'offline' ? options.mode.policyRules : undefined,
			prefetch: config,
			presentation: options.presentation,
			reloadOnConsentRevoked: options.reloadOnConsentRevoked,
			scripts,
			storageConfig: options.storageConfig,
			theme: options.theme,
			vendors: options.vendors,
		},
		pageRuntimeModules
	);

	let dialog: ConsentDialogHandle | null = null;
	let dialogKind: ConsentDialogKind | null = null;
	let dialogTab: 'purposes' | 'vendors' | undefined;
	let dialogTarget: HTMLElement | null = null;
	let opening: Promise<void> | null = null;
	// `openDialog()` awaits an adapter import, IAB readiness and the mount
	// itself. `dispose()` can land in any of those gaps, and only destroys
	// the handle it can already see — so the open path checks this after
	// every await and cleans up anything it mounted too late.
	let disposed = false;

	// The ClientRouter replaces `<body>`, and the dialog host with it. A
	// surface mounted into the old one is off the page, so reusing its
	// handle would open a dialog nobody can see.
	const releaseDetachedDialog = function releaseDetachedDialog(): boolean {
		if (!dialog || dialogTarget?.isConnected) {
			return false;
		}
		// Not awaited: an outro running on a detached node may never end.
		void dialog.destroy();
		dialog = null;
		dialogKind = null;
		dialogTarget = null;
		return true;
	};

	const client: AstroConsentClient = {
		// Under an IAB policy the blanket goes through the CMP handle, so the
		// TC string records it. Any surface closes on the local record.
		async acceptAll() {
			await saveConsentBlanket(runtime.kernel, 'all', runtime.iab);
		},
		closeDialog() {
			showConsentSurface(runtime.kernel, 'none');
			dialog?.close();
		},
		dispose() {
			if (disposed) {
				// A retained reference to a disposed client must not tear down
				// the replacement that booted after it: the colour-scheme
				// disposer and the page-swap listeners are window-owned, and
				// the second call would be running the new client's.
				return;
			}
			disposed = true;
			warming = null;
			detachPageSwapListeners();
			releaseBlocking?.();
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
		getDeclaredVendors() {
			const snapshot = runtime.kernel.getSnapshot();
			return snapshot.model === 'iab'
				? NO_VENDORS
				: (snapshot.vendors?.declared ?? NO_VENDORS);
		},
		getVendorChoice() {
			return runtime.kernel.getSnapshot().vendorChoice;
		},
		async identify(user: KernelUser) {
			await runtime.identify(user);
		},
		isVendorAllowed(vendorId: string) {
			return isVendorAllowed(runtime.kernel.getSnapshot(), vendorId);
		},
		async openDialog(
			kind: ConsentDialogKind = 'preferences',
			tab?: 'purposes' | 'vendors'
		) {
			if (disposed) {
				return;
			}
			if (extension.consentSource) {
				showConsentSurface(runtime.kernel, 'dialog');
				return;
			}
			// Decide against the settled resolution: an init still in flight is
			// not "no policy". Nothing to open without a rule that owes UI, which
			// excludes a `none` rule with no rights.
			await whenPolicySettled(runtime.kernel);
			if (disposed || !hasConsentUI(runtime.kernel.getSnapshot())) {
				return;
			}
			if (opening) {
				await opening;
			}
			if (disposed) {
				return;
			}
			releaseDetachedDialog();
			// The tab lives in the island's own component state, so asking
			// for a different one on an already-mounted surface means
			// remounting it. Checked after any pending mount has settled, so
			// a "N partners" click that lands while "Customize" is still
			// loading the island is honoured rather than dropped.
			if (
				dialog &&
				(dialogKind !== kind || (tab !== undefined && tab !== dialogTab))
			) {
				await dialog.destroy();
				dialog = null;
			}
			if (!dialog) {
				opening = (async () => {
					// The stylesheets load beside the island, and the mount waits
					// for both so the dialog never paints without its rules.
					const [adapter] = await Promise.all([
						loadDialogAdapter(options.ui),
						loadDialogStyles(pageNonce),
					]);
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
					const target = ensureDialogHost();
					const handle = await adapter.mount({
						kind,
						legalLinks:
							kind === 'preferences' ? readDialogLegalLinks() : undefined,
						options: {
							...options,
							disableAnimation:
								readDialogDisableAnimation(kind) ?? options.disableAnimation,
						},
						runtime,
						tab,
						target,
					});
					if (disposed) {
						// Disposal happened during the mount, so nothing will
						// ever ask for this handle again — tear it down here.
						await handle.destroy();
						return;
					}
					dialog = handle;
					dialogKind = kind;
					dialogTab = tab;
					dialogTarget = target;
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
			showConsentSurface(runtime.kernel, 'dialog');
		},
		options,
		async rejectAll() {
			await saveConsentBlanket(runtime.kernel, 'none', runtime.iab);
		},
		runtime,
		async save(consents: AstroConsentSaveInput) {
			await saveConsentSurface(runtime.kernel, () =>
				runtime.kernel.commands.save(consents)
			);
		},
		subscribe(listener) {
			return runtime.kernel.subscribe(listener);
		},
	};

	// A dialog that was open when the page swapped stays open on the new
	// page, as it does under the React, Svelte and Vue providers.
	dialogRecovery.set(client, async () => {
		await opening?.catch(() => undefined);
		const kind = dialogKind ?? 'preferences';
		const tab = dialogTab;
		const wasOpen = runtime.kernel.getSnapshot().activeUI === 'dialog';
		if (disposed || !releaseDetachedDialog() || !wasOpen) {
			return;
		}
		await client.openDialog(kind, tab);
	});

	return client;
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

/** A banner render in flight, and the client and page it started for. */
interface PendingPromptRender {
	client: AstroConsentClient;
	body: HTMLElement;
}

let promptRender: PendingPromptRender | null = null;

type PromptRendererModule = typeof PromptRenderer;

const loadDefaultPromptRenderer = (): Promise<PromptRendererModule> =>
	import('./browser/render-prompt');

let loadPromptRenderer = loadDefaultPromptRenderer;

/**
 * Replaces how the banner renderer chunk is loaded, so a test can make it
 * fail. Call with no argument to restore the real one.
 *
 * Tests only.
 *
 * @internal
 */
export const setPromptRendererLoaderForTest =
	function setPromptRendererLoaderForTest(
		loader?: () => Promise<PromptRendererModule>
	): void {
		loadPromptRenderer = loader ?? loadDefaultPromptRenderer;
	};

/** How often a client tries to load the banner renderer before giving up. */
const MAX_PROMPT_LOAD_ATTEMPTS = 3;

/** Failed renderer loads per client, for the retry back-off. */
const promptLoadFailures = new WeakMap<AstroConsentClient, number>();

const SPOT_SELECTOR = `[${PROMPT_SLOT_ATTRIBUTE}], [${IAB_PROMPT_SLOT_ATTRIBUTE}]`;

/** Whether the banner is still owed and nothing has rendered one yet. */
const owesBanner = function owesBanner(client: AstroConsentClient): boolean {
	return (
		getConsentClient() === client &&
		client.getConsent().activeUI === 'banner' &&
		document.querySelector(BANNER_ROOT_SELECTOR) === null
	);
};

/**
 * Whether the IAB banner's spot answers the snapshot.
 *
 * An IAB policy goes to the IAB spot while its IAB state loads. Once that
 * state is definitively disabled (no usable vendor list) the policy runs as
 * opt-in, and the standard banner answers it instead.
 */
const iabSpotAnswers = function iabSpotAnswers(
	snapshot: ConsentSnapshot
): boolean {
	const iabSpot = document.querySelector(`[${IAB_PROMPT_SLOT_ATTRIBUTE}]`);
	return (
		iabSpot !== null &&
		snapshot.iab?.enabled !== false &&
		readIABSpotModels(iabSpot).includes(snapshot.policyRule.model)
	);
};

/**
 * Load the renderer for whichever spot answers the snapshot, and render.
 *
 * @returns `false` when the answer changed while the renderer loaded, so
 * the caller should choose again.
 */
const renderIntoAnsweringSpot = async function renderIntoAnsweringSpot(
	client: AstroConsentClient
): Promise<boolean> {
	if (iabSpotAnswers(client.getConsent())) {
		const { renderIABPromptIntoSlot } =
			await import('./browser/render-iab-prompt');
		if (!iabSpotAnswers(client.getConsent())) {
			return false;
		}
		if (owesBanner(client)) {
			renderIABPromptIntoSlot(client.getConsent(), client.options);
		}
		return true;
	}
	if (!document.querySelector(`[${PROMPT_SLOT_ATTRIBUTE}]`)) {
		return true;
	}
	const { renderPromptIntoSlot } = await loadPromptRenderer();
	if (iabSpotAnswers(client.getConsent())) {
		return false;
	}
	if (owesBanner(client)) {
		renderPromptIntoSlot(client.getConsent(), client.options);
	}
	return true;
};

/**
 * Fill whichever spot answers the current policy. An IAB policy goes to the
 * IAB banner's spot, and waits there until the vendor list arrives rather
 * than falling back to the standard banner; the next snapshot retries.
 *
 * @returns `false` when a renderer chunk failed to load.
 */
const renderPrompt = async function renderPrompt(
	client: AstroConsentClient
): Promise<boolean> {
	try {
		// A policy refresh during the import can change the answer; choose once
		// more. A second change in one render is left to the next snapshot.
		if (!(await renderIntoAnsweringSpot(client))) {
			await renderIntoAnsweringSpot(client);
		}
		if (getConsentClient() === client) {
			syncBannerVisibility(client.getConsent());
		}
		return true;
	} catch (error) {
		// Usually a network failure. The caller retries with a back-off.
		console.warn('@c15t/astro: the consent banner failed to load.', error);
		return false;
	}
};

/**
 * Run one render and release the in-flight marker it owns.
 *
 * @returns What to do next: `'again'` when a `ClientRouter` swap replaced
 * the page during the chunk import (the swap's own `attach()` found this
 * render in flight and stood down, so the new page still needs a look),
 * `'later'` when the renderer failed to load, and `'done'` otherwise.
 */
const runPromptRender = async function runPromptRender(
	pending: PendingPromptRender
): Promise<'again' | 'later' | 'done'> {
	const loaded = await renderPrompt(pending.client);
	if (promptRender !== pending) {
		return 'done';
	}
	promptRender = null;
	if (!loaded) {
		return 'later';
	}
	return document.body !== pending.body && getConsentClient() === pending.client
		? 'again'
		: 'done';
};

/**
 * Render a banner in the browser when the page owes one it does not have.
 *
 * `<ConsentBanner />` and `<IABConsentBanner />` leave a marked spot
 * wherever the server could not know the policy — a prerendered page in
 * hosted or manifest mode, or a server render whose init failed — and the
 * IAB banner also when there was no vendor list yet. Each renderer is its
 * own chunk, so a page that never needs one never downloads it.
 *
 * @param client - The page's consent client.
 * @param snapshot - The current kernel snapshot.
 */
const ensurePromptRendered = function ensurePromptRendered(
	client: AstroConsentClient,
	snapshot: ConsentSnapshot
): void {
	// A render for this client is already under way. One left over from a
	// disposed client does not count: its result is discarded.
	if (
		promptRender?.client === client ||
		snapshot.activeUI !== 'banner' ||
		document.querySelector(BANNER_ROOT_SELECTOR) ||
		!document.querySelector(SPOT_SELECTOR)
	) {
		return;
	}
	const pending = { body: document.body, client };
	promptRender = pending;
	void (async () => {
		const next = await runPromptRender(pending);
		if (next === 'again') {
			ensurePromptRendered(client, client.getConsent());
			return;
		}
		if (next !== 'later') {
			return;
		}
		// Without the renderer the visitor has no way to choose, so try again
		// after 1 s and 2 s before giving up.
		const failures = (promptLoadFailures.get(client) ?? 0) + 1;
		promptLoadFailures.set(client, failures);
		if (failures < MAX_PROMPT_LOAD_ATTEMPTS) {
			setTimeout(
				() => {
					if (getConsentClient() === client) {
						ensurePromptRendered(client, client.getConsent());
					}
				},
				1000 * 2 ** (failures - 1)
			);
		}
	})();
};

const attach = function attach(client: AstroConsentClient): void {
	const snapshot = client.getConsent();
	ensurePromptRendered(client, snapshot);
	syncBannerVisibility(snapshot);
	syncSurfaceVisibility(snapshot);
	activateGatedScripts(snapshot, document, pageNonce);
};

/**
 * Start downloading the preference dialog when a visitor points at or
 * focuses a control that opens it.
 *
 * The island loads on first open, so a click used to wait for the framework
 * runtime and the surface to download. Hover and focus usually come a few
 * hundred milliseconds before the click, and on touch `pointerover` fires
 * on the tap's `pointerdown`. A failed warm-up is forgotten, so the next
 * hover, focus or open tries again.
 *
 * @param event - A `pointerover` or `focusin` event from the document.
 */
const warmDialogOnIntent = function warmDialogOnIntent(event: Event): void {
	const resolved = resolveAction(event.target);
	const client = getConsentClient();
	if (
		warming ||
		!client ||
		resolved?.action !== 'customize' ||
		resolved.dialog !== 'preferences'
	) {
		return;
	}
	const attempt = (async () => {
		try {
			await loadDialogChunks(client);
		} catch {
			// The open reports its own failure.
			warming = null;
		}
	})();
	warming = attempt;
};

/**
 * Wire the delegated handler for the server-rendered banner's buttons.
 *
 * The banner ships zero framework JavaScript: the buttons carry
 * `data-c15t-action` and one document-level listener turns them into
 * runtime calls. Hovering or focusing a control that opens the preference
 * dialog starts downloading it. Calling this more than once is a no-op.
 */
export const attachBannerActions = function attachBannerActions(): void {
	const browserWindow = getWindow() as
		| (ClientWindow & { __c15tAstroActions?: boolean })
		| undefined;
	if (!browserWindow || browserWindow.__c15tAstroActions) {
		return;
	}
	browserWindow.__c15tAstroActions = true;

	document.addEventListener('pointerover', warmDialogOnIntent, {
		passive: true,
	});
	document.addEventListener('focusin', warmDialogOnIntent);

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
		if (resolved.action === 'dismiss') {
			void client.runtime.kernel.commands.dismissNotice();
			return;
		}
		if (resolved.action === 'accept') {
			void client.acceptAll();
			return;
		}
		if (resolved.action === 'reject') {
			void client.rejectAll();
			return;
		}
		if (resolved.action === 'customize') {
			void client.openDialog(resolved.dialog, resolved.tab);
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
		ensurePromptRendered(client, snapshot);
		syncBannerVisibility(snapshot);
		syncSurfaceVisibility(snapshot);
		activateGatedScripts(snapshot, document, pageNonce);
	});

	// The ClientRouter replaces the document without re-evaluating modules,
	// so the runtime survives but its DOM does not. Re-attach to the new
	// markup instead of rebuilding consent state. The swap also replaces the
	// `<html>` attributes, taking `c15t-dark` with them, so the colour
	// scheme is applied again against the new document.
	const onAfterSwap = function onAfterSwap(): void {
		applyColorScheme(options.colorScheme);
		attach(client);
		void dialogRecovery.get(client)?.();
	};
	const onPageLoad = function onPageLoad(): void {
		attach(client);
	};
	// The swap also drops every `<head>` element the next page lacks,
	// including the dialog stylesheets the client linked.
	const onBeforeSwap = function onBeforeSwap(event: Event): void {
		const incoming = (event as Event & { newDocument?: Document }).newDocument;
		if (incoming) {
			adoptPageNonce(incoming);
			keepDialogStylesOnSwap(incoming);
		}
	};
	document.addEventListener('astro:before-swap', onBeforeSwap);
	document.addEventListener('astro:after-swap', onAfterSwap);
	document.addEventListener('astro:page-load', onPageLoad);
	// Without this, a dispose-then-boot leaves the old handlers on the
	// document, and the next swap reattaches a client that is already gone.
	detachPageSwapListeners = (): void => {
		document.removeEventListener('astro:before-swap', onBeforeSwap);
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
 * @param tab - Which IAB preference-centre tab to open on.
 */
export const openDialog = async function openDialog(
	kind: ConsentDialogKind = 'preferences',
	tab?: 'purposes' | 'vendors'
): Promise<void> {
	await getConsentClient()?.openDialog(kind, tab);
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
	await loadDialogChunks(client);
};

export { activateGatedScripts } from './browser/inline-scripts';
export type { ConsentRuntime } from '@c15t/core/runtime';
export type { ResolvedVendor, VendorChoice } from '@c15t/core';
export type { ConsentDialogKind } from './ui/adapter';
export { registerDialogAdapter, registerDialogSurface } from './ui/adapter';
export { registerDialogStyles } from './browser/dialog-styles';
export type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
	ConsentDialogSurfaceLoader,
} from './ui/adapter';
