'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';

/**
 * Share an on-demand module across exports and intent preloading. Ready client
 * retries run synchronously; Suspense retains server rendering and hydration.
 *
 * @internal
 */
export const createDeferredModule = <ModuleType,>(
	importModule: () => Promise<ModuleType>
) => {
	type Snapshot =
		| { status: 'pending' }
		| { status: 'ready'; module: ModuleType }
		| { status: 'error'; error: unknown };
	const pending: Snapshot = { status: 'pending' };
	let snapshot: Snapshot = pending;
	let promise: Promise<ModuleType> | undefined;
	const listeners = new Set<() => void>();
	const getSnapshot = () => snapshot;
	const getServerSnapshot = () => pending;
	const load = () => {
		promise ??= (async () => {
			try {
				const module = await importModule();
				snapshot = { module, status: 'ready' };
				return module;
			} catch (error) {
				snapshot = { error, status: 'error' };
				throw error;
			}
		})();
		return promise;
	};
	let notificationQueued = false;
	const publish = () => {
		if (notificationQueued) {
			return;
		}
		notificationQueued = true;
		// React.lazy must mark its own promise resolved before the synchronous
		// subscription update. Preserve the same lazy element during hydration.
		queueMicrotask(() => {
			notificationQueued = false;
			snapshot = { ...snapshot };
			for (const listener of listeners) {
				listener();
			}
		});
	};
	const subscribe = (listener: () => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	return {
		component<Props extends object>(
			select: (module: ModuleType) => ComponentType<Props>
		): ComponentType<Props> {
			const LazyComponent = lazy(() => {
				const selected = (async () => {
					const module = await load();
					return { default: select(module) };
				})();
				// oxlint-disable-next-line promise/prefer-await-to-then -- Register before React attaches its handler, then notify in the following microtask.
				void selected.then(publish, publish);
				return selected;
			});
			return function DeferredComponent(props: Props) {
				const current = useSyncExternalStore(
					subscribe,
					getSnapshot,
					getServerSnapshot
				);
				if (current.status === 'error') {
					throw current.error;
				}
				// The subscription retries this stable boundary synchronously instead
				// of waiting for React's throttled default retry.
				return (
					<Suspense fallback={null}>
						<LazyComponent {...props} />
					</Suspense>
				);
			};
		},
		async preload(): Promise<void> {
			try {
				await load();
			} catch {
				// A mounted export throws the cached failure to its error boundary.
			}
		},
	};
};
