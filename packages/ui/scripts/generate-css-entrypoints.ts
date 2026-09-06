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
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { defaultTheme, generateThemeCSS } from '../src/theme/utils';

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

const IAB_PREFIX = 'iab-';

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

const collectCssParts = function collectCssParts(
	primitives: string[],
	components: string[]
): { rootParts: string[]; ruleParts: string[] } {
	const rootParts: string[] = [];
	const ruleParts: string[] = [];
	// Several components inline the same shared animation stylesheet, so the
	// same @keyframes / :root block shows up more than once. Keep the first.
	const seenUnlayered = new Set<string>();

	const push = function push(label: string, filePath: string) {
		const { unlayered, componentRules } = splitStylesheet(
			readFileSync(filePath, 'utf-8')
		);
		const uniqueUnlayered = splitTopLevelStatements(unlayered).filter(
			(statement) => {
				if (seenUnlayered.has(statement)) {
					return false;
				}
				seenUnlayered.add(statement);
				return true;
			}
		);
		if (uniqueUnlayered.length > 0) {
			rootParts.push(`/* ${label} vars */\n${uniqueUnlayered.join('\n')}`);
		}
		if (componentRules) {
			ruleParts.push(`/* ${label} */\n${componentRules}`);
		}
	};

	for (const name of primitives) {
		push(`primitives/${name}`, join(PRIMITIVES_DIR, `${name}.module.css`));
	}

	for (const name of components) {
		push(`components/${name}`, join(COMPONENTS_DIR, `${name}.css`));
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
 * Generate layered CSS: component rules wrapped in @layer components.
 * Use with Tailwind 4 — import Tailwind normally; c15t joins the components layer automatically.
 */
const buildLayeredCss = function buildLayeredCss(
	rootParts: string[],
	ruleParts: string[]
): string {
	const parts: string[] = [DEFAULT_THEME_CSS];
	if (rootParts.length) {
		parts.push(rootParts.join('\n\n'));
	}
	if (ruleParts.length) {
		parts.push(
			`@layer components {\n${ruleParts.map((r) => `  ${r}`).join('\n\n')}\n}`
		);
	}
	return parts.join('\n\n');
};

/**
 * Generate flat CSS: component rules are emitted without any layer wrapper.
 * Use with Tailwind 3, where the stylesheet is typically imported from JS and
 * must not rely on a colocated `@tailwind components` directive.
 */
const buildFlatCss = function buildFlatCss(
	rootParts: string[],
	ruleParts: string[]
): string {
	const parts: string[] = [DEFAULT_THEME_CSS];
	if (rootParts.length) {
		parts.push(rootParts.join('\n\n'));
	}
	if (ruleParts.length) {
		parts.push(ruleParts.join('\n\n'));
	}
	return parts.join('\n\n');
};

// ── Non-IAB entrypoints ─────────────────────────────────────────────
const nonIab = collectCssParts(NON_IAB_PRIMITIVES, NON_IAB_COMPONENTS);

if (nonIab.ruleParts.length === 0) {
	throw new Error(
		'generate-css-entrypoints: no component rules collected for styles.css — output would contain only :root variables'
	);
}

// dist/styles.css — @layer components (default, for Tailwind 4 + native CSS layers)
writeFileSync(
	join(DIST_DIR, 'styles.css'),
	`${buildLayeredCss(nonIab.rootParts, nonIab.ruleParts)}\n`
);

// dist/styles.tw3.css — flat rules (for Tailwind 3 layout imports)
writeFileSync(
	join(DIST_DIR, 'styles.tw3.css'),
	`${buildFlatCss(nonIab.rootParts, nonIab.ruleParts)}\n`
);

// ── IAB entrypoints ─────────────────────────────────────────────────
const iab = collectCssParts(NON_IAB_PRIMITIVES, IAB_COMPONENTS);
const iabDir = join(DIST_DIR, 'iab');
mkdirSync(iabDir, { recursive: true });

if (IAB_COMPONENTS.length > 0 && iab.ruleParts.length === 0) {
	throw new Error(
		'generate-css-entrypoints: no component rules collected for iab/styles.css — output would contain only :root variables'
	);
}

// dist/iab/styles.css — @layer components
writeFileSync(
	join(iabDir, 'styles.css'),
	`${buildLayeredCss(iab.rootParts, iab.ruleParts)}\n`
);

// dist/iab/styles.tw3.css — flat rules (for Tailwind 3 layout imports)
writeFileSync(
	join(iabDir, 'styles.tw3.css'),
	`${buildFlatCss(iab.rootParts, iab.ruleParts)}\n`
);

console.log(
	'Generated dist/styles.css, dist/styles.tw3.css, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
