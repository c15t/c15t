/**
 * Post-build script for @c15t/ui:
 * 1. Renames `*_module.css` files to `*.module.css` (rslib emits underscores)
 * 2. Fixes `_module.css` references in `.module.js` and `.module.cjs` files
 * 3. Generates aggregated CSS entrypoints with:
 *    - Preflight shield (unlayered) — prevents Tailwind/normalize from resetting c15t buttons
 *    - :root variables (unlayered) — design tokens
 *    - @layer c15t { :where()-wrapped component styles } — low specificity so user classes win
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
 * Preflight shield — unlayered CSS that prevents Tailwind/normalize resets
 * from breaking c15t interactive elements.
 *
 * Uses `button:where([class*="c15t-ui-"])` at specificity (0,0,1) which
 * ties with Tailwind's `button` reset and wins by source order.
 * References CSS custom properties set by the component styles in @layer c15t.
 */
function generatePreflightShield(): string {
	// The shield uses [class*="c15t-ui-"] at specificity (0,1,0) which beats:
	//   - Tailwind's `* { padding: 0 }` at (0,0,0)
	//   - Tailwind's `button { background: transparent }` at (0,0,1)
	// And ties with Tailwind utilities like `.text-blue-500` at (0,1,0),
	// but the shield comes first in source order so utilities win.
	// Fallbacks use `revert-layer` which reverts to the @layer c15t value.
	// If the component in @layer c15t sets the property, that value applies.
	// If not, `revert-layer` falls through to the user-agent default.
	// This prevents the shield from interfering with elements that don't
	// set a particular bridge property.
	return `/*! c15t preflight shield */
[class*="c15t-ui-"] {
  padding: var(--_c15t-padding, revert-layer);
  margin: var(--_c15t-margin, revert-layer);
  border: var(--_c15t-border, revert-layer);
  border-radius: var(--_c15t-radius, revert-layer);
  background-color: var(--_c15t-bg, revert-layer);
  color: var(--_c15t-color, revert-layer);
  font-family: var(--_c15t-font, revert-layer);
  font-size: var(--_c15t-font-size, revert-layer);
  font-weight: var(--_c15t-font-weight, revert-layer);
  line-height: var(--_c15t-line-height, revert-layer);
  cursor: var(--_c15t-cursor, revert-layer);
  box-shadow: var(--_c15t-shadow, revert-layer);
}`;
}

/**
 * Split CSS into content outside @layer components (`:root` vars, `@media`)
 * and content inside the layer (component rules).
 */
function splitLayerContent(css: string): {
	outsideLayer: string;
	insideLayer: string;
} {
	const layerMatch = css.match(/@layer\s+components\s*\{([\s\S]+)\}\s*$/);
	if (!layerMatch || layerMatch.index === undefined) {
		return { outsideLayer: '', insideLayer: css };
	}

	const insideLayer = layerMatch[1];
	const outsideLayer = css.slice(0, layerMatch.index);
	return { outsideLayer, insideLayer };
}

/**
 * Wrap `.c15t-ui-*` class selectors with `:where()` to reduce specificity
 * to (0,0,0). This ensures any user class (Tailwind utilities, custom classes)
 * at specificity (0,1,0) overrides c15t defaults without `!important`.
 *
 * Only matches `.c15t-ui-` prefixed classes — leaves `.c15t-dark`, `.c15t-theme-root`,
 * keyframe names, and CSS custom properties untouched.
 */
function wrapWithWhere(css: string): string {
	return css.replace(/\.c15t-ui-[a-zA-Z0-9_-]+/g, ':where($&)');
}

/**
 * Inject `--_c15t-*` bridge custom property declarations into CSS rules.
 *
 * For every property the preflight shield reads (padding, background-color, etc.),
 * if a component rule sets that property, we also set the corresponding bridge
 * custom property so the unlayered shield can read it.
 *
 * This avoids manually adding bridge props to every source CSS module.
 */
const BRIDGE_MAP: Record<string, string> = {
	padding: '--_c15t-padding',
	'padding-top': '--_c15t-padding', // partial — shield uses shorthand
	'padding-left': '--_c15t-padding',
	'background-color': '--_c15t-bg',
	background: '--_c15t-bg',
	color: '--_c15t-color',
	'border-radius': '--_c15t-radius',
	border: '--_c15t-border',
	'font-family': '--_c15t-font',
	'font-size': '--_c15t-font-size',
	'font-weight': '--_c15t-font-weight',
	'line-height': '--_c15t-line-height',
	cursor: '--_c15t-cursor',
	'box-shadow': '--_c15t-shadow',
};

function injectBridgeProperties(css: string): string {
	// Match CSS declaration blocks: selector { ... }
	// For each property in the block, if it maps to a bridge var, add the bridge declaration
	return css.replace(
		/(:where\([^)]+\)(?:[^{]*?))\{([^}]+)\}/g,
		(match, selector, body) => {
			const bridgeDecls: string[] = [];
			const seen = new Set<string>();

			for (const [prop, bridgeVar] of Object.entries(BRIDGE_MAP)) {
				// Check if this property is set in the body (not as part of a var name)
				const propRegex = new RegExp(
					`(?:^|;)\\s*${prop.replace('-', '\\-')}\\s*:([^;]+)`,
					'i'
				);
				const propMatch = body.match(propRegex);
				if (propMatch && !seen.has(bridgeVar)) {
					seen.add(bridgeVar);
					bridgeDecls.push(`${bridgeVar}:${propMatch[1].trim()}`);
				}
			}

			if (bridgeDecls.length === 0) return match;
			return `${selector}{${bridgeDecls.join(';')};${body}}`;
		}
	);
}

function concatCss(primitives: string[], components: string[]): string {
	const rootBlocks: string[] = [];
	const layerBlocks: string[] = [];

	// Preflight shield (unlayered)
	rootBlocks.push(generatePreflightShield());

	const allModules = [
		...primitives.map((n) => ({ name: n, dir: 'primitives' })),
		...components.map((n) => ({ name: n, dir: 'components' })),
	];

	for (const mod of allModules) {
		const filePath = join(
			DIST_DIR,
			'styles',
			mod.dir,
			`${mod.name}.module.css`
		);
		const css = readFileSync(filePath, 'utf-8');
		const { outsideLayer, insideLayer } = splitLayerContent(css);

		// :root variable blocks stay unlayered
		if (outsideLayer.trim()) {
			rootBlocks.push(`/* ${mod.dir}/${mod.name} vars */`);
			rootBlocks.push(outsideLayer);
		}

		// Component rules go in @layer c15t with :where() wrapping + bridge props
		if (insideLayer.trim()) {
			layerBlocks.push(`/* ${mod.dir}/${mod.name} */`);
			layerBlocks.push(injectBridgeProperties(wrapWithWhere(insideLayer)));
		}
	}

	return [...rootBlocks, '@layer c15t {', ...layerBlocks, '}'].join('\n');
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
