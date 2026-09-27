/**
 * DOM helpers for the React observer tests. Loaded only by files that run
 * under `@vitest-environment jsdom`.
 */
import type { ConsentKernel } from 'c15t';
import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { vi } from 'vitest';

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A mounted React root. */
export interface Mounted {
	container: HTMLElement;
	rerender: (element: ReactElement) => Promise<void>;
	/** Unmounts the root. Safe to call more than once. */
	unmount: () => Promise<void>;
	/** Reads one probe's rendered attributes. */
	probe: (name: string) => {
		attached: string | null;
		granted: string | null;
		revision: string | null;
	} | null;
}

/** Lets pending microtasks, dynamic imports and effects commit. */
export const settle = async function settle(): Promise<void> {
	await act(async () => {
		await vi.dynamicImportSettled();
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
	});
};

/** Roots that are still mounted, keyed by their container. */
const live = new Map<HTMLElement, () => Promise<void>>();

/**
 * Unmounts every root {@link mount} created that a test has not unmounted,
 * including roots left behind by a failed assertion. Call it in `afterEach`.
 */
export const unmountAll = async function unmountAll(): Promise<void> {
	for (const unmount of [...live.values()]) {
		// oxlint-disable-next-line no-await-in-loop -- Unmount roots in order.
		await unmount();
	}
};

/**
 * Renders `element` into a fresh root and waits for effects, including the
 * provider's lazily loaded pieces, to settle. The root is registered before
 * the first render, so {@link unmountAll} cleans it up even if rendering or a
 * later assertion fails.
 */
export const mount = async function mount(
	element: ReactElement
): Promise<Mounted> {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	const unmount = async function unmount(): Promise<void> {
		if (!live.delete(container)) {
			return;
		}
		await act(() => {
			root.unmount();
		});
		container.remove();
		// Owned providers dispose in a microtask after unmount.
		await settle();
	};
	live.set(container, unmount);
	await act(() => {
		root.render(element);
	});
	await settle();
	return {
		container,
		probe(name) {
			const node = container.querySelector(`[data-probe="${name}"]`);
			return node
				? {
						attached: node.getAttribute('data-attached'),
						granted: node.getAttribute('data-granted'),
						revision: node.getAttribute('data-revision'),
					}
				: null;
		},
		async rerender(next) {
			await act(() => {
				root.render(next);
			});
			await settle();
		},
		unmount,
	};
};

/** Live count of a kernel's subscriptions. */
export interface SubscriptionCount {
	readonly active: number;
	readonly total: number;
	restore: () => void;
}

/**
 * Counts `subscribe()` calls on a kernel and the unsubscribes that match
 * them. Instrumentation only: the kernel's behavior is unchanged.
 */
export const countSubscriptions = function countSubscriptions(
	kernel: ConsentKernel
): SubscriptionCount {
	const original = kernel.subscribe;
	let active = 0;
	let total = 0;
	kernel.subscribe = (listener) => {
		active += 1;
		total += 1;
		const unsubscribe = original(listener);
		let open = true;
		return () => {
			if (open) {
				open = false;
				active -= 1;
			}
			unsubscribe();
		};
	};
	return {
		get active() {
			return active;
		},
		restore() {
			kernel.subscribe = original;
		},
		get total() {
			return total;
		},
	};
};
