/**
 * The category list every standard surface shares.
 *
 * The banner pushes it inside its sheet, `ConsentPreferences` presents it as a
 * page or a sheet, and `ConsentWidget` draws it inline. The rows, the pending
 * switches, and the three decisions are the same in all of them, so they live
 * here once. The surface only picks the chrome around it.
 *
 * It reads the category list, so it is mounted only while a surface shows it.
 * A banner that is waiting holds no subscription to the categories at all.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { useConsentActions } from '../../../hooks/use-consent-actions';
import { useConsentSelector } from '../../../hooks/use-consent-selector';
import {
	buildPreferences,
	categoryFromRowId,
} from '../../../ui-model/standard';
import type { Screen, ScreenActionId } from '../../../ui-model/types';
import {
	isConsentCategoryRowsEqual,
	selectConsentCategoryRows,
	useCategorySelection,
} from '../categories';
import type { ConsentCopy } from '../copy';
import { ActionFooter } from './action-button';
import { ScreenList } from './list';
import { NavBar } from './nav-stack';

/** What {@link usePreferences} hands a surface. */
export interface PreferencesController {
	/** Whether a write is in flight. */
	readonly busy: boolean;
	/**
	 * Run one of the screen's actions.
	 *
	 * @param id - Action pressed.
	 */
	readonly onAction: (id: ScreenActionId) => void;
	/**
	 * Move one category's switch.
	 *
	 * @param rowId - Row id, such as `category.marketing`.
	 * @param value - New position.
	 */
	readonly onToggle: (rowId: string, value: boolean) => void;
	/** The screen to draw, with pending switches applied. */
	readonly screen: Screen;
}

/** Options for {@link usePreferences}. */
export interface UsePreferencesOptions {
	/** Copy in the subject's language. */
	readonly copy: ConsentCopy;
	/** Whether to drop the "Secured by c15t" footnote. */
	readonly hideBranding: boolean;
	/** Called once a decision has been written. */
	readonly onDone?: () => void;
}

/**
 * Hold a category list's switches and write them on a decision.
 *
 * Save writes every category in scope, as the subject sees it. Accept all and
 * Reject all drop the pending switches, because the label promises everything
 * or nothing and the switches have to show what was written. A write that
 * fails leaves the screen as it was, so the subject can press again.
 *
 * @param options - Copy and callbacks.
 * @returns The screen and its handlers.
 */
export const usePreferences = function usePreferences({
	copy,
	hideBranding,
	onDone,
}: UsePreferencesOptions): PreferencesController {
	const actions = useConsentActions();
	const rows = useConsentSelector(
		selectConsentCategoryRows,
		isConsentCategoryRowsEqual
	);
	const selection = useCategorySelection(rows);
	const [busy, setBusy] = useState(false);
	// The guard has to hold between two presses in the same frame, before the
	// `busy` render lands.
	const busyRef = useRef(false);
	const { commitSelection, reset, toggle } = selection;

	const screen = useMemo(
		() => buildPreferences({ copy, hideBranding, rows: selection.rows }),
		[copy, hideBranding, selection.rows]
	);

	const onToggle = useCallback(
		(rowId: string, value: boolean) => {
			const category = categoryFromRowId(rowId);

			if (category !== null) {
				toggle(category, value);
			}
		},
		[toggle]
	);

	const onAction = useCallback(
		(id: ScreenActionId) => {
			let write: (() => Promise<unknown>) | undefined;
			if (id === 'save') {
				write = () => actions.save(commitSelection());
			} else if (id === 'acceptAll') {
				write = actions.acceptAll;
			} else if (id === 'rejectAll') {
				write = actions.rejectAll;
			}

			if (write === undefined || busyRef.current) {
				return;
			}

			busyRef.current = true;
			setBusy(true);

			const commit = async (): Promise<void> => {
				try {
					await write();
				} catch {
					// The snapshot reports the error. Keep the draft for another attempt.
					busyRef.current = false;
					setBusy(false);
					return;
				}
				busyRef.current = false;
				setBusy(false);
				reset();
				onDone?.();
			};
			void commit();
		},
		[actions, commitSelection, onDone, reset]
	);

	return { busy, onAction, onToggle, screen };
};

/** Props for {@link PreferencesScreen}. */
export interface PreferencesScreenProps extends UsePreferencesOptions {
	/**
	 * Close the whole surface from the navigation bar. When omitted the bar has
	 * no close control, which is right inside a sheet that still owes a choice.
	 */
	readonly onClose?: () => void;
}

/**
 * The category list as a full screen: navigation bar, list, and actions.
 *
 * @param props - Screen props.
 * @returns The screen.
 */
export const PreferencesScreen = ({
	copy,
	hideBranding,
	onClose,
	onDone,
}: PreferencesScreenProps): ReactElement => {
	const { busy, onAction, onToggle, screen } = usePreferences({
		copy,
		hideBranding,
		onDone,
	});

	return (
		<View style={{ flex: 1 }}>
			<NavBar
				backLabel={copy.back}
				closeLabel={copy.close}
				onClose={onClose}
				title={screen.title}
			/>
			<View style={{ flex: 1 }}>
				<ScreenList
					labels={{ moreInfo: copy.moreInfo, ok: copy.ok }}
					onToggle={onToggle}
					screen={screen}
					testID="c15t-preferences-list"
				/>
			</View>
			<ActionFooter
				actions={screen.actions}
				disabled={busy}
				onAction={onAction}
			/>
		</View>
	);
};
