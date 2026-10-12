/**
 * The system-reserved bands: what a surface does with a measurement, what it
 * reserves when nobody measured one, and whether a band that moves while the
 * prompt is on screen re-lays out without a remount.
 *
 * The insets below are inputs, not expectations: they are the numbers an
 * iPhone Pro reports in each orientation, and every assertion is a relation
 * between two renders of the same surface. Nothing here pins a device's pixel
 * size, because the fix is the arithmetic rather than a constant.
 */

import type { ReactElement } from 'react';
import { useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import {
	createFakeNativeModule,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import {
	resetNativeStub,
	setPlatformOS,
	setStatusBarHeight,
	uiState,
} from '../../__tests__/helpers/react-native-stub';
import { RESERVED_BOTTOM_INSET } from '../../hooks/use-consent-safe-area';
import { resetConsentClient } from '../../native/client';
import { C15tProvider } from '../../provider/c15t-provider';
import type { ConsentSafeAreaInsets } from '../../provider/safe-area-context';
import { ConsentBanner } from '../consent-banner';
import { ConsentDialog } from '../consent-dialog';
import { ConsentPreferences } from '../consent-preferences';
import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import { lightTheme } from '../theme/create-consent-theme';
import {
	nodeStyle,
	requireRole,
	surfaceNode,
	tap,
	translatedSnapshot,
} from './harness';

/** Portrait on a notched iPhone: a status bar band and a home indicator. */
const PORTRAIT = { bottom: 34, left: 0, right: 0, top: 59 };

/**
 * The same device turned sideways: the notch moves to the short edges and the
 * bottom band shrinks to the indicator alone.
 */
const LANDSCAPE = { bottom: 21, left: 59, right: 59, top: 0 };

/** Every band reported as zero, which is the layout this change replaced. */
const NO_BANDS = { bottom: 0, left: 0, right: 0, top: 0 };

/** A resolved style value, read as the length it is. */
const length = function length(
	style: Record<string, unknown>,
	...keys: string[]
): number {
	for (const key of keys) {
		const value = style[key];

		if (typeof value === 'number') {
			return value;
		}
	}

	return 0;
};

/** What {@link mountWithInsets} hands back, with insets the test can change. */
interface InsetTree {
	container: () => HTMLElement;
	rerender: (nextInsets: ConsentSafeAreaInsets | undefined) => void;
	unmount: () => void;
}

/** Mount a surface under a provider carrying the given insets. */
const mountWithInsets = function mountWithInsets(
	insets: ConsentSafeAreaInsets | undefined,
	surface: ReactElement
): InsetTree {
	createFakeNativeModule({ snapshot: translatedSnapshot() });

	const tree = renderTree(
		<C15tProvider safeAreaInsets={insets}>{surface}</C15tProvider>
	);

	return {
		container: tree.container,
		rerender: (nextInsets): void => {
			tree.rerender(
				<C15tProvider safeAreaInsets={nextInsets}>{surface}</C15tProvider>
			);
		},
		unmount: tree.unmount,
	};
};

/** The chrome of a banner or a sheet, as rendered. */
const sheetNode = surfaceNode;

/**
 * The resolved style of the layer a surface is positioned by.
 *
 * Both presentations wrap their sheet in an animated view inside that layer, so
 * the layer is two levels above the chrome either way: the absolutely
 * positioned box for a banner, the full-screen fill for a sheet.
 */
const layerStyle = function layerStyle(root: HTMLElement) {
	const layer = sheetNode(root).parentElement?.parentElement;

	if (!layer) {
		throw new Error('expected the surface to sit inside its layer');
	}

	return nodeStyle(layer);
};

/** The banner's own resolved style. */
const bannerStyle = function bannerStyle(root: HTMLElement) {
	return nodeStyle(sheetNode(root));
};

/** The resolved style of the scrolling body, found by the cap it was given. */
const bodyStyle = function bodyStyle(root: HTMLElement) {
	for (const node of root.querySelectorAll<HTMLElement>('[data-rn-style]')) {
		const style = nodeStyle(node);

		if (typeof style.maxHeight === 'number') {
			return style;
		}
	}

	throw new Error('expected a scrolling body with a height cap');
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('consent surface safe area', () => {
	test('lifts the banner out of the bottom band by exactly the inset', () => {
		const plain = mountWithInsets(NO_BANDS, <ConsentBanner />);
		const before = layerStyle(plain.container());

		const tree = mountWithInsets(PORTRAIT, <ConsentBanner />);
		const after = layerStyle(tree.container());

		expect(after.position).toBe('absolute');
		// Still out of the app's flow, so lifting it cannot move anything.
		expect(after.top ?? null).toBeNull();
		expect(after.bottom).toBe(length(before, 'bottom') + PORTRAIT.bottom);

		plain.unmount();
		tree.unmount();
	});

	/**
	 * How far the outer edge of a card sits above the screen's bottom edge.
	 *
	 * This is the measurement addendum 3 re-took off the live banner: the web card
	 * is 16 from the bottom of an 872 viewport, so the clearance past the band is
	 * one gutter and not a gutter stacked under a whole control height. Reserving
	 * `MIN_TAP_TARGET` here as well is what floated the mobile card 88 above the
	 * bottom of the screen. The 44 did not go away, it moved to the button hit
	 * areas, which is asserted in `web-token-parity.test.tsx`.
	 */
	const cardClearance = function cardClearance(
		layer: Record<string, unknown>
	): number {
		return length(layer, 'bottom') + length(layer, 'paddingBottom', 'padding');
	};

	test('keeps the banner card a gutter clear of the bottom band', () => {
		const tree = mountWithInsets(PORTRAIT, <ConsentBanner />);

		// The band itself is not clearance: a swipe up at the indicator starts
		// inside it and travels. What has to survive is the gutter past it, and it
		// has to stay exactly the gutter, so neither a collapsed edge nor an
		// inflated reserve passes.
		expect(cardClearance(layerStyle(tree.container())) - PORTRAIT.bottom).toBe(
			lightTheme.spacing.m
		);

		tree.unmount();
	});

	test('holds that gutter on a device that reports no band at all', () => {
		const tree = mountWithInsets(NO_BANDS, <ConsentBanner />);

		// The gutter is a constant and not an inset multiplier, so a flat screen
		// gets the same 16 rather than collapsing onto the edge of the display.
		expect(cardClearance(layerStyle(tree.container())) - NO_BANDS.bottom).toBe(
			lightTheme.spacing.m
		);

		tree.unmount();
	});

	test('narrows the banner to the side bands a notch sets in landscape', () => {
		const tree = mountWithInsets(LANDSCAPE, <ConsentBanner />);
		const layer = layerStyle(tree.container());

		expect(layer.paddingLeft ?? null).toBeNull();
		expect(layer.paddingHorizontal).toBe(
			Math.max(length(layer, 'paddingBottom'), LANDSCAPE.left, LANDSCAPE.right)
		);

		tree.unmount();
	});

	test('pushes a sheet below the top band and above the bottom band', () => {
		const dialog = (
			<ConsentDialog
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);

		const plain = mountWithInsets(NO_BANDS, dialog);
		const before = layerStyle(plain.container());

		const tree = mountWithInsets(PORTRAIT, dialog);
		const after = layerStyle(tree.container());

		expect(after.paddingTop).toBe(length(before, 'paddingTop') + PORTRAIT.top);
		expect(after.paddingBottom).toBe(
			length(before, 'paddingBottom') + PORTRAIT.bottom
		);
		// The layer still fills the screen, so the dimmed app behind the sheet
		// keeps covering the bands it is supposed to cover.
		expect(after.flex).toBe(1);

		plain.unmount();
		tree.unmount();
	});

	test('keeps the preference centre clear of both bands it can reach', () => {
		const tree = mountWithInsets(
			PORTRAIT,
			<ConsentPreferences
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);
		const layer = layerStyle(tree.container());
		const body = bodyStyle(tree.container());
		const screen = uiState.window.height;

		// Heading side: the body cap decides how high the sheet reaches, so the
		// cap plus the bands it was sized around has to fit the screen.
		expect(
			length(body, 'maxHeight') + PORTRAIT.top + PORTRAIT.bottom
		).toBeLessThanOrEqual(screen);
		expect(length(layer, 'paddingTop')).toBeGreaterThanOrEqual(PORTRAIT.top);

		// Action side: the band lifts the sheet and the footer keeps its own
		// gutter above it, so the save row is neither inside the indicator nor
		// floated a control height clear of it.
		expect(length(layer, 'paddingBottom') - PORTRAIT.bottom).toBe(
			lightTheme.spacing.m
		);
		expect(cardClearance(layer)).toBeGreaterThan(PORTRAIT.bottom);
		requireRole(tree.container(), 'button', 'Speichern');

		tree.unmount();
	});

	test('shrinks the body cap by the bands instead of overflowing them', () => {
		const centre = (
			<ConsentPreferences
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);

		uiState.window = { fontScale: 1, height: 667, scale: 2, width: 375 };

		const plain = mountWithInsets(NO_BANDS, centre);
		const before = length(bodyStyle(plain.container()), 'maxHeight');

		const tree = mountWithInsets(PORTRAIT, centre);
		const after = length(bodyStyle(tree.container()), 'maxHeight');

		expect(after).toBeLessThan(before);

		plain.unmount();
		tree.unmount();
	});

	test('reserves the interaction floor when the host measured nothing', () => {
		const tree = mountWithInsets(undefined, <ConsentBanner />);
		const layer = layerStyle(tree.container());
		const sheet = bannerStyle(tree.container());

		// The floor is the accessibility minimum rather than any device's
		// indicator height, which is why it holds on hardware nobody measured.
		expect(RESERVED_BOTTOM_INSET).toBe(MIN_TAP_TARGET);
		expect(layer.bottom).toBe(RESERVED_BOTTOM_INSET);

		expect(
			length(layer, 'bottom') +
				length(layer, 'paddingBottom', 'padding') +
				length(sheet, 'paddingBottom', 'padding')
		).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

		tree.unmount();
	});

	test('takes the status bar height for the top band on Android', () => {
		setPlatformOS('android');
		setStatusBarHeight(28);

		const tree = mountWithInsets(
			undefined,
			<ConsentPreferences
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);

		// A centred card is a web surface, and the web overlay pads 16 all round
		// *inside* the safe area: the band is added to the gutter, not traded for it.
		expect(layerStyle(tree.container()).paddingTop).toBe(
			28 + lightTheme.spacing.m
		);

		tree.unmount();
	});

	test('leaves the band alone at the top of a bottom sheet', () => {
		setPlatformOS('android');
		setStatusBarHeight(28);

		const tree = mountWithInsets(
			undefined,
			<ConsentPreferences
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
				presentation="sheet"
			/>
		);

		// The sheet hugs the bottom edge instead, so it reserves nothing up top and
		// the status bar band is the whole padding.
		expect(layerStyle(tree.container()).paddingTop).toBe(28);

		tree.unmount();
	});

	test('re-measures a band that moves while the prompt is on screen', () => {
		const tree = mountWithInsets(PORTRAIT, <ConsentBanner />);
		const layerBefore = sheetNode(tree.container()).parentElement
			?.parentElement as HTMLElement;
		const sheetBefore = sheetNode(tree.container());

		// The indicator collapsed and the device turned: new window, new bands,
		// same tree. A remount would have replaced both nodes.
		uiState.window = { fontScale: 1, height: 390, scale: 3, width: 844 };
		tree.rerender(LANDSCAPE);

		expect(sheetNode(tree.container()).parentElement?.parentElement).toBe(
			layerBefore
		);
		expect(sheetNode(tree.container())).toBe(sheetBefore);
		expect(nodeStyle(layerBefore).bottom).toBe(LANDSCAPE.bottom);
		expect(nodeStyle(layerBefore).paddingHorizontal).toBe(LANDSCAPE.left);

		tree.unmount();
	});

	test('follows a measurement that arrives late without remounting', () => {
		// The shape of a host whose inset source answers after the first frame.
		createFakeNativeModule({ snapshot: translatedSnapshot() });

		const Host = (): ReactElement => {
			const [insets, setInsets] = useState<ConsentSafeAreaInsets>(PORTRAIT);

			return (
				<C15tProvider safeAreaInsets={insets}>
					<button
						data-role="turn"
						onClick={() => {
							setInsets(LANDSCAPE);
						}}
						type="button"
					>
						turn
					</button>
					<ConsentBanner />
				</C15tProvider>
			);
		};

		const tree = renderTree(<Host />);
		const sheet = sheetNode(tree.container());

		expect(layerStyle(tree.container()).bottom).toBe(PORTRAIT.bottom);

		tap(
			tree.container().querySelector<HTMLElement>('[data-role="turn"]') ??
				(document.body as HTMLElement)
		);

		expect(layerStyle(tree.container()).bottom).toBe(LANDSCAPE.bottom);
		expect(sheetNode(tree.container())).toBe(sheet);

		tree.unmount();
	});
});
