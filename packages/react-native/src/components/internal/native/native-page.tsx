// React Native has no dialog element; its View uses the ARIA role prop.
/* eslint-disable jsx-a11y/prefer-tag-over-role */
/**
 * A full-height page presented over the app.
 *
 * On iOS it is the system page sheet: the app shrinks behind it, the subject
 * can swipe it down, and VoiceOver treats it as modal for free. On Android it
 * is a full-screen page that slides up, with hardware back popping a pushed
 * screen before it closes the page, as a Material full-screen dialog does.
 *
 * A page is for preferences opened on purpose from app settings, so closing it
 * without saving is always allowed and never records consent.
 */

import type { ReactElement, ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { useAnnounceOnOpen } from '../use-announce-on-open';
import { useReducedMotion } from '../use-reduced-motion';
import { useNativeStyles } from './styles-context';

/** Props for {@link NativePage}. */
export interface NativePageProps {
	/** What the page holds, normally a navigation stack. */
	readonly children: ReactNode;
	/** Announced when the page opens, normally its title. */
	readonly label: string;
	/**
	 * Hardware back on Android. The caller pops a pushed screen, or closes the
	 * page at the root.
	 */
	readonly onBack: () => void;
	/**
	 * Close the page. On iOS this also fires after the subject has swiped the
	 * sheet away, so the caller must treat it as already closed.
	 */
	readonly onClose: () => void;
	/** Whether the page is showing. */
	readonly open: boolean;
	/** Locator for UI tests. */
	readonly testID?: string;
}

/**
 * Present a page over the app.
 *
 * @param props - Page props.
 * @returns The page.
 */
export const NativePage = ({
	children,
	label,
	onBack,
	onClose,
	open,
	testID,
}: NativePageProps): ReactElement => {
	const { parts, safeArea, theme } = useNativeStyles();
	const ios = theme.platform === 'ios';
	const reduced = useReducedMotion();

	useAnnounceOnOpen(open, label);

	return (
		<Modal
			allowSwipeDismissal={ios}
			animationType={reduced ? 'fade' : 'slide'}
			navigationBarTranslucent={!ios}
			onRequestClose={ios ? onClose : onBack}
			presentationStyle={ios ? 'pageSheet' : 'fullScreen'}
			statusBarTranslucent={!ios}
			visible={open}
		>
			<View
				accessibilityLabel={label}
				accessibilityViewIsModal
				role="dialog"
				style={[
					parts.page,
					{
						flex: 1,
						// The page sheet already sits below the status bar on iOS.
						paddingBottom: safeArea.bottom,
						paddingLeft: safeArea.left,
						paddingRight: safeArea.right,
						paddingTop: ios ? 0 : safeArea.top,
					},
				]}
				testID={testID}
			>
				{children}
			</View>
		</Modal>
	);
};
