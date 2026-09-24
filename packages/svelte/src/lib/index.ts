export {
	custom,
	defaultTranslationConfig,
	detectBrowserLanguage,
	hosted,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from '@c15t/core';
export type {
	AllConsentNames,
	ConsentType,
	I18nConfig,
	LegalLinks,
	Translations,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	GlobalVendorList,
	InitResponse,
	KernelActiveUI,
	KernelBranding,
	KernelConfig,
	KernelEvent,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	LocationResponse,
	NonIABVendor,
	PolicyScopeMode,
	HostedModeOptions,
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
	SavePayload,
	SaveResult,
	TranslationsResponse,
} from '@c15t/core';
export { createConsentRuntime } from '@c15t/core/runtime';
export type {
	ConsentRuntime,
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABHandle,
	ConsentRuntimeOptions,
} from '@c15t/core/runtime';
export * from '@c15t/ui/primitives';
export * from '@c15t/ui/styles/primitives';
export type {
	ColorTokens,
	ComponentSlots,
	MotionTokens,
	RadiusTokens,
	ShadowTokens,
	SlotStyle,
	SpacingTokens,
	Theme,
	TypographyTokens,
} from '@c15t/ui/theme';
export { focusTrap } from './actions/focus-trap';
export { portal } from './actions/portal';
export { scrollLock } from './actions/scroll-lock';
export { default as ConsentBanner } from './components/prompt.svelte';
export { default as ConsentButton } from './components/action-button.svelte';
export { default as ConsentDialog } from './components/panel.svelte';
export { default as ConsentDialogLink } from './components/panel-link.svelte';
export { default as ConsentDialogTrigger } from './components/panel-trigger.svelte';
export { default as ConsentManagerProvider } from './components/manager-provider.svelte';
export { default as ConsentWidget } from './components/preferences.svelte';
export { default as ConsentGate } from './components/consent-gate.svelte';
/** @deprecated Renamed to `ConsentGate`. */
export { default as Frame } from './components/consent-gate.svelte';
export { default as IABConsentBanner } from './components/iab-prompt.svelte';
export { default as IABConsentDialog } from './components/iab-panel.svelte';
export {
	getConsentKernel,
	getConsentManager,
	getHeadlessConsent,
	getIAB,
	getSnapshot,
	type HeadlessConsentSurfaceState,
	type SvelteIABState,
} from './context.svelte';
export {
	Accordion,
	Collapsible,
	Dialog,
	Portal,
	PreferenceItem,
	Switch,
	Tabs,
} from './primitives';
export type {
	ConsentManagerOptions,
	ConsentProviderCallbacks,
	ProviderIABOptions,
	SvelteUIOptions,
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './types';
export type { OfflineModeOptions } from './transports/offline';
export { offline } from './transports/offline';

export type { ConsentManagerState, ConsentDraftState } from './context.svelte';
export { resolveConsentPresentation } from '@c15t/core';
export type {
	ConsentPresentation,
	PresentationAction,
	ResolvedConsentPresentation,
} from '@c15t/core';
