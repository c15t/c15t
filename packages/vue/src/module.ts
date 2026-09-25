import { existsSync, realpathSync } from 'node:fs';

import { defaultConsentConfig } from '@c15t/schema/config';
import {
	addComponent,
	addImports,
	addPlugin,
	addServerHandler,
	createResolver,
	defineNuxtModule,
} from '@nuxt/kit';
import type { Nuxt, NuxtModule } from '@nuxt/schema';
import { defu } from 'defu';
import { joinURL } from 'ufo';

import type { ModuleOptions } from './module-options';
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

export type { ConsentModuleOptions, ModuleOptions } from './module-options';

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

// Annotated explicitly: the inferred type names `NuxtModule` through
// @nuxt/schema's store path, which is not portable across installs (TS2883).
const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
	defaults: () => ({
		...defaultConsentConfig,
		devtools: true,
		initRoute: resolveNuxtInitRoute({}),
		manifest: false,
		manifestRoute: resolveNuxtManifestRoute({}),
	}),
	meta: {
		configKey: 'c15t',
		name: '@c15t/vue',
	},
	setup({ devtools, ...options }, nuxt) {
		const resolver = createResolver(import.meta.url);
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
				manifestURL: options.manifestURL,
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

		addPlugin(resolver.resolve('./runtime/plugin.nuxt'));

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
				'useOptOutDirectives',
				'usePolicyRule',
				'usePolicyResolution',
				'useConsentRestrictions',
				'useDismissNotice',
				'useConsentDraft',
				'useConsentPolicyActions',

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
