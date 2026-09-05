/**
 * Build-time `.astro` prerendering for Storybook.
 *
 * There is no official Astro renderer for Storybook. The community
 * `storybook-astro` package renders through the Vite dev server's HMR
 * channel, so a static `storybook build` — which is what CI serves to the
 * parity runner — has no renderer at all, and it offers no way to populate
 * `Astro.locals`, which every c15t `.astro` component needs. So this
 * plugin does the rendering itself.
 *
 * It boots one Vite server in middleware mode with Astro's own plugins (via
 * `getViteConfig`), which is what makes `.astro` files loadable, then
 * renders every variant in the catalogue through
 * `experimental_AstroContainer` exactly the way `packages/astro`'s unit
 * tests do — same `resolveOptions`, same `resolveConsentContext`. The
 * results are exposed as one virtual module the stories import.
 *
 * The fragments are static server output, so `<script>` tags are stripped:
 * Astro's build pipeline is what would normally bundle them, and the story
 * boots `@c15t/astro/client` itself instead. The inline config script the
 * banner emits is captured separately and replayed as
 * `window.__c15tAstroConfig`, which is what a real page does.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin, ViteDevServer } from 'vite';

import type { AstroStoryVariant } from '../src/story-variants.ts';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, '../../..');
const astroPackage = path.resolve(repoRoot, 'packages/astro');
const astroSrc = path.resolve(astroPackage, 'src');

export const VIRTUAL_ID = 'virtual:c15t-astro-prerendered';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/** One prerendered variant, as the browser receives it. */
export interface PrerenderedVariant {
	/** Server-rendered markup, with every `<script>` removed. */
	html: string;
	/** The kernel config the server inlined, replayed on the client. */
	config: unknown;
	/** The resolved integration options the story boots with. */
	options: unknown;
}

const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script>/giu;
const CONFIG_SCRIPT =
	/window\.__c15tAstroConfig\s*=\s*(?<config>[\s\S]*?);?\s*$/u;

/**
 * Pull the kernel config out of the inline script the banner emits.
 *
 * @param html - The container's raw output.
 * @returns The parsed config, or `{}` when the fragment emitted none.
 */
const extractConfig = function extractConfig(html: string): unknown {
	for (const tag of html.match(SCRIPT_TAG) ?? []) {
		const body = tag
			.replace(/^<script\b[^>]*>/iu, '')
			.replace(/<\/script>$/iu, '');
		const config = CONFIG_SCRIPT.exec(body.trim())?.groups?.config;
		if (config) {
			return JSON.parse(config);
		}
	}
	return {};
};

const COMPONENT_FILES: Record<string, string> = {
	'consent-banner': 'components/consent-banner.astro',
	'consent-dialog': 'components/consent-dialog.astro',
	'consent-dialog-trigger': 'components/consent-dialog-trigger.astro',
	'iab-consent-dialog': 'components/iab-consent-dialog.astro',
};

/**
 * Astro strips `data-astro-source-*` in production but not in dev. The
 * fragments have to be byte-stable for the parity DOM diff, so they are
 * removed unconditionally.
 */
const stripDevAttributes = function stripDevAttributes(html: string): string {
	return html.replace(/\s+data-astro-source-(?:file|loc)="[^"]*"/gu, '');
};

const renderVariants = async function renderVariants(
	variants: readonly AstroStoryVariant[]
): Promise<Record<string, PrerenderedVariant>> {
	// Imported lazily: pulling Astro's config entrypoint in at module scope
	// would load it for every Storybook process, including the browser build
	// that never renders anything.
	const [{ createServer }, { getViteConfig }, { experimental_AstroContainer }] =
		await Promise.all([
			import('vite'),
			import('astro/config'),
			import('astro/container'),
		]);

	// Rooted at `packages/astro`, not the repo root: Vite externalises
	// Astro's own runtime (`astro/compiler-runtime`) and resolves it from
	// the server root, and `astro` is a dependency of that package alone.
	const configFn = getViteConfig({}, { root: astroPackage });
	// `serve` rather than `build`: under `build` Vite externalises Astro's
	// runtime and then resolves it from the server root instead of the
	// importing `.astro` file, which fails in a workspace where `astro` is a
	// dependency of `packages/astro` alone.
	const viteConfig = await configFn({ command: 'serve', mode: 'development' });
	// `getViteConfig` is shaped for Vitest; the test block means nothing to a
	// plain dev server and Vite rejects unknown top-level keys.
	delete (viteConfig as { test?: unknown }).test;

	let server: ViteDevServer | undefined;
	try {
		server = await createServer({
			...viteConfig,
			appType: 'custom',
			logLevel: 'error',
			server: { hmr: false, middlewareMode: true },
		});

		const [serverModule, integration, mode] = await Promise.all([
			server.ssrLoadModule(path.join(astroSrc, 'server.ts')),
			server.ssrLoadModule(path.join(astroSrc, 'integration.ts')),
			server.ssrLoadModule(path.join(astroSrc, 'mode.ts')),
		]);
		const container = await experimental_AstroContainer.create();

		const out: Record<string, PrerenderedVariant> = {};
		for (const variant of variants) {
			const file = COMPONENT_FILES[variant.component];
			if (!file) {
				throw new Error(`Unknown Astro component: ${variant.component}`);
			}
			// oxlint-disable-next-line no-await-in-loop -- One shared container; renders must not interleave.
			const component = await server.ssrLoadModule(path.join(astroSrc, file));
			const astroOptions: Record<string, unknown> = {
				colorScheme: variant.options?.colorScheme ?? 'light',
				consentCategories: variant.options?.consentCategories,
				mode: mode.offlineMode(),
				ui: 'svelte',
			};
			if (variant.options?.iab) {
				astroOptions.iab = {};
			}
			const resolved = integration.resolveOptions(astroOptions);
			// oxlint-disable-next-line no-await-in-loop -- See above.
			const locals = await serverModule.resolveConsentContext({
				headers: new Headers(),
				options: resolved,
			});
			// oxlint-disable-next-line no-await-in-loop -- See above.
			const raw = await container.renderToString(component.default, {
				locals: { c15t: locals },
				props: variant.props ?? {},
				slots: variant.slots,
			});
			out[variant.id] = {
				config: extractConfig(raw),
				html: stripDevAttributes(raw.replace(SCRIPT_TAG, '')).trim(),
				options: resolved,
			};
		}
		return out;
	} finally {
		await server?.close();
	}
};

/**
 * Prerender every catalogued `.astro` variant and serve the result as
 * {@link VIRTUAL_ID}.
 *
 * @param variants - The story catalogue.
 * @returns A Vite plugin.
 */
export const astroPrerender = function astroPrerender(
	variants: readonly AstroStoryVariant[]
): Plugin {
	let pending: Promise<Record<string, PrerenderedVariant>> | undefined;

	return {
		enforce: 'pre',
		async load(id: string) {
			if (id !== RESOLVED_VIRTUAL_ID) {
				return;
			}
			pending ??= renderVariants(variants);
			const rendered = await pending;
			return `export default ${JSON.stringify(rendered)};`;
		},
		name: 'c15t:astro-prerender',
		resolveId(id: string) {
			return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
		},
	};
};
