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
 *      for Tailwind 4 and native CSS layer consumers; every layered file opens
 *      with Tailwind 4's layer order statement so `components` never ranks
 *      below `base`
 *    - `styles.tw3.css` / `iab/styles.tw3.css` emit the same component rules
 *      flat. They predate `@c15t/ui/postcss-tailwind3` covering the
 *      entrypoints and stay for apps that already import them; new Tailwind 3
 *      setups import `styles.css` and run the plugin
 *
 * | File | Holds | Loaded by |
 * | --- | --- | --- |
 * | `styles.css`, `styles.tw3.css` | default tokens, every `:root` variable and `@keyframes`, rules for the banner, dialog trigger, ConsentGate, dialog and preference widget | the app, once |
 * | `styles/primitives.css` | rules for the `@c15t/ui/styles/primitives` class maps | Svelte's `styles.css` and hosts that render those class maps |
 * | `iab/styles.css`, `iab/styles.tw3.css` | IAB variables and rules only | the app, next to `styles.css` |
 * | `styles/dialog.css`, `styles/dialog.js` | nothing; kept so existing imports resolve | — |
 * | `styles/sheets/first-paint.js` | `styles.css` up to its dialog rules, as a string | React and Svelte surfaces, which render it as a `<style>` |
 * | `styles/sheets/dialog.js`, `styles/sheets/dialog.css` | the dialog and preference-widget rules, as a string and as a file | the dialog and widget, with their lazy code; Astro links the file when the dialog opens |
 * | `styles/sheets/primitives.js` | `styles/primitives.css`, as a string | the Svelte dialog |
 * | `styles/sheets/iab-first-paint.js` | IAB variables and banner rules, as a string | IAB banners and standalone dialogs |
 * | `styles/sheets/iab-dialog.js`, `styles/sheets/iab-dialog.css` | IAB dialog rules, as a string and file | IAB dialogs, with their lazy code; Astro links the file before opening |
 *
 * No JavaScript in the package imports a stylesheet. The Next.js Pages
 * Router refuses to build an app whose dependencies import global CSS, so
 * rules reach the page through component-rendered styles or a stylesheet
 * the app imports itself.
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
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { defaultTheme, generateDefaultThemeCSS } from '../src/theme/utils';
import {
	DIALOG_COMPONENTS,
	FIRST_PAINT_COMPONENTS,
	IAB_DIALOG_COMPONENTS,
	IAB_FIRST_PAINT_COMPONENTS,
	IAB_PREFIX,
	LAYER_ORDER,
} from './stylesheet-parts';

const DIST_DIR = join(import.meta.dirname, '..', 'dist');
const TYPES_DIR = join(import.meta.dirname, '..', 'dist-types');
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
const splitStylesheet = function splitStylesheet(source: string): {
	unlayered: string;
	componentRules: string;
} {
	// Component files open with the layer order statement for Vue's
	// per-component imports. The entrypoints write their own once.
	const css = source.replace(LAYER_ORDER, '');
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
 * The `defaultTheme` base tokens, serialized by the same code as the
 * `generateThemeCSS` a host calls for its own theme. Every component stylesheet resolves its
 * colours, radii, fonts and motion through these, mostly without `var()`
 * fallbacks, so a stylesheet that ships without them renders unstyled in any
 * app that does not pass a `theme` — including server-rendered, zero-JS pages
 * that can never inject them.
 *
 * `defaultTheme` stays the single source of truth: this is generated at build
 * time from the same object the runtime exports, so CSS and JS cannot drift.
 *
 * Emitted first and **unlayered** in every entrypoint, on the base `:root`
 * selectors. In the light DOM, a host's `<style id="c15t-theme">` from
 * `generateThemeCSS` wins wherever it lands: its selectors carry one more
 * specificity point (`:root:root`), so it overrides these even when it comes
 * first in the document, as SvelteKit's `<svelte:head>` does. Its `:host`
 * selector does not, so inside a shadow root the theme must come after this
 * stylesheet. When a host imports the
 * stylesheet into a cascade layer (`@import ... layer(c15t)`), unlayered
 * theme declarations outrank it by layer precedence too.
 */
const DEFAULT_THEME_BANNER =
	'/* default theme tokens (generated from defaultTheme) */';
const DEFAULT_THEME_CSS = [
	DEFAULT_THEME_BANNER,
	// Only the package defaults use a primary reference, so CSS-only themes
	// can change the switch color by setting --c15t-primary.
	generateDefaultThemeCSS({
		...defaultTheme,
		colors: {
			...defaultTheme.colors,
			switchTrackActive: 'var(--c15t-primary)',
		},
		dark: {
			...defaultTheme.dark,
			switchTrackActive: 'var(--c15t-primary)',
		},
	}),
].join('\n');

/**
 * Sits directly above each layer block. Tailwind 3 without
 * `@c15t/ui/postcss-tailwind3` fails on that block, and bundlers print the
 * lines above the failing one, so the fix shows up in the build error.
 * Avoids the word "layer" after an at-sign so layer scans skip it.
 */
const TAILWIND3_HINT =
	"/* Tailwind 3 cannot build the next block on its own. Add '@c15t/ui/postcss-tailwind3' before 'tailwindcss' in your PostCSS plugins. */";

/**
 * Wrap component rules in `@layer components`. Tailwind 4 declares that layer
 * before its utilities, so bare utilities override c15t without
 * `!important`. Tailwind 3 hosts run `@c15t/ui/postcss-tailwind3`, which
 * unwraps the layer in every built stylesheet.
 */
const layered = function layered(ruleParts: string[]): string {
	return `${TAILWIND3_HINT}\n@layer components {\n${ruleParts.map((r) => `  ${r}`).join('\n\n')}\n}`;
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

/**
 * Rank the default tokens and variables of a sheet a component renders
 * below the app's own token rules, wherever the sheet lands.
 *
 * An app overrides a token with a `:root` rule, and a dark one with
 * `:root.dark` or `:root.c15t-dark`. Against `styles.css` those win by
 * coming later, since the app imports c15t's stylesheet first. A
 * component's `<style>` can come after the app's stylesheets instead:
 * React hoists it into `<head>` after them, and Svelte appends it. So the
 * defaults rank by specificity here: a bare `:root` becomes `:where(:root)`
 * (0,0,0), below an app's `:root` (0,1,0), and `:root.dark` becomes
 * `html.dark` (0,1,1), above an app's plain `:root` but below its
 * `:root.dark` (0,2,0). `:host` is left alone: these sheets never render
 * into a shadow root.
 */
const yieldToAppRoot = function yieldToAppRoot(css: string): string {
	return css
		.replace(/:root(?=[.[:])/gu, 'html')
		.replace(/:root(?![\w-])/gu, ':where(:root)');
};

/**
 * Write `dist/styles/sheets/<name>.js`: a module exporting a stylesheet as
 * a string, and the `id` a component dedupes it by.
 *
 * Comments are dropped: the string ships in JavaScript and in every
 * server-rendered page, where nobody reads them.
 */
const writeSheet = function writeSheet(name: string, css: string): string {
	const text = css
		.replace(/\/\*[\s\S]*?\*\//gu, '')
		.replace(/\n{2,}/gu, '\n')
		.trim();
	writeDist(
		`styles/sheets/${name}.js`,
		`export const id = ${JSON.stringify(`c15t-${name}`)};\nexport const css = ${JSON.stringify(text)};\n`
	);
	const declaration = join(TYPES_DIR, 'styles', 'sheets', `${name}.d.ts`);
	mkdirSync(dirname(declaration), { recursive: true });
	writeFileSync(
		declaration,
		[
			'/** Identifies the stylesheet, so a page renders it once. */',
			'export declare const id: string;',
			'/** The stylesheet text. */',
			'export declare const css: string;',
			'',
		].join('\n')
	);
	// Watch builds keep dist, so remove declarations from the earlier output
	// layout as well as emitting them in the package's types directory.
	rmSync(join(DIST_DIR, 'styles', 'sheets', `${name}.d.ts`), { force: true });
	return text;
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
// The dialog's rules follow the first-paint rules, the order the cascade had
// while they shipped in a stylesheet of their own that loaded later.
const componentRules = [
	...rulesFor(nonIab.ruleParts, 'first-paint', 'styles.css'),
	...rulesFor(nonIab.ruleParts, 'dialog', 'styles.css'),
];

// dist/styles.css — layer order, tokens, every variable, every non-IAB
// component rule in @layer components (Tailwind 4 and native CSS layers).
writeDist(
	'styles.css',
	joinParts([LAYER_ORDER, DEFAULT_THEME_CSS, rootCss, layered(componentRules)])
);

// dist/styles.tw3.css — the same, flat (kept for existing Tailwind 3 imports)
writeDist(
	'styles.tw3.css',
	joinParts([DEFAULT_THEME_CSS, rootCss, componentRules.join('\n\n')])
);

// dist/styles/dialog.css and dist/styles/dialog.js (`@c15t/ui/styles/dialog`)
// once carried the dialog's rules separately, and React's dialog modules
// imported them. styles.css holds those rules now. Both files stay empty so
// existing imports keep resolving without loading a rule twice.
writeDist(
	'styles/dialog.css',
	'/* Deprecated and empty: @c15t/ui/styles.css includes the dialog rules. */\n'
);
writeDist(
	'styles/dialog.js',
	'// Deprecated and empty: @c15t/ui/styles.css includes the dialog rules.\nexport {};\n'
);
writeDist('styles/dialog.d.ts', 'export {};\n');

// dist/styles/primitives.css — rules for the primitive class maps, which
// React never renders. Svelte's styles.css and custom hosts import it.
const primitiveRules = rulesFor(
	nonIab.ruleParts,
	'primitives',
	'styles/primitives.css'
);
writeDist(
	'styles/primitives.css',
	joinParts([
		LAYER_ORDER,
		'/* @c15t/ui primitive styles. Needs @c15t/ui/styles.css for tokens and variables. */',
		layered(primitiveRules),
	])
);

// dist/styles/sheets/*.js — the same rules as `styles.css` and
// `styles/primitives.css`, as strings, for components that render their own
// `<style>` instead of asking the app to import a stylesheet. A stylesheet
// the app imports is linked from `<head>` and holds the first paint until
// it downloads; a `<style>` in the server-rendered HTML, or one the banner's
// code inserts, does not.
//
// `first-paint` holds what `styles.css` holds up to its dialog rules, so a
// banner, trigger or ConsentGate needs nothing else. `dialog` holds the
// dialog and preference-widget rules, and `primitives` the primitive rules
// the Svelte dialog renders. Concatenated in that order they apply exactly
// what `styles.css` and `styles/primitives.css` apply.
writeSheet(
	'first-paint',
	[
		LAYER_ORDER,
		yieldToAppRoot(DEFAULT_THEME_CSS),
		yieldToAppRoot(rootCss),
		`@layer components{${rulesFor(nonIab.ruleParts, 'first-paint', 'styles/sheets/first-paint.js').join('\n')}}`,
	].join('\n')
);
const dialogSheet = `${LAYER_ORDER}\n@layer components{${rulesFor(nonIab.ruleParts, 'dialog', 'styles/sheets/dialog.js').join('\n')}}`;
// The same rules as a file, for hosts that link the dialog's rules when it
// opens instead of carrying them in its code (Astro).
writeDist('styles/sheets/dialog.css', `${writeSheet('dialog', dialogSheet)}\n`);
writeSheet(
	'primitives',
	`${LAYER_ORDER}\n@layer components{${primitiveRules.join('\n')}}`
);

// ── IAB entrypoints ─────────────────────────────────────────────────
// Loaded next to styles.css, so they carry only IAB variables and rules:
// no second copy of the tokens or of the variables styles.css declares.
if (IAB_COMPONENTS.length > 0) {
	const iabFirstPaintNames = new Set<string>(IAB_FIRST_PAINT_COMPONENTS);
	const iabDialogNames = new Set<string>(IAB_DIALOG_COMPONENTS);
	const unassignedIab = IAB_COMPONENTS.filter(
		(name) => !(iabFirstPaintNames.has(name) || iabDialogNames.has(name))
	);
	const missingIab = [...iabFirstPaintNames, ...iabDialogNames].filter(
		(name) => !IAB_COMPONENTS.includes(name)
	);
	if (unassignedIab.length > 0 || missingIab.length > 0) {
		throw new Error(
			`generate-css-entrypoints: IAB stylesheet groups differ from components (unassigned: ${unassignedIab.join(', ')}; missing: ${missingIab.join(', ')})`
		);
	}
	const iab = collectCssParts(
		IAB_COMPONENTS.map((name) => ({
			group: name,
			label: `components/${name}`,
			path: join(COMPONENTS_DIR, `${name}.css`),
		})),
		seenUnlayered
	);
	// Keep the existing aggregate's component order for manual CSS users.
	const iabRules = IAB_COMPONENTS.flatMap((name) =>
		rulesFor(iab.ruleParts, name, 'iab/styles.css')
	);
	const iabBanner =
		'/* @c15t/ui IAB TCF styles. Load after @c15t/ui/styles.css, which holds the tokens. */';
	const iabRoot = iab.rootParts.join('\n\n');

	// dist/iab/styles.css — @layer components
	writeDist(
		'iab/styles.css',
		joinParts([LAYER_ORDER, iabBanner, iabRoot, layered(iabRules)])
	);

	// dist/iab/styles.tw3.css — flat rules (kept for existing Tailwind 3 imports)
	writeDist(
		'iab/styles.tw3.css',
		joinParts([iabBanner, iabRoot, iabRules.join('\n\n')])
	);

	// IAB variables are delivered once, before either component's rules, so
	// opening a dialog cannot reset an app's token overrides.
	writeSheet(
		'iab-first-paint',
		[
			LAYER_ORDER,
			yieldToAppRoot(iabRoot),
			`@layer components{${IAB_FIRST_PAINT_COMPONENTS.flatMap((name) => rulesFor(iab.ruleParts, name, 'styles/sheets/iab-first-paint.js')).join('\n')}}`,
		].join('\n')
	);
	const iabDialogSheet = `${LAYER_ORDER}\n@layer components{${IAB_DIALOG_COMPONENTS.flatMap((name) => rulesFor(iab.ruleParts, name, 'styles/sheets/iab-dialog.js')).join('\n')}}`;
	writeDist(
		'styles/sheets/iab-dialog.css',
		`${writeSheet('iab-dialog', iabDialogSheet)}\n`
	);
}

console.log(
	'Generated dist/styles.css, dist/styles.tw3.css, dist/styles/dialog.css, dist/styles/dialog.js, dist/styles/primitives.css, dist/styles/sheets/*.js, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
