// Core exports
export type {
	AllConsentNames,
	ConsentManagerInterface,
	ConsentStoreState,
	ConsentType,
	EuropePolicyMode,
	Overrides,
	PolicyPackPresets,
	Translations,
} from 'c15t';

export {
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	policyPackPresets,
	prepareTranslationConfig,
} from 'c15t';
export {
	ConsentBanner,
	type ConsentBannerProps,
} from './components/consent-banner';
export * from './components/consent-banner/components';
// Components
export {
	ConsentDialog,
	type ConsentDialogProps,
} from './components/consent-dialog';
export {
	ConsentDialogLink,
	type ConsentDialogLinkProps,
} from './components/consent-dialog-link';
// Consent Dialog Trigger (floating button for resurfacing consent dialogs)
export {
	ConsentDialogTrigger,
	type ConsentDialogTriggerCompound,
	type ConsentDialogTriggerProps,
	TriggerButton,
	type TriggerButtonProps,
	TriggerIcon,
	type TriggerIconProps,
	type TriggerIconType,
	// Atom components for direct usage
	TriggerRoot,
	type TriggerRootProps,
	type TriggerSize,
	TriggerText,
	type TriggerTextProps,
	type TriggerVisibility,
	type UseDraggableOptions,
	type UseDraggableReturn,
	// Hook and types
	useDraggable,
	useTriggerContext,
} from './components/consent-dialog-trigger';
export {
	ConsentWidget,
	type ConsentWidgetProps,
} from './components/consent-widget';
export { Frame, type FrameProps } from './components/frame';
// IAB TCF 2.3 Components
export {
	IABConsentBanner,
	type IABConsentBannerProps,
} from './components/iab-consent-banner';
export {
	IABConsentDialog,
	type IABConsentDialogProps,
} from './components/iab-consent-dialog';

export { ConsentButton } from './components/shared/primitives/button';

// Hooks
export { useColorScheme } from './hooks/use-color-scheme';
export {
	type ConsentDialogTriggerVisibility,
	type UseConsentDialogTriggerOptions,
	type UseConsentDialogTriggerResult,
	useConsentDialogTrigger,
} from './hooks/use-consent-dialog-trigger';
export { useConsentManager } from './hooks/use-consent-manager';
export { useFocusTrap } from './hooks/use-focus-trap';
export {
	type HeadlessConsentAction,
	type HeadlessConsentBannerAction,
	type HeadlessConsentBannerState,
	type HeadlessConsentDialogAction,
	type HeadlessConsentDialogState,
	type HeadlessConsentSurface,
	type HeadlessConsentSurfaceState,
	type UseHeadlessConsentUIResult,
	useHeadlessConsentUI,
} from './hooks/use-headless-consent-ui';
export {
	type HeadlessIABBannerAction,
	type HeadlessIABBannerState,
	type HeadlessIABDialogAction,
	type HeadlessIABDialogState,
	type HeadlessIABPreferenceTab,
	type UseHeadlessIABConsentUIResult,
	useHeadlessIABConsentUI,
} from './hooks/use-headless-iab-consent-ui';
export { useSSRStatus } from './hooks/use-ssr-status';
export { useTranslations } from './hooks/use-translations';

// Providers
export { ConsentManagerProvider } from './providers/consent-manager-provider';
export type {
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from './types/consent-manager';

// Theme types
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
} from './types/theme';
