/**
 * The script-tag build inlines only the `@c15t/ui` rules its surfaces can
 * match.
 *
 * `@c15t/ui/styles.css` also styles the headless primitives, the vendor list,
 * tabs, collapsibles and the ConsentGate placeholder, which the vanilla and
 * IAB surfaces never render. `scripts/build-styles.ts` prunes them; these
 * tests read what it generated (`bun prebuild` runs before the suite).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import {
	collectClassNames,
	pruneStylesheet,
	withoutTailwind3Hints,
} from '../../scripts/prune-stylesheet';
import {
	classes as iabClasses,
	stylesheet as iabStylesheet,
} from '../generated/iab-styles';
import { classes, stylesheet } from '../generated/styles';

const require = createRequire(import.meta.url);
const uiStylesheet = (specifier: string) =>
	readFileSync(require.resolve(specifier), 'utf8');
// This package renders the dialog eagerly, so its sheet starts from both.
const uiMainStylesheet = () =>
	[
		uiStylesheet('@c15t/ui/styles.css'),
		uiStylesheet('@c15t/ui/styles/dialog.css'),
	].join('\n');

const rendered = collectClassNames([classes, iabClasses]);

/** Every hashed ui class a sheet's selectors require, outside `:not()`. */
const requiredUiClasses = (css: string): Set<string> => {
	const names = new Set<string>();
	const withoutNegations = css.replace(/:not\((?:[^()]|\([^()]*\))*\)/gu, '');
	for (const match of withoutNegations.matchAll(
		/\.(?<name>c15t-ui-[\w-]+-[\w-]{5})(?![\w-])/gu
	)) {
		names.add(match.groups?.name ?? '');
	}
	return names;
};

describe('inlined stylesheet', () => {
	it('carries no rule that needs a class these surfaces never render', () => {
		const unrendered = [
			...requiredUiClasses(stylesheet),
			...requiredUiClasses(iabStylesheet),
		].filter((name) => !rendered.has(name));
		expect(unrendered).toEqual([]);
	});

	it('keeps every rule the surfaces can match', () => {
		expect(stylesheet).toBe(
			withoutTailwind3Hints(pruneStylesheet(uiMainStylesheet(), rendered))
		);
		expect(iabStylesheet).toBe(
			withoutTailwind3Hints(
				pruneStylesheet(uiStylesheet('@c15t/ui/iab/styles.css'), rendered)
			)
		);
		expect(stylesheet).not.toContain('postcss-tailwind3');
		expect(iabStylesheet).not.toContain('postcss-tailwind3');
		// The tokens and the class-map rules the banner starts from are there.
		expect(stylesheet).toContain('--c15t-surface');
		expect(stylesheet).toContain(`.${classes.banner.card?.split(' ')[0]}`);
	});

	it('is smaller than the full @c15t/ui stylesheet', () => {
		// The stylesheet split already keeps the primitive rules out of both
		// source files, so pruning removes the vendor-list, preference-item,
		// collapsible, tabs and ConsentGate rules: about a tenth of the bytes.
		expect(stylesheet.length).toBeLessThan(uiMainStylesheet().length * 0.95);
	});
});

describe('pruneStylesheet', () => {
	const used = new Set(['c15t-ui-root-AAAAA']);
	const keeps = (selector: string) =>
		pruneStylesheet(`${selector}{color:red}`, used) !== '';

	it('drops a selector that needs an unrendered ui class', () => {
		expect(keeps('.c15t-ui-list-BBBBB .c15t-ui-root-AAAAA')).toBe(false);
		expect(keeps('.c15t-ui-root-AAAAA:has(.c15t-ui-x-CCCCC)')).toBe(false);
	});

	it('ignores negations and classes @c15t/ui does not generate', () => {
		expect(keeps('.c15t-ui-root-AAAAA:not(.c15t-ui-x-CCCCC)')).toBe(true);
		expect(keeps('.c15t-dark .c15t-ui-root-AAAAA')).toBe(true);
		expect(keeps(':root,:host')).toBe(true);
	});

	it('drops only the unmatchable selectors of a rule', () => {
		expect(
			pruneStylesheet(
				'.c15t-ui-root-AAAAA,.c15t-ui-x-CCCCC{color:red}@media (min-width:1px){.c15t-ui-x-CCCCC{color:blue}}@keyframes k{0%{opacity:0}}',
				used
			)
		).toBe('.c15t-ui-root-AAAAA{color:red}@keyframes k{0%{opacity:0}}');
	});
});
