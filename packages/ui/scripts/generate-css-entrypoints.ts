/**
 * Post-build script for @c15t/ui:
 * 1. Renames primitive `*_module.css` files to `*.module.css` (rslib emits
 *    underscores) and fixes the matching references in `.module.js` files
 * 2. Generates aggregated CSS entrypoints from `dist/styles/primitives` and
 *    the flat component CSS in `dist/styles/components` (produced by
 *    `generate-style-artifacts.ts`, which must run first):
 *    - the `defaultTheme` base tokens (`--c15t-surface`, `--c15t-radius-lg`,
 *      `--c15t-font-family`, ...) are emitted first and unlayered, so an app
 *      that imports the stylesheet without passing a `theme` still renders the
 *      styled UI instead of falling back to browser defaults
 *    - :root custom properties and @keyframes stay unlayered
 *    - `styles.css` / `iab/styles.css` wrap component rules in `@layer components`
 *      for Tailwind 4 and native CSS layer consumers
 *    - `styles.tw3.css` / `iab/styles.tw3.css` emit the same component rules flat
 *      for Tailwind 3, which cannot import a standalone layered stylesheet from JS
 *
 * The stylesheets are split by when a page needs them:
 *
 * | File | Holds | Loaded by |
 * | --- | --- | --- |
 * | `styles.css`, `styles.tw3.css` | default tokens, every `:root` variable and `@keyframes`, rules for the banner, dialog trigger and ConsentGate | the app, once, render-blocking |
 * | `styles/dialog.css` | rules for the dialog and preference widget | the dialog's module (lazy in React) |
 * | `styles/primitives.css` | rules for the `@c15t/ui/styles/primitives` class maps | Svelte's `styles.css` and hosts that render those class maps |
 * | `iab/styles.css`, `iab/styles.tw3.css` | IAB variables and rules only | the app, next to `styles.css` |
 *
 * Every variable stays in `styles.css`, so later sheets only add rules and
 * never re-declare a variable a host has overridden.
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { defaultTheme, generateThemeCSS } from '../src/theme/utils';
import {
	DIALOG_COMPONENTS,
	FIRST_PAINT_COMPONENTS,
	IAB_PREFIX,
} from './stylesheet-parts';

const DIST_DIR = join(import.meta.dirname, '..', 'dist');
const PRIMITIVES_DIR = join(DIST_DIR, 'styles', 'primitives');
const COMPONENTS_DIR = join(DIST_DIR, 'styles', 'components');

// ── Step 1: Normalize primitive CSS Module artifacts ─────────────────
// Rename *_module.css → *.module.css and strip the bare
// `import"./foo.module.css"` side-effect imports from the class maps:
// - Class names are hardcoded in the JS (rslib resolves them at build time)
// - Styles are loaded via the aggregated entrypoint (styles.css / iab/styles.css)
// Removing them keeps the package CSS contract centered on the aggregated
// entrypoints and avoids relying on host bundlers to process module CSS from
// node_modules.
for (const file of readdirSync(PRIMITIVES_DIR)) {
	if (file.endsWith('_module.css')) {
		renameSync(
			join(PRIMITIVES_DIR, file),
			join(PRIMITIVES_DIR, file.replace('_module.css', '.module.css'))
		);
	}
}

for (const file of readdirSync(PRIMITIVES_DIR)) {
	if (file.endsWith('.module.js')) {
		const filePath = join(PRIMITIVES_DIR, file);
		let content = readFileSync(filePath, 'utf-8');
		if (content.includes('_module.css')) {
			content = content.replace(/_module\.css/gu, '.module.css');
		}
		content = content.replace(
			/import\s*["'][^"']+\.module\.css["']\s*;?/gu,
			''
		);
		writeFileSync(filePath, content);
	}
}

// ── Step 2: Discover sources ─────────────────────────────────────────

const discoverPrimitiveNames = function discoverPrimitiveNames(): string[] {
	return readdirSync(PRIMITIVES_DIR)
		.filter((f) => f.endsWith('.module.css'))
		.map((f) => f.replace('.module.css', ''))
		.sort();
};

/**
 * Component CSS is the flat `<name>.css` triple member. Anything still named
 * `*.module.css` / `*_module.css` means `generate-style-artifacts.ts` has not
 * run, so fail loudly instead of silently building a partial stylesheet.
 */
const discoverComponentNames = function discoverComponentNames(): string[] {
	if (!existsSync(COMPONENTS_DIR)) {
		return [];
	}
	const files = readdirSync(COMPONENTS_DIR);
	const stale = files.filter(
		(f) => f.endsWith('_module.css') || f.endsWith('.module.css')
	);
	if (stale.length > 0) {
		throw new Error(
			`generate-css-entrypoints: dist/styles/components still contains rslib CSS Module artifacts (${stale.join(
				', '
			)}); run generate-style-artifacts.ts first`
		);
	}
	return files
		.filter((f) => f.endsWith('.css'))
		.map((f) => f.replace(/\.css$/u, ''))
		.sort();
};

const NON_IAB_PRIMITIVES = discoverPrimitiveNames();
const allComponents = discoverComponentNames();
const NON_IAB_COMPONENTS = allComponents.filter(
	(c) => !c.startsWith(IAB_PREFIX)
);
const IAB_COMPONENTS = allComponents.filter((c) => c.startsWith(IAB_PREFIX));

if (NON_IAB_PRIMITIVES.length === 0) {
	throw new Error(
		'generate-css-entrypoints: no primitives found in dist/styles/primitives/'
	);
}
if (NON_IAB_COMPONENTS.length === 0) {
	throw new Error(
		'generate-css-entrypoints: no components found in dist/styles/components/'
	);
}

const firstPaintNames = new Set<string>(FIRST_PAINT_COMPONENTS);
const dialogNames = new Set<string>(DIALOG_COMPONENTS);
const unassigned = NON_IAB_COMPONENTS.filter(
	(c) => !(firstPaintNames.has(c) || dialogNames.has(c))
);
if (unassigned.length > 0) {
	throw new Error(
		`generate-css-entrypoints: add ${unassigned.join(
			', '
		)} to FIRST_PAINT_COMPONENTS or DIALOG_COMPONENTS in scripts/stylesheet-parts.ts`
	);
}
const missing = [...firstPaintNames, ...dialogNames].filter(
	(c) => !NON_IAB_COMPONENTS.includes(c)
);
if (missing.length > 0) {
	throw new Error(
		`generate-css-entrypoints: scripts/stylesheet-parts.ts lists ${missing.join(
			', '
		)}, which dist/styles/components does not contain`
	);
}

// ── Step 3: Split each stylesheet into unlayered vs component rules ──

/**
 * Locate the `@layer components { ... }` block, matching braces so nested
 * `@media` / `@supports` blocks inside the layer are handled correctly.
 */
const findComponentsLayer = function findComponentsLayer(
	css: string
): { start: number; bodyStart: number; end: number } | null {
	const match = /@layer\s+components\s*\{/u.exec(css);
	if (!match) {
		return null;
	}
	const bodyStart = match.index + match[0].length;
	let depth = 1;
	for (let index = bodyStart; index < css.length; index += 1) {
		const char = css[index];
		if (char === '{') {
			depth += 1;
		} else if (char === '}') {
			depth -= 1;
			if (depth === 0) {
				return { bodyStart, end: index, start: match.index };
			}
		}
	}
	throw new Error(
		'generate-css-entrypoints: unbalanced @layer components block'
	);
};

/**
 * Split a stylesheet into the part that must stay unlayered (`:root`
 * custom properties, `@keyframes`, media-scoped overrides) and the component
 * rules from inside `@layer components`.
 *
 * Stylesheets without a `@layer components` wrapper (e.g.
 * consent-dialog-trigger, which inlines its variables into selectors) are
 * treated entirely as component rules.
 */
const splitStylesheet = function splitStylesheet(css: string): {
	unlayered: string;
	componentRules: string;
} {
	const layer = findComponentsLayer(css);
	if (!layer) {
		return { componentRules: css.trim(), unlayered: '' };
	}
	const componentRules = css.slice(layer.bodyStart, layer.end).trim();
	const unlayered = `${css.slice(0, layer.start)}${css.slice(
		layer.end + 1
	)}`.trim();
	return { componentRules, unlayered };
};

/**
 * Split CSS into top-level statements (`:root{...}`, `@keyframes x{...}`,
 * `@media{...}`) by brace matching, so identical blocks can be deduplicated.
 */
const splitTopLevelStatements = function splitTopLevelStatements(
	css: string
): string[] {
	const statements: string[] = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index < css.length; index += 1) {
		const char = css[index];
		if (char === '{') {
			depth += 1;
		} else if (char === '}') {
			depth -= 1;
			if (depth === 0) {
				statements.push(css.slice(start, index + 1).trim());
				start = index + 1;
			}
		}
	}
	const tail = css.slice(start).trim();
	if (tail) {
		statements.push(tail);
	}
	return statements.filter(Boolean);
};

/**
 * Add `:host` to every `:root` selector in a block of unlayered statements.
 *
 * Component stylesheets declare their variables on `:root`, which nothing
 * inside a shadow root matches; a script-tag host that renders the banner
 * in a shadow root would otherwise resolve `var(--consent-dialog-max-width)`
 * and friends against nothing. `:host` matches nothing in the light DOM, so
 * framework hosts see no change.
 */
const scopeRootToHost = function scopeRootToHost(css: string): string {
	return css.replace(
		/(?<before>^|[\s,}{;]):root(?<className>\.[A-Za-z0-9_-]+)?(?=[\s,{])/gu,
		(_match, before: string, className: string | undefined) =>
			className
				? `${before}:root${className}, :host(${className})`
				: `${before}:root, :host`
	);
};

interface StylesheetSource {
	/** Which output file receives the rules. */
	group: string;
	label: string;
	path: string;
}

/**
 * Read each source, keep its unlayered statements (`:root` variables,
 * `@keyframes`) in one list and its component rules in a list per output
 * group. `seenUnlayered` is shared across calls so a statement already
 * emitted in `styles.css` is not repeated in the IAB sheet.
 */
const collectCssParts = function collectCssParts(
	sources: StylesheetSource[],
	seenUnlayered: Set<string>
): { rootParts: string[]; ruleParts: Map<string, string[]> } {
	const rootParts: string[] = [];
	const ruleParts = new Map<string, string[]>();

	for (const { group, label, path } of sources) {
		const { unlayered, componentRules } = splitStylesheet(
			readFileSync(path, 'utf-8')
		);
		// Several components inline the same shared animation stylesheet, so
		// the same @keyframes / :root block shows up more than once. Keep the
		// first.
		const uniqueUnlayered = splitTopLevelStatements(
			scopeRootToHost(unlayered)
		).filter((statement) => {
			if (seenUnlayered.has(statement)) {
				return false;
			}
			seenUnlayered.add(statement);
			return true;
		});
		if (uniqueUnlayered.length > 0) {
			rootParts.push(`/* ${label} vars */\n${uniqueUnlayered.join('\n')}`);
		}
		if (componentRules) {
			const parts = ruleParts.get(group) ?? [];
			parts.push(`/* ${label} */\n${componentRules}`);
			ruleParts.set(group, parts);
		}
	}

	return { rootParts, ruleParts };
};

/**
 * The `defaultTheme` base tokens, rendered by the same `generateThemeCSS` a
 * host calls when it passes `theme`. Every component stylesheet resolves its
 * colours, radii, fonts and motion through these, mostly without `var()`
 * fallbacks, so a stylesheet that ships without them renders unstyled in any
 * app that does not pass a `theme` — including server-rendered, zero-JS pages
 * that can never inject them.
 *
 * `defaultTheme` stays the single source of truth: this is generated at build
 * time from the same object the runtime exports, so CSS and JS cannot drift.
 *
 * Emitted first and **unlayered** in every entrypoint. A provider's injected
 * `<style id="c15t-theme">` still wins: it carries the same selectors and the
 * same specificity, and lands later in the cascade — later in `<head>` when
 * the defaults are unlayered too, and unconditionally when a host imports the
 * stylesheet into a cascade layer (`@import ... layer(c15t)`), since unlayered
 * declarations outrank every layer.
 */
const DEFAULT_THEME_BANNER =
	'/* default theme tokens (generated from defaultTheme) */';
const DEFAULT_THEME_CSS = [
	DEFAULT_THEME_BANNER,
	generateThemeCSS(defaultTheme),
].join('\n');

/**
 * Wrap component rules in `@layer components`. Tailwind 4 declares that layer
 * before its utilities, so bare utilities override c15t without
 * `!important`. Tailwind 3 hosts either import the flat `.tw3.css` variant or
 * run `@c15t/ui/postcss-tailwind3`, which unwraps the layer in every
 * `dist/styles/*.css` file, including `styles/dialog.css`.
 */
const layered = function layered(ruleParts: string[]): string {
	return `@layer components {\n${ruleParts.map((r) => `  ${r}`).join('\n\n')}\n}`;
};

const joinParts = function joinParts(parts: (string | undefined)[]): string {
	return `${parts.filter((part) => part && part.length > 0).join('\n\n')}\n`;
};

const rulesFor = function rulesFor(
	ruleParts: Map<string, string[]>,
	group: string,
	file: string
): string[] {
	const parts = ruleParts.get(group) ?? [];
	if (parts.length === 0) {
		throw new Error(
			`generate-css-entrypoints: no component rules collected for ${file}`
		);
	}
	return parts;
};

const writeDist = function writeDist(relativePath: string, css: string) {
	const target = join(DIST_DIR, relativePath);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, css);
};

// ── Non-IAB entrypoints ─────────────────────────────────────────────
const seenUnlayered = new Set<string>();
const nonIab = collectCssParts(
	[
		...NON_IAB_PRIMITIVES.map((name) => ({
			group: 'primitives',
			label: `primitives/${name}`,
			path: join(PRIMITIVES_DIR, `${name}.module.css`),
		})),
		...NON_IAB_COMPONENTS.map((name) => ({
			group: dialogNames.has(name) ? 'dialog' : 'first-paint',
			label: `components/${name}`,
			path: join(COMPONENTS_DIR, `${name}.css`),
		})),
	],
	seenUnlayered
);
const rootCss = nonIab.rootParts.join('\n\n');
const firstPaintRules = rulesFor(nonIab.ruleParts, 'first-paint', 'styles.css');

// dist/styles.css — tokens, every variable, first-paint rules in
// @layer components (Tailwind 4 and native CSS layers). Render-blocking.
writeDist(
	'styles.css',
	joinParts([DEFAULT_THEME_CSS, rootCss, layered(firstPaintRules)])
);

// dist/styles.tw3.css — the same, flat (Tailwind 3 entry imports)
writeDist(
	'styles.tw3.css',
	joinParts([DEFAULT_THEME_CSS, rootCss, firstPaintRules.join('\n\n')])
);

// dist/styles/dialog.css — dialog and widget rules only. The dialog's module
// imports it, so bundlers deliver it with the dialog chunk and load it
// before that module runs. Variables stay in styles.css.
writeDist(
	'styles/dialog.css',
	joinParts([
		'/* @c15t/ui dialog styles. Needs @c15t/ui/styles.css for tokens and variables. */',
		layered(rulesFor(nonIab.ruleParts, 'dialog', 'styles/dialog.css')),
	])
);

// dist/styles/primitives.css — rules for the primitive class maps, which
// React never renders. Svelte's styles.css and custom hosts import it.
writeDist(
	'styles/primitives.css',
	joinParts([
		'/* @c15t/ui primitive styles. Needs @c15t/ui/styles.css for tokens and variables. */',
		layered(rulesFor(nonIab.ruleParts, 'primitives', 'styles/primitives.css')),
	])
);

// ── IAB entrypoints ─────────────────────────────────────────────────
// Loaded next to styles.css, so they carry only IAB variables and rules:
// no second copy of the tokens or of the variables styles.css declares.
if (IAB_COMPONENTS.length > 0) {
	const iab = collectCssParts(
		IAB_COMPONENTS.map((name) => ({
			group: 'iab',
			label: `components/${name}`,
			path: join(COMPONENTS_DIR, `${name}.css`),
		})),
		seenUnlayered
	);
	const iabRules = rulesFor(iab.ruleParts, 'iab', 'iab/styles.css');
	const iabBanner =
		'/* @c15t/ui IAB TCF styles. Load after @c15t/ui/styles.css, which holds the tokens. */';
	const iabRoot = iab.rootParts.join('\n\n');

	// dist/iab/styles.css — @layer components
	writeDist(
		'iab/styles.css',
		joinParts([iabBanner, iabRoot, layered(iabRules)])
	);

	// dist/iab/styles.tw3.css — flat rules (for Tailwind 3 layout imports)
	writeDist(
		'iab/styles.tw3.css',
		joinParts([iabBanner, iabRoot, iabRules.join('\n\n')])
	);
}

console.log(
	'Generated dist/styles.css, dist/styles.tw3.css, dist/styles/dialog.css, dist/styles/primitives.css, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
