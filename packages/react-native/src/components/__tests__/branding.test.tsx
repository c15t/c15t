/**
 * The branding tab and the rasters it draws.
 *
 * Two things are worth pinning here. The asset is a committed module of base64,
 * which means a bad regeneration would ship silently as a blank badge, so the
 * bytes get checked against what a PNG is supposed to start with and how big it
 * is supposed to be. And the tab is mounted outside the card it attaches to,
 * which is the only arrangement that survives the card clipping its own corners.
 */

import { afterEach, describe, expect, test } from 'vitest';

import {
	linking,
	resetNativeStub,
	uiState,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentDialog } from '../consent-dialog';
import { ConsentPreferences } from '../consent-preferences';
import {
	BRANDING_MARK_DATA_URI,
	BRANDING_MARK_SCALES,
	selectBrandingMark,
} from '../internal/branding-mark';
import { lightTheme } from '../theme/create-consent-theme';
import {
	mountSurface,
	nodeStyle,
	roleNodes,
	tap,
	translatedSnapshot,
} from './harness';

/** The 8-byte signature every PNG starts with. */
const PNG_SIGNATURE = '89504e470d0a1a0a';

/** One decoded raster, read far enough to name it. */
interface Raster {
	/** Every decoded byte, so a blank canvas can be caught by its size. */
	bytes: Buffer;
	/** Colour type from `IHDR`: 6 is truecolour with alpha. */
	colorType: number;
	/** Square edge length in pixels. */
	edge: number;
}

/**
 * Decode a data URI as far as `IHDR`.
 *
 * @param uri - The `data:image/png;base64,` URI a scale maps to.
 * @returns The decoded raster.
 * @throws {Error} When the URI is not a base64 PNG.
 */
const decode = function decode(uri: string): Raster {
	const prefix = 'data:image/png;base64,';

	expect(uri.startsWith(prefix)).toBe(true);

	const bytes = Buffer.from(uri.slice(prefix.length), 'base64');

	expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);

	return {
		bytes,
		colorType: bytes[25] as number,
		edge: bytes.readUInt32BE(16),
	};
};

/** The tab, or a thrown assertion when a surface forgot to render one. */
const tabNode = function tabNode(container: HTMLElement): HTMLElement {
	return roleNodes(container, 'link')[0] as HTMLElement;
};

/** The mark element, or a thrown assertion. */
const markNode = function markNode(container: HTMLElement): HTMLElement {
	const node = container.querySelector('img');

	if (node === null) {
		throw new Error('expected the branding tab to draw the c15t mark');
	}

	return node;
};

/** The data URI the mark element was handed. */
const markSource = function markSource(container: HTMLElement): string | null {
	return markNode(container).getAttribute('data-rn-source');
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('the branding mark asset', () => {
	test('each scale is a square 8-bit RGBA PNG of the expected edge', () => {
		expect(BRANDING_MARK_SCALES).toEqual([1, 2, 3]);

		for (const scale of BRANDING_MARK_SCALES) {
			const raster = decode(BRANDING_MARK_DATA_URI[scale]);

			// The 15dp mark, at 1x, 2x and 3x. An asset that came back at the wrong
			// size would still render, just soft or oversized, and nothing else
			// would notice.
			expect(raster.edge).toBe(scale * 15);
			expect(raster.colorType).toBe(6);
		}
	});

	test('the rasters are not a blank canvas', () => {
		// Fully transparent rows compress to almost nothing, so a run of Chromium
		// that drew no glyph would produce a valid PNG of a few dozen bytes.
		for (const scale of BRANDING_MARK_SCALES) {
			const uri = BRANDING_MARK_DATA_URI[scale];

			expect(
				Buffer.from(uri.slice('data:image/png;base64,'.length), 'base64').length
			).toBeGreaterThan(200);
		}
	});
});

describe('selectBrandingMark', () => {
	test('takes the nearest raster to the screen', () => {
		expect(selectBrandingMark(1)).toBe(BRANDING_MARK_DATA_URI[1]);
		expect(selectBrandingMark(2)).toBe(BRANDING_MARK_DATA_URI[2]);
		expect(selectBrandingMark(3)).toBe(BRANDING_MARK_DATA_URI[3]);
	});

	test('rounds a fractional density and clamps past the largest', () => {
		// 2.75 and 3.5 are what real phones report, and neither has its own asset.
		expect(selectBrandingMark(2.75)).toBe(BRANDING_MARK_DATA_URI[3]);
		expect(selectBrandingMark(1.5)).toBe(BRANDING_MARK_DATA_URI[2]);
		expect(selectBrandingMark(4)).toBe(BRANDING_MARK_DATA_URI[3]);
	});

	test('falls back to the smallest raster on a nonsense answer', () => {
		expect(selectBrandingMark(Number.NaN)).toBe(BRANDING_MARK_DATA_URI[1]);
	});
});

describe('ConsentBrandingTag', () => {
	test('draws the raster for the density the screen reports', () => {
		const tree = mountSurface(<ConsentBanner />);

		expect(markSource(tree.container())).toBe(BRANDING_MARK_DATA_URI[3]);

		tree.unmount();

		uiState.window = { fontScale: 1, height: 667, scale: 2, width: 375 };

		const small = mountSurface(<ConsentBanner />);

		expect(markSource(small.container())).toBe(BRANDING_MARK_DATA_URI[2]);

		small.unmount();
	});

	test('is the accent, with the outline the accent needs', () => {
		const tree = mountSurface(<ConsentBanner />);
		const style = nodeStyle(tabNode(tree.container()));

		expect(style.backgroundColor).toBe(lightTheme.colors.primary);
		// The tab is filled with the accent, so its border has to be darker than
		// the fill or the shape dissolves into it.
		expect(style.borderColor).toBe('#2C4FDB');
		expect(style.borderTopColor).toBe('rgba(255, 255, 255, 0.16)');
		expect(style.minHeight).toBe(28);
		expect(style.paddingHorizontal).toBe(10);
		// 5, not the 4.5 in the base rule: `.brandingTag` is restated at
		// `0.3125rem` inside the `max-width: 480px` query every phone matches.
		expect(style.paddingTop).toBe(5);
		expect(style.zIndex).toBe(2);

		const mark = markNode(tree.container());
		const markStyle = nodeStyle(mark);

		expect(markStyle.height).toBe(15);
		expect(markStyle.width).toBe(15);

		tree.unmount();
	});

	test('hangs off the top right of the banner card, sharing its corners', () => {
		const tree = mountSurface(<ConsentBanner />);
		const style = nodeStyle(tabNode(tree.container()));

		expect(style.alignSelf).toBe('flex-end');
		expect(style.marginRight).toBe(12);
		// The card carries a hairline; the tab gives up its own bottom border and
		// overlaps that 1px so the rule runs beside the tab instead of under it.
		expect(style.borderBottomWidth).toBe(0);
		expect(style.marginBottom).toBe(-1);
		expect(style.borderTopRightRadius).toBe(lightTheme.radius.surface);
		expect(style.borderBottomRightRadius).toBe(0);

		tree.unmount();
	});

	test('hangs off the bottom of a sheet instead, where the card has no border', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);
		const style = nodeStyle(tabNode(tree.container()));

		expect(style.alignSelf).toBe('flex-end');
		// 16, the sheet's own content inset, and no overlap: the sheet draws no
		// border, so there is no seam for a -1px to hide.
		expect(style.marginRight).toBe(16);
		// An overlap of nothing. The stand-in records an absent key as null, which is
		// how this differs from the banner variant's -1.
		expect(style.marginBottom).toBeNull();
		expect(style.borderTopWidth).toBe(0);
		expect(style.borderTopRightRadius).toBe(0);
		expect(style.borderBottomRightRadius).toBe(lightTheme.radius.surface);

		tree.unmount();
	});

	test('opens c15t on the press', () => {
		const tree = mountSurface(<ConsentBanner />);

		tap(tabNode(tree.container()));

		expect(linking.opened).toEqual(['https://c15t.com']);

		tree.unmount();
	});

	test('the host can take it out of every surface', () => {
		const centre = (
			<ConsentPreferences
				hideBranding
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);
		const sheet = (
			<ConsentDialog
				hideBranding
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);

		for (const surface of [
			<ConsentBanner
				hideBranding
				key="banner"
			/>,
			sheet,
			centre,
		]) {
			const tree = mountSurface(surface);

			expect(roleNodes(tree.container(), 'link')).toEqual([]);

			tree.unmount();
		}
	});

	test('the bundle owns the lead-in and not the brand', () => {
		const snapshot = translatedSnapshot({
			translations: {
				language: 'de',
				translations: { common: { securedBy: 'Rechtsgrundlage' } },
			},
		});
		const tree = mountSurface(<ConsentBanner />, snapshot);

		expect(tabNode(tree.container()).getAttribute('aria-label')).toBe(
			'Rechtsgrundlage c15t'
		);
		expect(tree.text()).toContain('Rechtsgrundlage');

		tree.unmount();
	});
});
