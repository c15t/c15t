import type {
	IABConfig,
	LegalLinks,
	ProviderTransportFactory,
} from '@c15t/core';
import type {
	ConsentRuntimeOptions,
	RuntimeGPPOptions,
	RuntimeNetworkBlockerOptions,
	RuntimePersistenceOptions,
	RuntimeScriptLoaderOptions,
} from '@c15t/core/runtime';
import type { CreateIABOptions } from '@c15t/iab';
import type { Theme, UIOptions } from '@c15t/ui/theme';

import type { DialogPreload } from './dialog-warming';

/** IAB options a provider accepts, or `false` to leave IAB unmounted. */
export type ProviderIABOptions =
	| (Partial<Omit<CreateIABOptions, 'kernel' | 'gvl'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>> &
			Partial<Pick<CreateIABOptions, 'gvl'>>)
	| false;

/**
 * Options for the script-loader module.
 *
 * The runtime's own contract, re-exported under this package's `use*`
 * naming so the Svelte hooks and the runtime cannot drift apart.
 *
 * @see {@link https://c15t.com/docs/frameworks/svelte/quickstart}
 */
export type UseScriptLoaderOptions = RuntimeScriptLoaderOptions;

/**
 * Options for the network-blocker module.
 *
 * The runtime's own contract, re-exported under this package's `use*`
 * naming so the Svelte hooks and the runtime cannot drift apart.
 */
export type UseNetworkBlockerOptions = RuntimeNetworkBlockerOptions;

/**
 * Options for the persistence module.
 *
 * The runtime's own contract, re-exported under this package's `use*`
 * naming so the Svelte hooks and the runtime cannot drift apart.
 */
export type UsePersistenceOptions = RuntimePersistenceOptions;

/**
 * Options accepted by `<ConsentManagerProvider>`.
 *
 * Everything except the fields below is the framework-agnostic
 * {@link ConsentRuntimeOptions} contract, forwarded untouched to
 * `createConsentRuntime()` from `@c15t/core/runtime`. `createIAB` and
 * `loadGPP` are supplied by this package, and `pkg` is fixed to
 * `'@c15t/svelte'`.
 * Policy rules are not a provider option: pass them to the transport as
 * `offline({ policyRules })`.
 */
export interface ConsentManagerOptions
	extends
		Omit<
			ConsentRuntimeOptions,
			'createIAB' | 'gpp' | 'iab' | 'loadGPP' | 'mode' | 'pkg' | 'policyRules'
		>,
		Pick<
			UIOptions,
			| 'colorScheme'
			| 'disableAnimation'
			| 'noStyle'
			| 'scrollLock'
			| 'trapFocus'
		> {
	/**
	 * Transport factory the provider builds its kernel with. Required.
	 *
	 * Pass `hosted()` to talk to a c15t backend, `offline()` to resolve
	 * policies locally with no network, or `custom()` to supply your own
	 * kernel transport or v2 endpoint handlers. This is an initial-only
	 * option: remount the provider to change it.
	 *
	 * @example
	 * ```svelte
	 * <script lang="ts">
	 *   import { ConsentManagerProvider, hosted } from '@c15t/svelte';
	 *
	 *   let { children } = $props();
	 * </script>
	 *
	 * <ConsentManagerProvider mode={hosted({ backendURL: '/api/c15t' })}>
	 *   {@render children()}
	 * </ConsentManagerProvider>
	 * ```
	 */
	mode: ProviderTransportFactory;
	/** IAB TCF configuration. Pass `false` to disable the TCF addon. */
	iab?: ProviderIABOptions;
	/**
	 * IAB Global Privacy Platform (GPP 1.1). Installs `window.__gpp` when
	 * the provider mounts and keeps the GPP string in step with the
	 * visitor's choices. `true` or `{}` uses the defaults; omitted or
	 * `false` leaves GPP off. The GPP code loads through a dynamic import
	 * of `@c15t/iab/gpp`, so apps that leave it off never download it.
	 *
	 * Ignored when you pass your own `runtime`: set `gpp` and `loadGPP` on
	 * that runtime instead. A load failure, or another CMP that already
	 * owns `__gpp`, is reported to `callbacks.onError`.
	 *
	 * @default undefined
	 * @see {@link https://c15t.com/docs/frameworks/svelte/gpp}
	 *
	 * @example
	 * ```svelte
	 * <ConsentManagerProvider
	 *   mode={hosted({ backendURL: '/api/c15t' })}
	 *   gpp={{ usApproach: 'national' }}
	 * >
	 *   {@render children()}
	 * </ConsentManagerProvider>
	 * ```
	 */
	gpp?: RuntimeGPPOptions | boolean;
	/** Links rendered in the banner and preference-center footers. */
	legalLinks?: LegalLinks;
	/**
	 * When `ConsentDialog` starts loading before its first open. It is not
	 * part of the first load: `'idle'` loads it in browser idle time after
	 * the page's load event while a button that opens it is mounted, and on
	 * hover or focus of that button. `'intent'` loads it on hover or focus
	 * only. Idle loading is skipped with Save-Data, on 2G connections and
	 * offline.
	 *
	 * @default 'idle'
	 */
	preloadDialog?: DialogPreload;
	/**
	 * Whether the stock surfaces add their own stylesheets.
	 *
	 * The standard and IAB banners and dialogs, dialog trigger, ConsentGate
	 * and preference widget each insert their rules into `<head>` as
	 * `<style>` elements, carrying `nonce`. On a server-rendered SvelteKit page,
	 * `c15tHandle` writes the banner's rules into the HTML. No c15t
	 * stylesheet `<link>` then holds back the page's first paint.
	 *
	 * Set `false` when the app imports `@c15t/svelte/styles.css` itself, for
	 * example to run it through Tailwind CSS 3 or to put it in a named
	 * cascade layer. IAB components also need `@c15t/svelte/iab/styles.css`.
	 *
	 * @default true
	 */
	styles?: boolean;
	/**
	 * Slot styles and consent-action variants. Design tokens (colors, dark,
	 * typography, spacing, radius, shadows, motion) are not applied in the
	 * browser: render `generateThemeCSS(theme)` from `@c15t/ui/theme` in a
	 * server `load` as `<style id="c15t-theme">` in `<svelte:head>`, or put
	 * its output in a stylesheet. In development the provider warns when
	 * `theme` has tokens and the page has no `#c15t-theme` element.
	 */
	theme?: Theme;
}

export type SvelteUIOptions = UIOptions;

/** Public policy lifecycle callbacks. */
export type ConsentProviderCallbacks = NonNullable<
	ConsentRuntimeOptions['callbacks']
>;
