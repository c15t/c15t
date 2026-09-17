/**
 * The chrome every consent surface is built from: a sheet, its heading, a body
 * that scrolls before it overflows, a footer, and the enter and exit reveal.
 *
 * Two presentations share it. A banner is an absolutely positioned layer, so
 * mounting one moves no app content: there is no reflow to animate and nothing
 * to shift when the prompt finally goes away. A dialog is a `Modal`, which gives
 * the platform the job of keeping touch and the reader inside the sheet.
 *
 * The sheet content is `children`, not props. A surface that is closed leaves
 * its children out of the tree, which is what keeps a mounted-but-closed dialog
 * holding no consent subscription at all. A host that needs to read the snapshot
 * while the sheet is shut should use a hook, not these slots.
 *
 * Both presentations mount inside a layer whose padding already carries the
 * safe-area bands, so nothing in here reads an inset. Keeping that in the resolved
 * styles is what lets the banner lift its bottom edge out of the home indicator
 * and a full-screen sheet keep its heading below the clock from one source.
 */

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
	Animated,
	KeyboardAvoidingView,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type {
	ConsentTheme,
	ConsentThemeColors,
	ConsentThemeSpacing,
} from '../theme/create-consent-theme';
import { BANNER_FOOTER_PADDING_HORIZONTAL } from '../theme/use-consent-styles';
import type { ConsentStyles } from '../theme/use-consent-styles';
import { useAnnounceOnOpen } from './use-announce-on-open';
import { useModalA11y } from './use-modal-a11y';
import { usePromptMotion } from './use-prompt-motion';
import { useReducedMotion } from './use-reduced-motion';

/** Fills the screen so the sheet can sit at its bottom edge. */
const FILL: ViewStyle = { flex: 1 };

/** Which of the two presentations is being rendered. */
export type ConsentSurfacePresentation = 'banner' | 'modal';

/** The layout a surface hands to its own content. */
export interface ConsentSurfaceFrame {
	/** Height the body may reach before it scrolls. */
	readonly maxBodyHeight: number;
	/** Every restylable part, already merged with the host override. */
	readonly parts: ConsentResolvedParts;
	/** Which presentation this surface mounted as, for the chrome that differs. */
	readonly presentation: ConsentSurfacePresentation;
	/** Theme in force, for the controls that need raw values. */
	readonly theme: ConsentTheme;
}

/** Props for the three slot components. */
export interface ConsentSurfaceSlotProps {
	/** Content of the slot. */
	readonly children: ReactNode;
}

/** `null` outside a surface, which is what makes the accessor throw. */
const FrameContext = createContext<ConsentSurfaceFrame | null>(null);

/**
 * Read the layout of the surface this component is rendered in.
 *
 * @returns The frame of the nearest consent surface.
 * @throws {Error} When called outside a consent surface.
 */
export const useConsentSurfaceFrame =
	function useConsentSurfaceFrame(): ConsentSurfaceFrame {
		const frame = useContext(FrameContext);

		if (frame === null) {
			throw new Error(
				'@c15t/react-native: this component has to be rendered inside ConsentBanner, ConsentDialog, or ConsentPreferences, so that it can read the theme in force.'
			);
		}

		return frame;
	};

/**
 * The heading area of a surface, directly under the sheet edge.
 *
 * @param props - Slot content.
 * @returns The heading container.
 */
export const ConsentSurfaceHeader = ({
	children,
}: ConsentSurfaceSlotProps): ReactNode => {
	const { parts } = useConsentSurfaceFrame();

	return <View style={parts.header}>{children}</View>;
};

/**
 * The scrolling middle of a surface.
 *
 * @param props - Slot content.
 * @returns A body that stops growing and starts scrolling.
 */
export const ConsentSurfaceBody = ({
	children,
}: ConsentSurfaceSlotProps): ReactNode => {
	const { maxBodyHeight, parts } = useConsentSurfaceFrame();

	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			style={[parts.scroll, { maxHeight: maxBodyHeight }]}
		>
			{/*
			 * A plain wrapper rather than `contentContainerStyle`, so the list's own
			 * rhythm is a restylable part the way every other rhythm here is.
			 */}
			<View style={parts.scrollContent}>{children}</View>
		</ScrollView>
	);
};

/**
 * What the footer earns from the surface it sits in.
 *
 * The two are measured apart rather than inferred from one another. A banner puts
 * its actions on the muted band with a hairline along its top edge, 16 deep and
 * 20 in from the card (`1rem 1.25rem` on `.footer`), with a full step between the
 * two action rows (`1rem` on `.actionRoot`). A sheet leaves them on the card with
 * a hairline only, 16 all round (`--consent-dialog-card-padding-mobile`,
 * `--consent-dialog-footer-padding-y`) and a half step (`--consent-dialog-footer-gap`).
 *
 * All of that is a fact about the presentation rather than about a theme, so it
 * goes on under the resolved `footer` part, where a host override still wins.
 */
const footerChrome = function footerChrome(
	colors: ConsentThemeColors,
	presentation: ConsentSurfacePresentation,
	spacing: ConsentThemeSpacing
): ViewStyle {
	const banner = presentation === 'banner';

	return {
		backgroundColor: banner ? colors.surfaceRaised : colors.surface,
		borderTopColor: colors.border,
		borderTopWidth: 1,
		gap: banner ? spacing.m : spacing.s,
		paddingHorizontal: banner ? BANNER_FOOTER_PADDING_HORIZONTAL : spacing.m,
		paddingVertical: spacing.m,
	};
};

/**
 * The actions row, kept out of the scroll so it is always reachable.
 *
 * @param props - Slot content.
 * @returns The footer container.
 */
export const ConsentSurfaceFooter = ({
	children,
}: ConsentSurfaceSlotProps): ReactNode => {
	const { parts, presentation, theme } = useConsentSurfaceFrame();

	return (
		<View
			style={[
				footerChrome(theme.colors, presentation, theme.spacing),
				parts.footer,
			]}
		>
			{children}
		</View>
	);
};

/** Props for {@link ConsentSurface}. */
export interface ConsentSurfaceProps {
	/**
	 * The branding tab, rendered against the card rather than inside it.
	 *
	 * Both cards clip, so a tab passed as ordinary content would be cut off at the
	 * edge it is supposed to merge into. The surface puts it above the card for a
	 * banner and below it for a sheet, which is what the two web variants do.
	 */
	readonly branding?: ReactNode;
	/**
	 * The sheet content, using the slot components.
	 *
	 * Kept out of the tree while the surface is closed, so nothing it subscribes
	 * to is live during that time.
	 */
	readonly children: ReactNode;
	/** Label for the tap-outside control. */
	readonly dismissLabel?: string;
	/** Name of the surface, announced and used as its accessibility label. */
	readonly label: string;
	/** Called when the subject dismisses without deciding. */
	readonly onRequestClose?: () => void;
	/** Whether the surface should be showing. */
	readonly open: boolean;
	/** How the surface is mounted. */
	readonly presentation: ConsentSurfacePresentation;
	/** Styles in force, including the body height cap. */
	readonly styles: ConsentStyles;
}

/**
 * Render one consent surface.
 *
 * @param props - Surface props.
 * @returns The surface while it is open or animating out, and nothing otherwise.
 */
export const ConsentSurface = (props: ConsentSurfaceProps) => {
	const {
		branding,
		children,
		dismissLabel,
		label,
		onRequestClose,
		open,
		presentation,
		styles,
	} = props;
	const { bannerLayer, maxBodyHeight, parts, sheetLayer, theme } = styles;
	const reducedMotion = useReducedMotion();
	const { motionStyle, rendered } = usePromptMotion(open, {
		distance: theme.motion.enterDistance,
		enterDuration: theme.motion.enterDuration,
		exitDuration: theme.motion.exitDuration,
		reducedMotion,
	});

	useAnnounceOnOpen(open, label);

	// A `Modal` already takes the Android back gesture, so asking for it here too
	// would run the close handler twice.
	const { containerProps, containerRef } = useModalA11y({
		active: open,
		hardwareBack: presentation === 'banner',
		onRequestClose,
	});

	// Memoized so a surface rerender alone does not push every slot down a new
	// value and rerender content that reads the frame.
	const frame = useMemo(
		() => ({ maxBodyHeight, parts, presentation, theme }),
		[maxBodyHeight, parts, presentation, theme]
	);

	if (!rendered) {
		return null;
	}

	// Naming the sheet as well as the action keeps the dimmed area from sharing a
	// label with the sheet's own close button, which would leave a reader with
	// two identical stops and no way to tell which is which.
	const scrimLabel =
		dismissLabel === undefined ? label : `${label}: ${dismissLabel}`;

	// `role`, not `accessibilityRole`. The two props name different lists: `accessibilityRole`
	// is Android's TalkBack enum, which has no region and no dialog, and a value outside it
	// throws inside the view manager instead of being ignored. `role` is the ARIA union, read
	// by React Native's shared C++ layer, where both of these exist.
	const sheet = (
		<View
			{...containerProps}
			accessibilityLabel={label}
			ref={containerRef}
			role={presentation === 'modal' ? 'dialog' : 'region'}
			style={presentation === 'modal' ? parts.sheet : parts.banner}
		>
			<FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
		</View>
	);

	if (presentation === 'banner') {
		return (
			<View
				pointerEvents="box-none"
				style={bannerLayer}
			>
				<Animated.View style={motionStyle}>
					{branding ?? null}
					{sheet}
				</Animated.View>
			</View>
		);
	}

	return (
		<Modal
			animationType="none"
			onRequestClose={onRequestClose}
			transparent
			visible={rendered}
		>
			<KeyboardAvoidingView style={[parts.overlay, FILL]}>
				{onRequestClose === undefined ? null : (
					<Pressable
						accessibilityLabel={scrimLabel}
						accessibilityRole="button"
						onPress={onRequestClose}
						style={StyleSheet.absoluteFill}
					/>
				)}
				<View style={sheetLayer}>
					<Animated.View style={motionStyle}>
						<View style={parts.handle} />
						{sheet}
						{branding ?? null}
					</Animated.View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};
