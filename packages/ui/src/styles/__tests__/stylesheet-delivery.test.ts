/**
 * Guards the stylesheet contract: each component rule reaches the page once,
 * and the render-blocking stylesheet carries only what a first paint can
 * show.
 *
 * - `styles.css` / `styles.tw3.css`: default tokens, every variable, and the
 *   rules for the banner, dialog trigger and ConsentGate. The app imports it
 *   once; it blocks rendering.
 * - `styles/dialog.css`: dialog and preference-widget rules. The dialog's
 *   module imports it, so bundlers ship it with the lazy dialog chunk.
 * - `styles/primitives.css`: rules for the primitive class maps.
 * - `iab/styles.css`: IAB variables and rules, loaded next to `styles.css`.
 *
 * Class maps stay CSS-free. If one imported its component stylesheet,
 * bundlers would emit that stylesheet as a second asset holding rules an
 * aggregate already carries. Next.js with Turbopack did exactly that for the
 * banner, actions, legal links and consent gate on first load, and for the
 * dialog on open.
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

import {
	DIALOG_COMPONENTS,
	FIRST_PAINT_COMPONENTS,
	IAB_PREFIX,
} from '../../../scripts/stylesheet-parts';

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

/** `:root` custom-property blocks, which always go into `styles.css`. */
const isVariableRule = (key: string) => key.split('|')[1]?.includes(':root');

const sheets = {
	dialog: ruleKeys(readDist(join(DIST_DIR, 'styles', 'dialog.css'))),
	iab: ruleKeys(readDist(join(DIST_DIR, 'iab', 'styles.css'))),
	iabTw3: ruleKeys(readDist(join(DIST_DIR, 'iab', 'styles.tw3.css'))),
	primitives: ruleKeys(readDist(join(DIST_DIR, 'styles', 'primitives.css'))),
	styles: ruleKeys(readDist(join(DIST_DIR, 'styles.css'))),
	stylesTw3: ruleKeys(readDist(join(DIST_DIR, 'styles.tw3.css'))),
};

const groupOf = function groupOf(
	file: string
): 'dialog' | 'first-paint' | 'iab' {
	const name = file.replace(/\.css$/u, '');
	if (name.startsWith(IAB_PREFIX)) {
		return 'iab';
	}
	if ((DIALOG_COMPONENTS as readonly string[]).includes(name)) {
		return 'dialog';
	}
	if ((FIRST_PAINT_COMPONENTS as readonly string[]).includes(name)) {
		return 'first-paint';
	}
	throw new Error(`components/${file} is in neither stylesheet part`);
};

const missingFrom = (rules: string[], sheet: Set<string>) =>
	rules.filter((rule) => !sheet.has(rule));

/**
 * Where each group's rules and variables must appear. IAB variables and
 * rules ship in the IAB sheet only. Every other variable rides in the
 * render-blocking sheet, so a host's override of one is never re-declared by
 * a sheet that loads later.
 */
const TARGETS = {
	dialog: {
		rules: [sheets.dialog],
		variables: [sheets.styles, sheets.stylesTw3],
	},
	'first-paint': {
		rules: [sheets.styles, sheets.stylesTw3],
		variables: [sheets.styles, sheets.stylesTw3],
	},
	iab: {
		rules: [sheets.iab, sheets.iabTw3],
		variables: [sheets.iab, sheets.iabTw3],
	},
} as const;

describe('each component rule lands in the stylesheet for its surface', () => {
	for (const file of COMPONENT_STYLESHEETS) {
		const group = groupOf(file);
		const target = TARGETS[group];

		test(`components/${file} (${group})`, () => {
			const all = [...ruleKeys(readDist(join(COMPONENTS_DIR, file)))];
			const variables = all.filter(isVariableRule);
			const rules = all.filter((rule) => !isVariableRule(rule));

			expect(rules.length).toBeGreaterThan(0);
			expect(target.rules.map((sheet) => missingFrom(rules, sheet))).toEqual(
				target.rules.map(() => [])
			);
			expect(
				target.variables.map((sheet) => missingFrom(variables, sheet))
			).toEqual(target.variables.map(() => []));
		});
	}

	for (const file of listFiles(PRIMITIVES_DIR, '.module.css')) {
		test(`primitives/${file}`, () => {
			const rules = [...ruleKeys(readDist(join(PRIMITIVES_DIR, file)))].filter(
				(rule) => !isVariableRule(rule)
			);
			expect(missingFrom(rules, sheets.primitives)).toEqual([]);
		});
	}
});

describe('the render-blocking stylesheet holds only first-paint rules', () => {
	/** Hashed class names of a class map in `dist/styles/<dir>/<name>.js`. */
	const classNamesOf = function classNamesOf(path: string): string[] {
		return [...readDist(path).matchAll(/c15t-ui-[\w-]+/gu)].map(
			(match) => match[0]
		);
	};
	const selectorsOf = (keys: Set<string>) =>
		[...keys].map((key) => key.split('|')[1] ?? '').join('\n');

	const deferred = [
		...DIALOG_COMPONENTS.map((name) => `components/${name}.js`),
		...listFiles(PRIMITIVES_DIR, '.module.js').map(
			(file) => `primitives/${file}`
		),
		...COMPONENT_STYLESHEETS.filter((file) => file.startsWith(IAB_PREFIX)).map(
			(file) => `components/${file.replace(/\.css$/u, '.js')}`
		),
	];

	for (const classMap of deferred) {
		test(`styles.css and styles.tw3.css select no class from ${classMap}`, () => {
			const classNames = classNamesOf(join(DIST_DIR, 'styles', classMap));
			expect(classNames.length).toBeGreaterThan(0);
			for (const sheet of [sheets.styles, sheets.stylesTw3]) {
				const selectors = selectorsOf(sheet);
				expect(classNames.filter((name) => selectors.includes(name))).toEqual(
					[]
				);
			}
		});
	}

	test('the dialog, primitive and IAB sheets declare no variables', () => {
		// Only styles.css declares variables. The IAB sheet adds IAB variables,
		// which styles.css does not declare.
		for (const sheet of [sheets.dialog, sheets.primitives]) {
			expect([...sheet].filter(isVariableRule)).toEqual([]);
		}
		expect(
			[...sheets.iab].filter(
				(rule) => isVariableRule(rule) && sheets.styles.has(rule)
			)
		).toEqual([]);
	});

	test('no rule reaches the page twice', () => {
		const overlap = (a: Set<string>, b: Set<string>) =>
			[...a].filter((rule) => b.has(rule));

		expect(overlap(sheets.styles, sheets.dialog)).toEqual([]);
		expect(overlap(sheets.styles, sheets.primitives)).toEqual([]);
		expect(overlap(sheets.styles, sheets.iab)).toEqual([]);
		expect(overlap(sheets.dialog, sheets.iab)).toEqual([]);
	});

	test('the dialog and primitive sheets keep their rules in @layer components', () => {
		for (const file of ['dialog.css', 'primitives.css']) {
			const css = readDist(join(DIST_DIR, 'styles', file));
			const root = parse(css);
			const topLevel = root.nodes.filter((node) => node.type !== 'comment');
			expect(topLevel).toHaveLength(1);
			expect(topLevel[0]).toMatchObject({
				name: 'layer',
				params: 'components',
				type: 'atrule',
			});
		}
	});
});
