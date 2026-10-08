declare module '#c15t/composables' {
	export {
		consentConfigKey,
		useConsentConfig,
	} from './runtime/composables/config';
	export { useConsentActiveUI } from './runtime/composables/activeUI';
	export { useConsentComponent } from './runtime/composables/component';
	export {
		createDefaultIabSelection,
		useConsentIabSave,
		useConsentIabSelection,
		useConsentIabStore,
		type ConsentIabSelection,
		type IabConsentSaveInput,
		type IabPreferenceTab,
	} from './runtime/composables/iabSelection';
	export {
		useConsent,
		useConsentSave,
		type ConsentSaveInput,
	} from './runtime/composables/consent';
	export { useIabTranslations } from './runtime/composables/iab-translations';
	export { useConsentInit } from './runtime/composables/init';
	export { useConsentLanguage } from './runtime/composables/language';
	export { useRequestRegion } from './runtime/composables/region';
}

/** A Nitro virtual the module registers for its server plugin. */
declare module '#c15t/server-app-config' {
	/**
	 * The app's merged `app.config.ts`, or `undefined` when Nitro cannot load
	 * it because server auto-imports are off.
	 */
	export const useServerAppConfig: (
		event?: unknown
	) => Record<string, unknown> | undefined;
}

/** A Nitro virtual the module registers for its server routes. */
declare module '#c15t/manifest-snapshot' {
	import type { ConsentManifest } from '@c15t/schema/types';

	/** The manifest fetched during the build, or `undefined` without one. */
	const manifest: ConsentManifest | undefined;
	export default manifest;
}

/** A Nuxt template the module registers for client manifest mode. */
declare module '#c15t/client-manifest-snapshot' {
	import type { ConsentManifest } from '@c15t/schema/types';

	/** A `manifestSnapshot` from the `c15t` key, in client manifest mode. */
	const manifest: ConsentManifest | undefined;
	export default manifest;
}
