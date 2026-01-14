import type { ClassValue } from 'clsx';
import type { CSSProperties } from 'react';
import type { AllThemeKeys } from './style-keys';

/**
 * Represents CSS properties with optional CSS variables.
 *
 * @typeParam VariableMap - A record of CSS variable names and their values for inline styles.
 * @public
 */
export type CSSPropertiesWithVars<
	VariableMap = Record<string, string | number>,
> = CSSProperties & Partial<VariableMap>;

/**
 * Represents a style configuration that can include both inline styles and class names.
 *
 * @typeParam VariableMap - A record of CSS variable names and their values for inline styles.
 * @public
 */
export type ClassNameStyle<VariableMap = Record<string, string | number>> = {
	/** CSS properties to be applied inline to the component. */
	style?: CSSPropertiesWithVars<VariableMap>;
	/** CSS class names to be applied to the component. */
	className?: string;
	/** If true, the component will not apply its default internal styles. */
	noStyle?: boolean;
	/** @internal Used to pass default class names to the component. */
	baseClassName?: ClassValue;
};

/**
 * Represents a style value that can be either a class name string or a {@link ClassNameStyle} object.
 *
 * @typeParam VariableMap - A record of CSS variable names and their values for inline styles.
 * @public
 */
export type ThemeValue<VariableMap = Record<string, string | number>> =
	| string
	| ClassNameStyle<VariableMap>;

/**
 * Extends styling options with a reference to a global theme key.
 *
 * @typeParam VariableMap - A record of CSS variable names and their values.
 * @public
 */
export interface ExtendThemeKeys<VariableMap = CSSVariables>
	extends ClassNameStyle<VariableMap> {
	/** Optional key to reference a specific part of the global theme. */
	themeKey?: AllThemeKeys;
}

/**
 * Map of CSS variable names to their values.
 * @public
 */
export type CSSVariables = {
	[key: string]: string | number;
};

// =============================================================================
// THEME 2.0 TYPES
// =============================================================================

/**
 * Color tokens for the theme.
 *
 * @example
 * ```ts
 * const colors: ColorTokens = {
 *   primary: '#6366f1',
 *   surface: '#ffffff',
 *   text: '#111827',
 * };
 * ```
 *
 * @see {@link Theme.dark} for dark mode overrides
 * @public
 */
export interface ColorTokens {
	/** Primary brand/accent color for interactive elements. */
	primary?: string;
	/** Hover/active state for primary elements. */
	primaryHover?: string;
	/** Main background color for panels and containers. */
	surface?: string;
	/** Hover state for surface elements. */
	surfaceHover?: string;
	/** Border color for containers and inputs. */
	border?: string;
	/** Hover state for bordered elements. */
	borderHover?: string;
	/** Primary text color for headings and body. */
	text?: string;
	/** Muted text color for secondary content. */
	textMuted?: string;
	/** Text color for content on primary background. */
	textOnPrimary?: string;
	/** Overlay color for modal backdrops. */
	overlay?: string;
	/** Toggle track color (off state). */
	switchTrack?: string;
	/** Toggle track color (on state). */
	switchTrackActive?: string;
	/** Toggle thumb color. */
	switchThumb?: string;
}

/**
 * Typography tokens for consistent text styling.
 *
 * @example
 * ```ts
 * const typography: TypographyTokens = {
 *   fontFamily: '"Inter", sans-serif',
 *   fontSize: { base: '1rem' },
 * };
 * ```
 *
 * @see {@link Theme.typography} for usage in themes
 * @public
 */
export interface TypographyTokens {
	/** Font family for all components. */
	fontFamily?: string;

	/** Font sizes for text hierarchy. */
	fontSize?: {
		/** @default '0.875rem' */
		sm?: string;
		/** @default '1rem' */
		base?: string;
		/** @default '1.125rem' */
		lg?: string;
	};

	/** Font weights for emphasis. */
	fontWeight?: {
		/** @default 400 */
		normal?: number;
		/** @default 500 */
		medium?: number;
		/** @default 600 */
		semibold?: number;
	};

	/** Line heights for readability. */
	lineHeight?: {
		/** @default '1.25' */
		tight?: string;
		/** @default '1.5' */
		normal?: string;
		/** @default '1.75' */
		relaxed?: string;
	};
}

/**
 * Spacing tokens for consistent padding, margins, and gaps.
 *
 * @example
 * ```ts
 * const spacing: SpacingTokens = {
 *   sm: '0.5rem',
 *   md: '1rem',
 * };
 * ```
 * @public
 */
export interface SpacingTokens {
	/** @default '0.25rem' (4px) */
	xs?: string;
	/** @default '0.5rem' (8px) */
	sm?: string;
	/** @default '1rem' (16px) */
	md?: string;
	/** @default '1.5rem' (24px) */
	lg?: string;
	/** @default '2rem' (32px) */
	xl?: string;
}

/**
 * Border radius tokens for corner rounding.
 *
 * @example
 * ```ts
 * const radius: RadiusTokens = { sm: '2px', md: '4px' };
 * ```
 * @public
 */
export interface RadiusTokens {
	/** @default '0.25rem' (4px) */
	sm?: string;
	/** @default '0.5rem' (8px) */
	md?: string;
	/** @default '0.75rem' (12px) */
	lg?: string;
	/** @default '9999px' */
	full?: string;
}

/**
 * Shadow tokens for depth and elevation effects.
 *
 * @example
 * ```ts
 * const shadows: ShadowTokens = {
 *   sm: '0 1px 2px rgba(0,0,0,0.05)',
 *   md: '0 4px 12px rgba(0,0,0,0.08)',
 * };
 * ```
 * @public
 */
export interface ShadowTokens {
	/** @default '0 1px 2px hsla(0, 0%, 0%, 0.05)' */
	sm?: string;
	/** @default '0 4px 12px hsla(0, 0%, 0%, 0.08)' */
	md?: string;
	/** @default '0 8px 24px hsla(0, 0%, 0%, 0.12)' */
	lg?: string;
}

/**
 * Motion tokens for animations and transitions.
 *
 * @example
 * ```ts
 * const motion: MotionTokens = {
 *   duration: { normal: '200ms' },
 * };
 * ```
 * @public
 */
export interface MotionTokens {
	/**
	 * Duration presets for transitions.
	 */
	duration?: {
		/** @default '100ms' */
		fast?: string;
		/** @default '200ms' */
		normal?: string;
		/** @default '300ms' */
		slow?: string;
	};
	/**
	 * CSS easing function for animation curves.
	 * @default 'cubic-bezier(0.4, 0, 0.2, 1)'
	 */
	easing?: string;
}

/**
 * Style value for a component slot.
 *
 * @example
 * ```ts
 * // String format (class names)
 * const slot: SlotStyle = 'bg-white shadow-lg p-6';
 *
 * // Object format (class + inline styles)
 * const slot: SlotStyle = {
 *   className: 'my-card',
 *   style: { maxWidth: '500px' },
 * };
 * ```
 *
 * @see {@link ComponentSlots} for available slot targets
 * @public
 */
export type SlotStyle = string | ClassNameStyle;

/**
 * Component slots for specific styling overrides.
 *
 * @example
 * ```ts
 * const slots: ComponentSlots = {
 *   bannerCard: 'rounded-xl',
 *   buttonPrimary: { style: { fontWeight: 600 } },
 * };
 * ```
 *
 * @see {@link SlotStyle} for the structure of slot values
 * @see {@link Theme} for the complete theme configuration
 * @public
 */
export interface ComponentSlots {
	// --- BANNER SLOTS ---

	/** Banner: Root positioning container. */
	banner?: SlotStyle;

	/** Banner: Main card container. */
	bannerCard?: SlotStyle;

	/** Banner: Header section. */
	bannerHeader?: SlotStyle;

	/** Banner: Title text element. */
	bannerTitle?: SlotStyle;

	/** Banner: Description text element. */
	bannerDescription?: SlotStyle;

	/** Banner: Footer container for buttons. */
	bannerFooter?: SlotStyle;

	/** Banner: Sub-group container for buttons. */
	bannerFooterSubGroup?: SlotStyle;

	/** Banner: Backdrop overlay backdrop. */
	bannerOverlay?: SlotStyle;

	// --- DIALOG SLOTS ---

	/** Dialog: Root positioning container. */
	dialog?: SlotStyle;

	/** Dialog: Main panel container. */
	dialogCard?: SlotStyle;

	/** Dialog: Header section. */
	dialogHeader?: SlotStyle;

	/** Dialog: Title text element. */
	dialogTitle?: SlotStyle;

	/** Dialog: Description text element. */
	dialogDescription?: SlotStyle;

	/** Dialog: Scrollable body content area. */
	dialogContent?: SlotStyle;

	/** Dialog: Footer container with buttons. */
	dialogFooter?: SlotStyle;

	/** Dialog: Backdrop overlay. */
	dialogOverlay?: SlotStyle;

	// --- WIDGET SLOTS ---

	/** Widget: Root inline container. */
	widget?: SlotStyle;

	/** Widget: Expandable category list. */
	widgetAccordion?: SlotStyle;

	/** Widget: Footer container with buttons. */
	widgetFooter?: SlotStyle;

	/** Widget: Branding section. */
	widgetBranding?: SlotStyle;

	// --- FRAME SLOTS ---

	/** Frame: Gated content placeholder. */
	frame?: SlotStyle;

	// --- SHARED SLOTS ---

	/** Shared: Primary action button. */
	buttonPrimary?: SlotStyle;

	/** Shared: Secondary action button. */
	buttonSecondary?: SlotStyle;

	/** Shared: Toggle switch control. */
	toggle?: SlotStyle;
}

/**
 * Complete theme configuration for c15t consent components (v2).
 *
 * @example
 * ```ts
 * const theme: Theme = {
 *   colors: { primary: '#6366f1' },
 *   radius: { md: '8px' },
 * };
 * ```
 *
 * @see {@link ColorTokens} for color customization
 * @see {@link ComponentSlots} for layout/structural overrides
 * @see {@link defineTheme} for type-safe theme creation
 * @public
 */
export interface Theme {
	/** Color palette for light mode. */
	colors?: ColorTokens;

	/** Dark mode color overrides. */
	dark?: ColorTokens;

	/** Typography settings for text elements. */
	typography?: TypographyTokens;

	/** Spacing scale for internal padding and margins. */
	spacing?: SpacingTokens;

	/** Border radius scale for rounded corners. */
	radius?: RadiusTokens;

	/** Box shadow scale for depth and elevation. */
	shadows?: ShadowTokens;

	/** Animation and transition timing. */
	motion?: MotionTokens;

	/** Component-specific style overrides. */
	slots?: ComponentSlots;
}

/**
 * Helper function to define a theme with full TypeScript autocompletion and validation.
 *
 * @example
 * ```ts
 * import { defineTheme } from '@c15t/react';
 *
 * export const myTheme = defineTheme({
 *   colors: { primary: '#6366f1' },
 * });
 * ```
 *
 * @param theme - Your theme configuration object
 * @returns The same theme object with proper typing
 * @public
 */
export function defineTheme<ThemeType extends Theme>(
	theme: ThemeType
): ThemeType {
	return theme;
}
