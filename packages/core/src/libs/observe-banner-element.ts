/**
 * Observe a mounted banner intersecting a visible document.
 *
 * @param element - The mounted banner card in its document or shadow root.
 * @param onVisible - Called once after visibility, layout and intersection checks pass.
 * @returns Cleanup to call when the surface unmounts or stops showing.
 */
export const observeBannerElement = function observeBannerElement(
	element: Element,
	onVisible: (isVisible: () => boolean) => void
): () => void {
	const document = element.ownerDocument;
	const view = document.defaultView;
	if (!view || !view.IntersectionObserver) {
		return () => {
			/* SSR and browsers without intersection support supply no display evidence. */
		};
	}
	let intersects = false;
	let done = false;
	const isVisible = () => {
		if (
			!intersects ||
			document.visibilityState !== 'visible' ||
			!element.isConnected
		) {
			return false;
		}
		const style = view.getComputedStyle(element);
		const rect = element.getBoundingClientRect();
		if (
			style.visibility !== 'visible' ||
			style.display === 'none' ||
			Number(style.opacity) === 0 ||
			rect.width <= 0 ||
			rect.height <= 0
		) {
			return false;
		}
		if (
			rect.bottom <= 0 ||
			rect.right <= 0 ||
			rect.top >= view.innerHeight ||
			rect.left >= view.innerWidth
		) {
			return false;
		}
		return (
			typeof element.checkVisibility !== 'function' ||
			element.checkVisibility({
				opacityProperty: true,
				visibilityProperty: true,
			})
		);
	};
	const check = () => {
		if (done || !intersects || !isVisible()) {
			return;
		}
		done = true;
		onVisible(isVisible);
	};

	const observer = new view.IntersectionObserver((entries) => {
		intersects = entries.some(
			(entry) =>
				entry.target === element &&
				entry.isIntersecting &&
				entry.intersectionRatio > 0
		);
		check();
	});
	const cleanup = () => {
		intersects = false;
		observer.disconnect();
		document.removeEventListener('visibilitychange', check);
		document.removeEventListener('animationend', check, true);
		document.removeEventListener('transitionend', check, true);
	};
	observer.observe(element);
	document.addEventListener('visibilitychange', check);
	document.addEventListener('animationend', check, true);
	document.addEventListener('transitionend', check, true);
	return () => {
		done = true;
		cleanup();
	};
};
