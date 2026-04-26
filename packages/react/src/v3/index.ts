/**
 * @c15t/react/v3 — kernel-consuming React adapter (experimental).
 *
 * Unstable. API may change before v3.0 stable.
 *
 * Pattern:
 *   import { ConsentProvider, useConsent, useSaveConsents } from '@c15t/react/v3';
 *
 *   function App({ children }) {
 *     return (
 *       <ConsentProvider options={{ mode: 'hosted', backendURL: '/api/c15t' }}>
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

// Re-export kernel types + factories so v3 consumers need only one import.
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
	SavePayload,
	SaveResult,
	Unsubscribe,
} from 'c15t/v3';
export {
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
} from 'c15t/v3';
export type {
	ConsentBannerButton,
	ConsentBannerLayout,
	ConsentBannerProps,
} from './components/consent-banner';
// -- UI components ----------------------------------------------------------
export {
	ConsentBanner,
	type ConsentBannerCompoundComponent,
} from './components/consent-banner';
export type { ConsentDialogProps } from './components/consent-dialog';
export {
	ConsentDialog,
	type ConsentDialogCompoundComponent,
} from './components/consent-dialog';
export type { ConsentDialogLinkProps } from './components/consent-dialog-link';
export { ConsentDialogLink } from './components/consent-dialog-link';
export type { ConsentDialogTriggerProps } from './components/consent-dialog-trigger';
export { ConsentDialogTrigger } from './components/consent-dialog-trigger';
export type { ConsentWidgetProps } from './components/consent-widget';
export { ConsentWidget } from './components/consent-widget';
export type { FrameProps } from './components/frame';
export { Frame } from './components/frame';
export type { ConsentDraftHandle, ConsentDraftProviderProps } from './draft';
export { ConsentDraftProvider, useConsentDraft } from './draft';
export {
	useActiveUI,
	useBranding,
	useConsent,
	useConsents,
	useHasConsented,
	useIABEnabled,
	useIABSnapshot,
	useIdentify,
	useInit,
	useLocation,
	useModel,
	useOverrides,
	usePolicy,
	usePolicyBanner,
	usePolicyCategories,
	usePolicyDecision,
	usePolicyDialog,
	usePolicyScopeMode,
	usePurposeConsent,
	useSaveConsents,
	useSetActiveUI,
	useSetConsent,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
	useSpecialFeatureOptIn,
	useTCString,
	useTranslations,
	useUser,
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
export type { ConsentProviderOptions, ConsentProviderProps } from './provider';
export { ConsentProvider } from './provider';
