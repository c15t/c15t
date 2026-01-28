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
 * Style value for a component slot.
 * @public
 */
export type SlotStyle = string | ClassNameStyle;

/**
 * Component slots for specific styling overrides.
 * @public
 */
export interface ComponentSlots {
	// --- BANNER SLOTS ---
	banner?: SlotStyle;
	bannerCard?: SlotStyle;
	bannerHeader?: SlotStyle;
	bannerTitle?: SlotStyle;
	bannerDescription?: SlotStyle;
	bannerFooter?: SlotStyle;
	bannerFooterSubGroup?: SlotStyle;
	bannerOverlay?: SlotStyle;

	// --- DIALOG SLOTS ---
	dialog?: SlotStyle;
	dialogCard?: SlotStyle;
	dialogHeader?: SlotStyle;
	dialogTitle?: SlotStyle;
	dialogDescription?: SlotStyle;
	dialogContent?: SlotStyle;
	dialogFooter?: SlotStyle;
	dialogOverlay?: SlotStyle;

	// --- WIDGET SLOTS ---
	widget?: SlotStyle;
	widgetAccordion?: SlotStyle;
	widgetFooter?: SlotStyle;
	widgetBranding?: SlotStyle;

	// --- FRAME SLOTS ---
	frame?: SlotStyle;

	// --- IAB BANNER SLOTS ---
	iabBanner?: SlotStyle;
	iabBannerCard?: SlotStyle;
	iabBannerHeader?: SlotStyle;
	iabBannerFooter?: SlotStyle;
	iabBannerOverlay?: SlotStyle;

	// --- IAB PREFERENCE CENTER SLOTS ---
	iabPreferenceCenter?: SlotStyle;
	iabPreferenceCenterOverlay?: SlotStyle;

	// --- SHARED SLOTS ---
	buttonPrimary?: SlotStyle;
	buttonSecondary?: SlotStyle;
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
	 * Visual theme to apply (v2 token-based system).
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
	 */
	colorScheme?: 'light' | 'dark' | 'system';

	/**
	 * Whether to disable default styles.
	 * @default false
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
