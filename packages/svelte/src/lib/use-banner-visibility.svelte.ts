import { onMount, untrack } from 'svelte';

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
 * - On show: mounts the element in its visible state with the
 *   `bannerEntering` class. That class is the `@starting-style` state the
 *   stylesheet transitions from on the first frame, so no reflow or class
 *   flip is needed. Browsers without `@starting-style` show it in place.
 * - On hide: flips to `.bannerHidden`, then unmounts after the duration
 *   declared by the `--consent-banner-animation-duration` CSS variable.
 * - When animation is disabled (provider option or `prefers-reduced-motion`):
 *   toggles synchronously, skipping the hide timer.
 * - Server render: when the very first evaluation already says "show" — which
 *   only happens once a `prefetch` has seeded a resolved policy, since
 *   without one the kernel's model is `null` and `activeUI` is `'none'` — the
 *   banner starts mounted and visible in the first HTML. The entry runs
 *   once, at first paint; hydration does not replay it because the element
 *   has already been styled.
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
	onMount(() => {
		isMounted = true;
	});
	let bannerEl: HTMLElement | undefined = $state();

	$effect(() => {
		const shouldShow = getShouldShow();
		const disableAnim = getDisableAnimation();

		if (shouldShow) {
			shouldRender = true;
			isVisible = true;
			return;
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
