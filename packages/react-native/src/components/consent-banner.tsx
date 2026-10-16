/**
 * The first-layer prompt: a notice where the policy allows notice, an opt-in
 * choice where it does not.
 *
 * It is a bottom sheet over the app, never a row in its layout, so the moment a
 * policy resolves a prompt nothing on screen moves. "Manage preferences" grows
 * the same sheet to full height and pushes the category list into it, the way a
 * system sheet changes detent, instead of stacking a second modal on the first.
 *
 * A choice cannot be swiped away. Dragging rubber-bands, the scrim ignores
 * taps, and hardware back only pops back to the first layer: a prompt the
 * subject has not answered stays asked. A notice can be swiped away, and that
 * acknowledges it, because a notice has nothing to decide.
 *
 * It reads the four lifecycle fields and the copy, and nothing else, so a grant
 * made elsewhere in the app does not rerender it.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentSelector } from '../hooks/use-consent-selector';
import { useConsentStatus } from '../hooks/use-consent-status';
import { isStatusPromptOwed } from '../lib/selectors';
import {
	buildFirstLayer,
	FIRST_LAYER_SCREEN,
	PREFERENCES_SCREEN,
} from '../ui-model/standard';
import type { ScreenActionId } from '../ui-model/types';
import { isConsentCopyEqual, selectConsentCopy } from './internal/copy';
import { FirstLayer } from './internal/native/first-layer';
import { NativeSheet } from './internal/native/native-sheet';
import {
	NavStackProvider,
	useNavStackState,
} from './internal/native/nav-stack';
import { PreferencesScreen } from './internal/native/preferences-screen';
import { ConsentStylesProvider } from './internal/native/styles-context';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentThemeOptions } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** Props for {@link ConsentBanner}. */
export interface ConsentBannerProps {
	/**
	 * Hide the "Secured by c15t" footnote on the preferences screen.
	 *
	 * Off by default: the footnote tells a subject who is holding their consent,
	 * and a plan that has already paid for removing it is the only reason to.
	 */
	readonly hideBranding?: boolean;
	/**
	 * Open the app's own finer controls instead of the built-in list.
	 *
	 * When omitted, "Manage preferences" grows the sheet and shows the category
	 * list inside it, which is what makes `<ConsentBanner />` on its own a
	 * complete prompt.
	 */
	readonly onCustomize?: () => void;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme overrides, such as `darkTheme` or a brand `primary`. */
	readonly theme?: ConsentThemeOptions;
}

/**
 * Render the consent banner.
 *
 * Mount it once, inside the view that holds your screen. It shows itself while
 * the policy owes an interaction and leaves once the subject has acted, and it
 * picks notice or opt-in copy from `promptRequirement.kind`.
 *
 * @example
 * ```tsx
 * <C15tProvider>
 *     <App />
 *     <ConsentBanner />
 * </C15tProvider>
 * ```
 *
 * @param props - Banner props.
 * @returns The banner while a prompt is owed, and nothing otherwise.
 */
export const ConsentBanner = ({
	hideBranding = false,
	onCustomize,
	styles,
	theme,
}: ConsentBannerProps): ReactElement => {
	const actions = useConsentActions();
	const status = useConsentStatus();
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ styles, theme });
	const stack = useNavStackState(FIRST_LAYER_SCREEN);

	const notice = status.promptRequirement.kind === 'notice';
	const owed =
		isStatusPromptOwed(status) &&
		(status.activeUI === null || status.activeUI === 'banner');
	const [shown, setShown] = useState(owed);
	const [busy, setBusy] = useState(false);
	const busyRef = useRef(false);

	// A prompt owed again later starts from the first layer, not from wherever
	// the last one was left. Reset on the way in rather than out, so the sheet
	// does not snap back to the first layer while it is still sliding away.
	if (owed !== shown) {
		setShown(owed);

		if (owed && stack.depth > 1) {
			stack.reset();
		}
	}

	const screen = useMemo(
		() => buildFirstLayer({ copy, notice }),
		[copy, notice]
	);
	const managing = stack.top === PREFERENCES_SCREEN;
	const write = useCallback(async (commit: () => Promise<unknown>) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		setBusy(true);
		try {
			await commit();
		} catch {
			// The snapshot reports the error. Leave the prompt available for retry.
		}
		busyRef.current = false;
		setBusy(false);
	}, []);

	const onAction = useCallback(
		(id: ScreenActionId) => {
			if (id === 'acceptAll') {
				void write(actions.acceptAll);
			} else if (id === 'rejectAll') {
				void write(actions.rejectAll);
			} else if (id === 'acknowledge') {
				actions.dismissNotice();
			} else if (id === 'manage') {
				if (onCustomize === undefined) {
					stack.push(PREFERENCES_SCREEN);
				} else {
					onCustomize();
				}
			}
		},
		[actions, onCustomize, stack, write]
	);

	const dismissNotice = useCallback(() => {
		actions.dismissNotice();
	}, [actions]);

	const back = useCallback(() => {
		if (!stack.pop() && notice) {
			actions.dismissNotice();
		}
	}, [actions, notice, stack]);

	const collapse = useCallback(() => {
		stack.pop();
	}, [stack]);

	return (
		<ConsentStylesProvider value={surface}>
			<NavStackProvider value={stack}>
				<NativeSheet
					detent={managing ? 'full' : 'content'}
					label={managing ? copy.dialogTitle : screen.title}
					onBack={back}
					onCollapse={collapse}
					onDismiss={notice ? dismissNotice : undefined}
					open={owed}
					testID="c15t-banner"
				>
					{managing ? (
						<View style={{ flex: 1 }}>
							<PreferencesScreen
								copy={copy}
								hideBranding={hideBranding}
							/>
						</View>
					) : (
						<FirstLayer
							disabled={busy}
							labels={{ moreInfo: copy.moreInfo, ok: copy.ok }}
							onAction={onAction}
							open={owed}
							screen={screen}
						/>
					)}
				</NativeSheet>
			</NavStackProvider>
		</ConsentStylesProvider>
	);
};
