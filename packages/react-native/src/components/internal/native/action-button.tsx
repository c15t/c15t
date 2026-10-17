/**
 * The buttons at the bottom of a consent screen.
 *
 * The screen model decides the weight of each action and the renderer only
 * draws it. `parity` is the one that matters legally: Accept all and Reject all
 * on a first layer get the same fill, size, and label color, stacked full width
 * so a long translation of either never wraps differently from the other.
 */

import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import type {
	ScreenAction,
	ScreenActionEmphasis,
	ScreenActionId,
} from '../../../ui-model/types';
import type { ConsentTheme } from '../../theme/create-consent-theme';
import { useNativeStyles } from './styles-context';

/**
 * Fill and label color for each emphasis.
 *
 * @param theme - Theme in force.
 * @param emphasis - Weight from the screen model.
 * @returns The container and label overrides.
 */
const emphasisStyle = function emphasisStyle(
	theme: ConsentTheme,
	emphasis: ScreenActionEmphasis
): { readonly container: ViewStyle; readonly label: TextStyle } {
	const { colors } = theme;

	if (emphasis === 'primary' || emphasis === 'parity') {
		return {
			container: { backgroundColor: colors.primary },
			label: { color: colors.onPrimary },
		};
	}

	if (emphasis === 'tonal') {
		return {
			container: { backgroundColor: colors.primaryContainer },
			label: { color: colors.onPrimaryContainer },
		};
	}

	return {
		container: { backgroundColor: 'transparent' },
		label: { color: colors.primary },
	};
};

/** Props for {@link ActionButton}. */
export interface ActionButtonProps {
	/** Action to draw. */
	readonly action: ScreenAction;
	/** Whether a write is in flight, so the button cannot be pressed. */
	readonly disabled?: boolean;
	/** Whether the button shares its row with another. */
	readonly inRow?: boolean;
	/**
	 * Run the action.
	 *
	 * @param id - The action pressed.
	 */
	readonly onPress: (id: ScreenActionId) => void;
}

/**
 * Draw one action.
 *
 * @param props - Button props.
 * @returns The button.
 */
export const ActionButton = ({
	action,
	disabled = false,
	inRow = false,
	onPress,
}: ActionButtonProps): ReactElement => {
	const { parts, theme } = useNativeStyles();
	const look = emphasisStyle(theme, action.emphasis);
	const ios = theme.platform === 'ios';

	return (
		<Pressable
			accessibilityLabel={action.label}
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			android_ripple={{
				color:
					action.emphasis === 'text'
						? theme.colors.fill
						: theme.colors.onPrimaryContainer,
				foreground: true,
			}}
			disabled={disabled}
			onPress={() => {
				onPress(action.id);
			}}
			style={({ pressed }) => [
				parts.button,
				look.container,
				inRow ? { flex: 1 } : null,
				disabled ? { opacity: 0.5 } : null,
				// iOS dims a pressed button. Android shows the ripple instead.
				ios && pressed ? { opacity: 0.7 } : null,
			]}
			testID={`c15t-action-${action.id}`}
		>
			<Text
				maxFontSizeMultiplier={2}
				style={[parts.buttonLabel, look.label]}
			>
				{action.label}
			</Text>
		</Pressable>
	);
};

/** Props for {@link ActionFooter}. */
export interface ActionFooterProps {
	/** Actions in display order. */
	readonly actions: readonly ScreenAction[];
	/** Whether a write is in flight, so no action can be pressed. */
	readonly disabled?: boolean;
	/**
	 * Run an action.
	 *
	 * @param id - The action pressed.
	 */
	readonly onAction: (id: ScreenActionId) => void;
}

/**
 * Lay out a screen's actions.
 *
 * Primary and parity buttons stack full width. A run of tonal actions shares
 * one row as an equal pair. Text actions sit last, centred.
 *
 * @param props - Footer props.
 * @returns The footer, or `null` when the screen has no actions.
 */
export const ActionFooter = ({
	actions,
	disabled = false,
	onAction,
}: ActionFooterProps): ReactElement | null => {
	const { parts } = useNativeStyles();

	if (actions.length === 0) {
		return null;
	}

	const rows: ScreenAction[][] = [];

	for (const action of actions) {
		const last = rows.at(-1);

		if (
			action.emphasis === 'tonal' &&
			last !== undefined &&
			last[0]?.emphasis === 'tonal'
		) {
			last.push(action);
		} else {
			rows.push([action]);
		}
	}

	return (
		<View style={parts.footer}>
			{rows.map((row) =>
				row.length === 1 && row[0] !== undefined ? (
					<ActionButton
						action={row[0]}
						disabled={disabled}
						key={row[0].id}
						onPress={onAction}
					/>
				) : (
					<View
						key={row.map((action) => action.id).join('+')}
						style={{ flexDirection: 'row', gap: parts.footer.gap }}
					>
						{row.map((action) => (
							<ActionButton
								action={action}
								disabled={disabled}
								inRow
								key={action.id}
								onPress={onAction}
							/>
						))}
					</View>
				)
			)}
		</View>
	);
};
