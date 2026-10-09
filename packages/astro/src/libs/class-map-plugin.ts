/**
 * Keeps the dialog islands from shipping a second copy of the stylesheet.
 *
 * The islands read `@c15t/ui` class maps. In the browser build those modules
 * also import their component CSS, and Astro links every stylesheet a page
 * script can reach on every page. The page already inlines the first-paint
 * rules, and the client links the dialog's, so that CSS is a duplicate.
 * `@c15t/ui` ships each class map without its CSS import as `<name>.node.js`
 * for runtimes that cannot load CSS; this points the browser build at those
 * instead.
 *
 * The islands' stylesheet imports resolve to an empty module here: the
 * inlined first-paint rules and the dialog and primitive rules the client
 * links when the dialog opens (see `browser/dialog-styles.ts`) cover them.
 * Left alone, a build either drops them or ships the same rules a second
 * time.
 */

/** `@c15t/ui/styles/components/<name>`, but not the `.css` subpaths. */
const CLASS_MAP = /^@c15t\/ui\/styles\/components\/[a-z-]+$/u;

/**
 * Stylesheets the injected one already covers or the client links itself.
 * `dialog.css` is empty, and an import of it would still link a file.
 */
const CLIENT_LINKED_CSS =
	/^@c15t\/ui\/styles\/(?:dialog|primitives|components\/[a-z-]+)\.css$/u;

/** The IAB components' class maps and CSS, whose rules live in the IAB stylesheet. */
const IAB_CLASS_MAP = /^@c15t\/ui\/styles\/components\/iab-/u;

/** The module an island's client-linked stylesheet import resolves to. */
export const EMPTY_STYLESHEET_ID = '\0c15t:client-linked-stylesheet';

/** Options for {@link createClassMapPlugin}. */
export interface ClassMapPluginOptions {
	/**
	 * Whether the IAB stylesheet is injected too. Without it the IAB class
	 * maps keep their CSS, since nothing else carries those rules.
	 */
	iabStylesInjected: boolean;
}

interface ResolvedId {
	id: string;
}

/** The slice of Vite's plugin context the hook uses. */
interface ResolveContext {
	resolve: (
		id: string,
		importer?: string,
		options?: Record<string, unknown>
	) => Promise<ResolvedId | null>;
	environment?: { config?: { consumer?: string } };
}

/** Minimal Vite plugin shape, so the package does not depend on Vite types. */
export interface ClassMapPlugin {
	name: string;
	enforce: 'pre';
	load: (id: string) => string | null;
	resolveId: (
		this: ResolveContext,
		id: string,
		importer: string | undefined,
		options?: { ssr?: boolean } & Record<string, unknown>
	) => Promise<string | null>;
}

/**
 * Create the plugin. Only add it when the integration delivers c15t's
 * styles: with `styles: false` the islands' own CSS is all a site has.
 *
 * @param options - Which stylesheets the integration injects.
 * @returns A Vite plugin.
 */
export const createClassMapPlugin = function createClassMapPlugin(
	options: ClassMapPluginOptions
): ClassMapPlugin {
	return {
		enforce: 'pre',
		load(id) {
			return id === EMPTY_STYLESHEET_ID ? 'export {};' : null;
		},
		name: 'c15t:class-maps-without-css',
		async resolveId(id, importer, resolveOptions = {}) {
			// The server build already resolves the `node` condition.
			if (
				(IAB_CLASS_MAP.test(id) && !options.iabStylesInjected) ||
				resolveOptions.ssr === true ||
				this.environment?.config?.consumer === 'server'
			) {
				return null;
			}
			if (CLIENT_LINKED_CSS.test(id)) {
				return EMPTY_STYLESHEET_ID;
			}
			if (!CLASS_MAP.test(id)) {
				return null;
			}
			const resolved = await this.resolve(id, importer, {
				...resolveOptions,
				skipSelf: true,
			});
			if (!resolved?.id.endsWith('.js')) {
				return null;
			}
			const withoutCSS = `${resolved.id.slice(0, -'.js'.length)}.node.js`;
			// Loaded here rather than at the top: the package root re-exports
			// the integration, and browser code importing it must not pull in
			// a Node built-in.
			const { existsSync } = await import('node:fs');
			return existsSync(withoutCSS) ? withoutCSS : null;
		},
	};
};
