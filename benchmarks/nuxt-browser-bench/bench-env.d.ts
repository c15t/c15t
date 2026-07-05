/**
 * Build-time alias switched in nuxt.config.ts: consent-mount.vue for full
 * builds, consent-mount-baseline.vue for zero-consent baseline builds.
 */
declare module '#bench-consent-mount' {
	import type { DefineComponent } from 'vue';

	const component: DefineComponent;
	export default component;
}
