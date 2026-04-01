/**
 * Post-build script for @c15t/ui:
 * 1. Renames `*_module.css` files to `*.module.css` (rslib emits underscores)
 * 2. Fixes `_module.css` references in `.module.js` and `.module.cjs` files
 * 3. Generates aggregated CSS entrypoints by concatenating CSS content
 *    (NOT @import — Turbopack silently drops .module.css imports from node_modules)
 * 4. Strips @layer wrappers so styles are unlayered (matches injectStyles behavior;
 *    layered c15t styles lose to Tailwind's unlayered preflight reset)
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

// ── Step 2: Fix _module.css references in JS files ────────────────────
for (const dir of CSS_DIRS) {
	for (const file of readdirSync(dir)) {
		if (file.endsWith('.module.js') || file.endsWith('.module.cjs')) {
			const filePath = join(dir, file);
			let content = readFileSync(filePath, 'utf-8');
			if (content.includes('_module.css')) {
				content = content.replace(/_module\.css/g, '.module.css');
				writeFileSync(filePath, content);
			}
		}
	}
}

// ── Step 3: Generate aggregated CSS entrypoints (concatenated) ────────
//
// We concatenate CSS content instead of using @import because:
// - Turbopack/Next.js silently ignores .module.css imports from node_modules
// - @import chains through package exports are fragile across bundlers
// - A single file avoids waterfall requests in non-bundled environments

const NON_IAB_PRIMITIVES = ['button', 'switch', 'accordion', 'legal-links'];

const NON_IAB_COMPONENTS = [
	'consent-banner',
	'consent-dialog',
	'consent-dialog-trigger',
	'consent-widget',
	'frame',
];

const IAB_COMPONENTS = ['iab-consent-banner', 'iab-consent-dialog'];

/**
 * Strip `@layer components { ... }` wrappers, keeping inner content.
 *
 * The CSS module source files use `@layer components` but the aggregated
 * stylesheet must be unlayered so it isn't overridden by Tailwind's
 * unlayered preflight reset. This matches the behavior of injectStyles
 * where the style-loader also strips @layer wrappers.
 */
function stripLayerWrappers(css: string): string {
	// Match @layer components{...} — the closing brace is the LAST one
	// since @layer wraps the entire rule block. We use a greedy match.
	return css.replace(/@layer\s+components\s*\{([\s\S]+)\}\s*$/, '$1');
}

function concatCss(primitives: string[], components: string[]): string {
	const parts: string[] = [];

	for (const name of primitives) {
		const filePath = join(
			DIST_DIR,
			'styles',
			'primitives',
			`${name}.module.css`
		);
		parts.push(`/* primitives/${name} */`);
		parts.push(stripLayerWrappers(readFileSync(filePath, 'utf-8')));
	}

	for (const name of components) {
		const filePath = join(
			DIST_DIR,
			'styles',
			'components',
			`${name}.module.css`
		);
		parts.push(`/* components/${name} */`);
		parts.push(stripLayerWrappers(readFileSync(filePath, 'utf-8')));
	}

	return parts.join('\n');
}

// dist/styles.css (non-IAB)
const nonIabCss = concatCss(NON_IAB_PRIMITIVES, NON_IAB_COMPONENTS);
writeFileSync(join(DIST_DIR, 'styles.css'), nonIabCss + '\n');

// dist/iab/styles.css (self-contained IAB)
const iabCss = concatCss(NON_IAB_PRIMITIVES, IAB_COMPONENTS);
const iabDir = join(DIST_DIR, 'iab');
mkdirSync(iabDir, { recursive: true });
writeFileSync(join(iabDir, 'styles.css'), iabCss + '\n');

console.log('Generated dist/styles.css and dist/iab/styles.css');
