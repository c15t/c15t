import { onMount, tick } from 'svelte';

const DEFAULT_DURATION_MS = 200;

function readDurationMs(target: Element | null): number {
	if (typeof document === 'undefined') return DEFAULT_DURATION_MS;
	const value = getComputedStyle(target ?? document.documentElement)
		.getPropertyValue('--consent-banner-animation-duration')
		.trim();
	if (!value) return DEFAULT_DURATION_MS;
	if (value.endsWith('ms'))
		return Number.parseFloat(value) || DEFAULT_DURATION_MS;
	if (value.endsWith('s'))
		return Number.parseFloat(value) * 1000 || DEFAULT_DURATION_MS;
	return Number.parseFloat(value) || DEFAULT_DURATION_MS;
}

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
 */
export function useBannerVisibility(
	getShouldShow: () => boolean,
	getDisableAnimation: () => boolean
) {
	let isVisible = $state(false);
	let isMounted = $state(false);
	let shouldRender = $state(false);
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
			void tick().then(() => {
				if (cancelled) return;
				// Force layout so the browser observes `bannerHidden` before we
				// flip to `bannerVisible`. Without this, a fresh mount can
				// compute the final style first and skip the entry transition.
				void bannerEl?.offsetHeight;
				isVisible = true;
			});
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
		get isVisible() {
			return isVisible;
		},
		get isMounted() {
			return isMounted;
		},
		get shouldRender() {
			return shouldRender;
		},
		get bannerEl() {
			return bannerEl;
		},
		set bannerEl(el: HTMLElement | undefined) {
			bannerEl = el;
		},
	};
}
