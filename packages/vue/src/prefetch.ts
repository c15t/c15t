import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The part of a Nuxt client manifest entry this module reads and writes.
 * Declared here so the module does not depend on `vue-bundle-renderer`.
 */
export interface ClientManifestChunk {
	assets?: string[];
	css?: string[];
	dynamicImports?: string[];
	imports?: string[];
	isDynamicEntry?: boolean;
	isEntry?: boolean;
	prefetch?: boolean;
	src?: string;
}

/**
 * c15t chunks a page may need before its first banner paints, so Nuxt keeps
 * prefetching them: the experiment controller. Matched against the end of
 * the source path, inside a c15t package. The IAB banner and the browser
 * resolver keep their hints only when the build uses them; see
 * {@link IAB_FIRST_BANNER_SOURCES} and {@link BROWSER_RESOLVER_SOURCE}.
 */
const FIRST_BANNER_SOURCES = ['/dist/libs/experiment-assignment.js'];

/**
 * The IAB banner and its CMP, kept like {@link FIRST_BANNER_SOURCES} only
 * when the build turns IAB on. Without it nothing loads them.
 */
const IAB_FIRST_BANNER_SOURCES = [
	'/iab/dist/headless.js',
	'/iab/dist/index.js',
	'/dist/libs/iab-banner-summary.js',
	'/dist/runtime/components/iab-prompt.vue',
];

/**
 * Core's browser resolver with English base copy. Other languages load on
 * demand. Only `manifest({ resolve: 'browser' })` loads it while the page
 * starts; no other mode loads it at all, so a hint there would download it
 * on every page for nothing.
 */
const BROWSER_RESOLVER_SOURCE = '/dist/transports/manifest-browser.js';

/** What the Nuxt module knows about the build when it edits the manifest. */
export interface ConsentPrefetchOptions {
	/**
	 * Whether the mode is `manifest({ resolve: 'browser' })`, the only mode
	 * that loads the browser resolver at startup. Defaults to `false`.
	 */
	browserResolve?: boolean;
	/**
	 * Whether the module options turn IAB on. Only then do the IAB banner
	 * and its CMP keep their hints. Defaults to `false`.
	 */
	iab?: boolean;
}

/**
 * Whether a file belongs to a c15t package (`c15t` or `@c15t/*`), read from
 * the nearest `package.json` that names a package.
 *
 * @returns A check that caches each directory it reads.
 * @internal
 */
export const createPackageCheck = function createPackageCheck(): (
	file: string
) => boolean {
	const byDirectory = new Map<string, boolean>();
	const check = (directory: string): boolean => {
		const cached = byDirectory.get(directory);
		if (cached !== undefined) {
			return cached;
		}
		let result = false;
		const manifest = join(directory, 'package.json');
		const parent = dirname(directory);
		let name: unknown;
		if (existsSync(manifest)) {
			try {
				({ name } = JSON.parse(readFileSync(manifest, 'utf8')) as {
					name?: unknown;
				});
			} catch {
				name = undefined;
			}
		}
		if (typeof name === 'string') {
			result = name === 'c15t' || name.startsWith('@c15t/');
		} else if (parent !== directory) {
			result = check(parent);
		}
		byDirectory.set(directory, result);
		return result;
	};
	return (file) => check(dirname(file));
};

/**
 * Stop Nuxt prefetching c15t chunks a page loads only after its first
 * banner, or only when it configures them: the script loader, network
 * blocker, data clearing and `consentSource` connection, live option
 * updates, the save path, the preference dialog (which c15t warms itself
 * once the page has loaded), and IAB unless the module options turn it on.
 *
 * Nuxt adds a `<link rel="prefetch">` for every chunk the entry imports
 * dynamically. Each download that finishes queues a task on the main
 * thread, so on a page whose `/init` answer arrives while they land, the
 * banner waits behind them. Chunks another part of the app also reaches
 * keep their hint.
 *
 * @param manifest - Nuxt's client manifest, edited in place.
 * @param srcDir - The directory manifest sources are relative to.
 * @param isConsentFile - Whether a file belongs to a c15t package; reads
 * the nearest `package.json` by default.
 * @param options - Build facts; see {@link ConsentPrefetchOptions}.
 * @internal
 */
export const stopPrefetchingConsentChunks =
	function stopPrefetchingConsentChunks(
		manifest: Record<string, ClientManifestChunk>,
		srcDir: string,
		isConsentFile: (file: string) => boolean = createPackageCheck(),
		options: ConsentPrefetchOptions = {}
	): void {
		const isConsentSource = (chunk: ClientManifestChunk): boolean =>
			chunk.src !== undefined && isConsentFile(resolve(srcDir, chunk.src));
		const kept = [
			...FIRST_BANNER_SOURCES,
			...(options.browserResolve ? [BROWSER_RESOLVER_SOURCE] : []),
			...(options.iab ? IAB_FIRST_BANNER_SOURCES : []),
		];
		const deferred = new Set<string>();
		for (const [key, chunk] of Object.entries(manifest)) {
			if (
				chunk.isDynamicEntry &&
				isConsentSource(chunk) &&
				!kept.some((source) => chunk.src?.endsWith(source))
			) {
				deferred.add(key);
			}
		}
		// Every chunk something else loads, statically or on demand, keeps its
		// hint: the entry, pages, components and the c15t chunks kept above.
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
			if ((chunk.isEntry || chunk.isDynamicEntry) && !deferred.has(key)) {
				visit(key);
			}
		}
		const reachedStyles = new Set(
			[...reached].flatMap((key) => manifest[key]?.css ?? [])
		);
		const skip = (key: string): void => {
			const chunk = manifest[key];
			if (!chunk || reached.has(key) || chunk.prefetch === false) {
				return;
			}
			chunk.prefetch = false;
			for (const css of chunk.css ?? []) {
				const style = manifest[css];
				if (style && !reachedStyles.has(css)) {
					style.prefetch = false;
				}
			}
			for (const dependency of chunk.imports ?? []) {
				skip(dependency);
			}
		};
		for (const key of deferred) {
			skip(key);
		}
	};

/** List a c15t dynamic chunk among every entry's imports. */
const preloadWithEntry = function preloadWithEntry(
	manifest: Record<string, ClientManifestChunk>,
	srcDir: string,
	isConsentFile: (file: string) => boolean,
	source: string
): void {
	const target = Object.entries(manifest).find(
		([, chunk]) =>
			chunk.isDynamicEntry &&
			chunk.src?.endsWith(source) &&
			isConsentFile(resolve(srcDir, chunk.src))
	)?.[0];
	if (!target) {
		return;
	}
	for (const chunk of Object.values(manifest)) {
		if (chunk.isEntry && !chunk.imports?.includes(target)) {
			chunk.imports = [...(chunk.imports ?? []), target];
		}
	}
};

/** The banner the Nuxt root loads as its own chunk (see `nuxt-root.vue`). */
const BANNER_SOURCE = '/dist/runtime/components/prompt.vue';

/**
 * Preload the banner chunk with the entry on every page.
 *
 * Nuxt's root imports the banner dynamically, so its stylesheets stay out
 * of the entry. Nuxt preloads a dynamic chunk only when the page server
 * renders it; elsewhere (an `ssr: false` shell, a prerendered page, a
 * visitor whose banner the browser opens later) the browser would find it
 * only after the entry runs, and the banner would wait for it after
 * `/init`. Listed among the entry's imports in the manifest, the chunk and
 * its imports get a `modulepreload` link in every page's HTML, as when the
 * banner was part of the entry. The browser still loads the chunk with a
 * dynamic import, which brings its stylesheets.
 *
 * Call it after `preloadInlinedConsentStyles`, which reads the
 * entry's real static imports.
 *
 * @param manifest - Nuxt's client manifest, edited in place.
 * @param srcDir - The directory manifest sources are relative to.
 * @param isConsentFile - Whether a file belongs to a c15t package.
 * @internal
 */
export const preloadConsentBanner = function preloadConsentBanner(
	manifest: Record<string, ClientManifestChunk>,
	srcDir: string,
	isConsentFile: (file: string) => boolean
): void {
	preloadWithEntry(manifest, srcDir, isConsentFile, BANNER_SOURCE);
};

/**
 * Preload the browser resolver with the entry, for
 * `manifest({ resolve: 'browser' })`. The app imports it when the runtime is
 * built, so a page that only learns of it from the entry would wait a round
 * trip for it before the banner can resolve. Same mechanism as
 * {@link preloadConsentBanner}.
 *
 * @param manifest - Nuxt's client manifest, edited in place.
 * @param srcDir - The directory manifest sources are relative to.
 * @param isConsentFile - Whether a file belongs to a c15t package.
 * @internal
 */
export const preloadBrowserResolver = function preloadBrowserResolver(
	manifest: Record<string, ClientManifestChunk>,
	srcDir: string,
	isConsentFile: (file: string) => boolean
): void {
	preloadWithEntry(manifest, srcDir, isConsentFile, BROWSER_RESOLVER_SOURCE);
};
