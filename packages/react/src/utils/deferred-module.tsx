'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';

/**
 * Share an on-demand module across exports and preloading. Ready client
 * retries run synchronously; Suspense retains server rendering and hydration.
 * A failed import is cached for rendered exports only, so a failed preload
 * does not stop a later open from retrying.
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
	// Whether a rendered export is waiting on the current import. A preload
	// nobody rendered from yet (hover, focus or idle warming) must not leave a
	// cached failure behind: the real open retries the import instead.
	let rendered = false;
	const listeners = new Set<() => void>();
	const getSnapshot = () => snapshot;
	const getServerSnapshot = () => pending;
	const load = (fromRender: boolean) => {
		rendered ||= fromRender;
		promise ??= (async () => {
			try {
				const module = await importModule();
				snapshot = { module, status: 'ready' };
				return module;
			} catch (error) {
				if (rendered) {
					snapshot = { error, status: 'error' };
				} else {
					promise = undefined;
				}
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
					const module = await load(true);
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
				await load(false);
			} catch {
				// Not cached: the next preload or rendered export retries the import,
				// and a rendered export reports its own failure to its error boundary.
			}
		},
	};
};
