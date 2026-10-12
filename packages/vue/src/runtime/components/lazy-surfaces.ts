// Keep lazy module filenames neutral: Vite derives chunk URLs from them.
/**
 * Lazy surface loading (mirrors the React adapter's chunk strategy).
 *
 * Only the non-IAB banner is statically imported by the Vue plugin's root:
 * it's the LCP-critical surface and must server-render into the first
 * HTML. Nuxt's root loads it as its own chunk too (see `nuxt-root.vue`).
 * Everything else is split:
 * - manager/dialog: mounted once first needed, chunk prefetched on idle so
 *   the first "customize" click never pays network+parse
 * - IAB surfaces: load only when the resolved policy is IAB (`init.gvl`)
 * - dialog trigger: mounted only in the browser, when `showTrigger` is set
 *
 * Measured motivation: with all surfaces static, @c15t/vue's mobile consent
 * tax was ~345-530ms; the weight was parse/hydration
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
 * The banner as its own chunk, for Nuxt's root. Its stylesheets then
 * belong to a lazy chunk instead of the entry: a server-rendered banner
 * paints with the styles Nuxt inlines into the HTML and hydrates once its
 * chunk arrives, and the module turns Nuxt's render-blocking links to
 * those rules into preloads. The browser applies them with the chunk,
 * before a banner it renders itself appears.
 */
export const LazyConsentBanner = defineAsyncComponent({
	// The root renders the banner component on every page (it decides its
	// own visibility), so the chunk starts loading with the app's first
	// render, not after `/init`. Vite's preload helper waits for the
	// chunk's stylesheets only in the first `import()` that asks for them:
	// keep this the only caller.
	loader: () => import('./prompt.vue'),
	// Outside Nuxt's root `<Suspense>`: the app mounts and hydrates without
	// waiting for the banner chunk and its stylesheets. Server-rendered
	// banner markup hydrates once the chunk arrives.
	suspensible: false,
});

/**
 * The floating dialog trigger renders nothing before the page mounts, so
 * it never takes part in the first paint. Its chunk carries its
 * stylesheet, which the bundler loads before the component renders: kept
 * out of the entry, the trigger's rules no longer block the first paint of
 * every page, and a page without the trigger never downloads them.
 */
export const LazyConsentDialogTrigger = defineAsyncComponent({
	loader: () => import('./panel-trigger.vue'),
	suspensible: false,
});

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
export const warmConsentManager = () => undefined;
export const warmIabConsentDialog = () => undefined;
