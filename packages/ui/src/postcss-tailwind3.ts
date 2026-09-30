/**
 * Built `@c15t/ui` stylesheets: the entrypoints (`styles.css`,
 * `iab/styles.css` and their `.tw3.css` twins) and everything under
 * `styles/` (`dialog.css`, `primitives.css`, per-component files).
 */
const C15T_UI_DIST_STYLES_PATH =
	/(?:^|[\\/])(?:node_modules[\\/]@c15t[\\/]ui|packages[\\/]ui)[\\/]dist[\\/](?:(?:iab[\\/])?styles(?:\.tw3)?\.css|styles[\\/](?:components[\\/])?[^\\/]+\.css)$/u;

/**
 * `@c15t/browser`'s light-DOM stylesheets (`@c15t/browser/styles.css` and
 * `iab/styles.css`), which carry the `@c15t/ui` rules with their layers.
 */
const C15T_BROWSER_DIST_STYLES_PATH =
	/(?:^|[\\/])(?:node_modules[\\/]@c15t[\\/]browser|packages[\\/]browser)[\\/]dist[\\/]c15t(?:\.iab)?\.css$/u;

interface PostcssSource {
	input?: {
		file?: string;
	};
}

interface PostcssAtRule {
	nodes?: unknown[];
	source?: PostcssSource;
	remove: () => void;
	replaceWith: (...nodes: unknown[]) => void;
}

interface PostcssRoot {
	source?: PostcssSource;
	walkAtRules: (name: string, callback: (rule: PostcssAtRule) => void) => void;
}

export interface PostcssTailwind3Plugin {
	postcssPlugin: string;
	Once: (root: PostcssRoot) => void;
}

export interface PostcssTailwind3PluginCreator {
	(): PostcssTailwind3Plugin;
	postcss: true;
}

/**
 * Whether a file is a built c15t stylesheet the plugin flattens.
 *
 * @param filePath - Absolute path of the stylesheet
 * @returns True for `@c15t/ui` and `@c15t/browser` dist stylesheets
 */
export const isC15tUiStylesheetPath = function isC15tUiStylesheetPath(
	filePath: string
): boolean {
	return (
		C15T_UI_DIST_STYLES_PATH.test(filePath) ||
		C15T_BROWSER_DIST_STYLES_PATH.test(filePath)
	);
};

/**
 * Tailwind 3 compatibility plugin for c15t component styles.
 *
 * Tailwind 3's PostCSS plugin hijacks `@layer components`: it errors when a
 * standalone stylesheet contains `@layer components` without a matching
 * `@tailwind components` directive in the same processing graph, and it also
 * tree-shakes layer contents against the Tailwind content scan. c15t's hashed
 * CSS Module classes (`c15t-ui-*`) are generated into dist class maps and never
 * appear verbatim in application source, so Tailwind 3 can purge the component
 * rules. This plugin unwraps `@layer` blocks only inside built `@c15t/ui`
 * stylesheet files before Tailwind runs, restoring Tailwind 3's v2-era
 * semantics: c15t base styles win by specificity, and overrides use
 * important-modifier utilities such as `!bg-blue-600` or c15t theme slots.
 *
 * Each `@layer` rule is checked against its own source file, not the root's.
 * Vite and `postcss-import` inline `@import`ed files into the importing
 * stylesheet before other plugins run, so c15t's rules can arrive inside the
 * app's Tailwind entry. The app's own layers are left alone.
 */
const c15tTailwind3: PostcssTailwind3PluginCreator = Object.assign(
	(): PostcssTailwind3Plugin => ({
		Once(root: PostcssRoot) {
			const rootFile = root.source?.input?.file ?? '';

			root.walkAtRules('layer', (rule: PostcssAtRule) => {
				const file = rule.source?.input?.file ?? rootFile;
				if (!isC15tUiStylesheetPath(file)) {
					return;
				}

				if (rule.nodes && rule.nodes.length > 0) {
					rule.replaceWith(...rule.nodes);
					return;
				}

				// Bare order statements have no effect once layer blocks are flat.
				rule.remove();
			});
		},

		postcssPlugin: 'c15t-tailwind3',
	}),
	{ postcss: true as const }
);

export { c15tTailwind3 };
export default c15tTailwind3;

/**
 * Pre-instantiated plugin for loaders that reach this ESM module through
 * `require()` — Next.js `require()`s string plugin names from
 * `postcss.config.*` and receives the module namespace, not the default
 * export. Both Next's plugin wrapper and PostCSS itself unwrap a `postcss`
 * property before giving up, so exporting the instantiated plugin under that
 * name keeps `plugins: ['@c15t/ui/postcss-tailwind3']` working without a
 * CommonJS build. The plugin takes no options, so a shared instance is
 * equivalent to calling the creator.
 */
export const postcss: PostcssTailwind3Plugin = c15tTailwind3();
