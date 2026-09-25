/**
 * Guards the stylesheet contract: component rules reach the page once,
 * through the aggregated stylesheet.
 *
 * React, Next.js, TanStack Start, Svelte and Astro document one app-level
 * import of `styles.css` (or `styles.tw3.css`). If a class-map module also
 * imported its component stylesheet, bundlers would emit that stylesheet as a
 * second asset holding rules the aggregate already carries. Next.js with
 * Turbopack did exactly that for the banner, actions, legal links and consent
 * gate on first load, and for the dialog on open.
 *
 * Vue keeps its component-only loading by importing the per-component `.css`
 * files explicitly next to each class map.
 *
 * These read the built artifacts, so `bun run --cwd packages/ui build` (or
 * `turbo run build --filter=@c15t/ui`, which `test` depends on) must have run.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'postcss';
import type { AtRule, ChildNode, Container, Declaration } from 'postcss';
import { describe, expect, test } from 'vitest';

const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');
const COMPONENTS_DIR = join(DIST_DIR, 'styles', 'components');
const PRIMITIVES_DIR = join(DIST_DIR, 'styles', 'primitives');

const readDist = function readDist(path: string): string {
	if (!existsSync(path)) {
		throw new Error(
			`Missing ${path}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}
	return readFileSync(path, 'utf8');
};

const listFiles = function listFiles(dir: string, suffix: string): string[] {
	if (!existsSync(dir)) {
		throw new Error(
			`Missing ${dir}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}
	return readdirSync(dir)
		.filter((file) => file.endsWith(suffix))
		.sort();
};

/** `@layer` is a delivery detail: the aggregate adds or reuses it. */
const contextOf = function contextOf(node: ChildNode): string {
	const context: string[] = [];
	for (
		let parent: Container | undefined = node.parent as Container | undefined;
		parent && parent.type !== 'root';
		parent = parent.parent as Container | undefined
	) {
		if (parent.type === 'atrule' && 'name' in parent) {
			const atRule = parent as AtRule;
			if (atRule.name !== 'layer') {
				context.unshift(`@${atRule.name} ${atRule.params}`);
			}
		}
	}
	return context.join(' ');
};

/**
 * The aggregate widens `:root` blocks to `:root, :host` for shadow-root hosts.
 * Drop the `:host` parts so both sides compare equal.
 */
const normalizeSelector = function normalizeSelector(selector: string): string {
	return selector
		.split(',')
		.map((part) => part.trim())
		.filter((part) => !part.startsWith(':host'))
		.join(',');
};

/** Every style rule as `context|selector|declarations`, keyframes excluded. */
const ruleKeys = function ruleKeys(css: string): Set<string> {
	const keys = new Set<string>();
	parse(css).walkRules((rule) => {
		const parent = rule.parent as AtRule | undefined;
		if (parent?.type === 'atrule' && parent.name.endsWith('keyframes')) {
			return;
		}
		const declarations = rule.nodes
			.filter((node): node is Declaration => node.type === 'decl')
			.map((node) => `${node.prop}:${node.value}`)
			.join(';');
		if (declarations) {
			keys.add(
				`${contextOf(rule)}|${normalizeSelector(rule.selector)}|${declarations}`
			);
		}
	});
	return keys;
};

const COMPONENT_STYLESHEETS = listFiles(COMPONENTS_DIR, '.css');

describe('class maps carry no CSS', () => {
	const classMaps = [
		...listFiles(COMPONENTS_DIR, '.js').map((file) =>
			join(COMPONENTS_DIR, file)
		),
		...listFiles(PRIMITIVES_DIR, '.js').map((file) =>
			join(PRIMITIVES_DIR, file)
		),
	];

	test('the build emits class maps to check', () => {
		expect(classMaps.length).toBeGreaterThan(COMPONENT_STYLESHEETS.length);
	});

	for (const path of classMaps) {
		const label = path.slice(DIST_DIR.length + 1);
		test(`${label} does not import a stylesheet`, () => {
			const contents = readDist(path);

			expect(contents).not.toMatch(/\.css["']/u);
			expect(contents).not.toMatch(/\bimport\s*["']/u);
		});
	}
});

describe('the aggregated stylesheet carries every component rule', () => {
	const aggregates = {
		iab: {
			layered: ruleKeys(readDist(join(DIST_DIR, 'iab', 'styles.css'))),
			tw3: ruleKeys(readDist(join(DIST_DIR, 'iab', 'styles.tw3.css'))),
		},
		standard: {
			layered: ruleKeys(readDist(join(DIST_DIR, 'styles.css'))),
			tw3: ruleKeys(readDist(join(DIST_DIR, 'styles.tw3.css'))),
		},
	};

	for (const file of COMPONENT_STYLESHEETS) {
		const target = file.startsWith('iab-')
			? aggregates.iab
			: aggregates.standard;
		const entry = file.startsWith('iab-') ? 'iab/styles' : 'styles';

		test(`${entry}.css and ${entry}.tw3.css contain every rule of components/${file}`, () => {
			const componentRules = [
				...ruleKeys(readDist(join(COMPONENTS_DIR, file))),
			];

			expect(componentRules.length).toBeGreaterThan(0);
			expect(
				componentRules.filter((rule) => !target.layered.has(rule))
			).toEqual([]);
			expect(componentRules.filter((rule) => !target.tw3.has(rule))).toEqual(
				[]
			);
		});
	}
});
