import { isLateEntry } from '@c15t/ui/utils/late-entry';
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
 *   `bannerEntering` class, so it shows on its first frame. A mount after
 *   the page has painted reports `lateEntry`, which the component writes
 *   as `data-entry="late"` for the stylesheet to fade it in.
 * - On hide: flips to `.bannerHidden`, then unmounts after the duration
 *   declared by the `--consent-banner-animation-duration` CSS variable.
 * - When animation is disabled (provider option or `prefers-reduced-motion`):
 *   toggles synchronously, skipping the hide timer.
 * - Server render: when the very first evaluation already says "show" — which
 *   only happens once a `prefetch` has seeded a resolved policy, since
 *   without one the kernel's model is `null` and `activeUI` is `'none'` — the
 *   banner starts mounted and visible in the first HTML, as part of the
 *   first paint, so it is never a late entry.
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
	let lateEntry = $state(false);
	onMount(() => {
		isMounted = true;
	});
	let bannerEl: HTMLElement | undefined = $state();

	$effect(() => {
		const shouldShow = getShouldShow();
		const disableAnim = getDisableAnimation();

		if (shouldShow) {
			if (!untrack(() => shouldRender)) {
				// Decided once per mount, as the element is about to render.
				lateEntry = isLateEntry();
			}
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
		get lateEntry() {
			return lateEntry;
		},
		get shouldRender() {
			return shouldRender;
		},
	};
};
