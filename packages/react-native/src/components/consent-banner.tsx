/**
 * The first-layer prompt: a notice where the policy allows notice, an opt-in
 * choice where it does not.
 *
 * The banner is an absolutely positioned layer over the app, never a row in its
 * layout, so the moment a policy resolves a prompt nothing on screen moves. It
 * reads the four lifecycle fields and the copy, and nothing else, so a grant
 * made elsewhere in the app does not rerender it.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentSelector } from '../hooks/use-consent-selector';
import { useConsentStatus } from '../hooks/use-consent-status';
import { isStatusPromptOwed } from '../lib/selectors';
import { ConsentDialog } from './consent-dialog';
import { ConsentButton } from './internal/consent-button';
import {
	ConsentSurface,
	ConsentSurfaceBody,
	ConsentSurfaceFooter,
	ConsentSurfaceHeader,
} from './internal/consent-surface';
import { isConsentCopyEqual, selectConsentCopy } from './internal/copy';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentTheme } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** Props for {@link ConsentBanner}. */
export interface ConsentBannerProps {
	/**
	 * Open the app's own finer controls.
	 *
	 * When omitted, the banner opens the built-in {@link ConsentDialog} itself,
	 * which is what makes `<ConsentBanner />` on its own a complete prompt.
	 */
	readonly onCustomize?: () => void;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme to render with, instead of the platform scheme. */
	readonly theme?: ConsentTheme;
}

/**
 * Render the consent banner.
 *
 * Mount it once, inside the view that holds your screen. It shows itself while
 * the policy owes an interaction and unmounts itself once the subject has acted,
 * and it picks notice or opt-in copy from `promptRequirement.kind`.
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
	onCustomize,
	styles,
	theme,
}: ConsentBannerProps): ReactNode => {
	const actions = useConsentActions();
	const status = useConsentStatus();
	const copy = useConsentSelector(selectConsentCopy, isConsentCopyEqual);
	const surface = useConsentStyles({ styles, theme });
	const [customizing, setCustomizing] = useState(false);

	const notice = status.promptRequirement.kind === 'notice';
	const title = notice ? copy.noticeTitle : copy.bannerTitle;
	const description = notice ? copy.noticeDescription : copy.bannerDescription;
	const owed =
		isStatusPromptOwed(status) &&
		(status.activeUI === null || status.activeUI === 'banner');

	const customize = (): void => {
		if (onCustomize === undefined) {
			setCustomizing(true);
			return;
		}

		onCustomize();
	};

	const { parts } = surface;

	return (
		<>
			<ConsentSurface
				dismissLabel={copy.dismiss}
				label={title}
				open={owed && !customizing}
				presentation="banner"
				styles={surface}
			>
				<ConsentSurfaceHeader>
					<Text
						accessibilityRole="header"
						style={parts.title}
					>
						{title}
					</Text>
				</ConsentSurfaceHeader>
				<ConsentSurfaceBody>
					<Text style={parts.description}>{description}</Text>
				</ConsentSurfaceBody>
				<ConsentSurfaceFooter>
					{notice ? (
						<>
							<ConsentButton
								label={copy.acknowledge}
								onPress={() => {
									actions.dismissNotice();
								}}
								parts={parts}
							/>
							<ConsentButton
								kind="secondary"
								label={copy.customize}
								onPress={customize}
								parts={parts}
							/>
						</>
					) : (
						<>
							<ConsentButton
								label={copy.acceptAll}
								onPress={() => {
									void actions.acceptAll();
								}}
								parts={parts}
							/>
							<ConsentButton
								kind="secondary"
								label={copy.rejectAll}
								onPress={() => {
									void actions.rejectAll();
								}}
								parts={parts}
							/>
							<ConsentButton
								kind="link"
								label={copy.customize}
								onPress={customize}
								parts={parts}
							/>
						</>
					)}
				</ConsentSurfaceFooter>
			</ConsentSurface>
			{onCustomize === undefined ? (
				<ConsentDialog
					onRequestClose={() => {
						setCustomizing(false);
					}}
					open={customizing}
					styles={styles}
					theme={theme}
				/>
			) : null}
		</>
	);
};
