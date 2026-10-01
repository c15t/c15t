import { createDevTools } from '@c15t/dev-tools';
import type { DevToolsInstance, DevToolsOptions } from '@c15t/dev-tools';

import { DEVTOOLS_BRIDGE_KEY } from './constants';

/** What the app exposes to a same-origin DevTools tab page. */
export interface DevToolsBridge {
	/**
	 * Mount an embedded panel into `container`. The container can belong to
	 * a same-origin iframe; the panel still inspects this window's kernel
	 * and page.
	 */
	mount: (container: HTMLElement) => DevToolsInstance;
}

/** Kernel and provider services the bridge passes to each panel. */
export type DevToolsBridgeOptions = Omit<
	DevToolsOptions,
	'container' | 'defaultOpen' | 'embedded' | 'position'
>;

/** Whether a panel's iframe was removed; browsers also drop its window. */
const isDiscarded = (document: Document): boolean => {
	const view = document.defaultView;
	return (
		!view || (view.frameElement !== null && !view.frameElement.isConnected)
	);
};

/**
 * Expose `window.__C15T_DEVTOOLS_BRIDGE__` so a DevTools tab can mount the
 * panel. Development only: the bridge hands out control of the kernel.
 *
 * @param target - Window that owns the kernel.
 * @param options - Kernel and provider services for each mounted panel.
 * @returns Removes the bridge and destroys every panel it mounted.
 */
export const registerDevToolsBridge = (
	target: Window,
	options: DevToolsBridgeOptions
): (() => void) => {
	const mounted = new Set<DevToolsInstance>();
	const bridge: DevToolsBridge = {
		mount(container) {
			// A tab iframe can be discarded without running its cleanup;
			// release those panels' kernel listeners.
			for (const instance of mounted) {
				if (!instance.element || isDiscarded(instance.element.ownerDocument)) {
					mounted.delete(instance);
					instance.destroy();
				}
			}
			const instance = createDevTools({
				...options,
				container,
				embedded: true,
			});
			mounted.add(instance);
			return {
				...instance,
				destroy() {
					mounted.delete(instance);
					instance.destroy();
				},
			};
		},
	};
	const slots = target as unknown as Record<string, unknown>;
	slots[DEVTOOLS_BRIDGE_KEY] = bridge;
	return () => {
		if (slots[DEVTOOLS_BRIDGE_KEY] === bridge) {
			Reflect.deleteProperty(slots, DEVTOOLS_BRIDGE_KEY);
		}
		for (const instance of mounted) {
			instance.destroy();
		}
		mounted.clear();
	};
};
