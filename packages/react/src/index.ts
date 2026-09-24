/**
 * `@c15t/react` — React adapter for the c15t consent kernel.
 *
 * Pattern:
 *   import {
 *     ConsentProvider,
 *     hosted,
 *     useConsent,
 *     useSaveConsents,
 *   } from '@c15t/react';
 *
 *   function App({ children }) {
 *     return (
 *       <ConsentProvider options={{ mode: hosted({ url: '/api/c15t' }) }}>
 *         {children}
 *       </ConsentProvider>
 *     );
 *   }
 *
 *   function MarketingScripts() {
 *     const allowed = useConsent('marketing');
 *     return allowed ? <GoogleTagManager /> : null;
 *   }
 *
 * Design notes:
 * - Selector hooks subscribe via `useSyncExternalStore` so re-renders
 *   stay scoped to the exact slice each hook reads.
 * - Action hooks return stable kernel methods — no `useCallback` dance
 *   required at the consumer site.
 * - No provider-level useEffect syncing state into React state. No
 *   cache patching. No method rewriting. Provider boot work is explicit
 *   module wiring around a single per-mount kernel.
 */

// Re-export kernel types so consumers need only one import.
export type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	HostedTransportOptions,
	InitContext,
	InitResponse,
	InitResult,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTransport,
	KernelUser,
	Listener,
	HostedModeOptions,
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
	SavePayload,
	SaveResult,
	Unsubscribe,
} from '@c15t/core';
export { createConsentKernel, custom, hosted } from '@c15t/core';
export type { OfflineModeOptions } from './transports/offline';
export { offline } from './transports/offline';
export { ConsentDialog, ConsentWidget } from './aggregate-components';
export type {
	ConsentBannerButton,
	ConsentBannerLayout,
	ConsentBannerProps,
	ConsentBannerRight,
	ConsentBannerRightLinkProps,
	ConsentBannerRightsProps,
	ConsentBannerSurface,
} from './components/prompt';
// -- UI components ----------------------------------------------------------
export {
	ConsentBanner,
	type ConsentBannerCompoundComponent,
	useConsentBannerSurface,
} from './components/prompt';
export type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/panel';
export type { ConsentDialogLinkProps } from './components/panel-link';
export { ConsentDialogLink } from './components/panel-link';
export type {
	ConsentDialogTriggerProps,
	ConsentDialogTriggerToolbarAction,
	ConsentDialogTriggerToolbarPreferences,
	ConsentDialogTriggerToolbarProps,
	TriggerOrientation,
} from './components/panel-trigger';
export {
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
} from './components/panel-trigger';
export type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/preferences';
export type { FrameProps } from './components/frame';
export { Frame } from './components/frame';
export type {
	ConsentDraftHandle,
	ConsentDraftProviderProps,
	VendorDraftHandle,
} from './draft';
export { ConsentDraftProvider, useConsentDraft, useVendorDraft } from './draft';
export { useConsentManager } from './component-hooks/use-manager';
export { useTranslations } from './component-hooks/use-translations';
export {
	useActiveUI,
	useBranding,
	useConsent,
	useConsents,
	useHasConsentPolicy,
	useHasConsentUI,
	useIABEnabled,
	useIABSnapshot,
	useIdentify,
	useInit,
	useLocation,
	useModel,
	useOverrides,
	usePromptPresentation,
	usePolicyCategories,
	usePreferencesPresentation,
	usePolicyScopeMode,
	usePurposeConsent,
	useSaveConsents,
	useSetActiveUI,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
	useSpecialFeatureOptIn,
	useTCString,
	useUser,
	useDeclaredVendors,
	useVendorAllowed,
	useVendorChoice,
	useVendorConsent,
} from './hooks';
export type {
	UseIframeBlockerOptions,
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './module-hooks';
export {
	useIframeBlocker,
	useNetworkBlocker,
	usePersistence,
	useScriptLoader,
} from './module-hooks';
export type {
	ConsentProviderOptions,
	ConsentProviderCallbacks,
	ConsentProviderPrefetch,
	ConsentProviderProps,
	ExternalRuntimeProviderOptions,
	ExternalRuntimeProviderProps,
	OwnedRuntimeProviderProps,
} from './provider';
export { ConsentProvider } from './provider';
export type { ReactUIOptions } from './types/manager';
export { defineTheme, type Theme } from './types/theme';

export {
	useExplicitChoice,
	useEffectivePermissions,
	usePromptRequirement,
	useNoticeDismissal,
	usePrivacySignals,
	useOptOutDirectives,
	usePolicyResolution,
	usePolicyRule,
	useRestrictions,
	useDismissNotice,
} from './hooks';
export type {
	ConsentPresentation,
	PromptPresentation,
	PreferencesPresentation,
	PresentationAction,
	PromptPosition,
	PromptVariant,
	ResolvedConsentPresentation,
} from '@c15t/core';
