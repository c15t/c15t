/**
 * A built stylesheet under `dist/` of `c15t` or an `@c15t/*` package in
 * `node_modules` (pnpm and Bun store paths included). Vite may append a
 * query such as `?transform-only` to the file name.
 */
const C15T_INSTALLED_STYLESHEET_PATH =
	/(?:^|[\\/])node_modules[\\/](?:@c15t[\\/][^\\/]+|c15t)[\\/]dist[\\/](?:[^\\/]+[\\/])*[^\\/]+\.css(?:\?[^\\/]*)?$/u;

/**
 * A built stylesheet under `packages/<name>/dist/` of a workspace, with the
 * package directory captured. Any monorepo has these paths, so a match only
 * counts once that directory's `package.json` names a c15t package.
 */
const WORKSPACE_STYLESHEET_PATH =
	/^(?<directory>.*[\\/]packages[\\/][^\\/]+)[\\/]dist[\\/](?:[^\\/]+[\\/])*[^\\/]+\.css(?:\?[^\\/]*)?$/u;

interface FileSystem {
	readFileSync: (path: string, encoding: 'utf8') => string;
}

/** Whether each workspace package directory holds a c15t package. */
const workspacePackageCache = new Map<string, boolean>();

/**
 * Whether a workspace package directory holds `c15t` or an `@c15t/*`
 * package, by the `name` in its `package.json`.
 *
 * `node:fs` comes from `process.getBuiltinModule` rather than an import, so
 * the module stays importable by bundlers that target the browser. Where
 * that is missing (Node before 20.16), workspace paths do not match;
 * installed packages still do.
 */
const isC15tWorkspacePackage = function isC15tWorkspacePackage(
	directory: string
): boolean {
	const cached = workspacePackageCache.get(directory);
	if (cached !== undefined) {
		return cached;
	}
	const fs = (
		globalThis as {
			process?: { getBuiltinModule?: (id: string) => unknown };
		}
	).process?.getBuiltinModule?.('node:fs') as FileSystem | undefined;
	let matches = false;
	if (fs) {
		try {
			const manifest: unknown = JSON.parse(
				fs.readFileSync(`${directory}/package.json`, 'utf8')
			);
			const name =
				typeof manifest === 'object' && manifest !== null && 'name' in manifest
					? manifest.name
					: undefined;
			matches =
				typeof name === 'string' &&
				(name === 'c15t' || name.startsWith('@c15t/'));
		} catch {
			// No readable `package.json`: not a c15t package.
		}
	}
	workspacePackageCache.set(directory, matches);
	return matches;
};

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
 * Whether a file is a built stylesheet from a c15t package, the files whose
 * `@layer` blocks `@c15t/ui/postcss-tailwind3` unwraps.
 *
 * Installed packages match by path. A workspace path such as
 * `packages/react/dist/styles.css` matches only when the package's own
 * `package.json` is named `c15t` or `@c15t/*`, so another monorepo's
 * `packages/react` keeps its layers.
 *
 * @param filePath - Absolute path of a CSS file.
 * @returns `true` for `dist/` stylesheets of `c15t` and `@c15t/*` packages.
 */
export const isC15tUiStylesheetPath = function isC15tUiStylesheetPath(
	filePath: string
): boolean {
	if (C15T_INSTALLED_STYLESHEET_PATH.test(filePath)) {
		return true;
	}
	const directory = WORKSPACE_STYLESHEET_PATH.exec(filePath)?.groups?.directory;
	return directory !== undefined && isC15tWorkspacePackage(directory);
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
 * rules. This plugin unwraps `@layer` blocks that come from a built c15t
 * stylesheet before Tailwind runs, restoring Tailwind 3's v2-era semantics:
 * c15t base styles win by specificity, and overrides use important-modifier
 * utilities such as `!bg-blue-600` or c15t theme slots.
 *
 * Each block is judged by the file it was written in, not the file being
 * processed. Vite and `postcss-import` inline an app's
 * `@import '@c15t/svelte/styles.css'` into the app's stylesheet, and Astro
 * processes `@c15t/astro/styles.css`, which imports `@c15t/ui/styles.css`;
 * in both, the root is not a c15t file but the layered rules are.
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
