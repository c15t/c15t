import { describe, expect, it } from 'vitest';

import {
	extractClassSelectors,
	findStylesheetOverlap,
} from './stylesheet-overlap';

describe('extractClassSelectors', () => {
	it('reads selector classes and ignores values, strings, urls, and at-rules', () => {
		const classes = extractClassSelectors(`
			/* .commented { color: red } */
			.c15t-banner, .c15t-banner > .c15t-title:hover { margin: .5em; }
			@media (min-width: 40rem) { .c15t-wide { content: ".not-a-class"; } }
			.c15t-icon { background: url(./a.b.svg); }
			.parent { color: red; &.nested-child { color: blue; } }
		`);
		expect([...classes].toSorted()).toEqual([
			'c15t-banner',
			'c15t-icon',
			'c15t-title',
			'c15t-wide',
			'nested-child',
			'parent',
		]);
	});
});

describe('findStylesheetOverlap', () => {
	it('counts classes that an aggregate and a component stylesheet both define', () => {
		const overlap = findStylesheetOverlap([
			{
				text: '.banner{}.dialog{}.token{}',
				url: '/aggregate.css',
			},
			{ text: '.banner{}.actions{}', url: '/banner.css' },
			{ text: '.page{}', url: '/app.css' },
		]);
		expect(overlap.sharedClassCount).toBe(1);
		expect(overlap.sharedClassSample).toEqual(['banner']);
		expect(overlap.assets).toEqual([
			{ classCount: 3, sharedClassCount: 1, url: '/aggregate.css' },
			{ classCount: 2, sharedClassCount: 1, url: '/banner.css' },
			{ classCount: 1, sharedClassCount: 0, url: '/app.css' },
		]);
	});

	it('reports no overlap for disjoint stylesheets', () => {
		expect(
			findStylesheetOverlap([
				{ text: '.a{}', url: '/a.css' },
				{ text: '.b{}', url: '/b.css' },
			]).sharedClassCount
		).toBe(0);
	});
});
