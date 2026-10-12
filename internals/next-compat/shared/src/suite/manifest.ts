import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type RenderingMode =
	| { kind: 'static' }
	| { kind: 'isr'; revalidate: number }
	| { kind: 'dynamic' }
	| { kind: 'partial' };

interface PrerenderManifest {
	routes: Record<
		string,
		{ initialRevalidateSeconds?: number | false; renderingMode?: string }
	>;
	dynamicRoutes: Record<string, unknown>;
}

interface PrerenderMeta {
	postponed?: string;
}

const isPrerenderedPage = function isPrerenderedPage(
	appDir: string,
	route: string
): boolean {
	const manifestPath = join(appDir, '.next', 'server', 'pages-manifest.json');
	if (!existsSync(manifestPath)) {
		return false;
	}
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
		string,
		string
	>;
	return manifest[route]?.endsWith('.html') ?? false;
};

/**
 * `output: 'export'` writes each prerendered route to `out/<route>.html`
 * (or `out/<route>/index.html` with `trailingSlash`). A route missing from
 * `out/` was not exported, which for a static export is the dynamic signal.
 */
const isExportedPage = function isExportedPage(
	appDir: string,
	route: string
): boolean {
	const name = route === '/' ? 'index' : route.replace(/^\//u, '');
	return (
		existsSync(join(appDir, 'out', `${name}.html`)) ||
		existsSync(join(appDir, 'out', name, 'index.html'))
	);
};

const hasPostponedState = function hasPostponedState(
	appDir: string,
	route: string
): boolean {
	const name = route === '/' ? 'index' : route.replace(/^\//u, '');
	const metaPath = join(appDir, '.next', 'server', 'app', `${name}.meta`);
	if (!existsSync(metaPath)) {
		return false;
	}
	const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as PrerenderMeta;
	return typeof meta.postponed === 'string';
};

/**
 * Reads how `next build` decided to render a route.
 *
 * @remarks
 * Static and ISR routes appear in `prerender-manifest.json`. Fully dynamic
 * routes (anything that read request headers) are absent, so absence is the
 * dynamic signal. This holds for App Router on Next 15 and 16, and for Pages
 * Router pages with `getStaticProps`.
 *
 * Pages Router pages with no data fetching are prerendered too, but only
 * show up in `.next/server/pages-manifest.json`, as `.html` entries (a
 * `getServerSideProps` page maps to `.js`). That manifest is the fallback.
 *
 * With `cacheComponents` (Next 16) every App Router route is listed with
 * `renderingMode: 'PARTIALLY_STATIC'`, including routes that read request
 * data. Those keep a static shell and resume the dynamic part per request;
 * the build records that in the route's `.meta` file as `postponed`. The
 * reader reports them as `partial` so a route that silently stopped being
 * static still fails the suite.
 *
 * A static export may leave no `prerender-manifest.json` behind; then the
 * exported `out/` tree decides, since every route it holds is static.
 */
export const readRenderingMode = function readRenderingMode(
	appDir: string,
	route: string
): RenderingMode {
	const manifestPath = join(appDir, '.next', 'prerender-manifest.json');
	if (!existsSync(manifestPath)) {
		return isExportedPage(appDir, route)
			? { kind: 'static' }
			: { kind: 'dynamic' };
	}
	const manifest = JSON.parse(
		readFileSync(manifestPath, 'utf8')
	) as PrerenderManifest;
	const entry = manifest.routes[route];
	if (!entry) {
		return isPrerenderedPage(appDir, route)
			? { kind: 'static' }
			: { kind: 'dynamic' };
	}
	if (
		entry.renderingMode === 'PARTIALLY_STATIC' &&
		hasPostponedState(appDir, route)
	) {
		return { kind: 'partial' };
	}
	const revalidate = entry.initialRevalidateSeconds;
	if (typeof revalidate === 'number') {
		return { kind: 'isr', revalidate };
	}
	return { kind: 'static' };
};
