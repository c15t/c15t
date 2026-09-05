import type {
	AllConsentNames,
	ConsentPresentation,
	KernelEvent,
	I18nConfig,
	IABConfig,
	KernelConfig,
	KernelOverrides,
	KernelUser,
	LegalLinks,
	NetworkBlockerConfig,
	ProviderTransportFactory,
	StorageConfig,
	User,
} from '@c15t/core';
import type { IframeBlockerOptions } from '@c15t/core/modules/iframe-blocker';
import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import type { PersistenceOptions } from '@c15t/core/modules/persistence';
import type {
	Script,
	ScriptLoaderDebugEvent,
} from '@c15t/core/modules/script-loader';
import type { CreateIABOptions } from '@c15t/iab';
import type { Theme, UIOptions } from '@c15t/ui/theme';

export type ProviderIABOptions =
	| (Partial<Omit<CreateIABOptions, 'kernel' | 'gvl'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>> &
			Partial<Pick<CreateIABOptions, 'gvl'>>)
	| false;

export interface UseScriptLoaderOptions {
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
}

export interface UseNetworkBlockerOptions {
	rules: NetworkBlockerRule[];
	enabled?: boolean;
	logBlockedRequests?: boolean;
	onRequestBlocked?: NetworkBlockerConfig['onRequestBlocked'];
}

export type UsePersistenceOptions = Omit<PersistenceOptions, 'kernel'>;

export interface ConsentManagerOptions extends Pick<
	UIOptions,
	'colorScheme' | 'disableAnimation' | 'noStyle' | 'scrollLock' | 'trapFocus'
> {
	enabled?: boolean;
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
	 * </script>
	 *
	 * <ConsentManagerProvider options={{ mode: hosted({ url: '/api/c15t' }) }}>
	 *   <slot />
	 * </ConsentManagerProvider>
	 * ```
	 */
	mode: ProviderTransportFactory;
	storageConfig?: StorageConfig;
	user?: User | KernelUser;
	overrides?: KernelOverrides;
	prefetch?: Omit<KernelConfig, 'transport' | 'initialDraft'>;
	callbacks?: ConsentProviderCallbacks;
	presentation?: ConsentPresentation;

	scripts?: Script[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	iframeBlocker?: Omit<IframeBlockerOptions, 'kernel'> | false;
	iab?: ProviderIABOptions;
	persistence?: boolean | UsePersistenceOptions;
	i18n?: Partial<I18nConfig>;
	consentCategories?: AllConsentNames[];
	legalLinks?: LegalLinks;
	theme?: Theme;
}

export type SvelteUIOptions = UIOptions;

/** Callbacks for actual kernel events; registration never replays a choice. */
export interface ConsentProviderCallbacks {
	onChoiceRecorded?: (
		event: Omit<Extract<KernelEvent, { type: 'choice:recorded' }>, 'type'>
	) => void;
	onPermissionsChanged?: (
		event: Omit<Extract<KernelEvent, { type: 'permissions:changed' }>, 'type'>
	) => void;
	onError?: (event: { error: string }) => void;
}
