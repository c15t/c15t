import type {
	IABConfig,
	LegalLinks,
	ProviderTransportFactory,
} from '@c15t/core';
import type {
	ConsentRuntimeOptions,
	RuntimeNetworkBlockerOptions,
	RuntimePersistenceOptions,
	RuntimeScriptLoaderOptions,
} from '@c15t/core/runtime';
import type { CreateIABOptions } from '@c15t/iab';
import type { Theme, UIOptions } from '@c15t/ui/theme';

export type ProviderIABOptions =
	| (Partial<Omit<CreateIABOptions, 'kernel' | 'gvl'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>> &
			Partial<Pick<CreateIABOptions, 'gvl'>>)
	| false;

export type UseScriptLoaderOptions = RuntimeScriptLoaderOptions;

export type UseNetworkBlockerOptions = RuntimeNetworkBlockerOptions;

export type UsePersistenceOptions = RuntimePersistenceOptions;

/**
 * Options accepted by `<ConsentManagerProvider>`.
 *
 * Everything except the fields below is the framework-agnostic
 * {@link ConsentRuntimeOptions} contract, forwarded untouched to
 * `createConsentRuntime()` from `@c15t/core/runtime`. `createIAB` is
 * supplied by this package, and `pkg` is fixed to `'@c15t/svelte'`.
 */
export interface ConsentManagerOptions
	extends
		Omit<ConsentRuntimeOptions, 'createIAB' | 'iab' | 'mode' | 'pkg'>,
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
	 * <ConsentManagerProvider mode={hosted({ url: '/api/c15t' })}>
	 *   {@render children()}
	 * </ConsentManagerProvider>
	 * ```
	 */
	mode: ProviderTransportFactory;
	/** IAB TCF configuration. Pass `false` to disable the TCF addon. */
	iab?: ProviderIABOptions;
	/** Links rendered in the banner and preference-center footers. */
	legalLinks?: LegalLinks;
	/** Design-token overrides applied as a `<style id="c15t-theme">` block. */
	theme?: Theme;
}

export type SvelteUIOptions = UIOptions;
