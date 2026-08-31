/**
 * Svelte action that teleports an element to a target container.
 * Used for rendering modals, banners, and overlays at the document body level.
 */
export const portal = function portal(
	node: HTMLElement,
	target: HTMLElement | string = typeof document === 'undefined'
		? (null as unknown as HTMLElement)
		: document.body
) {
	const resolve = function resolve(
		t: HTMLElement | string
	): HTMLElement | null {
		return typeof t === 'string' ? document.querySelector(t) : t;
	};

	let targetEl = resolve(target);

	if (targetEl) {
		targetEl.appendChild(node);
	} else {
		// oxlint-disable-next-line no-lonely-if -- Preserve established branch order and control flow.
		if (
			typeof process === 'undefined' ||
			process.env?.NODE_ENV !== 'production'
		) {
			console.warn(`[c15t/portal] Target element not found: ${target}`);
		}
	}

	return {
		destroy() {
			node.remove();
		},
		update(newTarget: HTMLElement | string) {
			const newTargetEl = resolve(newTarget);
			if (!newTargetEl) {
				if (
					typeof process === 'undefined' ||
					process.env?.NODE_ENV !== 'production'
				) {
					console.warn(`[c15t/portal] Target element not found: ${newTarget}`);
				}
				return;
			}
			newTargetEl.appendChild(node);
			targetEl = newTargetEl;
		},
	};
};
