/**
 * Serves the script-tag example on http://localhost:4173.
 *
 * `/c15t.js`, `/c15t.headless.js` and `/c15t.devtools.js` come straight
 * from the built `@c15t/browser` package, the way a CDN would serve them.
 * The rest stands in for the third parties a real page loads: two vendor
 * scripts, two embeds and a tracking endpoint, all local so the example
 * works offline and every request is visible in the page's log.
 *
 * `/consent-example` is the page the HTML docs publish. Its tag points at
 * jsDelivr and a `https://your-project.inth.app` placeholder, exactly as a reader
 * copies it. This server swaps the CDN prefix for the local build and the
 * placeholder for `C15T_BACKEND_URL`, so the page runs the code the docs
 * show against this checkout.
 *
 * `/consent-example/tailwind` adds `tailwind-classes.html`, which puts
 * Tailwind utilities on banner parts through `theme.slots`. `/tailwind.css`
 * is `tailwind.css` compiled at startup, standing in for the site's build.
 *
 * Cookies need an http origin, so `file://` is not enough to try a full
 * accept/reload cycle.
 *
 * ```sh
 * bun run --cwd examples/script-tag dev
 * C15T_BACKEND_URL=https://your-project.inth.app bun run --cwd examples/script-tag dev
 * ```
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';

const port = Number(process.env.PORT ?? 4173);
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const cdnPrefix = 'https://cdn.jsdelivr.net/npm/@c15t/browser@alpha/dist/';
const backendPlaceholder = 'https://your-project.inth.app';
const backendURL = process.env.C15T_BACKEND_URL;

const bundles: Record<string, string> = {
	'/c15t.devtools.js': fileURLToPath(
		import.meta.resolve('@c15t/browser/c15t.devtools.js')
	),
	'/c15t.headless.js': fileURLToPath(
		import.meta.resolve('@c15t/browser/c15t.headless.js')
	),
	'/c15t.iab.js': fileURLToPath(
		import.meta.resolve('@c15t/browser/c15t.iab.js')
	),
	'/c15t.js': fileURLToPath(import.meta.resolve('@c15t/browser/c15t.js')),
};

if (process.argv.includes('--check')) {
	// The example has no build of its own; `build` checks the bundles exist.
	const missing = Object.values(bundles).filter((file) => !existsSync(file));
	if (missing.length > 0) {
		console.error(
			`Missing ${missing.join(', ')}. Run bun turbo run build --filter=@c15t/browser.`
		);
		process.exit(1);
	}
	process.exit(0);
}

/** The site's Tailwind build, compiled once from `tailwind.css`. */
const buildTailwind = async function buildTailwind(): Promise<string> {
	const from = here('./tailwind.css');
	const result = await postcss([tailwind({ base: here('.') })]).process(
		readFileSync(from, 'utf8'),
		{ from }
	);
	return result.css;
};

const tailwindCSS = await buildTailwind();

/** The published page, with its CDN tag and backend URL made local. */
const renderConsentExample = function renderConsentExample(
	design: 'default' | 'branded' | 'headless' | 'tailwind'
): Response {
	if (!backendURL) {
		return new Response(
			'Set C15T_BACKEND_URL to your Inth backend URL to open /consent-example.',
			{ status: 500 }
		);
	}
	let html = readFileSync(here('./consent-example.html'), 'utf8');
	if (design === 'branded') {
		html = html.replace(
			'</head>',
			`${readFileSync(here('./branded-theme.html'), 'utf8')}</head>`
		);
	}
	if (design === 'tailwind') {
		html = html.replace(
			'</head>',
			`${readFileSync(here('./tailwind-classes.html'), 'utf8')}</head>`
		);
	}
	if (design === 'headless') {
		// Swap the stock tag for the headless build and the page's own bar.
		html = html
			.replace(/<script\s+src="[^"]*\/c15t\.js"[\s\S]*?<\/script>/u, '')
			.replace(
				'</body>',
				`${readFileSync(here('./headless-bar.html'), 'utf8')}</body>`
			);
	}
	html = html
		.replaceAll(cdnPrefix, '/')
		.replaceAll(backendPlaceholder, backendURL);
	return new Response(html, {
		headers: {
			'cache-control': 'no-store',
			'content-type': 'text/html; charset=utf-8',
		},
	});
};

const pages: Record<string, string> = {
	'/': here('./index.html'),
	'/custom': here('./custom.html'),
	'/embed/map.html': here('./embed/map.html'),
	'/embed/video.html': here('./embed/video.html'),
	'/iab': here('./iab.html'),
	'/iab-gvl.json': here('./iab-gvl.json'),
	'/site.css': here('./site.css'),
	'/styled': here('./styled.html'),
	'/vendor/analytics.js': here('./vendor/analytics.js'),
	'/vendor/chat-widget.js': here('./vendor/chat-widget.js'),
	'/vendor/posthog.js': here('./vendor/posthog.js'),
};

const contentTypes: Record<string, string> = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
};

let events = 0;

Bun.serve({
	fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname === '/api/track') {
			// What a consent-gated analytics endpoint sees once the network
			// blocker lets a request through.
			events += 1;
			return Response.json({ ok: true, received: events });
		}
		if (pathname === '/consent-example') {
			return renderConsentExample('default');
		}
		if (pathname === '/consent-example/branded') {
			return renderConsentExample('branded');
		}
		if (pathname === '/consent-example/headless') {
			return renderConsentExample('headless');
		}
		if (pathname === '/consent-example/tailwind') {
			return renderConsentExample('tailwind');
		}
		if (pathname === '/tailwind.css') {
			return new Response(tailwindCSS, {
				headers: {
					'cache-control': 'no-store',
					'content-type': 'text/css; charset=utf-8',
				},
			});
		}
		const file = bundles[pathname] ?? pages[pathname];
		if (!file) {
			return new Response('Not found', { status: 404 });
		}
		const extension = file.slice(file.lastIndexOf('.'));
		return new Response(Bun.file(file), {
			headers: {
				'cache-control': 'no-store',
				'content-type': contentTypes[extension] ?? 'application/octet-stream',
			},
		});
	},
	port,
});

console.log(`script-tag example: http://localhost:${port}/`);
