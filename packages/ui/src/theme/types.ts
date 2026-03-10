/**
 * Generic CSS properties record.
 * @public
 */
export type CSSProperties = Record<string, string | number | undefined>;

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
	baseClassName?: any;
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
	 * Default CSS easing function for general animation curves.
	 * @default 'cubic-bezier(0.4, 0, 0.2, 1)'
	 */
	easing?: string;
	/**
	 * CSS easing function for enter/exit animations.
	 * Use for modals, tooltips, dropdowns, and any element entering or exiting.
	 * @default 'cubic-bezier(0.215, 0.61, 0.355, 1)'
	 */
	easingOut?: string;
	/**
	 * CSS easing function for on-screen movement.
	 * Use when elements already on screen need to move or morph.
	 * @default 'cubic-bezier(0.645, 0.045, 0.355, 1)'
	 */
	easingInOut?: string;
	/**
	 * CSS easing function with spring-like overshoot.
	 * Use for playful, bouncy animations.
	 * @default 'cubic-bezier(0.34, 1.56, 0.64, 1)'
	 */
	easingSpring?: string;
}

/**
 * CSS custom properties generated from theme tokens.
 *
 * This interface is the source of truth for documented `--c15t-*` variables.
 * Runtime generation in `themeToVars()` is typed against these keys.
 *
 * @public
 */
export interface ThemeCSSVariables {
	/** `colors.primary` (default: `hsl(228, 100%, 60%)`) */
	'--c15t-primary'?: string;
	/** `colors.primaryHover` (default: `hsl(228, 100%, 55%)`) */
	'--c15t-primary-hover'?: string;
	/** `colors.surface` (default: `hsl(0, 0%, 100%)`) */
	'--c15t-surface'?: string;
	/** `colors.surfaceHover` (default: `hsl(0, 0%, 98%)`) */
	'--c15t-surface-hover'?: string;
	/** `colors.border` (default: `hsl(0, 0%, 90%)`) */
	'--c15t-border'?: string;
	/** `colors.borderHover` (default: `hsl(0, 0%, 85%)`) */
	'--c15t-border-hover'?: string;
	/** `colors.text` (default: `hsl(0, 0%, 10%)`) */
	'--c15t-text'?: string;
	/** `colors.textMuted` (default: `hsl(0, 0%, 40%)`) */
	'--c15t-text-muted'?: string;
	/** `colors.textOnPrimary` (default: `hsl(0, 0%, 100%)`) */
	'--c15t-text-on-primary'?: string;
	/** `colors.overlay` (default: `hsla(0, 0%, 0%, 0.5)`) */
	'--c15t-overlay'?: string;
	/** `colors.switchTrack` (default: `hsl(0, 0%, 85%)`) */
	'--c15t-switch-track'?: string;
	/** `colors.switchTrackActive` (default: `hsl(228, 100%, 60%)`) */
	'--c15t-switch-track-active'?: string;
	/** `colors.switchThumb` (default: `hsl(0, 0%, 100%)`) */
	'--c15t-switch-thumb'?: string;

	/** `typography.fontFamily` (default: `system-ui, -apple-system, sans-serif`) */
	'--c15t-font-family'?: string;
	/** `typography.fontSize.sm` (default: `0.875rem`) */
	'--c15t-font-size-sm'?: string;
	/** `typography.fontSize.base` (default: `1rem`) */
	'--c15t-font-size-base'?: string;
	/** `typography.fontSize.lg` (default: `1.125rem`) */
	'--c15t-font-size-lg'?: string;
	/** `typography.fontWeight.normal` (default: `400`) */
	'--c15t-font-weight-normal'?: string;
	/** `typography.fontWeight.medium` (default: `500`) */
	'--c15t-font-weight-medium'?: string;
	/** `typography.fontWeight.semibold` (default: `600`) */
	'--c15t-font-weight-semibold'?: string;
	/** `typography.lineHeight.tight` (default: `1.25`) */
	'--c15t-line-height-tight'?: string;
	/** `typography.lineHeight.normal` (default: `1.5`) */
	'--c15t-line-height-normal'?: string;
	/** `typography.lineHeight.relaxed` (default: `1.75`) */
	'--c15t-line-height-relaxed'?: string;

	/** `spacing.xs` (default: `0.25rem`) */
	'--c15t-space-xs'?: string;
	/** `spacing.sm` (default: `0.5rem`) */
	'--c15t-space-sm'?: string;
	/** `spacing.md` (default: `1rem`) */
	'--c15t-space-md'?: string;
	/** `spacing.lg` (default: `1.5rem`) */
	'--c15t-space-lg'?: string;
	/** `spacing.xl` (default: `2rem`) */
	'--c15t-space-xl'?: string;

	/** `radius.sm` (default: `0.25rem`) */
	'--c15t-radius-sm'?: string;
	/** `radius.md` (default: `0.5rem`) */
	'--c15t-radius-md'?: string;
	/** `radius.lg` (default: `0.75rem`) */
	'--c15t-radius-lg'?: string;
	/** `radius.full` (default: `9999px`) */
	'--c15t-radius-full'?: string;

	/** `shadows.sm` (default: `0 1px 2px hsla(0, 0%, 0%, 0.05)`) */
	'--c15t-shadow-sm'?: string;
	/** `shadows.md` (default: `0 4px 12px hsla(0, 0%, 0%, 0.08)`) */
	'--c15t-shadow-md'?: string;
	/** `shadows.lg` (default: `0 8px 24px hsla(0, 0%, 0%, 0.12)`) */
	'--c15t-shadow-lg'?: string;

	/** `motion.duration.fast` (default: `100ms`) */
	'--c15t-duration-fast'?: string;
	/** `motion.duration.normal` (default: `200ms`) */
	'--c15t-duration-normal'?: string;
	/** `motion.duration.slow` (default: `300ms`) */
	'--c15t-duration-slow'?: string;
	/** `motion.easing` (default: `cubic-bezier(0.4, 0, 0.2, 1)`) */
	'--c15t-easing'?: string;
	/** `motion.easingOut` (default: `cubic-bezier(0.215, 0.61, 0.355, 1)`) */
	'--c15t-easing-out'?: string;
	/** `motion.easingInOut` (default: `cubic-bezier(0.645, 0.045, 0.355, 1)`) */
	'--c15t-easing-in-out'?: string;
	/** `motion.easingSpring` (default: `cubic-bezier(0.34, 1.56, 0.64, 1)`) */
	'--c15t-easing-spring'?: string;
}

/**
 * Style value for a component slot.
 * @public
 */
export type SlotStyle = string | ClassNameStyle;

/**
 * Component slots for specific styling overrides.
 * @public
 */
export interface ComponentSlots {
	// --- CONSENT BANNER SLOTS ---
	/** Root wrapper for the consent banner portal content. */
	consentBanner?: SlotStyle;
	/** Main card container for banner content and actions. */
	consentBannerCard?: SlotStyle;
	/** Header region containing title and description. */
	consentBannerHeader?: SlotStyle;
	/** Banner title text element. */
	consentBannerTitle?: SlotStyle;
	/** Banner description text element. */
	consentBannerDescription?: SlotStyle;
	/** Footer container for banner action buttons. */
	consentBannerFooter?: SlotStyle;
	/** Nested button group inside the banner footer. */
	consentBannerFooterSubGroup?: SlotStyle;
	/** Backdrop overlay rendered behind the banner when enabled. */
	consentBannerOverlay?: SlotStyle;

	// --- CONSENT DIALOG SLOTS ---
	/** Root wrapper for the consent dialog modal. */
	consentDialog?: SlotStyle;
	/** Main dialog card container. */
	consentDialogCard?: SlotStyle;
	/** Dialog header region containing title and description. */
	consentDialogHeader?: SlotStyle;
	/** Dialog title text element. */
	consentDialogTitle?: SlotStyle;
	/** Dialog description text element. */
	consentDialogDescription?: SlotStyle;
	/** Dialog content region (typically holds ConsentWidget). */
	consentDialogContent?: SlotStyle;
	/** Dialog footer container with actions/branding. */
	consentDialogFooter?: SlotStyle;
	/** Backdrop overlay rendered behind the dialog. */
	consentDialogOverlay?: SlotStyle;

	// --- CONSENT WIDGET SLOTS ---
	/** Root wrapper for the consent widget/preferences panel. */
	consentWidget?: SlotStyle;
	/** Accordion region listing consent categories. */
	consentWidgetAccordion?: SlotStyle;
	/** Footer area for widget actions and links. */
	consentWidgetFooter?: SlotStyle;
	/** Branding element rendered in the widget footer. */
	consentWidgetBranding?: SlotStyle;

	// --- FRAME SLOTS ---
	/** Frame wrapper used by blocking placeholders (e.g., iframe blocking). */
	frame?: SlotStyle;

	// --- IAB CONSENT BANNER SLOTS ---
	/** Root wrapper for the IAB consent banner. */
	iabConsentBanner?: SlotStyle;
	/** Main card container for IAB banner content. */
	iabConsentBannerCard?: SlotStyle;
	/** Header region for IAB banner title/description. */
	iabConsentBannerHeader?: SlotStyle;
	/** Footer container for IAB banner actions. */
	iabConsentBannerFooter?: SlotStyle;
	/** Backdrop overlay rendered behind the IAB banner. */
	iabConsentBannerOverlay?: SlotStyle;

	// --- IAB CONSENT DIALOG SLOTS ---
	/** Root wrapper for the IAB consent dialog. */
	iabConsentDialog?: SlotStyle;
	/** Main card container for IAB dialog content. */
	iabConsentDialogCard?: SlotStyle;
	/** Header region for IAB dialog title/description. */
	iabConsentDialogHeader?: SlotStyle;
	/** Footer container for IAB dialog actions. */
	iabConsentDialogFooter?: SlotStyle;
	/** Backdrop overlay rendered behind the IAB dialog. */
	iabConsentDialogOverlay?: SlotStyle;

	// --- SHARED SLOTS ---
	/** Shared primary button style used across consent components. */
	buttonPrimary?: SlotStyle;
	/** Shared secondary button style used across consent components. */
	buttonSecondary?: SlotStyle;
	/** Shared toggle/switch style used for category controls. */
	toggle?: SlotStyle;
}

/**
 * All valid theme keys for the v2 system.
 * These correspond to the component slots defined in Theme.
 */
export type AllThemeKeys = keyof ComponentSlots;

/**
 * Common UI configuration options across all framework implementations.
 * @public
 */
export interface UIOptions {
	/**
	 * Visual theme to apply.
	 *
	 * @see https://c15t.com/docs/frameworks/react/styling/tokens
	 * @see {@link Theme} for token structure
	 */
	theme?: Theme;
	/**
	 * Whether to disable animations.
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * Whether to lock scroll when dialogs are open.
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Whether to trap focus within dialogs.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Color scheme preference.
	 * With this option, you can force the theme to be light, dark or system.
	 * Otherwise, the theme will be detected if you have '.dark' classname in your document.
	 *
	 * @see https://c15t.com/docs/frameworks/react/styling/color-scheme
	 */
	colorScheme?: 'light' | 'dark' | 'system';

	/**
	 * Whether to disable default styles.
	 * @default false
	 *
	 * @see https://c15t.com/docs/frameworks/react/headless
	 */
	noStyle?: boolean;
}

/**
 * Complete theme configuration for c15t consent components (v2).
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
 * @public
 */
export function defineTheme<ThemeType extends Theme>(
	theme: ThemeType
): ThemeType {
	return theme;
}
