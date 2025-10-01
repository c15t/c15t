import type { ThemeValue } from '../../types/style-types';
import type { ButtonCSSVariables } from '../button/css-vars';
import type {
  CardCSSVariables,
  DescriptionCSSVariables,
  FooterCSSVariables,
  HeaderCSSVariables,
  OverlayCSSVariables,
  TitleCSSVariables,
} from './css-vars';

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
	/** @remarks Styles for the footer re ject button element */
	'banner.footer.reject-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the footer customize button element */
	'banner.footer.customize-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the footer accept button element */
	'banner.footer.accept-button': ThemeValue<ButtonCSSVariables>;
	/** @remarks Styles for the overlay element */
	'banner.overlay': ThemeValue<OverlayCSSVariables>;
}>;
