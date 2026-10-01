/**
 * Guards the layer order statement at the top of every layered entrypoint.
 *
 * Cascade layers rank by first mention. A page that loads c15t's stylesheet
 * before Tailwind 4's (Astro injects it from `page-ssr`, and an app may
 * import it above its `globals.css`) would otherwise declare `components`
 * first, rank it below Tailwind's `base`, and let preflight zero the
 * banner's padding and borders. Declaring Tailwind 4's full order first
 * keeps `components` between `base` and `utilities` whichever sheet loads
 * first.
 *
 * These read the built artifacts, so `bun run --cwd packages/ui build` (or
 * `turbo run build --filter=@c15t/ui`, which `test` depends on) must have run.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'postcss';
import type { AtRule } from 'postcss';
import { describe, expect, test } from 'vitest';

const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');

/** What Tailwind 4 declares: `@layer properties;` then the other four. */
const TAILWIND_4_LAYER_ORDER = [
	'properties',
	'theme',
	'base',
	'components',
	'utilities',
];

const LAYERED_ENTRYPOINTS = [
	'styles.css',
	join('styles', 'dialog.css'),
	join('styles', 'primitives.css'),
	join('iab', 'styles.css'),
];

const FLAT_ENTRYPOINTS = ['styles.tw3.css', join('iab', 'styles.tw3.css')];

const readEntrypoint = function readEntrypoint(relativePath: string): string {
	const path = join(DIST_DIR, relativePath);
	if (!existsSync(path)) {
		throw new Error(
			`Missing ${path}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}
	return readFileSync(path, 'utf8');
};

const layerRules = function layerRules(css: string): AtRule[] {
	const rules: AtRule[] = [];
	parse(css).walkAtRules('layer', (rule) => {
		rules.push(rule);
	});
	return rules;
};

describe.each(LAYERED_ENTRYPOINTS)('%s', (entrypoint) => {
	const css = readEntrypoint(entrypoint);

	test('mentions Tailwind 4 layer order before any layer block', () => {
		const [first] = layerRules(css);

		expect({
			isBlock: first?.nodes !== undefined,
			order: first?.params.split(/\s*,\s*/u),
		}).toEqual({ isBlock: false, order: TAILWIND_4_LAYER_ORDER });
	});
});

describe.each(FLAT_ENTRYPOINTS)('%s', (entrypoint) => {
	test('stays free of @layer for Tailwind 3', () => {
		expect(layerRules(readEntrypoint(entrypoint))).toEqual([]);
	});
});
