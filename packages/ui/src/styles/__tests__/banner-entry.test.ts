/**
 * The consent banner never moves as it enters, and only fades when it
 * arrives late.
 *
 * A banner that shows with the page is part of the first paint, so a slide
 * or scale in reads as layout shift rather than polish. Every adapter mounts
 * the banner with some of the visible and entering classes below, so none of
 * them may carry motion and no `@starting-style` rule may give the mount a
 * hidden start state. The one exception is a mount the adapter marked
 * `data-entry="late"`, after the page has painted: that may fade in, with
 * opacity only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'postcss';
import { describe, expect, test } from 'vitest';

const COMPONENTS_DIR = join(__dirname, '..', 'components');

const ENTRY_CLASS =
	/\.(?:banner|overlay)(?:Visible|Entering|EnterActive|EnterFrom|EnterTo)\b/u;

const LATE_ENTRY = /\[data-entry=['"]?late['"]?\]/u;

const MOTION_PROPERTY = /^(?:transition|animation|transform)(?:-[a-z-]+)?$/u;

/** A transition of opacity alone, such as `opacity 150ms ease-out`. */
const OPACITY_TRANSITION = /^opacity(?:\s|$)/u;

const allowedLate = function allowedLate(prop: string, value: string): boolean {
	if (prop === 'transition') {
		return OPACITY_TRANSITION.test(value.trim()) && !value.includes(',');
	}
	return prop === 'transition-property' && value.trim() === 'opacity';
};

const entryMotion = function entryMotion(source: string): string[] {
	const found: string[] = [];
	const root = parse(source);

	root.walkAtRules('starting-style', (atRule) => {
		atRule.walkRules((rule) => {
			if (!ENTRY_CLASS.test(rule.selector)) {
				return;
			}
			const late = LATE_ENTRY.test(rule.selector);
			rule.walkDecls((decl) => {
				if (!(late && decl.prop === 'opacity')) {
					found.push(`@starting-style ${rule.selector} { ${decl.prop} }`);
				}
			});
		});
	});

	root.walkRules((rule) => {
		if (!ENTRY_CLASS.test(rule.selector)) {
			return;
		}
		if (rule.parent?.type === 'atrule' && 'name' in rule.parent) {
			if (rule.parent.name === 'starting-style') {
				return;
			}
		}
		const late = LATE_ENTRY.test(rule.selector);
		rule.walkDecls(MOTION_PROPERTY, (decl) => {
			if (decl.value.trim() === 'none') {
				return;
			}
			if (late && allowedLate(decl.prop, decl.value)) {
				return;
			}
			found.push(`${rule.selector} { ${decl.prop}: ${decl.value} }`);
		});
	});

	return found;
};

describe('banner entry', () => {
	test.each(['prompt.module.css', 'iab-prompt.module.css'])(
		'%s never moves the banner in, and only fades a late one',
		(file) => {
			const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
			expect(entryMotion(source)).toEqual([]);
		}
	);

	test.each(['prompt.module.css', 'iab-prompt.module.css'])(
		'%s fades in a banner marked late',
		(file) => {
			const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
			let startsHidden = false;
			parse(source).walkAtRules('starting-style', (atRule) => {
				atRule.walkRules((rule) => {
					if (
						/\.bannerEntering\b/u.test(rule.selector) &&
						LATE_ENTRY.test(rule.selector)
					) {
						rule.walkDecls('opacity', (decl) => {
							startsHidden ||= decl.value.trim() === '0';
						});
					}
				});
			});
			expect(startsHidden).toBe(true);
		}
	);

	test('flags a slide in on the visible state', () => {
		const css = `
			.bannerVisible { opacity: 1; transition: transform 80ms; }
			@starting-style { .bannerEntering { opacity: 0; } }`;
		expect(entryMotion(css)).toEqual([
			'@starting-style .bannerEntering { opacity }',
			'.bannerVisible { transition: transform 80ms }',
		]);
	});

	test('flags motion on a late entry', () => {
		const css = `
			.bannerEntering[data-entry='late'] { transition: opacity 150ms, transform 150ms; }
			@starting-style { .bannerEntering[data-entry='late'] { opacity: 0; transform: translateY(1rem); } }`;
		expect(entryMotion(css)).toEqual([
			"@starting-style .bannerEntering[data-entry='late'] { transform }",
			".bannerEntering[data-entry='late'] { transition: opacity 150ms, transform 150ms }",
		]);
	});

	test('allows an opacity fade on a late entry', () => {
		const css = `
			.bannerEntering[data-entry='late'] { transition: opacity 150ms ease-out; }
			@starting-style { .bannerEntering[data-entry='late'] { opacity: 0; } }`;
		expect(entryMotion(css)).toEqual([]);
	});
});
