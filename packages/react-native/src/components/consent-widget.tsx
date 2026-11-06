/**
 * The category list drawn inline, for an app that has its own privacy screen.
 *
 * It is the same list and the same three decisions as the preference centre,
 * without the page or the sheet around it. It sizes to its content and does
 * not scroll, so it sits inside the host's own scroll view the way a group of
 * rows sits in a settings screen.
 */

import type { ReactElement } from 'react';
import { View } from 'react-native';

import { useConsentSelector } from '../hooks/use-consent-selector';
import { isConsentCopyEqual, selectConsentCopy } from './internal/copy';
import { ActionFooter } from './internal/native/action-button';
import { ScreenList } from './internal/native/list';
import { usePreferences } from './internal/native/preferences-screen';
import { ConsentStylesProvider } from './internal/native/styles-context';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentThemeOptions } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** Props for {@link ConsentWidget}. */
export interface ConsentWidgetProps {
	/**
	 * Hide the "Secured by c15t" footnote.
	 *
	 * Off by default: the footnote tells a subject who is holding their consent,
	 * and a plan that has already paid for removing it is the only reason to.
	 */
	readonly hideBranding?: boolean;
	/**
	 * Called once a decision has been written, for a host that wants to leave
	 * the screen or confirm the change.
	 */
	readonly onSave?: () => void;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme overrides, such as `darkTheme` or a brand `primary`. */
	readonly theme?: ConsentThemeOptions;
}

/** Props for {@link ConsentWidgetContent}. */
interface ConsentWidgetContentProps {
	readonly hideBranding: boolean;
	readonly onSave?: () => void;
}

/**
 * The list and its actions, inside the widget's styles.
 *
 * @param props - Content props.
 * @returns The list and footer.
 */
const ConsentWidgetContent = ({
	hideBranding,
	onSave,
}: ConsentWidgetContentProps): ReactElement => {
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const { busy, onAction, onToggle, screen } = usePreferences({
		copy,
		hideBranding,
		onDone: onSave,
	});

	return (
		<View testID="c15t-widget">
			<ScreenList
				inline
				labels={{ moreInfo: copy.moreInfo, ok: copy.ok }}
				onToggle={onToggle}
				screen={screen}
			/>
			<ActionFooter
				actions={screen.actions}
				disabled={busy}
				onAction={onAction}
			/>
		</View>
	);
};

/**
 * Render the category list inline.
 *
 * Put it in your app's privacy or settings screen. Like the preference centre
 * it needs no pending prompt, and nothing is written until the subject saves or
 * picks Accept all or Reject all.
 *
 * @example
 * ```tsx
 * <ScrollView>
 *     <ConsentWidget />
 * </ScrollView>
 * ```
 *
 * @param props - Widget props.
 * @returns The widget.
 */
export const ConsentWidget = ({
	hideBranding = false,
	onSave,
	styles,
	theme,
}: ConsentWidgetProps): ReactElement => {
	const surface = useConsentStyles({ styles, theme });

	return (
		<ConsentStylesProvider value={surface}>
			<ConsentWidgetContent
				hideBranding={hideBranding}
				onSave={onSave}
			/>
		</ConsentStylesProvider>
	);
};
