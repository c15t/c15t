/**
 * Post-build script for @c15t/ui:
 * 1. Renames `*_module.css` files to `*.module.css` (rslib emits underscores)
 * 2. Fixes `_module.css` references in `.module.js` and `.module.cjs` files
 * 3. Generates aggregated CSS entrypoints:
 *    - :root custom property blocks stay unlayered
 *    - Component rules are wrapped in `@layer c15t`
 *    - Tailwind 4 users declare layer order: `@layer theme, base, components, c15t, utilities;`
 *      so c15t > preflight (base) and utilities > c15t — clean overrides, no !important
 *    - Tailwind 3 users can import the same stylesheet, provided their app keeps
 *      Tailwind directives in its own global CSS and scans c15t package sources
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
 * Split a CSS module file into :root variable blocks (unlayered)
 * and component rules (from inside @layer components).
 */
function splitModuleCss(css: string): {
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
	const componentRules = layerMatch ? layerMatch[1].trim() : '';

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
			readFileSync(filePath, 'utf-8')
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
			readFileSync(filePath, 'utf-8')
		);
		if (rootVars) rootParts.push(`/* components/${name} vars */\n${rootVars}`);
		if (componentRules)
			ruleParts.push(`/* components/${name} */\n${componentRules}`);
	}

	return { rootParts, ruleParts };
}

/**
 * Generate layered CSS: component rules wrapped in @layer c15t.
 * Use with Tailwind 4 — declare layer order: @layer theme, base, components, c15t, utilities;
 */
function buildLayeredCss(rootParts: string[], ruleParts: string[]): string {
	const parts: string[] = [];
	if (rootParts.length) {
		parts.push(rootParts.join('\n\n'));
	}
	if (ruleParts.length) {
		parts.push(
			`@layer c15t {\n${ruleParts.map((r) => `  ${r}`).join('\n\n')}\n}`
		);
	}
	return parts.join('\n\n');
}

// ── Non-IAB entrypoints ─────────────────────────────────────────────
const nonIab = collectCssParts(NON_IAB_PRIMITIVES, NON_IAB_COMPONENTS);

// dist/styles.css — @layer c15t (default, for Tailwind 4 + native CSS layers)
writeFileSync(
	join(DIST_DIR, 'styles.css'),
	buildLayeredCss(nonIab.rootParts, nonIab.ruleParts) + '\n'
);

// ── IAB entrypoints ─────────────────────────────────────────────────
const iab = collectCssParts(NON_IAB_PRIMITIVES, IAB_COMPONENTS);
const iabDir = join(DIST_DIR, 'iab');
mkdirSync(iabDir, { recursive: true });

// dist/iab/styles.css — @layer c15t
writeFileSync(
	join(iabDir, 'styles.css'),
	buildLayeredCss(iab.rootParts, iab.ruleParts) + '\n'
);

console.log('Generated dist/styles.css and dist/iab/styles.css');
