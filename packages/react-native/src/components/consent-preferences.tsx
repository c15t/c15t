/**
 * The preference centre: the category list, openable at any time, including
 * when the policy owes nothing.
 *
 * Nothing here gates on a prompt. The centre reads the live snapshot, so it shows
 * what the core decided under the rule that matched, and closing it without
 * pressing save writes nothing at all.
 *
 * By default it is a page: the system page sheet on iOS, a full-screen page on
 * Android, which is how a settings screen in either platform opens a sub-page
 * that holds its own decisions. `presentation="sheet"` draws it as a full-height
 * bottom sheet instead.
 */

import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import { useConsentSelector } from '../hooks/use-consent-selector';
import { PREFERENCES_SCREEN } from '../ui-model/standard';
import { isConsentCopyEqual, selectConsentCopy } from './internal/copy';
import { NativePage } from './internal/native/native-page';
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

/** How {@link ConsentPreferences} is presented. */
export type ConsentPreferencesPresentation = 'page' | 'sheet';

/** Props for {@link ConsentPreferences}. */
export interface ConsentPreferencesProps {
	/**
	 * Hide the "Secured by c15t" footnote.
	 *
	 * Off by default: the footnote tells a subject who is holding their consent,
	 * and a plan that has already paid for removing it is the only reason to.
	 */
	readonly hideBranding?: boolean;
	/**
	 * Called when the centre closes, saved or not. On iOS the subject can also
	 * swipe the page away, and this fires after it has gone.
	 */
	readonly onClose: () => void;
	/** Whether the centre is open. */
	readonly open: boolean;
	/**
	 * `page` (the default) opens a page sheet on iOS and a full-screen page on
	 * Android. `sheet` opens a full-height bottom sheet on both.
	 */
	readonly presentation?: ConsentPreferencesPresentation;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme overrides, such as `darkTheme` or a brand `primary`. */
	readonly theme?: ConsentThemeOptions;
}

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
 *     onClose={() => {
 *         setSettingsOpen(false);
 *     }}
 *     open={settingsOpen}
 * />
 * ```
 *
 * @param props - Preference-centre props.
 * @returns The centre.
 */
export const ConsentPreferences = ({
	hideBranding = false,
	onClose,
	open,
	presentation = 'page',
	styles,
	theme,
}: ConsentPreferencesProps): ReactElement => {
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ styles, theme });
	const stack = useNavStackState(PREFERENCES_SCREEN);
	// Each opening is a fresh session: switches moved and abandoned last time
	// are gone. The list stays mounted after closing so the page slides away
	// with its content still on it.
	const [session, setSession] = useState(open ? 1 : 0);
	const [wasOpen, setWasOpen] = useState(open);

	if (open !== wasOpen) {
		setWasOpen(open);

		if (open) {
			setSession((current) => current + 1);
		}
	}

	const close = useCallback(() => {
		onClose();
	}, [onClose]);

	const content =
		session === 0 ? null : (
			<PreferencesScreen
				copy={copy}
				hideBranding={hideBranding}
				key={session}
				onClose={close}
				onDone={close}
			/>
		);

	return (
		<ConsentStylesProvider value={surface}>
			<NavStackProvider value={stack}>
				{presentation === 'sheet' ? (
					<NativeSheet
						detent="full"
						label={copy.dialogTitle}
						onBack={close}
						onCollapse={close}
						open={open}
						testID="c15t-preferences"
					>
						{content}
					</NativeSheet>
				) : (
					<NativePage
						label={copy.dialogTitle}
						onBack={close}
						onClose={close}
						open={open}
						testID="c15t-preferences"
					>
						{content}
					</NativePage>
				)}
			</NavStackProvider>
		</ConsentStylesProvider>
	);
};
