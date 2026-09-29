import type { ConsentConfig } from './runtime/config';

// `app.config.ts` is typed by the `CustomAppConfig` augmentation in
// `module.ts`, which ships with the module's declarations.
declare module 'nuxt/schema' {
	interface NuxtConfig {
		c15t?: Partial<ConsentConfig>;
	}
	interface PublicRuntimeConfig {
		c15t?: Partial<ConsentConfig>;
	}
}

export {};
