/**
 * Post-build script for @c15t/ui:
 * 1. Renames `*_module.css` files to `*.module.css` (rslib emits underscores)
 * 2. Fixes `_module.css` references in `.module.js` and `.module.cjs` files
 * 3. Generates aggregated CSS entrypoints:
 *    - :root custom property blocks stay unlayered
 *    - `styles.css` / `iab/styles.css` wrap component rules in `@layer components`
 *      for Tailwind 4 and native CSS layer consumers
 *    - `styles.tw3.css` / `iab/styles.tw3.css` emit the same component rules flat
 *      for Tailwind 3, which cannot import a standalone layered stylesheet from JS
 */
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = join(import.meta.dirname, '..', 'dist');

// ── Step 1: Rename *_module.css → *.module.css ────────────────────────
const CSS_DIRS = [
	join(DIST_DIR, 'styles', 'primitives'),
	join(DIST_DIR, 'styles', 'components'),
];

for (const dir of CSS_DIRS) {
	for (const file of readdirSync(dir)) {
		if (file.endsWith('_module.css')) {
			const newName = file.replace('_module.css', '.module.css');
			renameSync(join(dir, file), join(dir, newName));
		}
	}
}

// ── Step 2: Fix _module.css references and strip bare CSS imports ─────
// The bare `import"./foo.module.css"` side-effect imports are redundant:
// - Class names are hardcoded in the JS (rslib resolves them at build time)
// - Styles are loaded via the aggregated entrypoint (styles.css / iab/styles.css)
// Removing them keeps the package CSS contract centered on the aggregated
// entrypoints and avoids relying on host bundlers to process module CSS from
// node_modules.
for (const dir of CSS_DIRS) {
	for (const file of readdirSync(dir)) {
		if (file.endsWith('.module.js') || file.endsWith('.module.cjs')) {
			const filePath = join(dir, file);
			let content = readFileSync(filePath, 'utf-8');
			// Fix underscore naming
			if (content.includes('_module.css')) {
				content = content.replace(/_module\.css/g, '.module.css');
			}
			// Strip bare CSS side-effect imports: import"./foo.module.css"; or require("./foo.module.css");
			content = content.replace(
				/import\s*["'][^"']+\.module\.css["']\s*;?/g,
				''
			);
			content = content.replace(
				/require\(["'][^"']+\.module\.css["']\)\s*;?/g,
				''
			);
			writeFileSync(filePath, content);
		}
	}
}

// ── Step 3: Generate aggregated CSS entrypoints ───────────────────────

const IAB_PREFIX = 'iab-';

function discoverModuleNames(dir: string): string[] {
	return readdirSync(dir)
		.filter((f) => f.endsWith('.module.css'))
		.map((f) => f.replace('.module.css', ''))
		.sort();
}

const PRIMITIVES_DIR = join(DIST_DIR, 'styles', 'primitives');
const COMPONENTS_DIR = join(DIST_DIR, 'styles', 'components');

const NON_IAB_PRIMITIVES = discoverModuleNames(PRIMITIVES_DIR);
const allComponents = discoverModuleNames(COMPONENTS_DIR);
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

/**
 * Split a CSS module file into :root variable blocks (unlayered)
 * and component rules (from inside @layer components).
 *
 * Some module CSS files (e.g. consent-dialog-trigger) inline variables
 * directly into selectors without :root blocks or @layer wrappers — these
 * are treated as flat component rules.
 */
function splitModuleCss(
	css: string,
	fileName?: string
): {
	rootVars: string;
	componentRules: string;
} {
	// Extract all :root { ... } blocks (they live outside @layer)
	const rootBlocks: string[] = [];
	const rootRegex = /:root\s*\{[^}]+\}/g;
	let match: RegExpExecArray | null;
	while ((match = rootRegex.exec(css)) !== null) {
		rootBlocks.push(match[0]);
	}

	// Extract the content inside @layer components { ... }
	const layerMatch = css.match(/@layer\s+components\s*\{([\s\S]+)\}\s*$/);
	let componentRules = layerMatch ? layerMatch[1].trim() : '';

	// If there's no @layer wrapper but the file has selectors (not just :root),
	// treat the entire file as flat component rules.
	if (!componentRules && css.length > 100 && rootBlocks.length === 0) {
		componentRules = css.trim();
	}

	// Warn only if a file has :root blocks but no @layer component rules —
	// that could indicate a parsing issue.
	if (!componentRules && rootBlocks.length > 0 && css.length > 100) {
		const label = fileName ?? 'unknown';
		console.warn(
			`⚠ ${label}: has :root blocks but no @layer components rules (${css.length} chars)`
		);
	}

	return {
		rootVars: rootBlocks.join('\n'),
		componentRules,
	};
}

/**
 * Collect :root vars and component rules from module CSS files.
 */
function collectCssParts(
	primitives: string[],
	components: string[]
): { rootParts: string[]; ruleParts: string[] } {
	const rootParts: string[] = [];
	const ruleParts: string[] = [];

	for (const name of primitives) {
		const filePath = join(
			DIST_DIR,
			'styles',
			'primitives',
			`${name}.module.css`
		);
		const { rootVars, componentRules } = splitModuleCss(
			readFileSync(filePath, 'utf-8'),
			`primitives/${name}.module.css`
		);
		if (rootVars) rootParts.push(`/* primitives/${name} vars */\n${rootVars}`);
		if (componentRules)
			ruleParts.push(`/* primitives/${name} */\n${componentRules}`);
	}

	for (const name of components) {
		const filePath = join(
			DIST_DIR,
			'styles',
			'components',
			`${name}.module.css`
		);
		const { rootVars, componentRules } = splitModuleCss(
			readFileSync(filePath, 'utf-8'),
			`components/${name}.module.css`
		);
		if (rootVars) rootParts.push(`/* components/${name} vars */\n${rootVars}`);
		if (componentRules)
			ruleParts.push(`/* components/${name} */\n${componentRules}`);
	}

	return { rootParts, ruleParts };
}

/**
 * Generate layered CSS: component rules wrapped in @layer components.
 * Use with Tailwind 4 — import Tailwind normally; c15t joins the components layer automatically.
 */
function buildLayeredCss(rootParts: string[], ruleParts: string[]): string {
	const parts: string[] = [];
	if (rootParts.length) {
		parts.push(rootParts.join('\n\n'));
	}
	if (ruleParts.length) {
		parts.push(
			`@layer components {\n${ruleParts.map((r) => `  ${r}`).join('\n\n')}\n}`
		);
	}
	return parts.join('\n\n');
}

/**
 * Generate flat CSS: component rules are emitted without any layer wrapper.
 * Use with Tailwind 3, where the stylesheet is typically imported from JS and
 * must not rely on a colocated `@tailwind components` directive.
 */
function buildFlatCss(rootParts: string[], ruleParts: string[]): string {
	const parts: string[] = [];
	if (rootParts.length) {
		parts.push(rootParts.join('\n\n'));
	}
	if (ruleParts.length) {
		parts.push(ruleParts.join('\n\n'));
	}
	return parts.join('\n\n');
}

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
	buildLayeredCss(nonIab.rootParts, nonIab.ruleParts) + '\n'
);

// dist/styles.tw3.css — flat rules (for Tailwind 3 layout imports)
writeFileSync(
	join(DIST_DIR, 'styles.tw3.css'),
	buildFlatCss(nonIab.rootParts, nonIab.ruleParts) + '\n'
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
	buildLayeredCss(iab.rootParts, iab.ruleParts) + '\n'
);

// dist/iab/styles.tw3.css — flat rules (for Tailwind 3 layout imports)
writeFileSync(
	join(iabDir, 'styles.tw3.css'),
	buildFlatCss(iab.rootParts, iab.ruleParts) + '\n'
);

console.log(
	'Generated dist/styles.css, dist/styles.tw3.css, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
