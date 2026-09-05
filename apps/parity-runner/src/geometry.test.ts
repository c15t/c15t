import { expect, test } from 'bun:test';

import { diffGeometry, formatGeometryDiffs } from './geometry';
import type { SlotBox } from './geometry';

const box = function box(
	slot: string,
	x: number,
	y: number,
	width: number,
	height: number
): SlotBox {
	return { height, slot, width, x, y };
};

test('identical captures produce no diffs', () => {
	const a = [box('consent-banner-card', 0, 0, 442, 191)];
	expect(diffGeometry(a, [...a], 1)).toEqual([]);
});

test('differences inside the tolerance are not drift', () => {
	const a = [box('consent-banner-card', 0, 0, 442, 191)];
	const b = [box('consent-banner-card', 0, 0, 442, 191.5)];
	expect(diffGeometry(a, b, 1)).toEqual([]);
});

test('a heading margin shows up as a height difference', () => {
	const a = [box('consent-banner-card', 0, 0, 442, 217.03)];
	const b = [box('consent-banner-card', 0, 0, 442, 190.5)];
	const diffs = diffGeometry(a, b, 1);
	expect(diffs).toEqual([
		{ a: 217.03, b: 190.5, field: 'height', slot: 'consent-banner-card' },
	]);
	expect(formatGeometryDiffs(diffs)).toEqual([
		'consent-banner-card.height: 217.03 ≠ 190.5',
	]);
});

test('a slot only one framework renders is a presence diff', () => {
	const diffs = diffGeometry(
		[],
		[box('consent-banner-branding', 300, -38, 128, 38)],
		1
	);
	expect(diffs).toEqual([
		{
			a: '<missing>',
			b: 0,
			field: '<presence>',
			slot: 'consent-banner-branding',
		},
	]);
});

test('a differing group count shows up on the indexed slot', () => {
	const single = [box('consent-widget-footer-sub-group', 0, 0, 326, 36)];
	const split = [
		box('consent-widget-footer-sub-group', 0, 0, 195, 36),
		box('consent-widget-footer-sub-group[1]', 240, 0, 115, 36),
	];
	const diffs = diffGeometry(single, split, 1);
	expect(diffs.map((diff) => `${diff.slot}.${diff.field}`)).toEqual([
		'consent-widget-footer-sub-group.width',
		'consent-widget-footer-sub-group[1].<presence>',
	]);
});
