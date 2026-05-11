import type { CreateIABOptions } from '@c15t/iab/v3';
import type { Theme, UIOptions } from '@c15t/ui/theme';
import type {
	AllConsentNames,
	Callbacks,
	I18nConfig,
	IABConfig,
	LegalLinks,
	NetworkBlockerConfig,
	PolicyConfig,
	StorageConfig,
	User,
} from 'c15t';
import type {
	KernelConfig,
	KernelOverrides,
	KernelTransport,
	KernelUser,
} from 'c15t/v3';
import type { IframeBlockerOptions } from 'c15t/v3/modules/iframe-blocker';
import type { NetworkBlockerRule } from 'c15t/v3/modules/network-blocker';
import type { PersistenceOptions } from 'c15t/v3/modules/persistence';
import type {
	Script,
	ScriptLoaderDebugEvent,
} from 'c15t/v3/modules/script-loader';

export type ProviderMode = 'hosted' | 'offline' | 'c15t';

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

export interface UsePersistenceOptions
	extends Omit<PersistenceOptions, 'kernel'> {}

export interface ConsentProviderOptions
	extends Pick<
		UIOptions,
		'colorScheme' | 'disableAnimation' | 'noStyle' | 'scrollLock' | 'trapFocus'
	> {
	enabled?: boolean;
	mode?: ProviderMode;
	backendURL?: string;
	domain?: string;
	headers?: Record<string, string>;
	customFetch?: typeof fetch;
	transport?: KernelTransport;
	storageConfig?: StorageConfig;
	user?: User | KernelUser;
	overrides?: KernelOverrides;
	prefetch?: KernelConfig;
	callbacks?: Callbacks;
	reloadOnConsentRevoked?: boolean;
	scripts?: Script[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	iframeBlocker?: Omit<IframeBlockerOptions, 'kernel'> | false;
	iab?: ProviderIABOptions;
	persistence?: boolean | UsePersistenceOptions;
	policies?: PolicyConfig[];
	i18n?: Partial<I18nConfig>;
	consentCategories?: AllConsentNames[];
	legalLinks?: LegalLinks;
	theme?: Theme;
}

export type SvelteUIOptions = UIOptions;
