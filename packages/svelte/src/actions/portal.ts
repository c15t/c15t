/**
 * Svelte action that teleports an element to a target container.
 * Used for rendering modals, banners, and overlays at the document body level.
 */
export function portal(
	node: HTMLElement,
	target: HTMLElement | string = document.body
) {
	const targetEl =
		typeof target === 'string' ? document.querySelector(target) : target;

	if (!targetEl) {
		return;
	}

	targetEl.appendChild(node);

	return {
		destroy() {
			node.remove();
		},
	};
}
