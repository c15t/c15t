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
import { Text, View } from 'react-native';

import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentSelector } from '../hooks/use-consent-selector';
import { ConsentBrandingTag } from './internal/branding-tag';
import {
	isConsentCategoryRowsEqual,
	selectConsentCategoryRows,
	useCategorySelection,
} from './internal/categories';
import {
	CONSENT_BUTTON_ROW_ITEM,
	ConsentButton,
} from './internal/consent-button';
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
	/**
	 * Hide the "Secured by c15t" tab.
	 *
	 * Off by default, which is what the web surfaces do: the tab is what tells a
	 * subject who is holding their consent, and a plan that has already paid for
	 * removing it is the only reason to.
	 */
	readonly hideBranding?: boolean;
	/** Entry point to the app's own preference centre, rendered when supplied. */
	readonly onOpenPreferences?: () => void;
	/** Called when the subject closes the dialog without saving. */
	readonly onRequestClose: () => void;
	/** Whether the dialog is open. */
	readonly open: boolean;
	/**
	 * How the card is anchored.
	 *
	 * `dialog` centres it inside the overlay with a 16pt gutter on every side and
	 * caps it at the web card's 448pt width, which is what the web surface does and
	 * the default here. `sheet` drops it to the bottom edge with a grab handle
	 * above it instead: a legitimate choice on a phone, and a host with a lot of
	 * categories to reach may prefer the taller card, but it is not what the web
	 * surface looks like.
	 */
	readonly presentation?: 'dialog' | 'sheet';
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

	/**
	 * Take one of the two whole-sheet decisions.
	 *
	 * A decision is not a save. The label promises everything or nothing, so the
	 * draft on screen is abandoned rather than carried into it, and the switches
	 * reset so that reopening the sheet shows what was written instead of the
	 * toggles that were never applied. Failure follows the save rule: the core
	 * keeps the error, the sheet stays open, and the draft is where it was.
	 *
	 * @param choice - Which way to decide.
	 * @returns Nothing.
	 */
	const decide = async (choice: 'accept' | 'reject'): Promise<void> => {
		if (busy) {
			return;
		}

		setBusy(true);

		let written = false;

		try {
			await (choice === 'accept' ? actions.acceptAll() : actions.rejectAll());
			written = true;
		} catch {
			// Same as a failed save: the sheet stays open with the draft intact.
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
				{/*
				 * The two decisions share a row in the neutral outline and the action
				 * that writes the draft takes the accent below them, which is the split
				 * `policy-actions.ts` draws for a preference surface: there
				 * `primaryActions` defaults to `save`, so reject and accept stay neutral
				 * together. Leaving the decisions out of a surface that owes a prompt
				 * meant a subject could not grant or deny everything without flicking
				 * five switches.
				 */}
				<View style={parts.row}>
					<ConsentButton
						disabled={busy}
						kind="secondary"
						label={copy.rejectAll}
						onPress={() => {
							void decide('reject');
						}}
						parts={parts}
						style={CONSENT_BUTTON_ROW_ITEM}
					/>
					<ConsentButton
						disabled={busy}
						kind="secondary"
						label={copy.acceptAll}
						onPress={() => {
							void decide('accept');
						}}
						parts={parts}
						style={CONSENT_BUTTON_ROW_ITEM}
					/>
				</View>
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
	hideBranding = false,
	onOpenPreferences,
	onRequestClose,
	open,
	presentation = 'dialog',
	styles,
	theme,
}: ConsentDialogProps): ReactNode => {
	// Words only. The category list belongs to the sheet, and a shut sheet has
	// none on screen.
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ presentation, styles, theme });

	const branding = hideBranding ? undefined : (
		<ConsentBrandingTag
			label={copy.securedBy}
			parts={surface.parts}
			presentation={presentation}
			radius={surface.theme.radius.surface}
		/>
	);

	return (
		<ConsentSurface
			branding={branding}
			dismissLabel={copy.dismiss}
			label={copy.dialogTitle}
			onRequestClose={onRequestClose}
			open={open}
			presentation={presentation}
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
