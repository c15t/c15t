/**
 * The preference centre: the same category list as the dialog, openable at any
 * time, including when the policy owes nothing.
 *
 * Nothing here gates on a prompt. The centre reads the live snapshot, so it shows
 * what the core decided under the rule that matched, and closing it without
 * pressing save writes nothing at all.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentSelector } from '../hooks/use-consent-selector';
import {
	isConsentCategoryRowsEqual,
	selectConsentCategoryRows,
	useCategorySelection,
} from './internal/categories';
import { ConsentButton } from './internal/consent-button';
import { ConsentCategoryRow } from './internal/consent-category-row';
import {
	ConsentSurface,
	ConsentSurfaceBody,
	ConsentSurfaceFooter,
	ConsentSurfaceHeader,
	useConsentSurfaceFrame,
} from './internal/consent-surface';
import { isConsentCopyEqual, selectConsentCopy } from './internal/copy';
import type { ConsentCopy } from './internal/copy';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentTheme } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** Props for {@link ConsentPreferences}. */
export interface ConsentPreferencesProps {
	/** Called when the subject closes the centre, saved or not. */
	readonly onRequestClose: () => void;
	/** Whether the centre is open. */
	readonly open: boolean;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme to render with, instead of the platform scheme. */
	readonly theme?: ConsentTheme;
}

/** What the sheet contents need, handed down so they read the snapshot once. */
interface ConsentPreferencesContentProps {
	/** Copy resolved by the outer half. */
	readonly copy: ConsentCopy;
	/** Called when the subject closes the centre, saved or not. */
	readonly onRequestClose: () => void;
}

/**
 * The list, the switches, and the two ways out.
 *
 * Mounted only while the centre is on screen.
 *
 * @param props - Content props.
 * @returns The contents of the sheet.
 */
const ConsentPreferencesContent = ({
	copy,
	onRequestClose,
}: ConsentPreferencesContentProps): ReactNode => {
	const actions = useConsentActions();
	const rows = useConsentSelector(
		selectConsentCategoryRows,
		isConsentCategoryRowsEqual
	);
	const selection = useCategorySelection(rows);
	const { parts, theme } = useConsentSurfaceFrame();
	const [busy, setBusy] = useState(false);

	const close = (): void => {
		selection.reset();
		onRequestClose();
	};

	const save = async (): Promise<void> => {
		if (busy) {
			return;
		}

		setBusy(true);

		let written = false;

		try {
			await actions.save(selection.commitSelection());
			written = true;
		} catch {
			// The failure is on the snapshot, and the subject can press save again.
		}

		setBusy(false);

		if (written) {
			selection.reset();
			onRequestClose();
		}
	};

	return (
		<>
			<ConsentSurfaceHeader>
				<Text
					accessibilityRole="header"
					style={parts.title}
				>
					{copy.dialogTitle}
				</Text>
				<Text style={parts.description}>{copy.dialogDescription}</Text>
			</ConsentSurfaceHeader>
			<ConsentSurfaceBody>
				{selection.rows.map((row) => (
					<ConsentCategoryRow
						key={row.key}
						onToggle={(value) => {
							selection.toggle(row.key, value);
						}}
						parts={parts}
						row={row}
						theme={theme}
					/>
				))}
			</ConsentSurfaceBody>
			<ConsentSurfaceFooter>
				<ConsentButton
					disabled={busy}
					label={copy.save}
					onPress={() => {
						void save();
					}}
					parts={parts}
				/>
				<ConsentButton
					kind="secondary"
					label={copy.dismiss}
					onPress={close}
					parts={parts}
				/>
			</ConsentSurfaceFooter>
		</>
	);
};

/**
 * Render the always-available preference centre.
 *
 * Wire it to a row in your app's settings. It needs no pending prompt: the
 * switches show what the core decided under the policy that matched, whether or
 * not an interaction is outstanding. Closing without saving writes nothing.
 *
 * @example
 * ```tsx
 * <ConsentPreferences
 *     onRequestClose={() => {
 *         setSettingsOpen(false);
 *     }}
 *     open={settingsOpen}
 * />
 * ```
 *
 * @param props - Preference-centre props.
 * @returns The centre while it is open or animating out.
 */
export const ConsentPreferences = ({
	onRequestClose,
	open,
	styles,
	theme,
}: ConsentPreferencesProps): ReactNode => {
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ styles, theme });

	return (
		<ConsentSurface
			dismissLabel={copy.dismiss}
			label={copy.preferences}
			onRequestClose={onRequestClose}
			open={open}
			presentation="modal"
			styles={surface}
		>
			<ConsentPreferencesContent
				copy={copy}
				onRequestClose={onRequestClose}
			/>
		</ConsentSurface>
	);
};
