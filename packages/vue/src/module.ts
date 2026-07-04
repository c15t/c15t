import { defaultConsentConfig } from '@c15t/schema/config';
import {
	addComponent,
	addImports,
	addPlugin,
	addServerHandler,
	createResolver,
	defineNuxtModule,
} from '@nuxt/kit';
import { defu } from 'defu';
import type { ConsentConfig } from './runtime/config';
import {
	isManifestModeEnabled,
	resolveNuxtInitRoute,
	resolveNuxtManifestRoute,
} from './runtime/manifest';

export default defineNuxtModule<ConsentConfig>({
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
		const manifestMode = isManifestModeEnabled(options);
		const initRoute = resolveNuxtInitRoute(options);
		const manifestRoute = resolveNuxtManifestRoute(options);

		nuxt.options.alias['#c15t/composables'] = resolver.resolve(
			'./runtime/composables/index.ts'
		);

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

		nuxt.options.build.transpile.push('@c15t/vue', '@c15t/styles');

		if (manifestMode) {
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
		}

		addPlugin(resolver.resolve('./runtime/plugin.nuxt'));

		addComponent({
			name: 'ConsentRoot',
			filePath: resolver.resolve('./runtime/components/nuxt-consent-root.vue'),
		});

		addImports([
			{
				from: resolver.resolve('./runtime/composables/config'),
				name: 'useConsentConfig',
			},
			{
				from: resolver.resolve('./runtime/composables/init'),
				name: 'useConsentInit',
			},
			{
				from: resolver.resolve('./runtime/composables/consent'),
				name: 'useConsent',
			},
			{
				from: resolver.resolve('./runtime/composables/consent'),
				name: 'useConsentSave',
			},
			{
				from: resolver.resolve('./runtime/composables/iabSelection'),
				name: 'useConsentIabSelection',
			},
			{
				from: resolver.resolve('./runtime/composables/iabSelection'),
				name: 'useConsentIabSave',
			},
			{
				from: resolver.resolve('./runtime/composables/language'),
				name: 'useConsentLanguage',
			},
			{
				from: resolver.resolve('./runtime/composables/activeUI'),
				name: 'useConsentActiveUI',
			},
			{
				from: resolver.resolve('./runtime/composables/component'),
				name: 'useConsentComponent',
			},
			{
				from: resolver.resolve('./runtime/composables/region'),
				name: 'useRequestRegion',
			},
			{
				from: resolver.resolve('./runtime/composables/kernel'),
				name: 'useConsentKernel',
			},
			{
				from: resolver.resolve('./runtime/composables/kernel'),
				name: 'useConsentSnapshot',
			},
		]);
	},
});
