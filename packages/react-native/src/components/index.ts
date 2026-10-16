/**
 * The built-in consent surfaces.
 *
 * These are optional. Everything they render is reachable through the hooks and
 * the headless components, so an app that designs its own banner imports nothing
 * from here.
 */

export { ConsentBanner } from './consent-banner';
export type { ConsentBannerProps } from './consent-banner';
export { ConsentIabBanner } from './consent-iab-banner';
export type { ConsentIabBannerProps } from './consent-iab-banner';
export { ConsentIabPreferences } from './consent-iab-preferences';
export type {
	ConsentIabPreferencesPresentation,
	ConsentIabPreferencesRootProps,
} from './consent-iab-preferences';
export { seedConsentIabSelection } from '../ui-model/iab-selection';
export type { ConsentIabInitialSelection } from '../ui-model/iab-selection';
export type {
	ConsentIabCopy,
	ConsentIabCopyOverrides,
} from './internal/iab-copy';
export type {
	ConsentIabDialogData,
	ConsentIabDisplayConsentRow,
	ConsentIabDisplayModel,
	ConsentIabDisplayRow,
	ConsentIabDisplayRowKind,
	ConsentIabDisplayStackRow,
	ConsentIabDisplayToggle,
	ConsentIabProcessedFeature,
	ConsentIabProcessedPurpose,
	ConsentIabProcessedSpecialFeature,
	ConsentIabProcessedStack,
	ConsentIabProcessedVendor,
	ConsentIabSelection,
	ConsentIabTab,
	ConsentIabVendorId,
} from './iab-display-model';
export { ConsentPreferences } from './consent-preferences';
export type {
	ConsentPreferencesPresentation,
	ConsentPreferencesProps,
} from './consent-preferences';
export { ConsentWidget } from './consent-widget';
export type { ConsentWidgetProps } from './consent-widget';
export {
	CONSENT_COLOR_SCHEMES,
	createConsentTheme,
	darkTheme,
	lightTheme,
	resolveConsentColorScheme,
} from './theme/create-consent-theme';
export type {
	ConsentColorScheme,
	ConsentTheme,
	ConsentThemeColors,
	ConsentThemeMotion,
	ConsentThemeOptions,
	ConsentThemeRadius,
	ConsentThemeSpacing,
	ConsentThemeTypography,
	ConsentTypeStyle,
} from './theme/create-consent-theme';
export {
	CONSENT_THEME_PARTS,
	isConsentThemePart,
} from './theme/consent-theme-parts';
export type {
	ConsentPartStyles,
	ConsentThemePart,
} from './theme/consent-theme-parts';
export { useConsentStyles } from './theme/use-consent-styles';
export type { ConsentStyles } from './theme/use-consent-styles';
