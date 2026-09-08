import type {
	AllConsentNames,
	Callbacks,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	HasCondition,
	I18nConfig,
	KernelActiveUI,
	KernelConfig,
	KernelOverrides,
	KernelUser,
	LegalLinks,
	PolicyConfig,
	policyPackPresets,
	ProviderTransportFactory,
	Script,
	StorageConfig,
	Unsubscribe,
} from '@c15t/core';
import type {
	ConsentRuntime,
	ConsentRuntimeOptions,
	RuntimeNetworkBlockerOptions,
} from '@c15t/core/runtime';
import type { ConsentManifest } from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';

/**
 * The transports a script-tag site can name without importing anything.
 *
 * - `hosted` — `GET /init` and `POST /subjects` against `backendURL`.
 * - `offline` — no backend; policy resolved from `policies` (or a default
 *   opt-in banner) and consent kept in the browser only.
 * - `manifest` — the backend's cacheable `/manifest` inlined or fetched,
 *   resolved locally so the banner can render without waiting on `/init`.
 */
export type ConsentModeName = 'hosted' | 'offline' | 'manifest';

/** A built-in policy pack, by the name `policyPackPresets` exports it under. */
export type PolicyPresetName = keyof typeof policyPackPresets;

/** Corner the floating preferences button docks to. */
export type TriggerPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

/** Copy and behaviour overrides for the cookie banner. */
export interface ConsentBannerOptions {
	/** Heading. Defaults to the resolved translation. */
	title?: string;
	/** Body copy. Defaults to the resolved translation. */
	description?: string;
	/** "Accept all" label. */
	acceptButtonText?: string;
	/** "Reject all" label. */
	rejectButtonText?: string;
	/** "Customize" label. */
	customizeButtonText?: string;
	/** Drop the "Secured by c15t" tag. */
	hideBranding?: boolean;
	/** Which legal links to render inline. `null` renders none. */
	legalLinks?: (keyof LegalLinks)[] | null;
	/** Dim the page and stop it scrolling while the banner is up. */
	scrollLock?: boolean;
	/** Keep keyboard focus inside the banner. Defaults to `true`. */
	trapFocus?: boolean;
}

/** Overrides for the preference centre dialog. */
export interface ConsentDialogOptions {
	/** Drop the "Secured by c15t" tag. */
	hideBranding?: boolean;
	/** Which legal links to render inline. `null` renders none. */
	legalLinks?: (keyof LegalLinks)[] | null;
}

/** The floating button that reopens the preference centre. */
export interface ConsentTriggerOptions {
	/** Corner to dock to. Defaults to `bottom-right`. */
	position?: TriggerPosition;
	/** Button size. Defaults to `md`. */
	size?: 'sm' | 'md' | 'lg';
	/**
	 * When to show it. `always` (default) whenever no other surface is
	 * open; `after-consent` only once the visitor has decided.
	 */
	showWhen?: 'always' | 'after-consent';
	/** Accessible name. */
	ariaLabel?: string;
	/** Remember a dragged-to corner in localStorage. Defaults to `true`. */
	persistPosition?: boolean;
}

/** How and where the prebuilt UI mounts. */
export interface ConsentUIOptions {
	/**
	 * Element (or selector) to append the UI host to. Defaults to
	 * `document.body`.
	 */
	container?: HTMLElement | string;
	/**
	 * Render inside a shadow root so the host page's CSS cannot restyle the
	 * banner and vice versa. Defaults to `true`; set `false` when you want
	 * to override the styles with your own stylesheet.
	 */
	shadow?: boolean;
	/** Colour scheme. Defaults to `system`. */
	colorScheme?: 'light' | 'dark' | 'system';
	/** Theme token overrides, the same shape `@c15t/react` accepts. */
	theme?: Theme;
	/** Extra CSS appended after the bundled stylesheet. */
	css?: string;
	/**
	 * Include the bundled stylesheet. Defaults to `true`. Set `false` when
	 * the page already loads `@c15t/browser/styles.css`.
	 */
	styles?: boolean;
	/** Ship the DOM without any class names, for fully custom CSS. */
	noStyle?: boolean;
	/** Skip enter and exit transitions. */
	disableAnimation?: boolean;
	/** Render the banner. Defaults to `true`. */
	banner?: boolean | ConsentBannerOptions;
	/** Render the preference centre. Defaults to `true`. */
	dialog?: boolean | ConsentDialogOptions;
	/** Render the floating reopen button. Defaults to `false`. */
	trigger?: boolean | ConsentTriggerOptions;
}

/**
 * Everything `init()` accepts. Every field is JSON-serialisable except
 * `mode` as a factory, `scripts` callbacks and `callbacks`, so the same
 * object works as `window.c15tConfig` on a no-code site.
 */
export interface ConsentClientOptions {
	/**
	 * Transport. A name picks one of the built-in modes; a factory from
	 * `hosted()`, `offline()`, `manifest()` or `custom()` is used as is.
	 * Defaults to `manifest` when a manifest is given, `hosted` when a
	 * `backendURL` is given, otherwise `offline`.
	 */
	mode?: ProviderTransportFactory | ConsentModeName;
	/** Backend origin for `hosted` and `manifest` modes. */
	backendURL?: string;
	/** Inline consent manifest for `manifest` mode. */
	manifest?: ConsentManifest;
	/** URL of the backend's `GET /manifest` for `manifest` mode. */
	manifestURL?: string;
	/**
	 * Policy packs for `offline` mode. A preset name such as
	 * `'europeOptIn'` stands in for `policyPackPresets.europeOptIn()`, so a
	 * JSON config or a `data-policies` attribute can name them.
	 */
	policies?: (PolicyConfig | PolicyPresetName)[];
	/** Categories the UI offers. Defaults to every category the policy allows. */
	consentCategories?: AllConsentNames[];
	/** Third-party scripts to load once their category is granted. */
	scripts?: Script[];
	/** Lifecycle callbacks. */
	callbacks?: Callbacks;
	/** Cookie and storage settings. */
	storageConfig?: StorageConfig;
	/** Known country, region, language or GPC signal. */
	overrides?: KernelOverrides;
	/**
	 * A server-resolved init answer. When it carries a policy and a
	 * decision the runtime renders from it and never calls `/init`.
	 */
	prefetch?: KernelConfig;
	/** Identified visitor. */
	user?: KernelUser;
	/** Locale and custom messages. */
	i18n?: Partial<I18nConfig>;
	/** Privacy policy, cookie policy and terms links. */
	legalLinks?: LegalLinks;
	/** Block network requests by URL until consent. */
	networkBlocker?: RuntimeNetworkBlockerOptions | false;
	/** Gate iframes by category. On by default. */
	iframeBlocker?: ConsentRuntimeOptions['iframeBlocker'];
	/** Reload the page when consent is withdrawn. Defaults to `true`. */
	reloadOnConsentRevoked?: boolean;
	/** `false` grants every category and mounts nothing. */
	enabled?: boolean;
	/** UI options, or `false` for headless use. */
	ui?: ConsentUIOptions | false;
	/** Package name reported on `window.c15t`. */
	pkg?: string;
}

/** Handle on a mounted UI. */
export interface ConsentUIHandle {
	/** The element appended to the container. */
	readonly host: HTMLElement;
	/** Where the surfaces render: the shadow root, or the host itself. */
	readonly root: ShadowRoot | HTMLElement;
	/** Re-render against the current snapshot. */
	update: () => void;
	/** Remove every surface and the host. */
	destroy: () => void;
}

/** Mounts the prebuilt UI for a client. */
export type ConsentUIMounter = (
	client: ConsentClient,
	options?: ConsentUIOptions
) => ConsentUIHandle;

/** Events a client emits, and their payloads. */
export interface ConsentClientEventMap {
	/** The policy resolved and the runtime is ready to render. */
	ready: ConsentSnapshot;
	/** A consent value changed. */
	consent: ConsentSnapshot;
	/** The surface the runtime wants shown changed. */
	ui: KernelActiveUI;
	/** A transport call failed. */
	error: unknown;
}

/** The page's consent client. */
export interface ConsentClient {
	/** The runtime that owns this page's kernel. */
	readonly runtime: ConsentRuntime;
	/** The kernel: snapshot, commands and events. */
	readonly kernel: ConsentKernel;
	/** The options the client was created with. */
	readonly options: ConsentClientOptions;
	/** Which transport is in use. */
	readonly mode: ConsentModeName | 'custom';
	/** Categories the UI should offer, after policy filtering. */
	readonly consentCategories: AllConsentNames[];
	/** The mounted UI, if any. */
	readonly ui: ConsentUIHandle | null;
	/** Whether `start()` has run. */
	readonly started: boolean;
	/** The current consent snapshot. */
	getSnapshot: () => ConsentSnapshot;
	/**
	 * Observe every snapshot change.
	 *
	 * @param listener - Called with each new snapshot.
	 * @returns An unsubscribe function.
	 */
	subscribe: (listener: (snapshot: ConsentSnapshot) => void) => Unsubscribe;
	/**
	 * Resolves once the policy is resolved and the UI can render. A
	 * returning visitor with stored consent resolves as soon as init lands
	 * too, so callers can rely on `hasConsented()` afterwards.
	 */
	ready: () => Promise<ConsentSnapshot>;
	/**
	 * Whether the given category (or condition) is granted.
	 *
	 * @param condition - A category name or a `has()` condition.
	 */
	has: (condition: HasCondition<AllConsentNames>) => boolean;
	/** Whether the visitor has already made a choice. */
	hasConsented: () => boolean;
	/** Grant every offered category and close the UI. */
	acceptAll: () => Promise<void>;
	/** Grant only strictly necessary and close the UI. */
	rejectAll: () => Promise<void>;
	/**
	 * Persist a specific set of consents and close the UI.
	 *
	 * @param consents - Categories to grant or deny.
	 */
	save: (consents: Partial<ConsentState>) => Promise<void>;
	/** Show the banner. */
	showBanner: () => void;
	/** Open the preference centre. */
	openDialog: () => void;
	/** Close the preference centre (or banner). */
	closeDialog: () => void;
	/**
	 * Switch language and re-resolve translations.
	 *
	 * @param code - A BCP 47 language tag.
	 */
	setLanguage: (code: string) => void;
	/**
	 * Replace the geo, language and GPC context.
	 *
	 * @param overrides - The new context.
	 */
	setOverrides: (overrides: KernelOverrides) => void;
	/**
	 * Associate the consent record with an external identity.
	 *
	 * @param user - The external user.
	 */
	identify: (user: KernelUser) => Promise<void>;
	/**
	 * Listen for a client event.
	 *
	 * @param event - The event name.
	 * @param listener - Called with the event payload.
	 * @returns An unsubscribe function.
	 */
	on: <EventName extends keyof ConsentClientEventMap>(
		event: EventName,
		listener: (payload: ConsentClientEventMap[EventName]) => void
	) => Unsubscribe;
	/**
	 * Mount the prebuilt UI. Throws in the headless build.
	 *
	 * @param options - UI options; defaults to `options.ui`.
	 */
	mountUI: (options?: ConsentUIOptions) => ConsentUIHandle;
	/** Start the runtime and mount the UI. Idempotent. */
	start: () => void;
	/** Tear everything down. */
	dispose: () => void;
}
