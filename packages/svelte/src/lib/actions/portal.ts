/**
 * Svelte action that teleports an element to a target container.
 * Used for rendering modals, banners, and overlays at the document body level.
 */
export function portal(
	node: HTMLElement,
	target: HTMLElement | string = typeof document !== 'undefined'
		? document.body
		: (null as unknown as HTMLElement)
) {
	function resolve(t: HTMLElement | string): HTMLElement | null {
		return typeof t === 'string' ? document.querySelector(t) : t;
	}

	let targetEl = resolve(target);

	if (!targetEl) {
		if (
			typeof process === 'undefined' ||
			process.env?.NODE_ENV !== 'production'
		) {
			console.warn(`[c15t/portal] Target element not found: ${target}`);
		}
	} else {
		targetEl.appendChild(node);
	}

	return {
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
		destroy() {
			node.remove();
		},
	};
}
