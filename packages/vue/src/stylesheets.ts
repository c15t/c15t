import type { Plugin } from 'vite';

import type { ClientManifestChunk } from './prefetch';

/**
 * A stylesheet module the client build bundled into a CSS file, with the
 * modules that import it.
 */
export interface StyleSource {
	id: string;
	importers: string[];
}

/** Bundled CSS file name (without directories) to the modules inside it. */
export type StyleSourceIndex = Map<string, StyleSource[]>;

/** Nuxt's `features.inlineStyles`, after Nuxt resolves it. */
export type InlineStylesOption = boolean | ((id?: string) => boolean);

const QUERY_RE = /\?.*$/u;
const STYLESHEET_RE = /\.(?:css|less|sass|scss|styl|stylus|pcss|postcss)$/u;

const baseName = (file: string): string =>
	file.slice(file.lastIndexOf('/') + 1);

/**
 * Record which stylesheet modules end up in each CSS file of the client
 * build, and which modules import them. Nuxt's client manifest names a
 * chunk's CSS files but not their sources.
 *
 * @param index - Filled in when the client bundle is written.
 * @returns A Vite plugin for the client build.
 * @internal
 */
export const collectStyleSources = function collectStyleSources(
	index: StyleSourceIndex
): Plugin {
	return {
		apply: 'build',
		generateBundle(_options, bundle) {
			for (const output of Object.values(bundle)) {
				if (output.type !== 'chunk') {
					continue;
				}
				const files = output.viteMetadata?.importedCss;
				if (!files?.size) {
					continue;
				}
				const sources = output.moduleIds
					.filter((id) => STYLESHEET_RE.test(id.replace(QUERY_RE, '')))
					.map((id) => ({
						id,
						importers: [...(this.getModuleInfo(id)?.importers ?? [])],
					}));
				for (const file of files) {
					const name = baseName(file);
					index.set(name, [...(index.get(name) ?? []), ...sources]);
				}
			}
		},
		name: '@c15t/vue:style-sources',
	};
};

/**
 * Turn the render-blocking `<link>`s Nuxt writes for c15t stylesheets it
 * already inlines into preloads, so they no longer hold the first paint.
 *
 * With `features.inlineStyles`, Nuxt writes the styles of every component
 * it server-renders into the HTML, and drops the `<link>` for a chunk named
 * after such a component. c15t's components share chunks (the banner and
 * the dialog use the same buttons), and those shared chunks kept their
 * render-blocking links next to the inlined copy of the same rules.
 *
 * A CSS file of a shared chunk moves from the chunk's stylesheets to its
 * preloaded assets when every rule in it comes from a c15t stylesheet that
 * only Vue components import (Nuxt inlines those for each component it
 * renders), and no chunk the entry imports statically carries it. The browser still
 * applies the file: a lazy chunk's dynamic import loads its stylesheets
 * before the component renders, so a surface the browser shows first, such
 * as the banner on an `ssr: false` route or the dialog, is styled when it
 * appears. The preload starts that download with the page, so a
 * server-rendered banner does not wait for it to hydrate.
 *
 * @param manifest - Nuxt's client manifest, edited in place.
 * @param index - The CSS file sources {@link collectStyleSources} recorded.
 * @param inlineStyles - Nuxt's resolved `features.inlineStyles`.
 * @param isConsentFile - Whether a file belongs to a c15t package.
 * @internal
 */
export const preloadInlinedConsentStyles = function preloadInlinedConsentStyles(
	manifest: Record<string, ClientManifestChunk>,
	index: StyleSourceIndex,
	inlineStyles: InlineStylesOption,
	isConsentFile: (file: string) => boolean
): void {
	if (!inlineStyles || index.size === 0) {
		return;
	}
	const isInlined = (importer: string): boolean => {
		const path = importer.replace(QUERY_RE, '');
		return (
			path.endsWith('.vue') && (inlineStyles === true || inlineStyles(importer))
		);
	};
	const isInlinedConsentFile = (file: string): boolean => {
		const sources = index.get(baseName(file));
		return (
			sources !== undefined &&
			sources.length > 0 &&
			sources.every(
				(source) =>
					isConsentFile(source.id.replace(QUERY_RE, '')) &&
					source.importers.length > 0 &&
					source.importers.every(isInlined)
			)
		);
	};
	// The entry's stylesheets reach the browser only through the HTML.
	const reached = new Set<string>();
	const visit = (key: string): void => {
		if (reached.has(key)) {
			return;
		}
		reached.add(key);
		for (const dependency of manifest[key]?.imports ?? []) {
			visit(dependency);
		}
	};
	for (const [key, chunk] of Object.entries(manifest)) {
		if (chunk.isEntry) {
			visit(key);
		}
	}
	for (const [key, chunk] of Object.entries(manifest)) {
		// A chunk with a source is a component's own chunk, whose
		// stylesheets Nuxt drops itself once it inlines them.
		if (!chunk.css?.length || chunk.src || reached.has(key)) {
			continue;
		}
		const inlined = chunk.css.filter(isInlinedConsentFile);
		if (inlined.length > 0) {
			chunk.css = chunk.css.filter((file) => !inlined.includes(file));
			chunk.assets = [...new Set([...(chunk.assets ?? []), ...inlined])];
		}
	}
};
