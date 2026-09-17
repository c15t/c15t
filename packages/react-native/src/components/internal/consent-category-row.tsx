/**
 * One category and its switch.
 *
 * The row is deliberately not `accessible`: making the row one stop in the reader
 * tree would hide the switch inside it, and the switch is the only thing on the
 * row a subject can act on.
 */

import type { ReactNode } from 'react';
import { Switch, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';
import type { ConsentCategoryRow as CategoryRow } from './categories';

/** The text column takes the width the switch does not need. */
const TEXT_COLUMN: ViewStyle = { flex: 1 };

/** Props for {@link ConsentCategoryRow}. */
export interface ConsentCategoryRowProps {
	/** Row to render. */
	readonly row: CategoryRow;
	/** Parts in force for this surface. */
	readonly parts: ConsentResolvedParts;
	/** Theme, for the switch track and thumb. */
	readonly theme: ConsentTheme;
	/**
	 * Record the position the subject moved the switch to.
	 *
	 * @param value - New position.
	 */
	readonly onToggle: (value: boolean) => void;
}

/**
 * A category with its description and a switch.
 *
 * @param props - Row props.
 * @param props.onToggle - Called with the new position.
 * @param props.parts - Parts in force.
 * @param props.row - Row to render.
 * @param props.theme - Theme in force.
 * @returns The row.
 */
export const ConsentCategoryRow = ({
	onToggle,
	parts,
	row,
	theme,
}: ConsentCategoryRowProps): ReactNode => (
	<View style={parts.categoryRow}>
		<View style={TEXT_COLUMN}>
			<Text style={parts.categoryTitle}>{row.label}</Text>
			<Text style={parts.categoryDescription}>{row.description}</Text>
		</View>
		<Switch
			accessibilityLabel={row.label}
			accessibilityRole="switch"
			accessibilityState={{ disabled: row.disabled }}
			disabled={row.disabled}
			onValueChange={onToggle}
			style={parts.switch}
			thumbColor={theme.colors.switchThumb}
			trackColor={{
				false: theme.colors.switchTrack,
				true: theme.colors.switchTrackOn,
			}}
			value={row.value}
		/>
	</View>
);
