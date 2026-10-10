import { existsSync, realpathSync } from 'node:fs';

import { loadManifestForBuild, readBuildEnv } from '@c15t/core/build';
import type { ConsentMode } from '@c15t/core/modes';
import { isIABConfigured } from '@c15t/core/runtime';
import { normalizeRoutePrefix } from '@c15t/core/server';
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

import { readComposableExports } from './composable-exports';
import type { C15tNuxtConfig, ModuleOptions } from './nuxt-options';
import {
	createPackageCheck,
	preloadConsentBanner,
	preloadBrowserResolver,
	stopPrefetchingConsentChunks,
} from './prefetch';
import {
	DEVTOOLS_ICON_ROUTE,
	DEVTOOLS_PAGE_ROUTE,
} from './runtime/devtools/constants';
import {
	DEFAULT_NUXT_ROUTE_PREFIX,
	readNuxtMode,
	readNuxtRoutePrefix,
} from './runtime/nuxt-mode';
import { findOverriddenOptions } from './runtime/server/build-options';
import type { BuiltOptions } from './runtime/server/build-options';
import {
	collectStyleSources,
	preloadInlinedConsentStyles,
} from './stylesheets';
import type { StyleSourceIndex } from './stylesheets';

export {
	hosted,
	manifest,
	offline,
	type ConsentMode,
	type HostedMode,
	type HostedModeOptions,
	type ManifestMode,
	type ManifestModeOptions,
	type OfflineMode,
	type OfflineModeOptions,
} from '@c15t/core/modes';
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
 * The Inth project URL, shared with other Inth SDKs. Read when
 * {@link BACKEND_URL_ENV} is unset.
 */
const INTH_URL_ENV = 'NUXT_PUBLIC_INTH_PROJECT_URL';

/**
 * Where the backend URL came from, so the runtime knows whether
 * `NUXT_PUBLIC_INTH_PROJECT_URL` may replace it on a running server.
 */
type BackendURLSource = 'option' | 'c15t-env' | 'inth-env' | 'none';

/**
 * The variable the app reads at runtime also gives the build its backend
 * when the config sets none. Read like every other framework integration:
 * the environment first (Nuxt loads `.env` into it before the config), then
 * the `.env` files in the root. `NUXT_PUBLIC_C15T_BACKEND_URL` wins over
 * `NUXT_PUBLIC_INTH_PROJECT_URL`.
 */
const fillBackendURLFromEnv = (
	options: ModuleOptions,
	nuxt: Nuxt
): BackendURLSource => {
	if (options.backendURL !== undefined) {
		return 'option';
	}
	const envOptions = {
		mode: nuxt.options.dev ? 'development' : 'production',
		root: nuxt.options.rootDir,
	};
	const fromC15t = readBuildEnv([BACKEND_URL_ENV], envOptions);
	if (fromC15t) {
		options.backendURL = fromC15t;
		return 'c15t-env';
	}
	const fromInth = readBuildEnv([INTH_URL_ENV], envOptions);
	if (fromInth) {
		options.backendURL = fromInth;
		return 'inth-env';
	}
	return 'none';
};

/**
 * The `mode` option, checked. It reaches the browser as JSON through the
 * public runtime config, so it must be the data `manifest()`, `hosted()` or
 * `offline()` from `c15t/vue` return, not a transport.
 */
const readModuleMode = function readModuleMode(
	options: ModuleOptions
): ConsentMode {
	if (typeof options.mode === 'function') {
		throw new TypeError(
			"@c15t/vue: `c15t.mode` in nuxt.config.ts is a transport. Import `manifest`, `hosted` or `offline` from 'c15t/vue' (the module entry), which return plain data."
		);
	}
	return readNuxtMode(options);
};

/**
 * The configured `routePrefix`, checked here so a bad prefix stops the build
 * and the runtime config only ever holds a checked one.
 *
 * @throws {TypeError} When the prefix is `/` or not a path.
 */
const checkRoutePrefix = function checkRoutePrefix(
	options: ModuleOptions
): string | false {
	if (options.routePrefix === false) {
		return false;
	}
	return normalizeRoutePrefix(
		'@c15t/vue',
		options.routePrefix ?? DEFAULT_NUXT_ROUTE_PREFIX
	);
};

/**
 * `manifest()` saves consent at `${backendURL}/subjects` from the browser.
 * The consent route answers `GET` only, so without a backend URL every save
 * would fail after the visitor chose. A `snapshot` replaces the manifest
 * download, not the save endpoint. `nuxt prepare` runs during dependency
 * installation, where the variable is often unset, so it is not checked.
 *
 * @throws {Error} When `manifest()` has no backend URL.
 */
const assertManifestBackend = function assertManifestBackend(
	mode: ConsentMode,
	backendURL: string | undefined,
	nuxt: Nuxt
): void {
	if (
		mode.type !== 'manifest' ||
		backendURL !== undefined ||
		nuxt.options._prepare
	) {
		return;
	}
	const reason = mode.snapshot
		? `manifest({ snapshot }) still needs a backend URL: the snapshot replaces the manifest download, but the browser saves consent with POST \${backendURL}/subjects`
		: `manifest() needs a backend URL: the browser saves consent with POST \${backendURL}/subjects`;
	throw new Error(
		`@c15t/vue: ${reason}, and the consent route only answers GET. Set ${BACKEND_URL_ENV} (or ${INTH_URL_ENV}), or \`c15t.backendURL\` in nuxt.config.ts.`
	);
};

/**
 * Downloads the manifest during `nuxt build` and `nuxt dev` setup, for
 * `manifest()` without a `snapshot` or `source: 'runtime'`. `onBuildError`
 * decides what a failed download or a missing backend URL does. `nuxt
 * prepare` writes types during dependency installation and never
 * downloads.
 */
const loadNuxtBuildManifest = function loadNuxtBuildManifest(
	mode: ConsentMode,
	backendURL: string | undefined,
	onBuildError: ModuleOptions['onBuildError'],
	nuxt: Nuxt
): Promise<ConsentManifest | undefined> | undefined {
	if (
		mode.type !== 'manifest' ||
		mode.snapshot ||
		mode.source === 'runtime' ||
		nuxt.options._prepare
	) {
		return undefined;
	}
	const logger = useLogger('@c15t/vue');
	return loadManifestForBuild(
		{ backendURL, manifestURL: mode.manifestURL },
		{
			command: nuxt.options.dev ? 'dev' : 'build',
			envNames: [BACKEND_URL_ENV, INTH_URL_ENV],
			label: '@c15t/vue',
			logger: {
				info: (message) => logger.info(message),
				warn: (message) => logger.warn(message),
			},
			onBuildError,
		}
	);
};

/**
 * The snapshot the server reads, and the one the browser bundle holds. A
 * `snapshot` the mode names wins over the download. Neither travels through
 * runtime config, where Nitro would replace every `null` in it with `''`
 * during the build. Only browser resolution ships a snapshot to the
 * browser: every other mode resolves on the server or asks the backend.
 */
const resolveSnapshots = async function resolveSnapshots(
	mode: ConsentMode,
	backendURL: string | undefined,
	onBuildError: ModuleOptions['onBuildError'],
	nuxt: Nuxt
): Promise<{
	clientSnapshot: ConsentManifest | undefined;
	serverSnapshot: ConsentManifest | undefined;
}> {
	if (mode.type !== 'manifest' || mode.source === 'runtime') {
		return { clientSnapshot: undefined, serverSnapshot: undefined };
	}
	const serverSnapshot =
		mode.snapshot ??
		(await loadNuxtBuildManifest(mode, backendURL, onBuildError, nuxt));
	return {
		clientSnapshot: mode.resolve === 'browser' ? serverSnapshot : undefined,
		serverSnapshot,
	};
};

/**
 * `nuxt generate` deploys files only, so nothing answers the consent route
 * or renders per visitor: say so instead of shipping a banner that never
 * resolves.
 */
const warnStaticServerResolution = function warnStaticServerResolution(
	mode: ConsentMode,
	nuxt: Nuxt
): void {
	const { _generate: generate } = nuxt.options as { _generate?: boolean };
	if (
		(generate || nuxt.options.nitro.static) &&
		!nuxt.options._prepare &&
		mode.type === 'manifest' &&
		mode.resolve !== 'browser'
	) {
		useLogger('@c15t/vue').warn(
			"`nuxt generate` deploys no server, so `manifest()` cannot resolve the policy there. Set `c15t: { mode: manifest({ resolve: 'browser' }), routePrefix: false }`, or `mode: hosted()`."
		);
	}
};

/** The mode as the browser and the server read it: without its snapshot. */
const withoutSnapshot = function withoutSnapshot(
	mode: ConsentMode
): ConsentMode {
	if (mode.type !== 'manifest' || !mode.snapshot) {
		return mode;
	}
	const { snapshot: _snapshot, ...rest } = mode;
	return rest;
};

/**
 * Puts the module options in the public runtime config, which the server
 * render and the browser read. Values already there win, except `mode` and
 * `routePrefix`: the build chose the consent route, the snapshots and the
 * browser code from the module's, so the server and the browser must run
 * those. The `build-options` server plugin does the same for runtime
 * variables such as `NUXT_PUBLIC_C15T_ROUTE_PREFIX`.
 */
const publishOptions = function publishOptions(
	options: Omit<ModuleOptions, 'devtools' | 'initPrefetch' | 'onBuildError'>,
	mode: ConsentMode,
	nuxt: Nuxt
): void {
	const existing = nuxt.options.runtimeConfig.public.c15t as
		| Record<string, unknown>
		| undefined;
	const built: BuiltOptions = {
		mode: withoutSnapshot(mode),
		routePrefix: options.routePrefix ?? false,
	};
	for (const name of findOverriddenOptions(existing, built)) {
		if (existing?.[name] !== undefined) {
			useLogger('@c15t/vue').warn(
				`\`runtimeConfig.public.c15t.${name}\` is ignored: the build uses \`c15t.${name}\` (${JSON.stringify(built[name])}). Set it there.`
			);
		}
	}
	const { mode: _mode, routePrefix: _routePrefix, ...rest } = existing ?? {};
	const published: Record<string, unknown> = defu(rest, options);
	published.mode = built.mode;
	published.routePrefix = built.routePrefix;
	// Untyped: an app's generated runtime config types read `routePrefix`
	// as the string it holds, while the option also takes `false`.
	const publicRuntimeConfig: Record<string, unknown> =
		nuxt.options.runtimeConfig.public;
	publicRuntimeConfig.c15t = published;
};

/** The modules the snapshot templates declare, with their documentation. */
const SNAPSHOT_MODULES = [
	['#c15t/manifest-snapshot', 'The server snapshot for the consent route.'],
	[
		'#c15t/server-manifest-snapshot',
		'The server snapshot for a server render without a consent route.',
	],
	[
		'#c15t/client-manifest-snapshot',
		"The snapshot for `manifest({ resolve: 'browser' })`; otherwise `undefined`.",
	],
] as const;

// Annotated explicitly: the inferred type names `NuxtModule` through
// @nuxt/schema's store path, which is not portable across installs (TS2883).
const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
	defaults: () => ({
		...defaultConsentConfig,
		devtools: true,
		initPrefetch: true,
		routePrefix: DEFAULT_NUXT_ROUTE_PREFIX,
	}),
	meta: {
		configKey: 'c15t',
		name: '@c15t/vue',
	},
	async setup({ devtools, initPrefetch, onBuildError, ...options }, nuxt) {
		const backendURLSource = fillBackendURLFromEnv(options, nuxt);
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
		const mode = readModuleMode(options);
		options.routePrefix = checkRoutePrefix(options);
		const routePrefix = readNuxtRoutePrefix(options);
		assertManifestBackend(mode, options.backendURL, nuxt);
		warnStaticServerResolution(mode, nuxt);
		const { clientSnapshot, serverSnapshot } = await resolveSnapshots(
			mode,
			options.backendURL,
			onBuildError,
			nuxt
		);

		// Source builds ship .ts, dist builds ship .js — alias whichever exists
		// (hardcoding .ts broke every consumer of the published package).
		nuxt.options.alias['#c15t/composables'] = ['index.ts', 'index.js']
			.map((file) => resolver.resolve(`./runtime/composables/${file}`))
			.find((path) => existsSync(path)) as string;

		nuxt.options.runtimeConfig.c15t = defu(
			nuxt.options.runtimeConfig.c15t ?? {},
			{
				// Empty, so the consent route uses the public value, which
				// `NUXT_PUBLIC_C15T_BACKEND_URL` replaces at runtime. The key
				// exists so `NUXT_C15T_BACKEND_URL` can give the route an
				// address of its own.
				backendURL: '',
				// The `/init` script reads it: with `ssr: false` for the whole
				// app, every page is a shell.
				ssr: nuxt.options.ssr !== false,
			}
		);

		// The consent route imports the server snapshot from this virtual. In
		// runtime config, Nitro would replace every `null` in it with `''`
		// during the build, and the route would reject each policy pack.
		nuxt.options.nitro.virtual ||= {};
		nuxt.options.nitro.virtual['#c15t/manifest-snapshot'] = () =>
			renderSnapshotModule(serverSnapshot);
		// A server render without a consent route resolves from the same
		// snapshot. Only the server render imports it.
		nuxt.options.alias['#c15t/server-manifest-snapshot'] = addTemplate({
			filename: 'c15t-server-manifest-snapshot.mjs',
			getContents: () => renderSnapshotModule(serverSnapshot),
		}).dst;
		// The browser bundle holds a snapshot only for browser resolution.
		nuxt.options.alias['#c15t/client-manifest-snapshot'] = addTemplate({
			filename: 'c15t-client-manifest-snapshot.mjs',
			getContents: () => renderSnapshotModule(clientSnapshot),
		}).dst;

		publishOptions(options, mode, nuxt);

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

		// One catch-all answers `${routePrefix}/init` and
		// `${routePrefix}/manifest` in `manifest()` mode.
		if (routePrefix !== undefined) {
			addServerHandler({
				handler: resolver.resolve('./runtime/server/consent-route'),
				route: `${routePrefix}/**`,
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
			// Nitro's typed routes import the consent route, and with it the
			// snapshot virtual. The plugin imports the client snapshot.
			addTypeTemplate(
				{
					filename: 'types/c15t-manifest-snapshot.d.ts',
					getContents: () =>
						SNAPSHOT_MODULES.flatMap(([id, description]) => [
							`declare module '${id}' {`,
							"\timport type { ConsentManifest } from '@c15t/schema/types';",
							'',
							`\t/** ${description} */`,
							'\tconst manifest: ConsentManifest | undefined;',
							'\texport default manifest;',
							'}',
							'',
						]).join('\n'),
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
		// The build chose the route, the snapshots and the browser code from
		// `mode` and `routePrefix`; a runtime override such as
		// `NUXT_PUBLIC_C15T_ROUTE_PREFIX` would make the browser disagree.
		const built: BuiltOptions = {
			mode: withoutSnapshot(mode),
			routePrefix: options.routePrefix ?? false,
		};
		nuxt.options.nitro.virtual['#c15t/build-options'] = () =>
			`export default ${JSON.stringify(built)};\n`;
		addServerPlugin(resolver.resolve('./runtime/server/build-options.nuxt'));
		// Nuxt applies `NUXT_PUBLIC_C15T_BACKEND_URL` on a running server by
		// itself. The Inth variable needs a plugin, and only while neither the
		// option nor the c15t variable gave the build its URL.
		if (backendURLSource === 'inth-env' || backendURLSource === 'none') {
			addServerPlugin(
				resolver.resolve('./runtime/server/inth-project-url.nuxt')
			);
		}
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
		// Browser resolution loads the resolver as the app starts.
		const browserResolve =
			mode.type === 'manifest' && mode.resolve === 'browser';
		nuxt.hook('build:manifest', (manifest) => {
			const isConsentFile = createPackageCheck();
			stopPrefetchingConsentChunks(
				manifest,
				nuxt.options.srcDir,
				isConsentFile,
				{ browserResolve, iab }
			);
			preloadInlinedConsentStyles(
				manifest,
				styleSources,
				nuxt.options.features.inlineStyles,
				isConsentFile
			);
			preloadConsentBanner(manifest, nuxt.options.srcDir, isConsentFile);
			if (browserResolve) {
				preloadBrowserResolver(manifest, nuxt.options.srcDir, isConsentFile);
			}
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
			['ConsentDialogLink', 'consent-dialog-link'],
			['ConsentDialogTrigger', 'panel-trigger'],
			['ConsentGate', 'consent-gate'],
		] as const) {
			addComponent({
				filePath: resolver.resolve(`./runtime/components/${file}.vue`),
				global: true,
				name,
			});
		}

		// Auto-import every composable the index exports. A single resolvable
		// `from` avoids unimport's per-file registry quirks (names registered
		// from per-file paths were silently dropped — see the
		// internals/fixtures/nuxt regression: useHasConsent undefined at
		// runtime).
		const composablesEntry = ['index.ts', 'index.js']
			.map((file) => resolver.resolve(`./runtime/composables/${file}`))
			.find((path) => existsSync(path)) as string;
		addImports(
			readComposableExports(composablesEntry).map((name) => ({
				from: composablesEntry,
				name,
			}))
		);
	},
});

export default module;
