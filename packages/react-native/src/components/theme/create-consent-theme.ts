/**
 * The visual tokens behind the built-in consent surfaces.
 *
 * Nothing here is a React Native stylesheet: a theme is plain data, so a host
 * app can read a token, override one part, or hand a whole theme in without
 * forking a component. Colors are literals rather than `Platform.Color` values
 * because the same object has to be comparable in a test and stable across a
 * re-render.
 *
 * The values mirror the web tokens in the `packages/ui` theme so a subject who
 * sees the web banner and then the app banner recognises one design: the same
 * accent, the same neutral steps, the same radii, and the same spacing scale.
 */

/** Palette half of a {@link ConsentTheme}. */
export interface ConsentThemeColors {
	/** Color behind a modal sheet, dimming the app below it. */
	readonly overlay: string;
	/** Sheet or banner background. */
	readonly surface: string;
	/** Muted surface: the banner footer band, and rows raised off the card. */
	readonly surfaceRaised: string;
	/** Hairline separating rows from the footer. */
	readonly border: string;
	/** Primary text. */
	readonly text: string;
	/** Secondary text, such as a category description. */
	readonly textMuted: string;
	/** Accent: the outline and label of the primary actions, and the switch track when on. */
	readonly primary: string;
	/** Text on a filled {@link ConsentThemeColors.primary}. */
	readonly onPrimary: string;
	/** Background of the outlined secondary buttons, which sit on the card surface. */
	readonly secondary: string;
	/** Text on {@link ConsentThemeColors.secondary}. */
	readonly onSecondary: string;
	/** Focus and selected outline. */
	readonly focus: string;
	/** Off-state switch track. */
	readonly switchTrack: string;
	/** On-state switch track. */
	readonly switchTrackOn: string;
	/** Switch thumb. */
	readonly switchThumb: string;
}

/** Spacing scale, in density-independent pixels. */
export interface ConsentThemeSpacing {
	/** 4 */
	readonly xs: number;
	/** 8 */
	readonly s: number;
	/** 16 */
	readonly m: number;
	/** 24 */
	readonly l: number;
	/** 32 */
	readonly xl: number;
}

/** One text style in a {@link ConsentThemeTypography}. */
export interface ConsentTypeStyle {
	/** Size before the platform font scale is applied by `Text`. */
	readonly fontSize: number;
	/** Line height before the platform font scale is applied. */
	readonly lineHeight: number;
	/** React Native font weight. */
	readonly weight: '500' | '600' | '400';
}

/** Type scale. `Text` applies the platform font scale on its own. */
export interface ConsentThemeTypography {
	/** Surface title. */
	readonly title: ConsentTypeStyle;
	/** Body copy and category descriptions. */
	readonly body: ConsentTypeStyle;
	/** Button label. */
	readonly label: ConsentTypeStyle;
	/** Legal and status line. */
	readonly caption: ConsentTypeStyle;
}

/** Corner radii. */
export interface ConsentThemeRadius {
	/** Sheet and banner corners. */
	readonly surface: number;
	/** Buttons and rows. */
	readonly control: number;
}

/** Motion half of a theme, in milliseconds. */
export interface ConsentThemeMotion {
	/** Enter duration while motion is allowed. */
	readonly enterDuration: number;
	/** Exit duration while motion is allowed. */
	readonly exitDuration: number;
	/** Enter duration under `reduceMotion`, effectively a reveal. */
	readonly reducedEnterDuration: number;
	/** Exit duration under `reduceMotion`. */
	readonly reducedExitDuration: number;
	/** Distance a sheet travels on entry, in pixels. */
	readonly enterDistance: number;
}

/** A complete theme. */
export interface ConsentTheme {
	/** Palette. */
	readonly colors: ConsentThemeColors;
	/** Motion. */
	readonly motion: ConsentThemeMotion;
	/** Corner radii. */
	readonly radius: ConsentThemeRadius;
	/** Spacing scale. */
	readonly spacing: ConsentThemeSpacing;
	/** Type scale. */
	readonly typography: ConsentThemeTypography;
}

/** Partial overrides accepted by {@link createConsentTheme}. */
export interface ConsentThemeOptions {
	/** Palette overrides. */
	readonly colors?: Partial<ConsentThemeColors>;
	/** Motion overrides. */
	readonly motion?: Partial<ConsentThemeMotion>;
	/** Radius overrides. */
	readonly radius?: Partial<ConsentThemeRadius>;
	/** Spacing overrides. */
	readonly spacing?: Partial<ConsentThemeSpacing>;
	/** Typography overrides. */
	readonly typography?: Partial<ConsentThemeTypography>;
}

/** The two schemes the package ships defaults for. */
export const CONSENT_COLOR_SCHEMES = ['light', 'dark'] as const;

/** One of {@link CONSENT_COLOR_SCHEMES}. */
export type ConsentColorScheme = (typeof CONSENT_COLOR_SCHEMES)[number];

/**
 * Which scheme to use, given what the platform reported.
 *
 * An unspecified scheme reads `light`, which matches the default that
 * `useColorScheme` returns on a device that has not answered yet, so the first
 * frame never flashes the dark palette.
 *
 * @param scheme - Value from `useColorScheme()`.
 * @returns The scheme to build styles from.
 */
export const resolveConsentColorScheme = function resolveConsentColorScheme(
	scheme: ConsentColorScheme | null | undefined
): ConsentColorScheme {
	return scheme === 'dark' ? 'dark' : 'light';
};

const baseSpacing: ConsentThemeSpacing = {
	l: 24,
	m: 16,
	s: 8,
	xl: 32,
	xs: 4,
};

const baseRadius: ConsentThemeRadius = { control: 8, surface: 12 };

const baseTypography: ConsentThemeTypography = {
	body: { fontSize: 16, lineHeight: 24, weight: '400' },
	caption: { fontSize: 13, lineHeight: 18, weight: '400' },
	label: { fontSize: 14, lineHeight: 18, weight: '500' },
	title: { fontSize: 14, lineHeight: 18, weight: '600' },
};

const baseMotion: ConsentThemeMotion = {
	enterDistance: 24,
	enterDuration: 260,
	exitDuration: 200,
	reducedEnterDuration: 1,
	reducedExitDuration: 1,
};

const lightColors: ConsentThemeColors = {
	border: '#E5E5E5',
	focus: '#335CFF',
	onPrimary: '#FFFFFF',
	onSecondary: '#1A1A1A',
	overlay: 'rgba(0, 0, 0, 0.5)',
	primary: '#335CFF',
	secondary: '#FFFFFF',
	surface: '#FFFFFF',
	surfaceRaised: '#FAFAFA',
	switchThumb: '#FFFFFF',
	switchTrack: '#D9D9D9',
	switchTrackOn: '#335CFF',
	text: '#1A1A1A',
	textMuted: '#666666',
};

const darkColors: ConsentThemeColors = {
	border: '#333333',
	focus: '#6685FF',
	onPrimary: '#FFFFFF',
	onSecondary: '#EDEDED',
	overlay: 'rgba(0, 0, 0, 0.7)',
	primary: '#6685FF',
	secondary: '#121212',
	surface: '#121212',
	surfaceRaised: '#1A1A1A',
	switchThumb: '#EDEDED',
	switchTrack: '#404040',
	switchTrackOn: '#6685FF',
	text: '#EDEDED',
	textMuted: '#999999',
};

/**
 * Build a theme from partial overrides.
 *
 * Overrides are shallow per group, so `{ colors: { primary: '#7C3AED' } }`
 * changes one color and inherits the rest.
 *
 * @example
 * ```tsx
 * import { ConsentDialog, createConsentTheme } from '@c15t/react-native';
 *
 * const theme = createConsentTheme({ colors: { primary: '#7C3AED' } });
 *
 * <ConsentDialog onRequestClose={close} theme={theme} />;
 * ```
 *
 * @param options - Groups to override.
 * @returns A complete theme.
 */
export const createConsentTheme = function createConsentTheme(
	options: ConsentThemeOptions = {}
): ConsentTheme {
	return {
		colors: { ...lightColors, ...options.colors },
		motion: { ...baseMotion, ...options.motion },
		radius: { ...baseRadius, ...options.radius },
		spacing: { ...baseSpacing, ...options.spacing },
		typography: { ...baseTypography, ...options.typography },
	};
};

/**
 * The light palette, used when the platform reports light or nothing yet.
 */
export const lightTheme: ConsentTheme = createConsentTheme();

/**
 * The dark palette, used when the platform reports dark.
 */
export const darkTheme: ConsentTheme = createConsentTheme({
	colors: darkColors,
});
