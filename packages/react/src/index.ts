// Core exports
export type {
	AllConsentNames,
	ConsentManagerInterface,
	ConsentStoreState,
	ConsentType,
	Overrides,
	Translations,
} from 'c15t';

export {
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from 'c15t';

// Components
export {
	ConsentManagerDialog,
	type ConsentManagerDialogProps,
} from './components/consent-manager-dialog';
export {
	ConsentManagerWidget,
	type ConsentManagerWidgetProps,
} from './components/consent-manager-widget';
export {
	CookieBanner,
	type CookieBannerProps,
} from './components/cookie-banner';
export * from './components/cookie-banner/components';
export { Frame, type FrameProps } from './components/frame';
export { ConsentButton } from './components/shared/primitives/button';
export {
	InlineLegalLinks,
	LegalLinks,
	type LegalLinksProps,
} from './components/shared/primitives/legal-links';

// Hooks
export { useColorScheme } from './hooks/use-color-scheme';
export { useConsentManager } from './hooks/use-consent-manager';
export { useFocusTrap } from './hooks/use-focus-trap';
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
