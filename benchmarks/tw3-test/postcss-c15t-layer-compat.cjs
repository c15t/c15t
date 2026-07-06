/**
 * Tailwind 3 compatibility plugin for c15t v3 styles.
 *
 * Tailwind 3's PostCSS plugin hijacks `@layer components`:
 * - it errors when `@layer components` appears in a file without a matching
 *   `@tailwind components` directive, and
 * - it TREE-SHAKES the layer contents against the content scan, purging any
 *   class not found verbatim in scanned files. c15t's hashed CSS Module
 *   classes (`c15t-ui-*`) only exist in dist class maps, so every rule
 *   would be purged.
 *
 * Fix: unwrap `@layer` blocks in c15t stylesheet files into plain rules
 * BEFORE Tailwind processes them. Plain rules pass through untouched. This
 * restores v2-era Tailwind 3 semantics: c15t base styles win by specificity;
 * overrides use the important modifier (`!bg-blue-600`) or slots.
 *
 * NOTE: this is the prototype for a product `@c15t/ui` PostCSS export that
 * Tailwind 3 consumers would add to their postcss config.
 */

/** Only unwrap layers in c15t-built stylesheets, never the app's own CSS. */
const C15T_STYLES_PATH = /[\\/]dist[\\/]styles[\\/](v3[\\/])?[^\\/]*\.css$/;

function c15tLayerCompat() {
	return {
		postcssPlugin: 'c15t-layer-compat',
		Once(root) {
			const file = root.source?.input.file ?? '';
			if (!C15T_STYLES_PATH.test(file)) {
				return;
			}

			root.walkAtRules('layer', (rule) => {
				if (rule.nodes && rule.nodes.length > 0) {
					rule.replaceWith(rule.nodes);
				} else {
					// Bare `@layer a, b;` order statements have no effect once
					// blocks are unwrapped.
					rule.remove();
				}
			});
		},
	};
}

c15tLayerCompat.postcss = true;

module.exports = c15tLayerCompat;
