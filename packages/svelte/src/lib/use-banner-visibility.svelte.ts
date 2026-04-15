import { onMount } from 'svelte';

/**
 * Shared visibility/animation state machine for banner components.
 *
 * Manages the mount → show → hide → unmount lifecycle with CSS transition support.
 * - On show: mounts DOM, then delays 10ms to trigger CSS transition.
 * - On hide: starts CSS transition, waits for transitionend (with 500ms fallback), then unmounts.
 * - When animations are disabled: toggles instantly without transitions.
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
			const timer = setTimeout(() => {
				isVisible = true;
			}, 10);
			return () => clearTimeout(timer);
		}

		if (disableAnim) {
			isVisible = false;
			shouldRender = false;
		} else {
			isVisible = false;
			const el = bannerEl;
			if (el) {
				const handler = () => {
					shouldRender = false;
				};
				el.addEventListener('transitionend', handler, { once: true });
				const fallback = setTimeout(handler, 500);
				return () => {
					el.removeEventListener('transitionend', handler);
					clearTimeout(fallback);
				};
			}
			shouldRender = false;
		}
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
