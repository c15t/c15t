/**
 * The owed-prompt dialog: every category in scope, one switch each, and a save
 * that writes exactly what the subject is looking at.
 *
 * The component is split in two on purpose. The outer half reads copy only, so
 * a grant made somewhere else in the app leaves it alone; the inner half reads
 * the category list and exists only while the sheet is on screen. A dialog that
 * is mounted and shut therefore holds no consent subscription at all, which is
 * what lets `<ConsentBanner />` ship its own manager for free.
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

/** Props for {@link ConsentDialog}. */
export interface ConsentDialogProps {
	/** Entry point to the app's own preference centre, rendered when supplied. */
	readonly onOpenPreferences?: () => void;
	/** Called when the subject closes the dialog without saving. */
	readonly onRequestClose: () => void;
	/** Whether the dialog is open. */
	readonly open: boolean;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme to render with, instead of the platform scheme. */
	readonly theme?: ConsentTheme;
}

/** What the sheet contents need, handed down so they read the snapshot once. */
interface ConsentDialogContentProps {
	/** Copy resolved by the outer half. */
	readonly copy: ConsentCopy;
	/** Entry point to the app's own preference centre. */
	readonly onOpenPreferences?: () => void;
	/** Called when the subject closes the dialog without saving. */
	readonly onRequestClose: () => void;
}

/**
 * The list, the switches, and the save button.
 *
 * Mounted only while the sheet is on screen.
 *
 * @param props - Content props.
 * @returns The contents of the sheet.
 */
const ConsentDialogContent = ({
	copy,
	onOpenPreferences,
	onRequestClose,
}: ConsentDialogContentProps): ReactNode => {
	const actions = useConsentActions();
	const rows = useConsentSelector(
		selectConsentCategoryRows,
		isConsentCategoryRowsEqual
	);
	const selection = useCategorySelection(rows);
	const { parts, theme } = useConsentSurfaceFrame();
	const [busy, setBusy] = useState(false);

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
			// The core holds the failure on the snapshot and the subject can press
			// save again, so the dialog stays open with the switches where they are.
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
				{onOpenPreferences === undefined ? null : (
					<ConsentButton
						kind="link"
						label={copy.preferences}
						onPress={onOpenPreferences}
						parts={parts}
					/>
				)}
			</ConsentSurfaceFooter>
		</>
	);
};

/**
 * Render the consent manager as a modal.
 *
 * Open it from your own state, or let {@link ConsentBanner} open it when the
 * subject taps customize. The save button writes the categories on screen and
 * nothing else, so a subject who changes one switch does not renew the receipts
 * behind the ones they never looked at.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ConsentDialog onRequestClose={() => {
 *     setOpen(false);
 * }} open={open} />;
 * ```
 *
 * @param props - Dialog props.
 * @returns The dialog while it is open or animating out.
 */
export const ConsentDialog = ({
	onOpenPreferences,
	onRequestClose,
	open,
	styles,
	theme,
}: ConsentDialogProps): ReactNode => {
	// Words only. The category list belongs to the sheet, and a shut sheet has
	// none on screen.
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ styles, theme });

	return (
		<ConsentSurface
			dismissLabel={copy.dismiss}
			label={copy.dialogTitle}
			onRequestClose={onRequestClose}
			open={open}
			presentation="modal"
			styles={surface}
		>
			<ConsentDialogContent
				copy={copy}
				onOpenPreferences={onOpenPreferences}
				onRequestClose={onRequestClose}
			/>
		</ConsentSurface>
	);
};
