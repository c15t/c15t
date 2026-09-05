/**
 * Cross-framework geometry capture.
 *
 * The DOM, a11y and computed-style diffs all compare *descriptions* of a
 * surface. None of them notices when the same classes and the same tree
 * lay out differently — a `<h2>` with the user-agent's default margins
 * against a `<div role="heading">` with none produces identical class
 * lists, identical roles and identical declared CSS, and a banner card
 * 26px taller.
 *
 * So this measures the boxes. Every slot is reported relative to the card
 * it sits in rather than to the viewport, because each Storybook wraps
 * stories differently and absolute position would only ever measure the
 * wrapper. Sizes are the point; page offsets are not.
 */

import type { Page } from '@playwright/test';

/** One measured slot. */
export interface SlotBox {
	/** `data-testid`, suffixed with an index when it repeats. */
	slot: string;
	/** Left edge, relative to the anchoring card. */
	x: number;
	/** Top edge, relative to the anchoring card. */
	y: number;
	/** Border-box width. */
	width: number;
	/** Border-box height. */
	height: number;
}

/** A geometry difference between two frameworks. */
export interface GeometryDiff {
	/** The slot that differs. */
	slot: string;
	/** Which box dimension differs, or `<presence>` for a missing slot. */
	field: 'x' | 'y' | 'width' | 'height' | '<presence>';
	/** Baseline value, or `<missing>`. */
	a: number | '<missing>';
	/** Compared value, or `<missing>`. */
	b: number | '<missing>';
}

/**
 * Measure every `data-testid` slot on the page.
 *
 * Runs in the page rather than over a serialized DOM: the boxes only
 * exist once the browser has laid the surface out.
 *
 * @param page - The page showing a story.
 * @returns Every visible slot, in document order.
 */
export const captureGeometry = function captureGeometry(
	page: Page
): Promise<SlotBox[]> {
	return page.evaluate(() => {
		/**
		 * The box a slot is measured against: the card it belongs to, else
		 * the surface root, else itself. Keeps the numbers about layout
		 * inside a component instead of where a Storybook put it.
		 */
		const anchorOf = function anchorOf(element: Element): Element {
			return (
				element.closest('[data-testid$="-card"]') ??
				element.closest('[data-testid$="-root"]') ??
				element
			);
		};

		const round = function round(value: number): number {
			// Two decimals: enough to see a 13.28px UA margin, coarse enough
			// that sub-pixel text metrics do not register as drift.
			return Math.round(value * 100) / 100;
		};

		const seen = new Map<string, number>();
		const boxes: {
			slot: string;
			x: number;
			y: number;
			width: number;
			height: number;
		}[] = [];

		for (const element of document.querySelectorAll('[data-testid]')) {
			const testId = element.getAttribute('data-testid');
			if (!testId) {
				continue;
			}
			const rect = element.getBoundingClientRect();
			// Storybook's own chrome and torn-down portals leave zero-sized
			// nodes behind; they are not part of any surface.
			if (rect.width === 0 && rect.height === 0) {
				continue;
			}
			const index = seen.get(testId) ?? 0;
			seen.set(testId, index + 1);
			const anchor = anchorOf(element).getBoundingClientRect();
			boxes.push({
				height: round(rect.height),
				slot: index === 0 ? testId : `${testId}[${index}]`,
				width: round(rect.width),
				x: round(rect.x - anchor.x),
				y: round(rect.y - anchor.y),
			});
		}

		return boxes;
	});
};

/**
 * Compare two geometry captures.
 *
 * @param a - Baseline capture (React).
 * @param b - The framework under comparison.
 * @param tolerance - Largest difference, in px, that is not a diff.
 * @returns Every slot that differs, empty when the two agree.
 */
export const diffGeometry = function diffGeometry(
	a: readonly SlotBox[],
	b: readonly SlotBox[],
	tolerance: number
): GeometryDiff[] {
	const bySlotA = new Map(a.map((box) => [box.slot, box]));
	const bySlotB = new Map(b.map((box) => [box.slot, box]));
	const diffs: GeometryDiff[] = [];

	for (const slot of new Set([...bySlotA.keys(), ...bySlotB.keys()])) {
		const boxA = bySlotA.get(slot);
		const boxB = bySlotB.get(slot);
		if (!boxA || !boxB) {
			diffs.push({
				a: boxA ? 0 : '<missing>',
				b: boxB ? 0 : '<missing>',
				field: '<presence>',
				slot,
			});
			continue;
		}
		for (const field of ['x', 'y', 'width', 'height'] as const) {
			if (Math.abs(boxA[field] - boxB[field]) > tolerance) {
				diffs.push({ a: boxA[field], b: boxB[field], field, slot });
			}
		}
	}

	return diffs.sort(
		(x, y) => x.slot.localeCompare(y.slot) || x.field.localeCompare(y.field)
	);
};

/**
 * Render diffs as one line each, for a test failure message.
 *
 * @param diffs - The diffs to describe.
 * @returns One line per diff.
 */
export const formatGeometryDiffs = function formatGeometryDiffs(
	diffs: readonly GeometryDiff[]
): string[] {
	return diffs.map(
		(diff) => `${diff.slot}.${diff.field}: ${diff.a} ≠ ${diff.b}`
	);
};
