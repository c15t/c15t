/**
 * The demo-link grammar, pinned.
 *
 * This is the one part of the deep-link path a reviewer cannot confirm by eye, because
 * it happens before anything is on screen. A link that mis-parses does not fail loudly:
 * the app opens and the consent state does not move, which reads as a broken SDK rather
 * than a broken parser. So the shapes a shell command can produce are fixed here.
 */

import { describe, expect, it } from 'vitest';

import {
	DEMO_LINK_SCHEME,
	linkFlag,
	linkRequestsReport,
	parseDemoLink,
} from './parse';

describe('parseDemoLink', () => {
	it('reads a bare verb off the authority', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://accept`);

		expect(link?.verb).toBe('accept');
		expect(link?.rest).toEqual([]);
		expect(link?.params).toEqual({});
	});

	it('keeps the URL as it arrived, for the on-screen receipt', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://reject?x=1`);

		expect(link?.raw).toBe(`${DEMO_LINK_SCHEME}://reject?x=1`);
	});

	it('takes a path segment as the argument to a verb', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://scheme/dark`);

		expect(link?.verb).toBe('scheme');
		expect(link?.rest).toEqual(['dark']);
	});

	it('decodes a percent-encoded argument', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://identify/id%2042`);

		expect(link?.rest).toEqual(['id 42']);
	});

	it('reads query parameters, and lets the last one win', () => {
		const link = parseDemoLink(
			`${DEMO_LINK_SCHEME}://save?experience=1&marketing=0&marketing=1`
		);

		expect(link?.params.experience).toBe('1');
		expect(link?.params.marketing).toBe('1');
	});

	it('keeps an empty parameter as empty, which is how a clear is typed', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://overrides?country=`);

		expect(link?.params.country).toBe('');
	});

	it('drops a fragment', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://accept#step-3`);

		expect(link?.verb).toBe('accept');
		expect(link?.params).toEqual({});
	});

	it('accepts the spelling without authority slashes', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}:reject`);

		expect(link?.verb).toBe('reject');
	});

	it('ignores a link from another scheme', () => {
		expect(parseDemoLink('https://c15t.com/accept')).toBeNull();
		expect(parseDemoLink('mailto:someone@c15t.com')).toBeNull();
	});

	it('ignores no link at all', () => {
		expect(parseDemoLink(null)).toBeNull();
		expect(parseDemoLink(undefined)).toBeNull();
	});

	it('reports an empty verb for a bare scheme', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://`);

		expect(link?.verb).toBe('');
	});

	it('leaves a malformed escape alone', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://identify/%zz`);

		expect(link?.rest).toEqual(['%zz']);
	});
});

describe('linkFlag', () => {
	const truthy = ['1', 'true', 'yes', 'on', 'EXPERIENCE'];

	for (const value of truthy) {
		it(`reads ${value} as on`, () => {
			const link = parseDemoLink(
				`${DEMO_LINK_SCHEME}://save?marketing=${value}`
			);

			expect(link === null ? '' : linkFlag(link, 'marketing')).toBe(true);
		});
	}

	const falsy = ['0', 'false', 'no', 'off'];

	for (const value of falsy) {
		it(`reads ${value} as off`, () => {
			const link = parseDemoLink(
				`${DEMO_LINK_SCHEME}://save?marketing=${value}`
			);

			expect(link === null ? '' : linkFlag(link, 'marketing')).toBe(false);
		});
	}

	it('reads an absent parameter as off', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://save?experience=1`);

		expect(link === null ? '' : linkFlag(link, 'marketing')).toBe(false);
	});
});

describe('linkRequestsReport', () => {
	// The receipt for a link is printed on the Diagnostics tab, and iOS can only
	// deliver a link at launch, which resets that tab. A step that wants its receipt
	// in the screenshot has to ask for the tab in the same link.
	it('asks for the tab when the link carries the flag', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://accept?report=1`);

		expect(link === null ? false : linkRequestsReport(link)).toBe(true);
	});

	it('leaves the tab alone when no flag is on the link', () => {
		const link = parseDemoLink(
			`${DEMO_LINK_SCHEME}://save?measurement=1&marketing=0`
		);

		expect(link === null ? false : linkRequestsReport(link)).toBe(false);
	});

	it('honours a flag spelled off', () => {
		const link = parseDemoLink(`${DEMO_LINK_SCHEME}://accept?report=0`);

		expect(link === null ? false : linkRequestsReport(link)).toBe(false);
	});

	it('reports without disturbing the categories the same link names', () => {
		const link = parseDemoLink(
			`${DEMO_LINK_SCHEME}://save?measurement=1&report=1`
		);

		if (link === null) {
			throw new Error('expected a demo link');
		}

		expect(linkRequestsReport(link)).toBe(true);
		expect(linkFlag(link, 'measurement')).toBe(true);
		expect(linkFlag(link, 'marketing')).toBe(false);
	});
});
