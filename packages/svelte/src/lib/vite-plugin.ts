import type { Plugin } from 'vite';

/**
 * Vite plugin that redirects `@c15t/ui` CSS-module JS files
 * to raw `.module.css` sources so Vite can process them natively.
 *
 * The `@c15t/ui` build uses rslib's `injectStyles: true`, which
 * bundles an rspack style-loader runtime into each `.module.js`
 * file. That runtime works in webpack/rspack but is incompatible
 * with Vite's module system and SSR environment.
 *
 * This plugin intercepts those imports and rewrites the resolved
 * path from `.module.js` → `.module.css`, letting Vite handle
 * CSS modules with its own pipeline. It also strips `@layer`
 * wrappers from the CSS to prevent layer-ordering conflicts
 * with Tailwind or other CSS that declares layer order.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import { c15tStylesPlugin } from '@c15t/svelte/vite';
 *
 * export default defineConfig({
 *   plugins: [c15tStylesPlugin(), sveltekit()],
 *   ssr: { noExternal: ['@c15t/ui', '@c15t/svelte'] },
 * });
 * ```
 */
export function c15tStylesPlugin(): Plugin {
	const redirectedIds = new Set<string>();

	return {
		name: 'c15t-styles',
		enforce: 'pre',

		async resolveId(source, importer, options) {
			// Pattern 1 — bare-specifier imports from Svelte components:
			//   import styles from '@c15t/ui/styles/components/foo.module.js'
			const packageMatch = source.match(/@c15t\/ui\/styles\/(.+)\.module\.js$/);
			if (packageMatch) {
				const resolved = await this.resolve(source, importer, {
					...options,
					skipSelf: true,
				});
				if (!resolved) return;
				const cssId = resolved.id.replace(/\.module\.js$/, '.module.css');
				redirectedIds.add(cssId);
				return cssId;
			}

			// Pattern 2 — relative imports from within @c15t/ui dist:
			//   e.g. switch.js internally does `import m from "./switch.module.js"`
			if (
				source.endsWith('.module.js') &&
				!source.startsWith('@') &&
				importer?.includes('@c15t/ui')
			) {
				const resolved = await this.resolve(source, importer, {
					...options,
					skipSelf: true,
				});
				if (!resolved) return;
				const cssId = resolved.id.replace(/\.module\.js$/, '.module.css');
				redirectedIds.add(cssId);
				return cssId;
			}
		},

		transform(code, id) {
			// Strip `@layer components { ... }` wrappers from redirected CSS files.
			// The @layer wrapper causes priority issues when consumer apps declare
			// their own layer order (e.g. Tailwind's @layer base beating @layer
			// components because the CSS module loads first, registering the
			// "components" layer at the lowest priority).
			// CSS module hashed class names already provide isolation.
			if (!redirectedIds.has(id)) return;

			return code.replace(
				/@layer\s+components\s*\{([\s\S]*)\}/gm,
				(_, inner) => inner
			);
		},
	};
}
