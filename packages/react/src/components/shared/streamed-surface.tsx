'use client';

import type { StreamedPrefetch } from '@c15t/core/runtime';
import * as React from 'react';
import { Suspense, useContext, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

import { HydrationSnapshotContext, StreamedPrefetchContext } from '~/context';
import { useKernel } from '~/kernel-selector';

/** A layout effect in the browser; nothing to run on the server. */
const useBrowserLayoutEffect =
	typeof document === 'undefined' ? useEffect : useLayoutEffect;

type RecordedThenable<Value> = PromiseLike<Value> & {
	status?: 'pending' | 'fulfilled';
	value?: Value;
};

/**
 * React 18's way to suspend: throw the promise, and read its recorded
 * result on the retry. The runtime's `settled` records its own result.
 * Exported for tests.
 *
 * @internal
 */
export const readRecorded = function readRecorded<Value>(
	thenable: PromiseLike<Value>
): Value {
	const recorded = thenable as RecordedThenable<Value>;
	if (recorded.status === 'fulfilled') {
		return recorded.value as Value;
	}
	throw thenable;
};

/** `use()` where React has it (19), `readRecorded` where it does not (18). */
const useSettled = function useSettled<Value>(
	thenable: PromiseLike<Value>
): Value {
	const { use } = React as { use?: <Read>(usable: PromiseLike<Read>) => Read };
	return use ? use(thenable) : readRecorded(thenable);
};

const StreamedScope = ({
	children,
	streamed,
}: {
	children: ReactNode;
	streamed: StreamedPrefetch;
}) => {
	const kernel = useKernel();
	const config = useSettled(streamed.settled);
	const snapshot = streamed.snapshotFor(config);
	// Before the surface's own effects can act on it, and before React
	// compares the kernel with what hydration rendered: the kernel adopts
	// the config the surface was rendered from.
	useBrowserLayoutEffect(() => {
		streamed.adopt(config);
	}, [streamed, config]);
	return (
		<HydrationSnapshotContext.Provider
			value={snapshot === kernel.getServerSnapshot() ? null : snapshot}
		>
			{/* A surface inside this one is already in the boundary. */}
			<StreamedPrefetchContext.Provider value={undefined}>
				{children}
			</StreamedPrefetchContext.Provider>
		</HydrationSnapshotContext.Provider>
	);
};

/**
 * Renders a consent surface the server can stream. While the provider's
 * `prefetch` is a promise, the surface waits for it in its own Suspense
 * boundary: the rest of the page streams at once, and the surface follows
 * in a later chunk of the same response, rendered from the resolved
 * config. It shows only when that config carries a policy that shows it.
 * Hydration reads the same config, so the surface hydrates in place.
 *
 * @internal
 */
export const StreamedSurface = ({ children }: { children: ReactNode }) => {
	const streamed = useContext(StreamedPrefetchContext);
	if (!streamed) {
		return children;
	}
	return (
		<Suspense fallback={null}>
			<StreamedScope streamed={streamed}>{children}</StreamedScope>
		</Suspense>
	);
};
