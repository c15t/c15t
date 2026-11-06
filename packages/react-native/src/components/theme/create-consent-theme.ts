/**
 * The visual tokens behind the built-in consent screens.
 *
 * The screens follow the platform, not the web. Every color, size, and curve
 * here is the value iOS or Material 3 already uses for the same element, so a
 * consent sheet reads as part of the host app. The c15t brand appears as the
 * default tint and nothing else, and a host's `colors.primary` replaces it.
 *
 * A theme is plain data. Colors are literals rather than `PlatformColor`
 * values, so one object can be compared in a test, stays stable across a
 * render, and can be read by the SwiftUI and Compose ports as written in
 * `native/UI.md`.
 */

import { Platform } from 'react-native';

/** The two chrome families the screens draw. */
export const CONSENT_PLATFORMS = ['ios', 'android'] as const;

/** One of {@link CONSENT_PLATFORMS}. */
export type ConsentPlatform = (typeof CONSENT_PLATFORMS)[number];

/** The two color schemes a theme resolves for. */
export const CONSENT_COLOR_SCHEMES = ['light', 'dark'] as const;

/** One of {@link CONSENT_COLOR_SCHEMES}. */
export type ConsentColorScheme = (typeof CONSENT_COLOR_SCHEMES)[number];

/** Semantic palette of a {@link ConsentTheme}. */
export interface ConsentThemeColors {
	/** Tint: filled buttons, links, switch tracks, the segment indicator. */
	readonly primary: string;
	/** Text and icons on a filled {@link ConsentThemeColors.primary}. */
	readonly onPrimary: string;
	/** Fill of a tinted (iOS) or filled tonal (Android) button. */
	readonly primaryContainer: string;
	/** Text on {@link ConsentThemeColors.primaryContainer}. */
	readonly onPrimaryContainer: string;
	/** Behind a list: the grouped background on iOS, the page on Android. */
	readonly background: string;
	/** A list cell, and the first-layer sheet. */
	readonly surface: string;
	/** Primary text. */
	readonly label: string;
	/** Supporting text, section headers, and footers. */
	readonly secondaryLabel: string;
	/** Hairlines between rows and above the footer. */
	readonly separator: string;
	/** Search field and segmented control track. */
	readonly fill: string;
	/** Dims the app behind a sheet. */
	readonly scrim: string;
}

/** Spacing scale, in density-independent pixels. */
export interface ConsentThemeSpacing {
	readonly xs4: number;
	readonly s8: number;
	readonly m16: number;
	readonly l24: number;
	readonly xl32: number;
}

/** One type role. */
export interface ConsentTypeStyle {
	/** Font size, in density-independent pixels. */
	readonly fontSize: number;
	/** Line height, in density-independent pixels. */
	readonly lineHeight: number;
	/** Font weight. */
	readonly weight: '400' | '500' | '600' | '700';
}

/**
 * Type roles, named after what they label.
 *
 * Each maps to an iOS text style and an M3 type role, listed in `native/UI.md`.
 */
export interface ConsentThemeTypography {
	/** First-layer heading: iOS title 2 bold, M3 headline small. */
	readonly title: ConsentTypeStyle;
	/** Navigation bar title: iOS headline, M3 title large. */
	readonly navTitle: ConsentTypeStyle;
	/** Running copy: iOS body, M3 body large. */
	readonly body: ConsentTypeStyle;
	/** A row's title: iOS body, M3 body large. */
	readonly rowTitle: ConsentTypeStyle;
	/** A row's supporting line: iOS subheadline, M3 body medium. */
	readonly rowDetail: ConsentTypeStyle;
	/** Section header: iOS footnote, M3 title small. */
	readonly sectionHeader: ConsentTypeStyle;
	/** Section footer: iOS footnote, M3 body medium. */
	readonly sectionFooter: ConsentTypeStyle;
	/** Button label: iOS headline, M3 label large. */
	readonly button: ConsentTypeStyle;
	/** The branding footnote: iOS caption 1, M3 body small. */
	readonly caption: ConsentTypeStyle;
}

/** Corner radii. */
export interface ConsentThemeRadius {
	/** Top corners of a bottom sheet. */
	readonly sheet: number;
	/** An inset-grouped section on iOS. Android lists have no cards. */
	readonly section: number;
	/** A button. */
	readonly button: number;
	/** The search field and segmented control. */
	readonly field: number;
}

/** Fixed sizes the platform prescribes. */
export interface ConsentThemeMetrics {
	/** Smallest touch target. */
	readonly hitTarget: number;
	/** Navigation bar height, without the status bar. */
	readonly navBarHeight: number;
	/** A one-line row. */
	readonly rowHeight: number;
	/** A row with a supporting line. */
	readonly rowHeightTwoLine: number;
	/** A button. */
	readonly buttonHeight: number;
	/** The search field. */
	readonly searchHeight: number;
	/** The segmented control or tab row. */
	readonly segmentHeight: number;
	/** Sheet grabber width. */
	readonly grabberWidth: number;
	/** Sheet grabber height. */
	readonly grabberHeight: number;
	/** How far a separator starts from the leading edge of a row. */
	readonly separatorInset: number;
}

/** Durations and curves. */
export interface ConsentThemeMotion {
	/** Sheet exit, in ms. The entry is a spring. */
	readonly sheetExit: number;
	/** Push and pop, in ms. */
	readonly push: number;
	/** How far the outgoing screen travels on a push, as a share of the width. */
	readonly pushParallax: number;
	/** The crossfade that replaces every slide under reduced motion, in ms. */
	readonly reducedFade: number;
	/** Spring damping for the sheet. */
	readonly springDamping: number;
	/** Spring stiffness for the sheet. */
	readonly springStiffness: number;
}

/** A complete theme, resolved for one platform and one color scheme. */
export interface ConsentTheme {
	readonly colorScheme: ConsentColorScheme;
	readonly colors: ConsentThemeColors;
	readonly metrics: ConsentThemeMetrics;
	readonly motion: ConsentThemeMotion;
	readonly platform: ConsentPlatform;
	readonly radius: ConsentThemeRadius;
	readonly spacing: ConsentThemeSpacing;
	readonly typography: ConsentThemeTypography;
}

/** What a host may override. Every group merges onto the platform default. */
export interface ConsentThemeOptions {
	/** Scheme to resolve for. Defaults to light. */
	readonly colorScheme?: ConsentColorScheme | null;
	/** Colors for every scheme, such as the host's brand tint. */
	readonly colors?: Partial<ConsentThemeColors>;
	/** Colors for the dark scheme only, applied after {@link colors}. */
	readonly darkColors?: Partial<ConsentThemeColors>;
	readonly metrics?: Partial<ConsentThemeMetrics>;
	readonly motion?: Partial<ConsentThemeMotion>;
	/** Chrome to draw. Defaults to the running platform. */
	readonly platform?: ConsentPlatform;
	readonly radius?: Partial<ConsentThemeRadius>;
	readonly spacing?: Partial<ConsentThemeSpacing>;
	readonly typography?: Partial<ConsentThemeTypography>;
}

/** c15t blue, the default tint. Matches `packages/ui/src/theme/utils.ts`. */
const BRAND = { dark: '#6680FF', light: '#3355FF' } as const;

/**
 * Apple's grouped palette. Dark uses the elevated values, because every screen
 * here is presented above the app.
 */
const IOS_COLORS: Record<ConsentColorScheme, ConsentThemeColors> = {
	dark: {
		background: '#1C1C1E',
		fill: 'rgba(118, 118, 128, 0.24)',
		label: '#FFFFFF',
		onPrimary: '#FFFFFF',
		onPrimaryContainer: BRAND.dark,
		primary: BRAND.dark,
		primaryContainer: 'rgba(102, 128, 255, 0.2)',
		scrim: 'rgba(0, 0, 0, 0.4)',
		secondaryLabel: 'rgba(235, 235, 245, 0.6)',
		separator: 'rgba(84, 84, 88, 0.65)',
		surface: '#2C2C2E',
	},
	light: {
		background: '#F2F2F7',
		fill: 'rgba(118, 118, 128, 0.12)',
		label: '#000000',
		onPrimary: '#FFFFFF',
		onPrimaryContainer: BRAND.light,
		primary: BRAND.light,
		primaryContainer: 'rgba(51, 85, 255, 0.15)',
		scrim: 'rgba(0, 0, 0, 0.2)',
		secondaryLabel: 'rgba(60, 60, 67, 0.6)',
		separator: 'rgba(60, 60, 67, 0.29)',
		surface: '#FFFFFF',
	},
};

/** The M3 baseline, with neutrals tuned toward the c15t hue. */
const ANDROID_COLORS: Record<ConsentColorScheme, ConsentThemeColors> = {
	dark: {
		background: '#121318',
		fill: '#33343A',
		label: '#E3E1E9',
		onPrimary: '#FFFFFF',
		onPrimaryContainer: '#DDE1FF',
		primary: BRAND.dark,
		primaryContainer: '#2D3A80',
		scrim: 'rgba(0, 0, 0, 0.32)',
		secondaryLabel: '#C5C5D4',
		separator: '#45464F',
		surface: '#1B1B21',
	},
	light: {
		background: '#FBF8FF',
		fill: '#E9E7F0',
		label: '#1B1B21',
		onPrimary: '#FFFFFF',
		onPrimaryContainer: '#001159',
		primary: BRAND.light,
		primaryContainer: '#DDE1FF',
		scrim: 'rgba(0, 0, 0, 0.32)',
		secondaryLabel: '#45464F',
		separator: '#C5C5D4',
		surface: '#F5F2FA',
	},
};

const SPACING: ConsentThemeSpacing = {
	l24: 24,
	m16: 16,
	s8: 8,
	xl32: 32,
	xs4: 4,
};

const TYPOGRAPHY: Record<ConsentPlatform, ConsentThemeTypography> = {
	android: {
		body: { fontSize: 16, lineHeight: 24, weight: '400' },
		button: { fontSize: 14, lineHeight: 20, weight: '500' },
		caption: { fontSize: 12, lineHeight: 16, weight: '400' },
		navTitle: { fontSize: 22, lineHeight: 28, weight: '400' },
		rowDetail: { fontSize: 14, lineHeight: 20, weight: '400' },
		rowTitle: { fontSize: 16, lineHeight: 24, weight: '400' },
		sectionFooter: { fontSize: 14, lineHeight: 20, weight: '400' },
		sectionHeader: { fontSize: 14, lineHeight: 20, weight: '500' },
		title: { fontSize: 24, lineHeight: 32, weight: '400' },
	},
	ios: {
		body: { fontSize: 17, lineHeight: 22, weight: '400' },
		button: { fontSize: 17, lineHeight: 22, weight: '600' },
		caption: { fontSize: 12, lineHeight: 16, weight: '400' },
		navTitle: { fontSize: 17, lineHeight: 22, weight: '600' },
		rowDetail: { fontSize: 15, lineHeight: 20, weight: '400' },
		rowTitle: { fontSize: 17, lineHeight: 22, weight: '400' },
		sectionFooter: { fontSize: 13, lineHeight: 18, weight: '400' },
		sectionHeader: { fontSize: 13, lineHeight: 18, weight: '400' },
		title: { fontSize: 22, lineHeight: 28, weight: '700' },
	},
};

const RADIUS: Record<ConsentPlatform, ConsentThemeRadius> = {
	android: { button: 20, field: 28, section: 0, sheet: 28 },
	ios: { button: 12, field: 10, section: 10, sheet: 10 },
};

const METRICS: Record<ConsentPlatform, ConsentThemeMetrics> = {
	android: {
		buttonHeight: 40,
		grabberHeight: 4,
		grabberWidth: 32,
		hitTarget: 48,
		navBarHeight: 64,
		rowHeight: 56,
		rowHeightTwoLine: 72,
		searchHeight: 56,
		segmentHeight: 48,
		separatorInset: 16,
	},
	ios: {
		buttonHeight: 50,
		grabberHeight: 5,
		grabberWidth: 36,
		hitTarget: 44,
		navBarHeight: 44,
		rowHeight: 44,
		rowHeightTwoLine: 60,
		searchHeight: 36,
		segmentHeight: 32,
		separatorInset: 16,
	},
};

const MOTION: Record<ConsentPlatform, ConsentThemeMotion> = {
	android: {
		push: 300,
		pushParallax: 0,
		reducedFade: 150,
		sheetExit: 250,
		springDamping: 30,
		springStiffness: 300,
	},
	ios: {
		push: 350,
		pushParallax: 0.3,
		reducedFade: 150,
		sheetExit: 250,
		springDamping: 32,
		springStiffness: 320,
	},
};

/**
 * Narrow whatever a color-scheme source reports to a scheme a theme exists for.
 *
 * `useColorScheme` returns `null` before the platform answers and can return
 * values a future release adds. Anything but `'dark'` falls back to light.
 *
 * @param scheme - Value from `useColorScheme`, or a host override.
 * @returns The scheme to resolve a theme for.
 */
export const resolveConsentColorScheme = function resolveConsentColorScheme(
	scheme: string | null | undefined
): ConsentColorScheme {
	return scheme === 'dark' ? 'dark' : 'light';
};

/**
 * The chrome family for the running platform.
 *
 * @returns `android` on Android, `ios` everywhere else.
 */
export const resolveConsentPlatform =
	function resolveConsentPlatform(): ConsentPlatform {
		return Platform.OS === 'android' ? 'android' : 'ios';
	};

/**
 * Build a theme for one platform and one color scheme.
 *
 * The scheme is resolved first, so a host override lands on the right base:
 * `colors` applies to both schemes and `darkColors` to dark only.
 *
 * @param options - Platform, scheme, and any overrides.
 * @returns A complete theme.
 * @example
 * ```ts
 * createConsentTheme({
 *     colorScheme: 'dark',
 *     colors: { primary: '#0A7C55' },
 *     darkColors: { primary: '#4FD1A1' },
 * });
 * ```
 */
export const createConsentTheme = function createConsentTheme(
	options: ConsentThemeOptions = {}
): ConsentTheme {
	const platform = options.platform ?? resolveConsentPlatform();
	const colorScheme = resolveConsentColorScheme(options.colorScheme);
	const palette = platform === 'android' ? ANDROID_COLORS : IOS_COLORS;

	return {
		colorScheme,
		colors: {
			...palette[colorScheme],
			...options.colors,
			...(colorScheme === 'dark' ? options.darkColors : undefined),
		},
		metrics: { ...METRICS[platform], ...options.metrics },
		motion: { ...MOTION[platform], ...options.motion },
		platform,
		radius: { ...RADIUS[platform], ...options.radius },
		spacing: { ...SPACING, ...options.spacing },
		typography: { ...TYPOGRAPHY[platform], ...options.typography },
	};
};

/** The light theme for the running platform. */
export const lightTheme: ConsentTheme = createConsentTheme();

/** The dark theme for the running platform. */
export const darkTheme: ConsentTheme = createConsentTheme({
	colorScheme: 'dark',
});
