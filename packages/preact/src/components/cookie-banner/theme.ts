
import type { ButtonCSSVariables } from '@c15t/styles/button/css-vars';
import type { ThemeValue } from '../../types/theme';

/**
 * Configuration object for styling different parts of the CookieBanner component.
 * @public
 */
export type CookieBannerTheme = Partial<{
	/** @remarks Styles for the root container element */
	'banner.root': ThemeValue;
	/** @remarks Styles for the card element */
	'banner.card': ThemeValue<CardCSSVariables>;
	/** @remarks Styles for the main content wrapper */
	'banner.header.root': ThemeValue<HeaderCSSVariables>;
	/** @remarks Styles for the banner title */
	'banner.header.title': ThemeValue<TitleCSSVariables>;
	/** @remarks Styles for the banner description text */
	'banner.header.description': ThemeValue<DescriptionCSSVariables>;
	/** @remarks Styles for the footer container */
	'banner.footer': ThemeValue<FooterCSSVariables>;
	/** @remarks Styles for the footer sub-group element */
	'banner.footer.sub-group': ThemeValue;
	/** @remarks Styles for the footer reject button element */
	'banner.footer.reject-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the footer customize button element */
	'banner.footer.customize-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the footer accept button element */
	'banner.footer.accept-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the overlay element */
	'banner.overlay': ThemeValue<OverlayCSSVariables>;
}>;

/** Card component CSS variables */
type CardCSSVariables = {
	'--banner-max-width': string;
	'--banner-border-radius': string;
	'--banner-border-width': string;
	'--banner-border-color': string;
	'--banner-border-color-dark': string;
	'--banner-background-color': string;
	'--banner-background-color-dark': string;
	'--banner-shadow': string;
	'--banner-shadow-dark': string;
	'--banner-entry-animation': string;
	'--banner-exit-animation': string;
};

/** Header component CSS variables */
type HeaderCSSVariables = {
	'--banner-text-color': string;
	'--banner-text-color-dark': string;
};

/** Title component CSS variables */
type TitleCSSVariables = {
	'--banner-title-color': string;
	'--banner-title-color-dark': string;
};

/** Description component CSS variables */
type DescriptionCSSVariables = {
	'--banner-description-color': string;
	'--banner-description-color-dark': string;
};

/** Footer component CSS variables */
type FooterCSSVariables = {
	'--banner-footer-background-color': string;
	'--banner-footer-background-color-dark': string;
};

/** Overlay component CSS variables */
type OverlayCSSVariables = {
	'--banner-overlay-background-color': string;
	'--banner-overlay-background-color-dark': string;
};
