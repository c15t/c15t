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
import type { NuxtModule } from '@nuxt/schema';
import { defu } from 'defu';
import type { ConsentConfig } from './runtime/config';
import {
	resolveManifestMode,
	resolveNuxtInitRoute,
	resolveNuxtManifestRoute,
} from './runtime/manifest';

// Annotated explicitly: the inferred type names `NuxtModule` through
// @nuxt/schema's store path, which is not portable across installs (TS2883).
const module: NuxtModule<ConsentConfig> = defineNuxtModule<ConsentConfig>({
	meta: {
		name: '@c15t/vue',
		configKey: 'c15t',
	},
	defaults: () => ({
		...defaultConsentConfig,
		manifest: false,
		initRoute: resolveNuxtInitRoute({}),
		manifestRoute: resolveNuxtManifestRoute({}),
	}),
	async setup(options, nuxt) {
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
				manifestURL: options.manifestURL,
				initRoute,
				manifestRoute,
			}
		);

		nuxt.options.runtimeConfig.public.c15t = defu(
			nuxt.options.runtimeConfig.public.c15t ?? {},
			{
				...options,
				manifest: manifestMode,
				initRoute,
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
				route: initRoute,
				method: 'get',
				handler: resolver.resolve('./runtime/server/init.get'),
			});
			addServerHandler({
				route: manifestRoute,
				method: 'get',
				handler: resolver.resolve('./runtime/server/manifest.get'),
			});
		} else if (manifestMode === 'client' && !options.manifestURL) {
			addServerHandler({
				route: manifestRoute,
				method: 'get',
				handler: resolver.resolve('./runtime/server/manifest.get'),
			});
		}

		addPlugin(resolver.resolve('./runtime/plugin.nuxt'));

		addComponent({
			// Global so runtime resolution (<component :is="'ConsentRoot'">)
			// works too — ConsentRoot is the documented mount-anywhere entry.
			global: true,
			name: 'ConsentRoot',
			filePath: resolver.resolve('./runtime/components/nuxt-consent-root.vue'),
		});

		addComponent({
			// Inline consent widget for settings/privacy pages — same DOM
			// contract as @c15t/react and @c15t/svelte ConsentWidget.
			global: true,
			name: 'ConsentWidget',
			filePath: resolver.resolve('./runtime/components/consent-widget.vue'),
		});

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
