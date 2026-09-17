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
		style={[parts[CONTAINER_PART[kind]], style]}
	>
		<Text style={parts[LABEL_PART[kind]]}>{label}</Text>
	</Pressable>
);
