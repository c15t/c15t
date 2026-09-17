/**
 * The one button every built-in consent surface renders through.
 *
 * Keeping it in one place is what guarantees the two things a consent UI gets
 * judged on: the label a screen reader announces, and a tap target that survives
 * a large system font. A surface that rolled its own `Pressable` would drift on
 * one of the two.
 */

import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import type { ConsentResolvedParts } from '../theme/consent-theme-parts';

/** How a button is dressed. */
export type ConsentButtonKind = 'link' | 'primary' | 'secondary';

/** Which part styles the container for each kind. */
const CONTAINER_PART: Record<
	ConsentButtonKind,
	'captionLink' | 'primaryButton' | 'secondaryButton'
> = {
	link: 'captionLink',
	primary: 'primaryButton',
	secondary: 'secondaryButton',
};

/** Which part styles the text for each kind. */
const LABEL_PART: Record<
	ConsentButtonKind,
	'captionLink' | 'primaryLabel' | 'secondaryLabel'
> = {
	link: 'captionLink',
	primary: 'primaryLabel',
	secondary: 'secondaryLabel',
};

/**
 * What a kind needs that its theme part cannot carry.
 *
 * `captionLink` is both the container and the label of a link, so anything that is
 * true of a box but wrong for a run of text has to live here rather than in the
 * part: a `minHeight` on the label would lengthen the text, and `alignItems` on it
 * would do nothing. The link reads as plain text, so it is the one control that
 * stops short of a tap target when nothing stretches it.
 *
 * This is also why `Customize` used to ride above `Reject All` instead of beside it.
 * The actions row stretches its items, so the link's box grew to the row's height
 * while its label stayed at the top of that box. Centring the content puts the label
 * on the same middle line as the button it shares a row with, and costs nothing when
 * the link wraps onto a line of its own.
 */
const CONTAINER_EXTRA: Record<ConsentButtonKind, ViewStyle> = {
	link: {
		alignItems: 'center',
		flexShrink: 0,
		justifyContent: 'center',
		minHeight: MIN_TAP_TARGET,
	},
	primary: {},
	secondary: {},
};

/** Props for {@link ConsentButton}. */
export interface ConsentButtonProps {
	/** Parts in force for this surface. */
	readonly parts: ConsentResolvedParts;
	/** What the control does. */
	readonly kind?: ConsentButtonKind;
	/** Text the button shows. */
	readonly label: string;
	/** Disable the control, which also stops the press. */
	readonly disabled?: boolean;
	/**
	 * Announced instead of {@link ConsentButtonProps.label}, for a button whose
	 * visible text is shorter than what it acts on.
	 */
	readonly accessibilityLabel?: string;
	/** Extra style merged over the part style. */
	readonly style?: StyleProp<ViewStyle | TextStyle>;
	/**
	 * Run the action.
	 *
	 * @returns Nothing.
	 */
	readonly onPress: () => void;
}

/**
 * A labelled consent control.
 *
 * @example
 * ```tsx
 * <ConsentButton
 *     label="Accept all"
 *     onPress={() => {
 *         actions.acceptAll();
 *     }}
 *     parts={parts}
 * />
 * ```
 *
 * @param props - Button props.
 * @returns The control.
 */
export const ConsentButton = ({
	accessibilityLabel,
	disabled = false,
	kind = 'primary',
	label,
	onPress,
	parts,
	style,
}: ConsentButtonProps): ReactNode => (
	<Pressable
		accessibilityLabel={accessibilityLabel ?? label}
		accessibilityRole={kind === 'link' ? 'link' : 'button'}
		accessibilityState={{ disabled }}
		disabled={disabled}
		onPress={onPress}
		style={[parts[CONTAINER_PART[kind]], CONTAINER_EXTRA[kind], style]}
	>
		<Text style={parts[LABEL_PART[kind]]}>{label}</Text>
	</Pressable>
);
