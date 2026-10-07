import { existsSync, realpathSync } from 'node:fs';

import { loadBuildManifest } from '@c15t/core/build';
import { defaultConsentConfig } from '@c15t/schema/config';
import {
	addComponent,
	addImports,
	addPlugin,
	addServerHandler,
	addServerPlugin,
	addTypeTemplate,
	createResolver,
	defineNuxtModule,
} from '@nuxt/kit';
import type { Nuxt, NuxtModule } from '@nuxt/schema';
import { defu } from 'defu';
import { joinURL } from 'ufo';

import type { C15tNuxtConfig, ModuleOptions } from './nuxt-options';
import { stopPrefetchingConsentChunks } from './prefetch';
import {
	DEVTOOLS_ICON_ROUTE,
	DEVTOOLS_PAGE_ROUTE,
} from './runtime/devtools/constants';
import {
	resolveManifestMode,
	resolveNuxtInitRoute,
	resolveNuxtManifestRoute,
} from './runtime/manifest';

export { defineTheme, type Theme } from '@c15t/ui/theme';

export type {
	C15tNuxtAppConfig,
	C15tNuxtConfig,
	ConsentModuleOptions,
	ModuleOptions,
} from './nuxt-options';

/**
 * The part of a Nuxt DevTools custom tab this module sends. Declared here
 * so the module does not depend on `@nuxt/devtools-kit` for one hook.
 */
interface DevToolsCustomTab {
	category?: 'app';
	icon?: string;
	name: string;
	title: string;
	view: { src: string; type: 'iframe' };
}

/** Whether Nuxt installs its DevTools module for this build. */
const isNuxtDevToolsEnabled = (nuxt: Nuxt): boolean => {
	const { devtools } = nuxt.options;
	return typeof devtools === 'boolean' ? devtools : devtools?.enabled !== false;
};

/**
 * Serve the tab page, expose the kernel to it from a client plugin, and
 * register the tab. Nuxt DevTools 4 keeps `devtools:customTabs` as a shim
 * over its dock system, so the same tab shows in both versions.
 */
const addDevToolsTab = (
	nuxt: Nuxt,
	resolve: (path: string) => string
): void => {
	const handler = resolve('./runtime/server/devtools.get');
	addServerHandler({ handler, method: 'get', route: DEVTOOLS_PAGE_ROUTE });
	addServerHandler({ handler, method: 'get', route: DEVTOOLS_ICON_ROUTE });
	// Appended so it runs after the consent plugin that provides the kernel;
	// addPlugin prepends by default.
	addPlugin(
		{ mode: 'client', src: resolve('./runtime/devtools/plugin.nuxt') },
		{ append: true }
	);
	const { baseURL } = nuxt.options.app;
	const hook = nuxt.hook as unknown as (
		name: 'devtools:customTabs',
		callback: (tabs: DevToolsCustomTab[]) => void
	) => void;
	hook('devtools:customTabs', (tabs) => {
		tabs.push({
			category: 'app',
			icon: joinURL(baseURL, DEVTOOLS_ICON_ROUTE),
			name: 'c15t',
			title: 'c15t',
			view: { src: joinURL(baseURL, DEVTOOLS_PAGE_ROUTE), type: 'iframe' },
		});
	});
};

const loadNuxtBuildManifest = async (
	enabled: boolean | undefined,
	options: ModuleOptions
) => {
	if (!enabled) {
		return undefined;
	}
	if (options.manifest === 'client') {
		throw new Error('@c15t/vue: buildManifest requires server manifest mode.');
	}
	const snapshot = await loadBuildManifest(options, '@c15t/vue');
	options.manifest = 'server';
	return snapshot;
};

// Annotated explicitly: the inferred type names `NuxtModule` through
// @nuxt/schema's store path, which is not portable across installs (TS2883).
const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
	defaults: () => ({
		...defaultConsentConfig,
		devtools: true,
		initPrefetch: true,
		initRoute: resolveNuxtInitRoute({}),
		manifest: false,
		manifestRoute: resolveNuxtManifestRoute({}),
	}),
	meta: {
		configKey: 'c15t',
		name: '@c15t/vue',
	},
	async setup({ buildManifest, devtools, initPrefetch, ...options }, nuxt) {
		// Nuxt merges module options with `defu`, which skips `null`, so a
		// `colorScheme: null` under the `c15t` key would arrive unset and
		// mirror a `dark` class. Read it back: `null` leaves `c15t-dark` to
		// the site.
		const configured = (nuxt.options as { c15t?: Partial<C15tNuxtConfig> })
			.c15t;
		if (configured?.colorScheme === null) {
			options.colorScheme = null;
		}
		const resolver = createResolver(import.meta.url);
		const manifestSnapshot = await loadNuxtBuildManifest(
			buildManifest,
			options
		);
		const manifestMode = resolveManifestMode(options);
		const initRoute = resolveNuxtInitRoute(options);
		const manifestRoute = resolveNuxtManifestRoute(options);

		// Source builds ship .ts, dist builds ship .js — alias whichever exists
		// (hardcoding .ts broke every consumer of the published package).
		nuxt.options.alias['#c15t/composables'] = ['index.ts', 'index.js']
			.map((file) => resolver.resolve(`./runtime/composables/${file}`))
			.find((path) => existsSync(path)) as string;

		nuxt.options.runtimeConfig.c15t = defu(
			nuxt.options.runtimeConfig.c15t ?? {},
			{
				backendURL: options.backendURL,
				initRoute,
				manifestRoute,
				manifestSnapshot,
				manifestURL: options.manifestURL,
				// The `/init` script reads it: with `ssr: false` for the whole
				// app, every page is a shell.
				ssr: nuxt.options.ssr !== false,
			}
		);

		nuxt.options.runtimeConfig.public.c15t = defu(
			nuxt.options.runtimeConfig.public.c15t ?? {},
			{
				...options,
				initRoute,
				manifest: manifestMode,
				manifestRoute,
			}
		);

		// Transpile/inline the module runtime by directory, not just package
		// name. When the module is registered through an aliasing package
		// (e.g. the `c15t` umbrella re-exporting `@c15t/vue`), the runtime
		// files can resolve through a symlink chain whose real path carries no
		// `node_modules/@c15t/vue` segment, so a name-only pattern misses them
		// and Nitro externalizes server-handler imports with broken relative
		// paths. Registering the resolved runtime directory and its real path
		// keeps every runtime file inlined regardless of how the package was
		// reached (the official module template's `transpile.push(runtimeDir)`
		// pattern, hardened for symlinked installs).
		nuxt.options.build.transpile.push('@c15t/vue');
		const runtimeDir = resolver.resolve('./runtime');
		nuxt.options.build.transpile.push(runtimeDir);
		try {
			const realRuntimeDir = realpathSync(runtimeDir);
			if (realRuntimeDir !== runtimeDir) {
				nuxt.options.build.transpile.push(realRuntimeDir);
			}
		} catch {
			// The runtime directory always exists next to the module entry;
			// realpath can only fail on exotic filesystems — the resolved path
			// is already registered above.
		}

		if (manifestMode === 'server') {
			addServerHandler({
				handler: resolver.resolve('./runtime/server/init.get'),
				method: 'get',
				route: initRoute,
			});
			addServerHandler({
				handler: resolver.resolve('./runtime/server/manifest.get'),
				method: 'get',
				route: manifestRoute,
			});
		} else if (manifestMode === 'client' && !options.manifestURL) {
			addServerHandler({
				handler: resolver.resolve('./runtime/server/manifest.get'),
				method: 'get',
				route: manifestRoute,
			});
		}

		// Type the `c15t` key of `app.config.ts`. A type template reaches the
		// app's types whichever package registered the module, including the
		// `c15t` umbrella. It imports the option types from the declarations
		// next to this file: the source in this repo, `module.d.mts` once built.
		// `CustomAppConfig` types `useAppConfig()`. `AppConfigInput` types
		// `defineAppConfig()`: it extended `CustomAppConfig` until Nuxt 4.6,
		// which made them separate, so augment both.
		const optionTypes = ['nuxt-options.ts', 'module.d.mts']
			.map((file) => resolver.resolve(`./${file}`))
			.find((path) => existsSync(path));
		if (optionTypes) {
			const specifier = optionTypes
				.replace(/\.ts$/u, '')
				.replace(/\.d\.mts$/u, '.mjs');
			addTypeTemplate(
				{
					filename: 'types/c15t-app-config.d.ts',
					getContents: () =>
						[
							`import type { C15tNuxtAppConfig } from ${JSON.stringify(specifier)};`,
							'',
							"declare module '@nuxt/schema' {",
							'\tinterface CustomAppConfig {',
							'\t\t/** c15t options, merged over the `c15t` module options. */',
							'\t\tc15t?: Partial<C15tNuxtAppConfig>;',
							'\t}',
							'\tinterface AppConfigInput {',
							'\t\t/** c15t options, merged over the `c15t` module options. */',
							'\t\tc15t?: Partial<C15tNuxtAppConfig>;',
							'\t}',
							'}',
							'',
							'export {};',
							'',
						].join('\n'),
				},
				{ nitro: true, nuxt: true }
			);
		}

		// Type the `c15t` key of a route rule, in `nuxt.config.ts` (node), in
		// pages (`defineRouteRules`) and in Nitro.
		addTypeTemplate(
			{
				filename: 'types/c15t-route-rules.d.ts',
				getContents: () =>
					[
						"declare module 'nitropack/types' {",
						'\tinterface NitroRouteConfig {',
						'\t\t/** c15t options for the routes this rule matches. */',
						'\t\tc15t?: {',
						'\t\t\t/**',
						'\t\t\t * `false` writes no early `/init` script into the HTML of an',
						'\t\t\t * `ssr: false` route.',
						'\t\t\t */',
						'\t\t\tinitPrefetch?: boolean;',
						'\t\t};',
						'\t}',
						'}',
						'',
						'export {};',
						'',
					].join('\n'),
			},
			{ nitro: true, node: true, nuxt: true }
		);

		addPlugin(resolver.resolve('./runtime/plugin.nuxt'));
		if (initPrefetch !== false) {
			// Starts `/init` from the HTML of `ssr: false` pages, before the
			// app's JavaScript loads.
			addServerPlugin(resolver.resolve('./runtime/server/init-prefetch.nuxt'));
			// The plugin reads `app.config.ts` through this virtual, not
			// `#imports`, which Nuxt 5 stops providing to server code. Nuxt 4
			// builds the merged config as `#internal/nuxt/app-config`; Nuxt 3
			// passes the files to Nitro, whose own `useAppConfig` reads them.
			// Without Nitro auto-imports, `app.config.ts` cannot load on the
			// server (its `defineAppConfig` is an auto-import), so the plugin
			// gets no config and leaves `/init` to the browser.
			nuxt.hook('nitro:config', (nitroConfig) => {
				let source =
					"export { useAppConfig as useServerAppConfig } from 'nitropack/runtime';";
				if (nitroConfig.imports === false) {
					source = 'export const useServerAppConfig = () => undefined;';
				} else if (nitroConfig.virtual?.['#internal/nuxt/app-config']) {
					source = [
						"import appConfig from '#internal/nuxt/app-config';",
						'export const useServerAppConfig = () => appConfig;',
					].join('\n');
				}
				nitroConfig.virtual ||= {};
				nitroConfig.virtual['#c15t/server-app-config'] = source;
			});
		}
		if (manifestMode === 'client') {
			// Resolves the manifest in the browser at startup: bundle the
			// resolver with the entry so it preloads with the page.
			addPlugin({
				mode: 'client',
				src: resolver.resolve('./runtime/plugin-client-manifest.nuxt'),
			});
		}

		// c15t loads what a page needs when it needs it; Nuxt would prefetch
		// every lazy c15t chunk on every page, and each finished download
		// queues main-thread work in front of the banner.
		nuxt.hook('build:manifest', (manifest) => {
			stopPrefetchingConsentChunks(manifest, nuxt.options.srcDir);
		});

		if (nuxt.options.dev && devtools && isNuxtDevToolsEnabled(nuxt)) {
			addDevToolsTab(nuxt, (path) => resolver.resolve(path));
		}

		// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
		addComponent({
			// Global so runtime resolution (<component :is="'ConsentRoot'">)
			// works too — ConsentRoot is the documented mount-anywhere entry.
			global: true,
			name: 'ConsentRoot',
			filePath: resolver.resolve('./runtime/components/nuxt-root.vue'),
		});

		// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
		addComponent({
			// Inline consent widget for settings/privacy pages — same DOM
			// contract as @c15t/react and @c15t/svelte ConsentWidget.
			global: true,
			name: 'ConsentWidget',
			filePath: resolver.resolve('./runtime/components/preferences.vue'),
		});

		for (const [name, file] of [
			['ConsentPreferencesLink', 'preferences-link'],
			['ConsentDialogTrigger', 'panel-trigger'],
			['ConsentGate', 'consent-gate'],
			// Deprecated alias kept so existing <ConsentFrame> templates resolve.
			['ConsentFrame', 'consent-gate'],
		] as const) {
			addComponent({
				filePath: resolver.resolve(`./runtime/components/${file}.vue`),
				global: true,
				name,
			});
		}

		// Auto-import every public composable from the index entry. A single
		// resolvable `from` avoids unimport's per-file registry quirks (three
		// names registered from per-file paths were silently dropped — see
		// examples/nuxt regression: useHasConsent undefined at runtime).
		const composablesEntry = ['index.ts', 'index.js']
			.map((file) => resolver.resolve(`./runtime/composables/${file}`))
			.find((path) => existsSync(path)) as string;
		addImports(
			[
				'useConsentConfig',
				'useConsentInit',
				'useConsent',
				'useConsentSave',
				'useHasConsent',
				'useStoredConsent',
				'useConsentKernel',
				'useConsentSnapshot',
				'useExplicitChoice',
				'useEffectivePermissions',
				'usePromptRequirement',
				'useNoticeDismissal',
				'usePrivacySignals',
				'usePolicyRule',
				'usePolicyResolution',
				'useConsentRestrictions',
				'useDismissNotice',
				'useConsentDraft',
				'useVendorAllowed',
				'useConsentPolicyActions',
				'useExperiment',
				'useResolvedPresentation',
				'useResolvedTheme',

				'useConsentIabSelection',
				'useConsentIabSave',
				'useConsentLanguage',
				'useConsentActiveUI',
				'useConsentComponent',
				'useRequestRegion',
			].map((name) => ({ from: composablesEntry, name }))
		);
		// Note: unimport's generated .nuxt/imports.d.ts omits
		// useHasConsent/useStoredConsent even though the runtime registry
		// (imports:context) contains them and `nuxt typecheck` passes —
		// cosmetic generator quirk, tracked upstream-worthy.
	},
});

export default module;
