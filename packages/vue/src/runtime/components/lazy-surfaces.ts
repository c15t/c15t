// Keep lazy module filenames neutral: Vite derives chunk URLs from them.
/**
 * Lazy surface loading (mirrors the React adapter's chunk strategy).
 *
 * Only the non-IAB banner is statically imported — it's the LCP-critical
 * surface and must server-render into the first HTML. Everything else is
 * split:
 * - manager/dialog: mounted once first needed, chunk prefetched on idle so
 *   the first "customize" click never pays network+parse
 * - IAB surfaces: load only when the resolved policy is IAB (`init.gvl`)
 *
 * Measured motivation: with all surfaces static, @c15t/vue's mobile consent
 * tax was ~345-530ms (v3.md § the numbers); the weight was parse/hydration
 * of surfaces most visitors never see.
 */
import { defineAsyncComponent } from 'vue';

export const LazyConsentManager = defineAsyncComponent(
	() => import('./manager.vue')
);
export const LazyIabConsentBanner = defineAsyncComponent(
	() => import('./iab-prompt.vue')
);
export const LazyIabConsentDialog = defineAsyncComponent(
	() => import('./iab-panel.vue')
);

/**
 * Prefetch a surface chunk WITHOUT competing with the critical path.
 *
 * Measured: prefetching on bare requestIdleCallback fired during the loading
 * window under CPU throttle and made banner-visible ~130ms WORSE on the SPA
 * arm. So we wait for the window `load` event first (banner is visible well
 * before it), then an idle slot. Intent warming (hover/focus on the
 * customize button) still wins the race for mouse users.
 */
export const prefetchSurfaceAfterLoad = function prefetchSurfaceAfterLoad(
	load: () => Promise<unknown>
): void {
	if (typeof window === 'undefined') {
		return;
	}
	const schedule = () => {
		const idle =
			'requestIdleCallback' in window
				? (handler: () => void) =>
						(
							window as Window & {
								requestIdleCallback: (handler: () => void) => void;
							}
						).requestIdleCallback(handler)
				: (handler: () => void) => setTimeout(handler, 1500);
		idle(() => {
			void load();
		});
	};
	if (document.readyState === 'complete') {
		schedule();
	} else {
		window.addEventListener('load', schedule, { once: true });
	}
};

const loadConsentManager = () => import('./manager.vue');
const loadIabConsentDialog = () => import('./iab-panel.vue');

export const prefetchConsentManager = () =>
	prefetchSurfaceAfterLoad(loadConsentManager);
export const prefetchIabConsentDialog = () =>
	prefetchSurfaceAfterLoad(loadIabConsentDialog);

/** Immediate warm for user-intent signals (hover/focus on "customize"). */
const warmSurface = async (load: () => Promise<unknown>): Promise<void> => {
	try {
		await load();
	} catch {
		// Intent preloading is optional. The async component handles load errors
		// when the visitor actually opens it, and can retry a failed preload.
	}
};
export const warmConsentManager = () => warmSurface(loadConsentManager);
export const warmIabConsentDialog = () => warmSurface(loadIabConsentDialog);
