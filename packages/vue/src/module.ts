import { existsSync, realpathSync } from 'node:fs';

import {
	hasBuildManifestSource,
	loadManifestForBuild,
	readBuildEnv,
	resolveManifestBuildErrorMode,
} from '@c15t/core/build';
import { isIABConfigured } from '@c15t/core/runtime';
import { defaultConsentConfig } from '@c15t/schema/config';
import type { ConsentManifest } from '@c15t/schema/types';
import {
	addComponent,
	addImports,
	addPlugin,
	addServerHandler,
	addServerPlugin,
	addTemplate,
	addVitePlugin,
	addTypeTemplate,
	createResolver,
	defineNuxtModule,
	useLogger,
} from '@nuxt/kit';
import type { Nuxt, NuxtModule } from '@nuxt/schema';
import { defu } from 'defu';
import { joinURL } from 'ufo';

import type { C15tNuxtConfig, ModuleOptions } from './nuxt-options';
import {
	createPackageCheck,
	preloadConsentBanner,
	stopPrefetchingConsentChunks,
} from './prefetch';
import {
	DEVTOOLS_ICON_ROUTE,
	DEVTOOLS_PAGE_ROUTE,
} from './runtime/devtools/constants';
import {
	resolveManifestMode,
	resolveNuxtInitRoute,
	resolveNuxtManifestRoute,
} from './runtime/manifest';
import {
	collectStyleSources,
	preloadInlinedConsentStyles,
} from './stylesheets';
import type { StyleSourceIndex } from './stylesheets';

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

/** Source of a module whose default export is the manifest snapshot. */
const renderSnapshotModule = (snapshot: ConsentManifest | undefined): string =>
	`export default ${snapshot ? JSON.stringify(snapshot) : 'undefined'};`;

/** Variable the module reads the backend URL from when none is set. */
const BACKEND_URL_ENV = 'NUXT_PUBLIC_C15T_BACKEND_URL';

/**
 * The variable the app reads at runtime also gives the build its backend
 * when the config sets none. Read like every other framework integration:
 * the environment first (Nuxt loads `.env` into it before the config), then
 * the `.env` files in the root.
 */
const fillBackendURLFromEnv = (options: ModuleOptions, nuxt: Nuxt): void => {
	const fromEnv = readBuildEnv([BACKEND_URL_ENV], {
		mode: nuxt.options.dev ? 'development' : 'production',
		root: nuxt.options.rootDir,
	});
	if (options.backendURL === undefined && !options.manifestURL && fromEnv) {
		options.backendURL = fromEnv;
	}
};

/**
 * Whether `buildManifest` left unset fetches a snapshot. It needs a Nuxt
 * server that renders pages and an absolute upstream URL, and stays out of
 * the way of an explicit `manifest: false` or `'client'` and of a
 * `manifestSnapshot` the app supplies. An explicit `onBuildError: 'fail'`
 * with a relative URL still fetches, so the build reports the URL.
 */
const buildsManifestByDefault = (
	options: ModuleOptions,
	nuxt: Nuxt,
	hasSnapshot: boolean,
	strict: boolean
): boolean => {
	const { manifest } = options;
	if (manifest === false || manifest === 'client' || hasSnapshot) {
		return false;
	}
	// `nuxt generate` deploys static files with no server routes to serve
	// the snapshot, and an `ssr: false` app renders nothing on the server.
	const { _generate: generate } = nuxt.options as { _generate?: boolean };
	if (generate || nuxt.options.nitro.static || nuxt.options.ssr === false) {
		return false;
	}
	return strict || hasBuildManifestSource(options);
};

const loadNuxtBuildManifest = (
	buildManifest: boolean | undefined,
	onBuildError: ModuleOptions['onBuildError'],
	options: ModuleOptions,
	nuxt: Nuxt,
	hasSnapshot: boolean
) => {
	if (buildManifest === false) {
		return undefined;
	}
	if (buildManifest === true && options.manifest === 'client') {
		throw new Error('@c15t/vue: buildManifest requires server manifest mode.');
	}
	const command = nuxt.options.dev ? 'dev' : 'build';
	// `buildManifest: true` is the older spelling of `onBuildError: 'fail'`.
	const configured = buildManifest === true ? 'fail' : onBuildError;
	const { explicit, mode } = resolveManifestBuildErrorMode(
		configured,
		command,
		'@c15t/vue'
	);
	if (
		buildManifest === undefined &&
		!buildsManifestByDefault(
			options,
			nuxt,
			hasSnapshot,
			explicit && mode === 'fail'
		)
	) {
		return undefined;
	}
	options.manifest = 'server';
	// `nuxt prepare` writes types during dependency installation. The
	// build loads its own snapshot, so preparation needs no backend request.
	if (nuxt.options._prepare) {
		return undefined;
	}
	const logger = useLogger('@c15t/vue');
	return loadManifestForBuild(options, {
		command,
		envNames: [BACKEND_URL_ENV],
		label: '@c15t/vue',
		logger: {
			info: (message) => logger.info(message),
			warn: (message) => logger.warn(message),
		},
		onBuildError: configured,
	});
};

// Annotated explicitly: the inferred type names `NuxtModule` through
// @nuxt/schema's store path, which is not portable across installs (TS2883).
const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
	defaults: () => ({
		...defaultConsentConfig,
		devtools: true,
		initPrefetch: true,
		initRoute: resolveNuxtInitRoute({}),
		manifestRoute: resolveNuxtManifestRoute({}),
	}),
	meta: {
		configKey: 'c15t',
		name: '@c15t/vue',
	},
	async setup(
		{ buildManifest, devtools, initPrefetch, onBuildError, ...options },
		nuxt
	) {
		fillBackendURLFromEnv(options, nuxt);
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
		// A `manifestSnapshot` under the `c15t` key stays out of runtime config,
		// like the build snapshot below.
		const configuredSnapshot = options.manifestSnapshot;
		delete options.manifestSnapshot;
		const manifestSnapshot =
			(await loadNuxtBuildManifest(
				buildManifest,
				onBuildError,
				options,
				nuxt,
				configuredSnapshot !== undefined
			)) ?? configuredSnapshot;
		// Left unset so the build manifest could tell it from an explicit
		// `false`. Without one, a `manifestURL` alone still calls `/init`.
		options.manifest ??= false;
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
				// Empty, so the server routes use the public value, which
				// `NUXT_PUBLIC_C15T_BACKEND_URL` replaces at runtime. The keys
				// exist so `NUXT_C15T_BACKEND_URL` and `NUXT_C15T_MANIFEST_URL`
				// can give the server routes an address of their own.
				backendURL: '',
				manifestURL: '',
				// The `/init` script reads it: with `ssr: false` for the whole
				// app, every page is a shell.
				ssr: nuxt.options.ssr !== false,
			}
		);

		// The server routes import the build snapshot from this virtual. In
		// runtime config, Nitro would replace every `null` in it with `''`
		// during the build, and the routes would reject each policy pack.
		nuxt.options.nitro.virtual ||= {};
		nuxt.options.nitro.virtual['#c15t/manifest-snapshot'] = () =>
			renderSnapshotModule(manifestSnapshot);
		// The app bundles a `c15t` key snapshot in every mode, because app
		// config can switch to client manifest mode after this setup. The
		// build snapshot stays on the server: `buildManifest` needs server mode.
		nuxt.options.alias['#c15t/client-manifest-snapshot'] = addTemplate({
			filename: 'c15t-client-manifest-snapshot.mjs',
			getContents: () => renderSnapshotModule(configuredSnapshot),
		}).dst;

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
			// Nitro's typed routes import the server handlers, and with them
			// the snapshot virtual. The plugin imports the client snapshot.
			addTypeTemplate(
				{
					filename: 'types/c15t-manifest-snapshot.d.ts',
					getContents: () =>
						['#c15t/manifest-snapshot', '#c15t/client-manifest-snapshot']
							.flatMap((id) => [
								`declare module '${id}' {`,
								`\timport type { C15tNuxtConfig } from ${JSON.stringify(specifier)};`,
								'',
								"\tconst manifest: C15tNuxtConfig['manifestSnapshot'];",
								'\texport default manifest;',
								'}',
								'',
							])
							.join('\n'),
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

		// Which stylesheets each CSS file of the client build holds; the
		// manifest below only names the files.
		const styleSources: StyleSourceIndex = new Map();
		addVitePlugin(() => collectStyleSources(styleSources), {
			dev: false,
			server: false,
		});

		// c15t loads what a page needs when it needs it; Nuxt would prefetch
		// every lazy c15t chunk on every page, and each finished download
		// queues main-thread work in front of the banner. Nuxt would also
		// link c15t stylesheets it already inlines into the HTML, and each
		// link holds back the first paint: they become preloads.
		// IAB chunks keep their hints only when the module options turn IAB
		// on. `app.config.ts` can turn it on too, but the build cannot read
		// it; the CMP then loads on demand, without a hint.
		const iab = isIABConfigured(options.iab);
		nuxt.hook('build:manifest', (manifest) => {
			const isConsentFile = createPackageCheck();
			stopPrefetchingConsentChunks(
				manifest,
				nuxt.options.srcDir,
				isConsentFile,
				{
					clientManifest: manifestMode === 'client',
					iab,
				}
			);
			preloadInlinedConsentStyles(
				manifest,
				styleSources,
				nuxt.options.features.inlineStyles,
				isConsentFile
			);
			preloadConsentBanner(manifest, nuxt.options.srcDir, isConsentFile);
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
		// internals/fixtures/nuxt regression: useHasConsent undefined at runtime).
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
