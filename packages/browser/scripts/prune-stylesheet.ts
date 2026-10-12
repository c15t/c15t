/**
 * Drops the `@c15t/ui` rules this package's surfaces can never match.
 *
 * `@c15t/ui/styles.css` styles every framework's surfaces: the headless
 * primitives, the tabbed and collapsible parts, the ConsentGate
 * placeholder. The vanilla banner, dialog and trigger render a
 * fixed set of class maps, so a rule that needs a class outside them only
 * costs bytes in `c15t.js` and selector matching in the shadow root.
 *
 * Only `@c15t/ui`'s hashed CSS-module classes (`c15t-ui-<name>-<hash>`) decide
 * anything. A selector keeps its rule unless it requires one of those classes
 * and no class map this package renders contains it. Classes inside `:not()`
 * never make a selector unmatchable, and plain classes such as `c15t-dark` or
 * `c15t-theme-root` are assumed present. `:root`/`:host` token blocks and
 * `@keyframes` are kept. A component custom property goes only when every
 * rule that read it went, such as the tabs and ConsentGate variables; the
 * `--c15t-*` theme tokens always stay.
 */

import { parse } from 'postcss';
import type { AtRule, Root } from 'postcss';

/** Class names `@c15t/ui` generates for its CSS modules. */
const HASHED_CLASS = /^c15t-ui-[\w-]+-[\w-]{5}$/u;

const NEGATION = /:not\((?:[^()]|\([^()]*\))*\)/gu;

const CLASS_NAME = /\.(?<name>-?[_a-zA-Z][\w-]*)/gu;

const VAR_REFERENCE = /var\(\s*(?<name>--[\w-]+)/gu;

/** Theme tokens: public, so never dropped. */
const THEME_TOKEN = /^--c15t-/u;

/**
 * Every class name a set of class maps can put on an element.
 *
 * @param maps - Class maps, nested in any shape, with space-separated values.
 * @returns The class names.
 */
export const collectClassNames = function collectClassNames(
	maps: unknown
): Set<string> {
	const names = new Set<string>();
	const visit = (value: unknown): void => {
		if (typeof value === 'string') {
			for (const name of value.split(/\s+/u)) {
				if (name) {
					names.add(name);
				}
			}
			return;
		}
		if (value && typeof value === 'object') {
			for (const entry of Object.values(value)) {
				visit(entry);
			}
		}
	};
	visit(maps);
	return names;
};

/**
 * Whether a selector can match an element built from `rendered` classes.
 *
 * @param selector - One complex selector (no top-level commas).
 * @param rendered - Class names the surfaces render.
 * @returns `false` only when the selector requires an unrendered ui class.
 */
const canMatch = function canMatch(
	selector: string,
	rendered: ReadonlySet<string>
): boolean {
	const required = selector.replace(NEGATION, '');
	for (const match of required.matchAll(CLASS_NAME)) {
		const name = match.groups?.name ?? '';
		if (HASHED_CLASS.test(name) && !rendered.has(name)) {
			return false;
		}
	}
	return true;
};

/**
 * The custom properties a stylesheet reads: those a property or an at-rule
 * names in `var()`, and the ones their definitions name in turn.
 *
 * @param root - The parsed stylesheet.
 * @returns The custom property names.
 */
const readCustomProperties = function readCustomProperties(
	root: Root
): Set<string> {
	const definitions = new Map<string, string[]>();
	const pending: string[] = [];
	const collect = (text: string) => {
		for (const match of text.matchAll(VAR_REFERENCE)) {
			pending.push(match.groups?.name ?? '');
		}
	};
	root.walkDecls((decl) => {
		if (decl.prop.startsWith('--')) {
			definitions.set(decl.prop, [
				...(definitions.get(decl.prop) ?? []),
				decl.value,
			]);
		} else {
			collect(decl.value);
		}
	});
	root.walkAtRules((atRule) => {
		collect(atRule.params);
	});
	const read = new Set<string>();
	for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
		if (!read.has(name)) {
			read.add(name);
			for (const value of definitions.get(name) ?? []) {
				collect(value);
			}
		}
	}
	return read;
};

/**
 * Keep only the rules a surface built from `rendered` classes can match.
 *
 * @param css - The stylesheet.
 * @param rendered - Class names the surfaces render.
 * @returns The pruned stylesheet, with the input's formatting.
 */
export const pruneStylesheet = function pruneStylesheet(
	css: string,
	rendered: ReadonlySet<string>
): string {
	const root = parse(css);
	const readBefore = readCustomProperties(root);
	root.walkRules((rule) => {
		const { parent } = rule;
		if (
			parent?.type === 'atrule' &&
			/keyframes$/iu.test((parent as AtRule).name)
		) {
			return;
		}
		const kept = rule.selectors.filter((selector) =>
			canMatch(selector, rendered)
		);
		if (kept.length === 0) {
			rule.remove();
		} else if (kept.length < rule.selectors.length) {
			rule.selector = kept.join(',');
		}
	});
	// A component variable only the removed rules read goes with them.
	const readAfter = readCustomProperties(root);
	root.walkDecls(/^--/u, (decl) => {
		if (
			!THEME_TOKEN.test(decl.prop) &&
			readBefore.has(decl.prop) &&
			!readAfter.has(decl.prop)
		) {
			const rule = decl.parent;
			decl.remove();
			if (rule?.type === 'rule' && rule.nodes.length === 0) {
				rule.remove();
			}
		}
	});
	// A block whose rules all went (`@media` for a removed part) goes too;
	// statement at-rules such as `@layer a, b;` have no nodes and stay.
	root.walkAtRules((atRule) => {
		if (atRule.nodes && atRule.nodes.length === 0) {
			atRule.remove();
		}
	});
	return root.toString();
};

/**
 * Drop the comments and the whitespace between rules and declarations.
 *
 * `@c15t/ui` ships a readable sheet: a comment above each section (one
 * names `@c15t/ui/postcss-tailwind3` so Tailwind 3's build error shows the
 * fix) and line breaks between blocks. In the shadow root they only add
 * bytes to `c15t.js`. Selectors, at-rule params and declaration values
 * are left as written, so every rule still means the same thing.
 *
 * @param css - The stylesheet.
 * @returns The stylesheet without comments or formatting whitespace.
 */
export const compactStylesheet = function compactStylesheet(
	css: string
): string {
	const root = parse(css);
	root.walkComments((comment) => {
		comment.remove();
	});
	root.walk((node) => {
		node.raws.before = '';
		if (node.type === 'rule') {
			node.raws.between = '';
		}
		if (node.type === 'rule' || node.type === 'atrule') {
			node.raws.after = '';
		}
	});
	root.raws.after = '';
	return root.toString();
};
