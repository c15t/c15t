// Keep lazy module filenames neutral: Vite derives chunk URLs from them.
/**
 * Lazy surface loading (mirrors the React adapter's chunk strategy).
 *
 * Only the non-IAB banner is statically imported by the Vue plugin's root:
 * it's the LCP-critical surface and must server-render into the first
 * HTML. Nuxt's root loads it as its own chunk too (see `nuxt-root.vue`).
 * Everything else is split:
 * - manager/dialog: mounted once first needed. While something can open
 *   it, its chunk is prefetched once the page has loaded and gone quiet,
 *   and warmed at once on hover, focus or touch of a button that opens it,
 *   so the first "customize" click rarely pays network+parse
 * - IAB surfaces: load only when the resolved policy is IAB (`init.gvl`)
 * - dialog trigger: mounted only in the browser, when `showTrigger` is set
 *
 * Measured motivation: with all surfaces static, @c15t/vue's mobile consent
 * tax was ~345-530ms; the weight was parse/hydration
 * of surfaces most visitors never see.
 */
import {
	isIdlePreloadAllowed,
	scheduleIdlePreload,
} from '@c15t/ui/utils/idle-preload';
import {
	defineAsyncComponent,
	inject,
	onBeforeUnmount,
	onMounted,
	watch,
} from 'vue';

import { symbolSnapshot } from '../utils/symbols';

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

/** Start a download whose failure the next open reports instead. */
const loadQuietly = async (load: () => Promise<unknown>) => {
	try {
		await load();
	} catch {
		// The open retries the import and reports its own failure.
	}
};

const loadConsentManager = () => import('./manager.vue');
const loadIabConsentDialog = () => import('./iab-panel.vue');

/** A failed warm is left to the open, which retries the download. */
const warm = (load: () => Promise<unknown>) => {
	if (typeof window !== 'undefined') {
		void loadQuietly(load);
	}
};

/** Immediate warm for user-intent signals (hover/focus on "customize"). */
export const warmConsentManager = () => warm(loadConsentManager);
export const warmIabConsentDialog = () => warm(loadIabConsentDialog);

/**
 * Warm the dialog a policy opens now: the IAB dialog under an IAB policy,
 * otherwise the consent manager.
 *
 * @param iab - Whether the resolved policy is IAB (`init.gvl`).
 */
export const warmConsentDialog = function warmConsentDialog(
	iab: boolean
): void {
	if (iab) {
		warmIabConsentDialog();
	} else {
		warmConsentManager();
	}
};

/**
 * An intent handler for an element containing buttons that open the
 * dialog. Bind it to `pointerover` and `focusin`: both bubble, so one
 * handler covers every button, and a touch fires `pointerover` before
 * `pointerdown`. Hover, focus or a touch on a descendant matching
 * `selector` warms the dialog.
 *
 * @param selector - The descendants that open the dialog.
 * @param iab - Whether the resolved policy is IAB, read when intent fires.
 * @returns The event handler.
 * @internal
 */
export const dialogIntentHandler = function dialogIntentHandler(
	selector: string,
	iab: () => boolean
): (event: Event) => void {
	return (event) => {
		const target = event.target as Element | null;
		if (target?.closest?.(selector)) {
			warmConsentDialog(iab());
		}
	};
};

// Open idle-prefetch gates: the banner is shown, or a trigger, link or
// placeholder button that opens the dialog is mounted. Each gate keeps its
// own IAB check, since two Vue apps on one page each get their own runtime
// and can resolve different policies. The chunks load once
// the page has gone quiet if a gate is still open then, so a visit with
// saved consent and nothing that opens the dialog never downloads it.
// `load` alone is too early on pages that render their main image after
// their scripts run, and a bare idle callback fired during loading under CPU
// throttle made banner-visible about 130ms worse on the SPA arm; see
// `scheduleIdlePreload` in `@c15t/ui`.
type IdleScheduler = typeof scheduleIdlePreload;

const openGates = new Set<() => boolean>();
let cancelScheduled: (() => void) | undefined;
let scheduleIdle: IdleScheduler = scheduleIdlePreload;

const prefetchOpenDialog = () => {
	cancelScheduled = undefined;
	if (openGates.size === 0 || !isIdlePreloadAllowed()) {
		return;
	}
	const kinds = new Set<boolean>();
	for (const iab of openGates) {
		kinds.add(iab());
	}
	for (const iab of kinds) {
		warmConsentDialog(iab);
	}
};

const scheduleOpenDialogPrefetch = () => {
	if (!cancelScheduled && isIdlePreloadAllowed()) {
		cancelScheduled = scheduleIdle(prefetchOpenDialog);
	}
};

/**
 * Hold an idle-prefetch gate open while `active` is true, from mount until
 * unmount. The gate opens once `/init` has resolved the policy, so the
 * prefetch loads the dialog that policy opens. Should a later init switch
 * between the IAB dialog and the consent manager, the prefetch runs again
 * for the new one.
 *
 * @param active - Whether the dialog can be opened soon from this component.
 * @param iab - Whether the resolved policy is IAB (`init.gvl`).
 * @internal
 */
export const useIdleDialogPrefetch = function useIdleDialogPrefetch(
	active: () => boolean,
	iab: () => boolean
): void {
	// Outside a c15t app (tests of this module alone), no policy is pending.
	const snapshot = inject(symbolSnapshot, undefined);
	// Each mount gets its own gate, even when two share an `iab` check.
	const gate = () => iab();
	let held = false;
	const release = () => {
		if (held) {
			held = false;
			openGates.delete(gate);
		}
	};
	onMounted(() => {
		watch(
			// The dialog this gate needs, or `undefined` while it needs none.
			() => (active() && !snapshot?.value.policyPending ? iab() : undefined),
			(needed) => {
				if (needed === undefined) {
					release();
					return;
				}
				if (!held) {
					held = true;
					openGates.add(gate);
				}
				// Also on a change of dialog: an earlier prefetch loaded the
				// other one.
				scheduleOpenDialogPrefetch();
			},
			{ immediate: true }
		);
	});
	onBeforeUnmount(release);
};

/**
 * Reset the idle-prefetch gates between tests.
 *
 * @param options - `scheduleIdle` replaces the idle scheduler, so a test can
 * run idle work on demand instead of waiting for the page to go quiet.
 * @internal
 */
export const resetIdleDialogPrefetchForTests =
	function resetIdleDialogPrefetchForTests(
		options: { scheduleIdle?: IdleScheduler } = {}
	): void {
		cancelScheduled?.();
		cancelScheduled = undefined;
		openGates.clear();
		scheduleIdle = options.scheduleIdle ?? scheduleIdlePreload;
	};
