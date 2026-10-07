/**
 * The consent banner appears on its first frame, with no entry animation.
 *
 * It usually shows as the page loads, so a slide or scale in reads as layout
 * shift rather than polish. Hiding may still fade out. Every adapter mounts
 * the banner with some of the visible and entering classes below, so none of
 * them may carry motion, and no `@starting-style` rule may give the mount a
 * hidden start state.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'postcss';
import { describe, expect, test } from 'vitest';

const COMPONENTS_DIR = join(__dirname, '..', 'components');

const ENTRY_CLASS =
	/\.(?:banner|overlay)(?:Visible|Entering|EnterActive|EnterFrom|EnterTo)\b/u;

const MOTION_PROPERTY = /^(?:transition|animation|transform)(?:-[a-z-]+)?$/u;

const entryMotion = function entryMotion(source: string): string[] {
	const found: string[] = [];
	const root = parse(source);

	root.walkAtRules('starting-style', (atRule) => {
		atRule.walkRules((rule) => {
			if (ENTRY_CLASS.test(rule.selector)) {
				found.push(`@starting-style ${rule.selector}`);
			}
		});
	});

	root.walkRules((rule) => {
		if (!ENTRY_CLASS.test(rule.selector)) {
			return;
		}
		rule.walkDecls(MOTION_PROPERTY, (decl) => {
			if (decl.value.trim() !== 'none') {
				found.push(`${rule.selector} { ${decl.prop}: ${decl.value} }`);
			}
		});
	});

	return found;
};

describe('banner entry', () => {
	test.each(['prompt.module.css', 'iab-prompt.module.css'])(
		'%s shows the banner without an entry animation',
		(file) => {
			const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
			expect(entryMotion(source)).toEqual([]);
		}
	);

	test('flags a slide in on the visible state', () => {
		const css = `
			.bannerVisible { opacity: 1; transition: transform 80ms; }
			@starting-style { .bannerEntering { opacity: 0; } }`;
		expect(entryMotion(css)).toEqual([
			'@starting-style .bannerEntering',
			'.bannerVisible { transition: transform 80ms }',
		]);
	});
});
