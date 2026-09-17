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

/**
 * The share of a row a control takes when it sits in one.
 *
 * Two decisions side by side have to be the same width, which is a `1fr 1fr`
 * track on web and `flex-grow` over a zero basis here. It belongs on the row's
 * children and nowhere else: in the footer's own column the same pair of
 * properties makes `flex-basis: 0` the button's height, which is what left a
 * save action 18pt tall with no room for its label, and the grow left of it
 * feeds back into the card's own measure.
 */
export const CONSENT_BUTTON_ROW_ITEM: ViewStyle = {
	flexBasis: 0,
	flexGrow: 1,
	flexShrink: 1,
};

/** How a button is dressed. */
export type ConsentButtonKind = 'link' | 'primary' | 'secondary';

/**
 * How far a touch area may reach past the box it belongs to, one edge at a time.
 *
 * Spelled here rather than imported because `Pressable`'s `hitSlop` type is a
 * structural shape that React Native has renamed between releases; the numbers are
 * the same in all of them, and this component only ever passes plain points.
 */
interface TouchInset {
	bottom?: number;
	left?: number;
	right?: number;
	top?: number;
}

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
 * would do nothing. Every kind reaches the tap floor through `hitSlopFor`.
 */
const CONTAINER_EXTRA: Record<ConsentButtonKind, ViewStyle> = {
	link: { alignItems: 'center', flexShrink: 0, justifyContent: 'center' },
	primary: {},
	secondary: {},
};

/**
 * The touch area a control gets, derived from the box it was drawn with.
 *
 * A web consent action is 35.5 tall, and a finger still needs 44. The two are
 * reconciled on the hit area rather than on `minHeight`, so the drawn control
 * matches the design and the fingertip gets its room. Deriving it from the parts
 * in force rather than hardcoding an inset means a host theme with a taller label
 * asks for a smaller inset, and one that already clears 44 asks for none.
 *
 * @param parts - Parts in force for this surface.
 * @param kind - Which kind of control is being drawn.
 * @returns An inset for `hitSlop`, or `undefined` when the box clears the floor.
 */
const hitSlopFor = function hitSlopFor(
	parts: ConsentResolvedParts,
	kind: ConsentButtonKind
): TouchInset | undefined {
	const box = parts[CONTAINER_PART[kind]];
	const label = parts[LABEL_PART[kind]];
	const border = (box.borderWidth ?? 0) * 2;
	const drawn =
		typeof box.paddingVertical === 'number'
			? box.paddingVertical * 2 + (label.lineHeight ?? 0) + border
			: (label.lineHeight ?? 0) + border;
	const inset = Math.ceil((MIN_TAP_TARGET - drawn) / 2);

	if (inset <= 0) {
		return undefined;
	}

	return { bottom: inset, left: inset, right: inset, top: inset };
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
		hitSlop={hitSlopFor(parts, kind)}
		onPress={onPress}
		style={[parts[CONTAINER_PART[kind]], CONTAINER_EXTRA[kind], style]}
	>
		<Text style={parts[LABEL_PART[kind]]}>{label}</Text>
	</Pressable>
);
