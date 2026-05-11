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
export type {
	AllConsentNames,
	ConsentType,
	I18nConfig,
	LegalLinks,
	Translations,
} from 'c15t';
export { defaultTranslationConfig } from 'c15t';
export type {
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
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
	SavePayload,
	SaveResult,
	TranslationsResponse,
} from 'c15t/v3';
export { focusTrap } from './actions/focus-trap';
export { portal } from './actions/portal';
export { scrollLock } from './actions/scroll-lock';
export { default as ConsentBanner } from './components/consent-banner.svelte';
export { default as ConsentButton } from './components/consent-button.svelte';
export { default as ConsentDialog } from './components/consent-dialog.svelte';
export { default as ConsentDialogLink } from './components/consent-dialog-link.svelte';
export { default as ConsentDialogTrigger } from './components/consent-dialog-trigger.svelte';
export { default as ConsentProvider } from './components/consent-provider.svelte';
export { default as ConsentWidget } from './components/consent-widget.svelte';
export { default as Frame } from './components/frame.svelte';
export { default as IABConsentBanner } from './components/iab-consent-banner.svelte';
export { default as IABConsentDialog } from './components/iab-consent-dialog.svelte';
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
	ConsentProviderOptions,
	ProviderIABOptions,
	ProviderMode,
	SvelteUIOptions,
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './types';
