import { onMount, tick, untrack } from 'svelte';

const DEFAULT_DURATION_MS = 200;

const readDurationMs = function readDurationMs(target: Element | null): number {
	if (typeof document === 'undefined') {
		return DEFAULT_DURATION_MS;
	}
	const value = getComputedStyle(target ?? document.documentElement)
		.getPropertyValue('--consent-banner-animation-duration')
		.trim();
	if (!value) {
		return DEFAULT_DURATION_MS;
	}
	if (value.endsWith('ms')) {
		return Number.parseFloat(value) || DEFAULT_DURATION_MS;
	}
	if (value.endsWith('s')) {
		return Number.parseFloat(value) * 1000 || DEFAULT_DURATION_MS;
	}
	return Number.parseFloat(value) || DEFAULT_DURATION_MS;
};

/**
 * Visibility / mount lifecycle for the consent banner.
 *
 * - On show: mounts the element with `.bannerHidden`, awaits Svelte commit,
 *   forces a reflow so the browser observes that initial style, then flips
 *   to `.bannerVisible`. The CSS transition fires automatically — no JS
 *   timing coordination.
 * - On hide: flips to `.bannerHidden`, then unmounts after the duration
 *   declared by the `--consent-banner-animation-duration` CSS variable.
 * - When animation is disabled (provider option or `prefers-reduced-motion`):
 *   toggles synchronously, skipping the show reflow and the hide timer.
 * - Server render: when the very first evaluation already says "show" — which
 *   only happens once a `prefetch` has seeded a resolved policy, since
 *   without one the kernel's model is `null` and `activeUI` is `'none'` — the
 *   banner starts mounted and *visible*. That puts the shell in the first
 *   HTML and skips the entry animation on hydration, which would otherwise
 *   replay an animation the user has already seen painted. Client-triggered
 *   shows still take the animated path.
 */
export const useBannerVisibility = function useBannerVisibility(
	getShouldShow: () => boolean,
	getDisableAnimation: () => boolean
) {
	// Read outside a reactive scope: this is the one-shot server/initial
	// decision, not an ongoing dependency. The $effect below owns the rest.
	const serverVisible = untrack(getShouldShow);

	let isVisible = $state(serverVisible);
	let isMounted = $state(serverVisible);
	let shouldRender = $state(serverVisible);
	let bannerEl: HTMLElement | undefined = $state();

	onMount(() => {
		isMounted = true;
	});

	$effect(() => {
		const shouldShow = getShouldShow();
		const disableAnim = getDisableAnimation();

		if (shouldShow) {
			shouldRender = true;
			if (disableAnim) {
				isVisible = true;
				return;
			}
			let cancelled = false;
			void (async () => {
				await tick();
				if (cancelled) {
					return;
				}
				// Force layout so the browser observes `bannerHidden` before we
				// flip to `bannerVisible`. Without this, a fresh mount can
				// compute the final style first and skip the entry transition.
				void bannerEl?.offsetHeight;
				isVisible = true;
			})();
			return () => {
				cancelled = true;
			};
		}

		if (!isVisible) {
			shouldRender = false;
			return;
		}

		if (disableAnim) {
			isVisible = false;
			shouldRender = false;
			return;
		}

		isVisible = false;
		const timer = setTimeout(
			() => {
				shouldRender = false;
			},
			readDurationMs(bannerEl ?? null)
		);
		return () => clearTimeout(timer);
	});

	return {
		get bannerEl() {
			return bannerEl;
		},
		set bannerEl(el: HTMLElement | undefined) {
			bannerEl = el;
		},
		get isMounted() {
			return isMounted;
		},
		get isVisible() {
			return isVisible;
		},
		get shouldRender() {
			return shouldRender;
		},
	};
};
