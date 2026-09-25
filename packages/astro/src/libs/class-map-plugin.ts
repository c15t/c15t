/**
 * Keeps the dialog islands from shipping a second copy of the stylesheet.
 *
 * The islands read `@c15t/ui` class maps. In the browser build those modules
 * also import their component CSS, and Astro links every stylesheet a page
 * script can reach on every page. The integration already injects the full
 * stylesheet, so that CSS is a duplicate. `@c15t/ui` ships each class map
 * without its CSS import as `<name>.node.js` for runtimes that cannot load
 * CSS; this points the browser build at those instead.
 */

/** `@c15t/ui/styles/components/<name>`, but not the `.css` subpaths. */
const CLASS_MAP = /^@c15t\/ui\/styles\/components\/[a-z-]+$/u;

/** The IAB components' class maps, whose rules live in the IAB stylesheet. */
const IAB_CLASS_MAP = /^@c15t\/ui\/styles\/components\/iab-/u;

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
	resolveId: (
		this: ResolveContext,
		id: string,
		importer: string | undefined,
		options?: { ssr?: boolean } & Record<string, unknown>
	) => Promise<string | null>;
}

/**
 * Create the plugin. Only add it when the integration injects the full
 * stylesheet: with `styles: false` the islands' own CSS is all a site has.
 *
 * @param options - Which stylesheets the integration injects.
 * @returns A Vite plugin.
 */
export const createClassMapPlugin = function createClassMapPlugin(
	options: ClassMapPluginOptions
): ClassMapPlugin {
	return {
		enforce: 'pre',
		name: 'c15t:class-maps-without-css',
		async resolveId(id, importer, resolveOptions = {}) {
			// The server build already resolves the `node` condition.
			if (
				!CLASS_MAP.test(id) ||
				(IAB_CLASS_MAP.test(id) && !options.iabStylesInjected) ||
				resolveOptions.ssr === true ||
				this.environment?.config?.consumer === 'server'
			) {
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
