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
import { useMemo, useState, useSyncExternalStore } from 'react';
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

	const value = useMemo<IABContextValue>(
		() => ({ handle, setTab, tab }),
		[handle, tab]
	);

	return <IABContext.Provider value={value}>{children}</IABContext.Provider>;
};
