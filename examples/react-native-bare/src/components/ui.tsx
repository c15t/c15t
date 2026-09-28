/**
 * The host screens, drawn with the package's own tokens.
 *
 * Nothing here picks a colour, a radius, or a step by hand. The theme comes from
 * `useConsentStyles`, which is what the built-in banner and sheets lay themselves
 * out with, so the accent, the neutrals, the 4/8/16/24/32 rhythm, and the control
 * height that font scale earns are shared by the app and the consent surfaces
 * rather than imitated by them.
 *
 * Two elements are the same thing in both places, a button label and a caption, and
 * those reuse the resolved part style verbatim instead of restating it.
 */

import type { ConsentStyles, ConsentThemeColors } from '@c15t/react-native';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
	Pressable,
	ScrollView,
	Switch,
	Text as NativeText,
	View,
} from 'react-native';

/** Provides the resolved consent styles to the chrome below it. */
const HostStylesContext = createContext<ConsentStyles | null>(null);

/** Publish the resolved styles, as the shell resolves them. */
export const HostStylesProvider = ({
	children,
	styles,
}: {
	readonly children: ReactNode;
	readonly styles: ConsentStyles;
}) => (
	<HostStylesContext.Provider value={styles}>
		{children}
	</HostStylesContext.Provider>
);

/**
 * Read the styles the consent surfaces are using.
 *
 * @returns The resolved styles.
 * @throws {Error} When rendered outside the provider.
 */
export const useHostStyles = (): ConsentStyles => {
	const styles = useContext(HostStylesContext);

	if (styles === null) {
		throw new Error(
			'the example chrome has to render inside HostStylesProvider so it can share the consent theme'
		);
	}

	return styles;
};

/**
 * The colour this app uses for a warning.
 *
 * The consent theme carries no danger token, so there is nothing to share here.
 * This is fixture chrome: it marks a run that cannot prove the native kernel, and it
 * is deliberately the one colour on screen that is not the package's.
 */
const WARNING = '#B42318';

/** The ink a {@link Badge} draws with for its tone. */
const badgeInk = (
	colors: ConsentThemeColors,
	tone: 'accent' | 'danger' | 'neutral'
): string => {
	if (tone === 'accent') {
		return colors.primary;
	}

	return tone === 'danger' ? WARNING : colors.textMuted;
};

/** Scrollable page container, kept clear of the bottom band. */
export const Screen = ({ children }: { readonly children: ReactNode }) => {
	const { safeArea, theme } = useHostStyles();
	const { spacing } = theme;

	return (
		<ScrollView
			contentContainerStyle={{
				gap: spacing.m,
				padding: spacing.m,
				paddingBottom: spacing.xl + safeArea.bottom,
			}}
			keyboardShouldPersistTaps="handled"
		>
			{children}
		</ScrollView>
	);
};

/** Bordered section with a heading, at the sheet's own corner radius. */
export const Card = ({
	children,
	title,
}: {
	readonly children: ReactNode;
	readonly title: string;
}) => {
	const { theme } = useHostStyles();
	const { colors, radius, spacing, typography } = theme;

	return (
		<View
			style={{
				borderColor: colors.border,
				borderRadius: radius.surface,
				borderWidth: 1,
				gap: spacing.s,
				padding: spacing.m,
			}}
		>
			<NativeText
				accessibilityRole="header"
				style={{
					color: colors.textMuted,
					fontSize: typography.caption.fontSize,
					fontWeight: typography.title.weight,
					letterSpacing: 0,
					lineHeight: typography.caption.lineHeight,
					textTransform: 'uppercase',
				}}
			>
				{title}
			</NativeText>
			{children}
		</View>
	);
};

/**
 * A screen heading.
 *
 * The theme's type scale stops at a 16-point body and a 14-point surface title, so
 * the largest step it ships is body size at the title weight. That keeps the app
 * reading a size above its own headings without inventing a step the consent sheets
 * do not have.
 */
export const Heading = ({ children }: { readonly children: ReactNode }) => {
	const { theme } = useHostStyles();
	const { body, title } = theme.typography;

	return (
		<NativeText
			accessibilityRole="header"
			style={{
				color: theme.colors.text,
				fontSize: body.fontSize,
				fontWeight: title.weight,
				lineHeight: body.lineHeight,
			}}
		>
			{children}
		</NativeText>
	);
};

/** Body text, with the one variant the screens need. */
export const Text = ({
	children,
	muted = false,
}: {
	readonly children: ReactNode;
	readonly muted?: boolean;
}) => {
	const { theme } = useHostStyles();
	const { body } = theme.typography;

	return (
		<NativeText
			style={{
				color: muted ? theme.colors.textMuted : theme.colors.text,
				fontSize: body.fontSize,
				fontWeight: body.weight,
				lineHeight: body.lineHeight,
			}}
		>
			{children}
		</NativeText>
	);
};

/** Muted explanatory line, in the surfaces' caption step. */
export const Hint = ({ children }: { readonly children: ReactNode }) => {
	const { parts } = useHostStyles();

	return <NativeText style={parts.caption}>{children}</NativeText>;
};

/**
 * An inline text link, in the accent the surfaces use for one.
 *
 * The web renders its `{count} partners` entry as a bare link inside a sentence
 * and not as a button, and this keeps that: same accent, same weight, the size
 * inherited from the line it sits in. One thing it adds is the underline. On the
 * web the underline arrives on hover, and a phone has no hover to wait for.
 */
export const TextLink = ({
	children,
	onPress,
}: {
	readonly children: ReactNode;
	readonly onPress: () => void;
}) => {
	const { theme } = useHostStyles();
	const { body, title } = theme.typography;

	return (
		<Pressable
			accessibilityRole="link"
			hitSlop={{ bottom: 8, left: 0, right: 0, top: 8 }}
			onPress={onPress}
			style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
		>
			<NativeText
				style={{
					color: theme.colors.primary,
					fontSize: body.fontSize,
					fontWeight: title.weight,
					lineHeight: body.lineHeight,
					textDecorationLine: 'underline',
				}}
			>
				{children}
			</NativeText>
		</Pressable>
	);
};

/** A value, in the monospace a reader scans a diagnostic dump with. */
export const Mono = ({
	children,
	muted = false,
}: {
	readonly children: ReactNode;
	readonly muted?: boolean;
}) => {
	const { theme } = useHostStyles();
	const { colors, typography } = theme;

	return (
		<NativeText
			selectable
			style={{
				color: muted ? colors.textMuted : colors.text,
				fontFamily: 'monospace',
				fontSize: typography.caption.fontSize,
				lineHeight: typography.caption.lineHeight,
			}}
		>
			{children}
		</NativeText>
	);
};

/** Fixed-width label and its value on one line. */
export const Row = ({
	label,
	value,
}: {
	readonly label: string;
	readonly value: ReactNode;
}) => {
	const { theme } = useHostStyles();
	const { colors, spacing, typography } = theme;

	return (
		<View
			style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.m }}
		>
			<NativeText
				style={{
					color: colors.textMuted,
					flexBasis: 132,
					flexShrink: 0,
					fontSize: typography.caption.fontSize,
					lineHeight: typography.caption.lineHeight,
				}}
			>
				{label}
			</NativeText>
			<View style={{ flexShrink: 1 }}>
				{typeof value === 'string' ? <Mono>{value}</Mono> : value}
			</View>
		</View>
	);
};

/** The accent-outlined button, which is what the package makes a primary action. */
export const Button = ({
	busy = false,
	label,
	onPress,
	variant = 'primary',
}: {
	readonly busy?: boolean;
	readonly label: string;
	readonly onPress: () => void;
	readonly variant?: 'primary' | 'secondary';
}) => {
	const { controlMinHeight, parts } = useHostStyles();
	const button =
		variant === 'primary' ? parts.primaryButton : parts.secondaryButton;
	const labelStyle =
		variant === 'primary' ? parts.primaryLabel : parts.secondaryLabel;

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ busy, disabled: busy }}
			disabled={busy}
			onPress={onPress}
			style={({ pressed }) => [
				button,
				{ minHeight: controlMinHeight },
				pressed || busy ? { opacity: 0.5 } : null,
			]}
		>
			<NativeText
				numberOfLines={1}
				style={labelStyle}
			>
				{label}
			</NativeText>
		</Pressable>
	);
};

/** Column of buttons that share the width. */
export const ButtonGrid = ({ children }: { readonly children: ReactNode }) => {
	const { theme } = useHostStyles();

	return (
		<View style={{ flexDirection: 'column', gap: theme.spacing.s }}>
			{children}
		</View>
	);
};

/** Row of buttons that share the width. */
export const ButtonRow = ({ children }: { readonly children: ReactNode }) => {
	const { theme } = useHostStyles();

	return (
		<View style={{ flexDirection: 'row', gap: theme.spacing.s }}>
			{children}
		</View>
	);
};

/** One choice in a {@link Segmented} control. */
export interface SegmentedOption<Value extends string> {
	readonly label: string;
	readonly value: Value;
}

/** Mutually exclusive choices, one visible at a time. */
export const Segmented = <Value extends string>({
	onChange,
	options,
	value,
}: {
	readonly onChange: (value: Value) => void;
	readonly options: readonly SegmentedOption<Value>[];
	readonly value: Value;
}) => {
	const { controlMinHeight, theme } = useHostStyles();
	const { colors, radius, spacing, typography } = theme;

	return (
		<View
			style={{
				flexDirection: 'row',
				gap: spacing.xs,
				padding: spacing.xs,
			}}
		>
			{options.map((option) => {
				const selected = option.value === value;

				return (
					<Pressable
						accessibilityLabel={option.label}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						key={option.value}
						onPress={() => {
							onChange(option.value);
						}}
						style={{
							alignItems: 'center',
							backgroundColor: selected ? colors.surfaceRaised : 'transparent',
							borderColor: selected ? colors.primary : colors.border,
							borderRadius: radius.control,
							borderWidth: 1,
							justifyContent: 'center',
							minHeight: controlMinHeight,
							paddingHorizontal: spacing.s,
						}}
					>
						<NativeText
							style={{
								color: selected ? colors.primary : colors.textMuted,
								fontSize: typography.caption.fontSize,
								fontWeight: typography.label.weight,
								lineHeight: typography.caption.lineHeight,
							}}
						>
							{option.label}
						</NativeText>
					</Pressable>
				);
			})}
		</View>
	);
};

/** Labelled switch. */
export const Toggle = ({
	label,
	onValueChange,
	value,
}: {
	readonly label: string;
	readonly onValueChange: (value: boolean) => void;
	readonly value: boolean;
}) => {
	const { theme } = useHostStyles();
	const { colors, spacing } = theme;

	return (
		<View
			style={{
				alignItems: 'center',
				flexDirection: 'row',
				gap: spacing.m,
				justifyContent: 'space-between',
			}}
		>
			<Text>{label}</Text>
			<Switch
				accessibilityLabel={label}
				trackColor={{ false: colors.switchTrack, true: colors.switchTrackOn }}
				thumbColor={colors.switchThumb}
				onValueChange={onValueChange}
				value={value}
			/>
		</View>
	);
};

/** `true`/`false`, coloured the way the fixtures read it at a glance. */
export const Flag = ({ value }: { readonly value: boolean }) => {
	const { theme } = useHostStyles();
	const { colors, typography } = theme;

	return (
		<NativeText
			style={{
				color: value ? colors.primary : colors.textMuted,
				fontFamily: 'monospace',
				fontSize: typography.caption.fontSize,
				fontWeight: typography.title.weight,
				lineHeight: typography.caption.lineHeight,
			}}
		>
			{value ? 'true' : 'false'}
		</NativeText>
	);
};

/** Short status pill, for the state the whole screen is about. */
export const Badge = ({
	label,
	tone = 'neutral',
}: {
	readonly label: string;
	readonly tone?: 'accent' | 'danger' | 'neutral';
}) => {
	const { theme } = useHostStyles();
	const { colors, radius, spacing, typography } = theme;
	const foreground = badgeInk(colors, tone);

	return (
		<View
			style={{
				alignSelf: 'flex-start',
				borderColor: tone === 'neutral' ? colors.border : foreground,
				borderRadius: radius.control,
				borderWidth: 1,
				paddingHorizontal: spacing.s,
				paddingVertical: spacing.xs,
			}}
		>
			<NativeText
				style={{
					color: foreground,
					fontSize: typography.caption.fontSize,
					fontWeight: typography.label.weight,
					lineHeight: typography.caption.lineHeight,
				}}
			>
				{label}
			</NativeText>
		</View>
	);
};
