/**
 * The chrome every consent surface is built from: a sheet, its heading, a body
 * that scrolls before it overflows, a footer, and the enter and exit reveal.
 *
 * Two mounts share it. A banner is an absolutely positioned layer, so mounting
 * one moves no app content: there is no reflow to animate and nothing to shift
 * when the prompt finally goes away. A dialog and a bottom sheet are both a
 * `Modal`, which gives the platform the job of keeping touch and the reader
 * inside the card, and they differ only in where that card sits.
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

import { createContext, useContext, useMemo, useState } from 'react';
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

/**
 * Which of the three presentations is being rendered.
 *
 * `banner` is the absolutely positioned layer over the app. `dialog` and `sheet`
 * both mount in a `Modal` and differ only in where the card sits inside it: a
 * dialog is centred, the way the web surface is, and a sheet is anchored to the
 * bottom edge with a grab handle above the card.
 */
export type ConsentSurfacePresentation = 'banner' | 'dialog' | 'sheet';

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
	// What the list asks for, as the list itself reports it. Nothing above this
	// point can know it: the card is content-sized, and a scroll view that is
	// asked to size itself reports something other than what it draws.
	const [contentHeight, setContentHeight] = useState(0);
	// Only a list that cannot fit gets a scroll container. Web does the same
	// thing in CSS -- the dialog's content scrolls past a maximum height and is
	// just a box below it -- and on React Native the difference is not cosmetic:
	// a scroll view that never scrolls still takes part in measuring the card,
	// which came back 135pt taller than its own bands on a 411x914 device and
	// left that much empty card under the last action.
	const scrolling = contentHeight > maxBodyHeight;
	// Before the first layout pass there is nothing to size from, and the list is
	// left to its own height for that frame.
	let bodyHeight: number | undefined;

	if (contentHeight > 0) {
		bodyHeight = scrolling ? maxBodyHeight : contentHeight;
	}

	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			scrollEnabled={scrolling}
			style={[parts.scroll, { height: bodyHeight }]}
		>
			{/*
			 * The wrapper doubles as the measure. It is a plain `View` rather than
			 * `contentContainerStyle` so the list's own rhythm stays a restylable
			 * part the way every other rhythm here is, and its height is the list.
			 */}
			<View
				onLayout={(event) => {
					const next = Math.round(event.nativeEvent.layout.height);

					// Returning the same number bails out of the render, so a layout
					// pass over an unchanged list cannot ping-pong the surface.
					setContentHeight((previous) => (previous === next ? previous : next));
				}}
				style={parts.scrollContent}
			>
				{children}
			</View>
		</ScrollView>
	);
};

/**
 * What the footer earns from the surface it sits in.
 *
 * The banner is the only surface with a band. It puts its actions on the muted
 * fill under a hairline, 16 deep and 20 in from the card, which is `1rem 1.25rem`
 * on `.footer` over the `--consent-banner-footer-background`. The two card
 * surfaces get none of that: the live dialog's actions sit on the card colour
 * with nothing above them, and `.footer` there declares only vertical padding.
 * Measuring that composition rather than the rule is the difference, and it is
 * why the dialog's own `.footer` border, which does exist in the stylesheet, is
 * never painted: the actions render in a plain container that carries no class.
 *
 * A dialog therefore pays the card's own 24 gutter, `--consent-dialog-card-padding`,
 * so its buttons line up with the heading and the list above them -- the web footer
 * pads `0` sideways and leans on `.content`'s `padding: 0 24 24` for the inset.
 * Above the actions it keeps 24, and that 24 is the number to be careful with: the
 * actions are the *manager's* footer, so `manager.module.css` owns it, and
 * `--consent-manager-footer-padding` is `var(--c15t-space-lg) 0 0 0` -- 24 above,
 * nothing below, the 24 under them being `.content`'s own bottom padding. The 16
 * in `panel.module.css` (`--consent-dialog-footer-padding-y`) is the frame's rule
 * for a footer the dialog never renders, and reading it instead of the manager's
 * put the actions 8 short of where the web puts them. The manager also puts 24
 * between its children, so the live widget measures 48 from the last category card
 * to the first button, and this footer plus the list's own run underneath it is
 * what has to add up to that. A bottom sheet takes `--consent-dialog-card-padding-
 * mobile`, 16 all round, because it runs to the screen edges and has no card
 * padding to inherit. Neither draws a rule: the two are the same card anchored two
 * ways, and flipping `presentation` on a host theme should move the card, not
 * restyle it.
 *
 * The step between two action rows is 8 on all three. `.actionRoot` is `gap:
 * 1rem`, which is what a single action group gets, but the ordinary banner and
 * the ordinary dialog carry `[data-split]` because they hold two groups, and that
 * rule drops it to `0.5rem`. Measured row to row, the web footer is 8.0.
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
	const dialog = presentation === 'dialog';

	// The two edges that disagree per surface, taken as plain numbers because a
	// `ViewStyle` cannot be built up field by field.
	let paddingHorizontal = spacing.m;

	if (banner) {
		paddingHorizontal = BANNER_FOOTER_PADDING_HORIZONTAL;
	} else if (dialog) {
		paddingHorizontal = spacing.l;
	}

	return {
		backgroundColor: banner ? colors.surfaceRaised : colors.surface,
		// Only the banner has an edge to hide: its band sits under the copy, so the
		// rule along its top is what separates the two. A card surface has nothing
		// to separate from itself.
		borderTopColor: banner ? colors.border : undefined,
		borderTopWidth: banner ? 1 : 0,
		gap: spacing.s,
		paddingBottom: dialog ? spacing.l : spacing.m,
		paddingHorizontal,
		paddingTop: dialog ? spacing.l : spacing.m,
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
			role={presentation === 'banner' ? 'region' : 'dialog'}
			style={presentation === 'banner' ? parts.banner : parts.sheet}
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
						{/*
						 * Only a sheet earns a handle. It is the affordance that says the
						 * card can be dragged, and a centred dialog cannot be dragged, so
						 * the web surface that this one is measured against has no bar
						 * above its card.
						 */}
						{presentation === 'sheet' ? <View style={parts.handle} /> : null}
						{sheet}
						{branding ?? null}
					</Animated.View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};
