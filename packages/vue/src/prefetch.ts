import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The part of a Nuxt client manifest entry this module reads and writes.
 * Declared here so the module does not depend on `vue-bundle-renderer`.
 */
export interface ClientManifestChunk {
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
 * prefetching them: the IAB banner and its CMP, the experiment controller,
 * and the client manifest resolver. Matched against the end of the source
 * path, inside a c15t package.
 */
const FIRST_BANNER_SOURCES = [
	'/iab/dist/headless.js',
	'/iab/dist/index.js',
	'/dist/libs/experiment-assignment.js',
	'/dist/libs/iab-banner-summary.js',
	'/dist/runtime/client-manifest.js',
	'/dist/runtime/components/iab-prompt.vue',
];

/**
 * Whether a file belongs to a c15t package (`c15t` or `@c15t/*`), read from
 * the nearest `package.json` that names a package.
 */
const createPackageCheck = function createPackageCheck(): (
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
 * updates, the save path and the preference dialog (which c15t warms itself
 * once the page has loaded).
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
 * @internal
 */
export const stopPrefetchingConsentChunks =
	function stopPrefetchingConsentChunks(
		manifest: Record<string, ClientManifestChunk>,
		srcDir: string,
		isConsentFile: (file: string) => boolean = createPackageCheck()
	): void {
		const isConsentSource = (chunk: ClientManifestChunk): boolean =>
			chunk.src !== undefined && isConsentFile(resolve(srcDir, chunk.src));
		const deferred = new Set<string>();
		for (const [key, chunk] of Object.entries(manifest)) {
			if (
				chunk.isDynamicEntry &&
				isConsentSource(chunk) &&
				!FIRST_BANNER_SOURCES.some((source) => chunk.src?.endsWith(source))
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
