'use client';

/**
 * The IAB bridge for an externally owned runtime.
 *
 * When a host creates the runtime itself — an Astro page, a SvelteKit
 * layout — that runtime already mounted the CMP and owns its lifecycle.
 * This provider republishes `runtime.iab` into React context instead of
 * calling `createIAB()` a second time, which would install a second
 * `__tcfapi` on the page.
 *
 * It deliberately imports nothing from `@c15t/iab`: the module is a peer of
 * the runtime, not of the component tree, and a preference-centre chunk
 * that pulled in the TCF encoder would cost every visitor bytes only an IAB
 * site needs.
 */

import type { ConsentRuntime } from '@c15t/core/runtime';
import type { IABHandle } from '@c15t/iab';
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { IABContext } from './context/iab-context-value';
import type { IABContextValue } from './context/iab-context-value';

/** Props for {@link ExternalIABProvider}. */
export interface ExternalIABProviderProps {
	/** The runtime that owns the CMP. */
	runtime: ConsentRuntime;
	children: ReactNode;
}

const getServerHandle = function getServerHandle(): IABHandle | null {
	return null;
};

// This imperative queue owns pending work independently of React's renders.
const createActionQueue = (runtime: ConsentRuntime) => {
	let active = false;
	let closed = false;
	const actions: {
		run: (mounted: IABHandle) => Promise<void>;
		cancel: () => void;
	}[] = [];
	return {
		actions,
		activate: () => {
			active = true;
		},
		deactivate: () => {
			active = false;
			// StrictMode replays setup in the same turn. Only cancel once the
			// provider is gone or has switched to a different runtime.
			queueMicrotask(() => {
				if (!active) {
					closed = true;
					for (const action of actions.splice(0)) {
						action.cancel();
					}
				}
			});
		},
		isClosed: () => closed,
		runtime,
	};
};

/**
 * Publish an externally owned runtime's CMP into React context.
 *
 * @param props - The owning runtime and the tree to render.
 * @returns The children, wrapped in the IAB context.
 */
export const ExternalIABProvider = ({
	runtime,
	children,
}: ExternalIABProviderProps) => {
	const [tab, setTab] = useState<'purposes' | 'vendors'>('purposes');
	const handle = useSyncExternalStore(
		(listener) => runtime.onIABChange(listener),
		() => runtime.iab as IABHandle | null,
		getServerHandle
	);

	// Keep pending actions attached to the runtime they were requested against.
	const queue = useMemo(() => createActionQueue(runtime), [runtime]);
	useEffect(() => {
		queue.activate();
		const flush = () => {
			const mounted = queue.runtime.iab as IABHandle | null;
			if (mounted) {
				for (const action of queue.actions.splice(0)) {
					void action.run(mounted);
				}
			}
		};
		const unsubscribe = queue.runtime.onIABChange(flush);
		flush();
		return () => {
			unsubscribe();
			queue.deactivate();
		};
	}, [queue]);
	const run = useCallback<NonNullable<IABContextValue['run']>>(
		(action) => {
			const pending = new Promise<void>((resolve, reject) => {
				const cancel = () =>
					reject(
						new DOMException(
							'External IAB provider unmounted or changed runtimes.',
							'AbortError'
						)
					);
				if (queue.isClosed()) {
					cancel();
					return;
				}
				const invoke = async (ready: IABHandle) => {
					try {
						await action(ready);
						resolve();
					} catch (error) {
						reject(error);
					}
				};
				const mounted = queue.runtime.iab as IABHandle | null;
				if (mounted) {
					void invoke(mounted);
				} else {
					queue.actions.push({ cancel, run: invoke });
				}
			});
			// Void IAB actions have no promise consumer. Handle their cancellation,
			// while returning the original promise so awaiting save still rejects.
			// oxlint-disable-next-line promise/prefer-await-to-then
			void pending.catch(() => undefined);
			return pending;
		},
		[queue]
	);

	const value = useMemo<IABContextValue>(
		() => ({ handle, run, setTab, tab }),
		[handle, run, tab]
	);

	return <IABContext.Provider value={value}>{children}</IABContext.Provider>;
};
