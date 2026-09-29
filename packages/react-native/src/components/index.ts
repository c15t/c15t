/**
 * The built-in consent surfaces.
 *
 * These are optional. Everything they render is reachable through the hooks and
 * the headless components, so an app that designs its own banner imports nothing
 * from here.
 */

export { ConsentBanner } from './consent-banner';
export type { ConsentBannerProps } from './consent-banner';
export { ConsentDialog } from './consent-dialog';
export type { ConsentDialogProps } from './consent-dialog';
export {
	ConsentIabDrawer,
	seedConsentIabSelection,
} from './consent-iab-drawer';
export type {
	ConsentIabDrawerRootProps,
	ConsentIabInitialSelection,
} from './consent-iab-drawer';
export type {
	ConsentIabCopy,
	ConsentIabCopyOverrides,
} from './consent-iab-drawer';
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
export type { ConsentPreferencesProps } from './consent-preferences';
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
