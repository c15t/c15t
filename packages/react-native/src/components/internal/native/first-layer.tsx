/**
 * The first layer both banners draw at the sheet's content height.
 *
 * The title, the explanation, any summary rows the screen carries, and the
 * decisions. The text and rows scroll when a long translation or a large font
 * would push the buttons off screen. The buttons never scroll away.
 */

import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { Screen, ScreenActionId } from '../../../ui-model/types';
import { ActionFooter } from './action-button';
import { ScreenList } from './list';
import type { ListLabels } from './list';
import { useNativeStyles } from './styles-context';
import { useAccessibilityFocus } from './use-accessibility-focus';

/** Props for {@link FirstLayer}. */
export interface FirstLayerProps {
	/** Labels the rows need. */
	readonly labels: ListLabels;
	/**
	 * Run one of the first layer's actions.
	 *
	 * @param id - Action pressed.
	 */
	readonly onAction: (id: ScreenActionId) => void;
	/**
	 * Open a screen from a summary row, such as the partner list.
	 *
	 * @param route - Screen id from the row's `navigatesTo`.
	 */
	readonly onNavigate?: (route: string) => void;
	/** Whether the sheet is showing, which moves focus to the title. */
	readonly open: boolean;
	/** The screen to draw. */
	readonly screen: Screen;
}

/** The first layer has no switches, so a toggle has nothing to write. */
const ignoreToggle = (): void => undefined;

/**
 * Draw a first-layer screen.
 *
 * @param props - First-layer props.
 * @returns The first layer.
 */
export const FirstLayer = ({
	labels,
	onAction,
	onNavigate,
	open,
	screen,
}: FirstLayerProps): ReactElement => {
	const { parts, theme } = useNativeStyles();
	const titleRef = useAccessibilityFocus(open);
	const inset = theme.spacing.m16 + theme.spacing.xs4;

	return (
		<>
			<ScrollView
				bounces={false}
				contentContainerStyle={{
					gap: theme.spacing.s8,
					paddingHorizontal: inset,
					paddingTop: theme.spacing.xs4,
				}}
				style={{ flexGrow: 0, flexShrink: 1 }}
			>
				<Text
					accessibilityRole="header"
					ref={titleRef}
					style={parts.title}
				>
					{screen.title}
				</Text>
				{screen.intro === undefined ? null : (
					<Text style={parts.intro}>{screen.intro}</Text>
				)}
				{screen.sections.length === 0 ? null : (
					// The rows bring their own inset, as they do on a full screen.
					<View style={{ marginHorizontal: -inset }}>
						<ScreenList
							inline
							labels={labels}
							onNavigate={onNavigate}
							onToggle={ignoreToggle}
							screen={{ ...screen, intro: undefined }}
						/>
					</View>
				)}
			</ScrollView>
			<ActionFooter
				actions={screen.actions}
				onAction={onAction}
			/>
		</>
	);
};
