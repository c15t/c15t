/**
 * The `c15t()` Astro integration.
 *
 * It wires four things into an Astro app:
 *
 * 1. A `pre`-order middleware that resolves consent for every request into
 *    `Astro.locals.c15t`.
 * 2. A page-level boot script that creates the one consent runtime the page
 *    shares — Astro islands never share a component tree, so the runtime is
 *    a page singleton rather than a provider.
 * 3. Optional `/api/c15t/init` and `/api/c15t/manifest` routes for
 *    `manifest` mode, with the same semantics as `@c15t/nextjs/api`.
 * 4. A virtual module (`virtual:c15t/options`) carrying the serialized
 *    options to all of the above.
 */

import type { AstroIntegration } from 'astro';

import type {
	C15tAstroOptions,
	C15tEndpointOptions,
	C15tMiddlewareOptions,
	C15tResolvedOptions,
	C15tUIAdapterName,
} from './types';

const VIRTUAL_ID = 'virtual:c15t/options';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

const DEFAULT_INIT_PATH = '/api/c15t/init';
const DEFAULT_MANIFEST_PATH = '/api/c15t/manifest';

/**
 * What each `ui` adapter needs from the app, keyed by adapter name.
 *
 * `astroIntegration` is checked at `astro:config:done`; `packages` is only
 * ever printed, so the error names everything to install in one go rather
 * than one failed build per missing package.
 */
const UI_ADAPTERS: Record<
	C15tUIAdapterName,
	{
		astroIntegration: string;
		packages: string[];
		adapterModule: string;
		adapterExport: string;
		surfaceModule: string;
	}
> = {
	react: {
		adapterExport: 'reactDialogAdapter',
		adapterModule: '@c15t/astro/ui/react',
		astroIntegration: '@astrojs/react',
		packages: ['@astrojs/react', '@c15t/react', 'react', 'react-dom'],
		surfaceModule: '@c15t/astro/islands/consent-dialog-surface.tsx',
	},
	svelte: {
		adapterExport: 'svelteDialogAdapter',
		adapterModule: '@c15t/astro/ui/svelte',
		astroIntegration: '@astrojs/svelte',
		packages: ['@astrojs/svelte', 'svelte'],
		surfaceModule: '@c15t/astro/islands/consent-dialog-surface.svelte',
	},
	vue: {
		adapterExport: 'vueDialogAdapter',
		adapterModule: '@c15t/astro/ui/vue',
		astroIntegration: '@astrojs/vue',
		packages: ['@astrojs/vue', '@c15t/vue', 'vue'],
		surfaceModule: '@c15t/astro/islands/consent-dialog-surface.vue',
	},
};

/**
 * Adapters worth suggesting when `ui` was left at the default.
 *
 * Never applied automatically. Switching a site's dialog framework changes
 * what every visitor downloads, and doing that because a package happened
 * to be installed would be a worse surprise than a one-line log.
 */
const SUGGESTIBLE_ADAPTERS: C15tUIAdapterName[] = ['react', 'vue'];

const resolveMiddleware = function resolveMiddleware(
	options: C15tAstroOptions
): C15tResolvedOptions['middleware'] {
	const raw: C15tMiddlewareOptions =
		typeof options.middleware === 'boolean'
			? { enabled: options.middleware }
			: (options.middleware ?? {});
	return { enabled: raw.enabled ?? true, skip: raw.skip ?? [] };
};

const resolveEndpoints = function resolveEndpoints(
	options: C15tAstroOptions
): C15tResolvedOptions['endpoints'] {
	const raw: C15tEndpointOptions =
		typeof options.endpoints === 'boolean'
			? { enabled: options.endpoints }
			: (options.endpoints ?? {});
	return {
		enabled: raw.enabled ?? options.mode.type === 'manifest',
		initPath: raw.initPath ?? DEFAULT_INIT_PATH,
		manifestPath: raw.manifestPath ?? DEFAULT_MANIFEST_PATH,
	};
};

const backendURLFromEnv = function backendURLFromEnv(): string | undefined {
	if (typeof process === 'undefined') {
		return undefined;
	}
	const env = process.env as Record<string, string | undefined> | undefined;
	return env?.C15T_BACKEND_URL ?? env?.PUBLIC_C15T_BACKEND_URL;
};

/**
 * Normalize user options into the serializable shape every consumer reads.
 *
 * @param options - The options passed to `c15t()`.
 * @returns Options with defaults applied.
 * @throws {Error} When `mode` is missing, is not a mode descriptor, or is a
 * manifest mode with nowhere to save consent.
 */
export const resolveOptions = function resolveOptions(
	options: C15tAstroOptions
): C15tResolvedOptions {
	if (!options?.mode || typeof options.mode !== 'object') {
		throw new Error(
			'@c15t/astro: `mode` is required. Use hosted({ url }), offline() or manifest().'
		);
	}
	// The injected routes cover `init` and `manifest`; consent is saved with
	// `POST /subjects` at the backend itself. A `manifestURL` says where the
	// manifest lives but not where consent goes, so without a `backendURL`
	// the browser would post it at the init route's own prefix, where
	// nothing answers. An inline `manifest` is the deliberately network-free
	// path and is left alone: an app on it supplies its own save route.
	if (
		options.mode.type === 'manifest' &&
		options.mode.manifestURL &&
		!options.mode.backendURL &&
		!backendURLFromEnv()
	) {
		throw new Error(
			'@c15t/astro: manifest mode with a `manifestURL` also needs a `backendURL` (or C15T_BACKEND_URL) — that is where consent is saved, and the injected routes only serve init and manifest.'
		);
	}
	const {
		endpoints: _endpoints,
		middleware: _middleware,
		requireUIIntegration: _requireUIIntegration,
		...rest
	} = options;
	return {
		...rest,
		colorScheme: options.colorScheme ?? 'system',
		endpoints: resolveEndpoints(options),
		middleware: resolveMiddleware(options),
		ui: options.ui ?? 'svelte',
	};
};

/** Minimal Vite plugin shape, so the package does not depend on Vite types. */
interface VirtualOptionsPlugin {
	name: string;
	resolveId: (id: string) => string | undefined;
	load: (id: string) => string | undefined;
}

const createVirtualOptionsPlugin = function createVirtualOptionsPlugin(
	resolved: C15tResolvedOptions
): VirtualOptionsPlugin {
	const serialized = JSON.stringify(resolved);
	return {
		load(id: string) {
			if (id !== RESOLVED_VIRTUAL_ID) {
				return undefined;
			}
			return `export default ${serialized};`;
		},
		name: 'c15t:options',
		resolveId(id: string) {
			return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
		},
	};
};

/**
 * Build the page script the integration injects.
 *
 * The adapter and island specifiers are written here, not in `adapter.ts`
 * or the `.astro` components, because this is the one place that knows
 * `ui` before the app's bundler runs. A static reference to all three
 * would make a Svelte-only site's build resolve `@c15t/react` and `vue`.
 * Both specifiers stay behind `import()`, so nothing loads until someone
 * opens a dialog.
 *
 * @param options - The options passed to `c15t()`.
 * @param ui - The resolved dialog adapter.
 * @returns The module source to inject at the `page` stage.
 */
const buildBootScript = function buildBootScript(
	options: C15tAstroOptions,
	ui: C15tUIAdapterName
): string {
	const adapter = UI_ADAPTERS[ui];
	const lines = [
		`import options from '${VIRTUAL_ID}';`,
		"import { boot, registerDialogAdapter, registerDialogSurface } from '@c15t/astro/client';",
		`registerDialogAdapter('${ui}', async () => (await import('${adapter.adapterModule}')).${adapter.adapterExport});`,
		`registerDialogSurface('${ui}', () => import('${adapter.surfaceModule}'));`,
	];
	if (options.clientEntrypoint) {
		lines.push(
			`import clientOptions from '${options.clientEntrypoint}';`,
			'boot(options, clientOptions);'
		);
	} else {
		lines.push('boot(options);');
	}
	return lines.join('\n');
};

/**
 * The Vite plugins the app needs for the configured `ui`.
 *
 * `@c15t/vue`'s shared composables import `#imports`, which only Nuxt
 * defines; the package ships a Vite plugin that shims it for plain Vue
 * apps, and an Astro app is one. The import is dynamic so a site on any
 * other adapter never has to have `@c15t/vue` installed.
 *
 * @param resolved - The resolved integration options.
 * @returns Vite plugins to merge into the app config.
 */
const buildVitePlugins = async function buildVitePlugins(
	resolved: C15tResolvedOptions
): Promise<VirtualOptionsPlugin[]> {
	const plugins: VirtualOptionsPlugin[] = [
		createVirtualOptionsPlugin(resolved),
	];
	if (resolved.ui === 'vue') {
		try {
			const { default: shimVueImports } = await import('@c15t/vue/vite');
			plugins.push(shimVueImports() as unknown as VirtualOptionsPlugin);
		} catch (cause) {
			// This runs at `astro:config:setup`, before `astro:config:done`
			// where the peer check lives, so an unresolved import would
			// otherwise surface as a module error naming a path the site
			// owner never wrote.
			throw new Error(
				`@c15t/astro: \`ui: 'vue'\` needs ${UI_ADAPTERS.vue.packages.join(', ')} installed. Install them, or pick another \`ui\`.`,
				{ cause }
			);
		}
	}
	return plugins;
};

/** The narrow slice of Astro's logger this integration uses. */
interface IntegrationLogger {
	warn: (message: string) => void;
	error: (message: string) => void;
}

/**
 * Point out a cheaper `ui` when the site already ships that framework.
 *
 * Only ever a log. Reading `ui` off whichever integration happens to be
 * installed would change what every visitor downloads without anyone
 * asking for it, and a site can install `@astrojs/react` for one unrelated
 * widget while still wanting the smaller Svelte dialog.
 *
 * @param options - The options passed to `c15t()`.
 * @param installed - Names of the integrations Astro resolved.
 * @param logger - The integration logger.
 */
const suggestUIAdapter = function suggestUIAdapter(
	options: C15tAstroOptions,
	installed: Set<string>,
	logger: IntegrationLogger
): void {
	if (options.ui !== undefined) {
		return;
	}
	const match = SUGGESTIBLE_ADAPTERS.find((name) =>
		installed.has(UI_ADAPTERS[name].astroIntegration)
	);
	if (!match) {
		return;
	}
	logger.warn(
		`this site already loads ${UI_ADAPTERS[match].astroIntegration}; \`ui: '${match}'\` would render the consent dialog with it instead of adding the Svelte runtime. Set \`ui: 'svelte'\` to silence this.`
	);
};

/**
 * Create the c15t Astro integration.
 *
 * @param options - Consent configuration for the site.
 * @returns The Astro integration to list in `astro.config.mjs`.
 * @throws {Error} When `mode` is missing, or when the Astro integration for
 * the configured `ui` is not listed in `astro.config`.
 * @example
 * ```js
 * import { defineConfig } from 'astro/config';
 * import svelte from '@astrojs/svelte';
 * import c15t, { hosted } from '@c15t/astro';
 *
 * export default defineConfig({
 *   output: 'server',
 *   integrations: [
 *     svelte(),
 *     c15t({
 *       mode: hosted({ url: 'https://consent.example.com' }),
 *       consentCategories: ['necessary', 'measurement', 'marketing'],
 *     }),
 *   ],
 * });
 * ```
 */
export const c15t = function c15t(options: C15tAstroOptions): AstroIntegration {
	const resolved = resolveOptions(options);

	return {
		hooks: {
			'astro:config:done'({ config, logger }) {
				const installed = new Set(
					config.integrations.map((integration) => integration.name)
				);
				suggestUIAdapter(options, installed, logger);

				if (options.requireUIIntegration === false) {
					return;
				}
				const adapter = UI_ADAPTERS[resolved.ui];
				if (installed.has(adapter.astroIntegration)) {
					return;
				}
				logger.error(
					`the preference-centre and IAB dialogs render as ${resolved.ui} islands, so ${adapter.astroIntegration} must be installed and listed in astro.config before c15t(). Install ${adapter.packages.join(', ')} and run \`npx astro add ${resolved.ui}\`, or pass \`requireUIIntegration: false\` if you only use the server-rendered banner.`
				);
				throw new Error(
					`@c15t/astro: ui: ${JSON.stringify(resolved.ui)} needs ${adapter.astroIntegration}. Install it, or set \`requireUIIntegration: false\` for a banner-only site.`
				);
			},

			async 'astro:config:setup'({
				addMiddleware,
				injectRoute,
				injectScript,
				updateConfig,
			}) {
				updateConfig({
					vite: { plugins: await buildVitePlugins(resolved) },
				});

				if (resolved.middleware.enabled) {
					addMiddleware({
						entrypoint: '@c15t/astro/middleware',
						order: 'pre',
					});
				}

				// `page` runs the boot on every page, before any island
				// hydrates, so the runtime exists before anything asks for it.
				injectScript('page', buildBootScript(options, resolved.ui));

				if (resolved.endpoints.enabled) {
					injectRoute({
						entrypoint: '@c15t/astro/api/init',
						pattern: resolved.endpoints.initPath,
						prerender: false,
					});
					injectRoute({
						entrypoint: '@c15t/astro/api/manifest',
						pattern: resolved.endpoints.manifestPath,
						prerender: false,
					});
				}
			},
		},
		name: '@c15t/astro',
	};
};

export default c15t;
