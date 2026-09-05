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
	C15tResolvedOptions,
} from './types';

const VIRTUAL_ID = 'virtual:c15t/options';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

const DEFAULT_INIT_PATH = '/api/c15t/init';
const DEFAULT_MANIFEST_PATH = '/api/c15t/manifest';

const SVELTE_INTEGRATION = '@astrojs/svelte';

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

/**
 * Normalize user options into the serializable shape every consumer reads.
 *
 * @param options - The options passed to `c15t()`.
 * @returns Options with defaults applied.
 * @throws {Error} When `mode` is missing or is not a mode descriptor.
 */
export const resolveOptions = function resolveOptions(
	options: C15tAstroOptions
): C15tResolvedOptions {
	if (!options?.mode || typeof options.mode !== 'object') {
		throw new Error(
			'@c15t/astro: `mode` is required. Use hosted({ url }), offline() or manifest().'
		);
	}
	const {
		endpoints: _endpoints,
		middleware: _middleware,
		requireSvelte: _requireSvelte,
		...rest
	} = options;
	return {
		...rest,
		endpoints: resolveEndpoints(options),
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

const buildBootScript = function buildBootScript(
	options: C15tAstroOptions
): string {
	const lines = [
		`import options from '${VIRTUAL_ID}';`,
		"import { boot } from '@c15t/astro/client';",
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
 * Create the c15t Astro integration.
 *
 * @param options - Consent configuration for the site.
 * @returns The Astro integration to list in `astro.config.mjs`.
 * @throws {Error} When `mode` is missing, or when a Svelte dialog surface
 * is configured without `@astrojs/svelte` installed.
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
				if (options.requireSvelte === false || resolved.ui !== 'svelte') {
					return;
				}
				const hasSvelte = config.integrations.some(
					(integration) => integration.name === SVELTE_INTEGRATION
				);
				if (hasSvelte) {
					return;
				}
				logger.error(
					`the preference-centre and IAB dialogs are Svelte islands, so ${SVELTE_INTEGRATION} must be installed and listed in astro.config before c15t(). Run \`npx astro add svelte\`, or pass \`requireSvelte: false\` if you only use the server-rendered banner.`
				);
				throw new Error(
					`@c15t/astro: missing ${SVELTE_INTEGRATION}. Install it, or set \`requireSvelte: false\` for a banner-only site.`
				);
			},

			'astro:config:setup'({
				addMiddleware,
				injectRoute,
				injectScript,
				updateConfig,
			}) {
				updateConfig({
					vite: { plugins: [createVirtualOptionsPlugin(resolved)] },
				});

				if (options.middleware !== false) {
					addMiddleware({
						entrypoint: '@c15t/astro/middleware',
						order: 'pre',
					});
				}

				// `page` runs the boot on every page, before any island
				// hydrates, so the runtime exists before anything asks for it.
				injectScript('page', buildBootScript(options));

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
