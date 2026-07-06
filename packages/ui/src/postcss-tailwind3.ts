const C15T_UI_DIST_STYLES_PATH =
	/(?:^|[\\/])(?:node_modules[\\/]@c15t[\\/]ui|packages[\\/]ui)[\\/]dist[\\/]styles[\\/](?:v3[\\/])?[^\\/]+\.css$/;

type PostcssAtRule = {
	nodes?: unknown[];
	remove(): void;
	replaceWith(...nodes: unknown[]): void;
};

type PostcssRoot = {
	source?: {
		input?: {
			file?: string;
		};
	};
	walkAtRules(name: string, callback: (rule: PostcssAtRule) => void): void;
};

export type PostcssTailwind3Plugin = {
	postcssPlugin: string;
	Once(root: PostcssRoot): void;
};

export type PostcssTailwind3PluginCreator = {
	(): PostcssTailwind3Plugin;
	postcss: true;
};

export function isC15tUiStylesheetPath(filePath: string): boolean {
	return C15T_UI_DIST_STYLES_PATH.test(filePath);
}

/**
 * Tailwind 3 compatibility plugin for c15t v3 styles.
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
 */
const c15tTailwind3: PostcssTailwind3PluginCreator = Object.assign(
	function c15tTailwind3(): PostcssTailwind3Plugin {
		return {
			postcssPlugin: 'c15t-tailwind3',
			Once(root: PostcssRoot) {
				const file = root.source?.input?.file ?? '';
				if (!isC15tUiStylesheetPath(file)) {
					return;
				}

				root.walkAtRules('layer', (rule: PostcssAtRule) => {
					if (rule.nodes && rule.nodes.length > 0) {
						rule.replaceWith(...rule.nodes);
						return;
					}

					// Bare order statements have no effect once layer blocks are flat.
					rule.remove();
				});
			},
		};
	},
	{ postcss: true as const }
);

export { c15tTailwind3 };
export default c15tTailwind3;
