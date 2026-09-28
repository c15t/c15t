'use client';

import type {
	ConsentKernel,
	GlobalVendorList,
	KernelIABState,
	NonIABVendor,
} from '@c15t/core';
import { createIAB } from '@c15t/iab';
import type { CreateIABOptions, IABHandle } from '@c15t/iab';
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { KernelContext } from './context';
import { IABContext } from './context/iab-context-value';
import type { IABContextValue } from './context/iab-context-value';
import { useCommittedRef } from './hooks/use-committed-ref';

export interface ReactIABState extends KernelIABState {
	config: {
		enabled: boolean;
		cmpId: number | null;
	};
	isLoadingGVL: boolean;
	nonIABVendors: NonIABVendor[];
	preferenceCenterTab: 'purposes' | 'vendors';
	setPreferenceCenterTab: (tab: 'purposes' | 'vendors') => void;
	setVendorConsent: (vendorId: string | number, value: boolean) => void;
	setVendorLegitimateInterest: (
		vendorId: string | number,
		value: boolean
	) => void;
	setPurposeConsent: (purposeId: number, value: boolean) => void;
	setPurposeLegitimateInterest: (purposeId: number, value: boolean) => void;
	setSpecialFeatureOptIn: (featureId: number, value: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<void>;
}

/**
 * One period during which the provider renders a kernel. Switching away and
 * back to the same kernel starts a new selection, so an action taken for the
 * current selection is never confused with one left over from an earlier
 * selection of that kernel.
 */
interface KernelSelection {
	kernel: ConsentKernel;
}

/** An IAB action waiting for the handle of the selection it was taken in. */
interface QueuedIABAction {
	selection: KernelSelection;
	run: (handle: IABHandle) => void;
	cancel: () => void;
}

/** The current selection, replaced whenever the kernel in context changes. */
const useKernelSelection = function useKernelSelection(
	kernel: ConsentKernel
): KernelSelection {
	const [selection, setSelection] = useState<KernelSelection>(() => ({
		kernel,
	}));
	if (selection.kernel === kernel) {
		return selection;
	}
	// Adjusting state during render: React re-renders before committing, so
	// every commit sees the selection that matches its kernel.
	const next = { kernel };
	setSelection(next);
	return next;
};

export interface IABProviderProps extends Omit<
	CreateIABOptions,
	'kernel' | 'gvl'
> {
	children: ReactNode;
	gvl?: GlobalVendorList | null;
}

export const IABProvider = ({ children, ...options }: IABProviderProps) => {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'IABProvider: no kernel in context. Wrap with <ConsentProvider options={...}> first.'
		);
	}

	const [tab, setTab] = useState<'purposes' | 'vendors'>('purposes');
	const selection = useKernelSelection(kernel);
	const committedSelectionRef = useCommittedRef(selection);
	// The handle is bound to the selection it was created for. After the
	// provider switches kernels, the previous handle is disposed and must not
	// be exposed for the render before the effect below creates the next one.
	const [mountedHandle, setMountedHandle] = useState<{
		handle: IABHandle;
		selection: KernelSelection;
	} | null>(null);
	const handle =
		mountedHandle?.selection === selection ? mountedHandle.handle : null;
	const optionsRef = useRef(options);
	// The imperative handle, tagged with its selection. During a switch it
	// still holds the previous handle until the passive effect cleanup runs,
	// and a child layout effect or a click can call `run` in between.
	const handleRef = useRef<{
		handle: IABHandle;
		selection: KernelSelection;
	} | null>(null);
	// Selections whose handle this provider has torn down. An action still
	// addressed to one of them is aborted, never applied to a newer handle.
	// Returning to the same kernel starts a new selection, which is not.
	const retiredRef = useRef(new WeakSet<KernelSelection>());
	// Actions taken between hydration and the effect below creating the
	// handle. A server-rendered banner is clickable in that window. Each
	// action remembers its selection, so it never runs against another one.
	const queuedRef = useRef<QueuedIABAction[]>([]);
	// Whether the provider is mounted, and whether it has stayed unmounted
	// long enough to abort its queue. No handle will drain a closed queue.
	const mountedRef = useRef(false);
	const closedRef = useRef(false);

	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	useEffect(() => {
		mountedRef.current = true;
		closedRef.current = false;
		return () => {
			mountedRef.current = false;
			// StrictMode, and a hidden Activity that is shown again, replay this
			// cleanup and setup. Only a provider still unmounted once the
			// current task's microtasks run aborts its queue, whichever
			// selection each action belongs to.
			queueMicrotask(() => {
				if (mountedRef.current) {
					return;
				}
				closedRef.current = true;
				for (const action of queuedRef.current.splice(0)) {
					action.cancel();
				}
			});
		};
	}, []);

	useEffect(() => {
		const retired = retiredRef.current;
		// StrictMode replays cleanup then setup for the same selection.
		retired.delete(selection);
		const next = createIAB({ ...optionsRef.current, kernel: selection.kernel });
		handleRef.current = { handle: next, selection };
		setMountedHandle({ handle: next, selection });
		const queued = queuedRef.current;
		queuedRef.current = [];
		for (const action of queued) {
			if (action.selection === selection) {
				action.run(next);
			} else {
				action.cancel();
			}
		}
		return () => {
			// Cleanup always runs before the next selection's setup, so the ref
			// still holds this effect's handle here.
			handleRef.current = null;
			retired.add(selection);
			next.dispose();
		};
	}, [selection]);

	const run = useCallback<NonNullable<IABContextValue['run']>>(
		(action) => {
			// An action from a result kept across a switch still carries the
			// previous selection. Compare it with the selection last committed,
			// which changes before any layout effect of the switch commit runs;
			// `handleRef` only moves on in the passive effect.
			const stale = committedSelectionRef.current !== selection;
			const { current } = handleRef;
			if (!stale && current?.selection === selection) {
				return Promise.resolve(action(current.handle));
			}
			const pending = new Promise<void>((resolve, reject) => {
				const cancel = () =>
					reject(
						new DOMException(
							'IAB provider unmounted or switched to another consent kernel.',
							'AbortError'
						)
					);
				if (stale || closedRef.current || retiredRef.current.has(selection)) {
					cancel();
					return;
				}
				// No handle exists yet, or the one that does belongs to the
				// selection this provider is switching away from: wait for this
				// selection's handle.
				queuedRef.current.push({
					cancel,
					run: async (mounted) => {
						try {
							await action(mounted);
							resolve();
						} catch (error) {
							reject(error);
						}
					},
					selection,
				});
			});
			// Void IAB actions have no promise consumer. Handle their
			// cancellation, while returning the original promise so awaiting
			// save still rejects.
			// oxlint-disable-next-line promise/prefer-await-to-then
			pending.catch(() => {
				// Observed by the caller when it awaits.
			});
			return pending;
		},
		[committedSelectionRef, selection]
	);

	const value = useMemo<IABContextValue>(
		() => ({
			customVendors: options.customVendors,
			filtered: Boolean(options.vendors?.length),
			handle,
			run,
			setTab,
			tab,
		}),
		[handle, run, tab, options.vendors?.length, options.customVendors]
	);

	return <IABContext.Provider value={value}>{children}</IABContext.Provider>;
};

export const useIAB = function useIAB(): ReactIABState | null {
	const kernel = useContext(KernelContext);
	const iabContext = useContext(IABContext);
	if (!kernel) {
		throw new Error(
			'useIAB must be used within <ConsentProvider options={...}> from @c15t/react'
		);
	}

	const iab = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().iab,
		() => kernel.getServerSnapshot().iab
	);

	return useMemo(() => {
		if (!iab) {
			return null;
		}
		const handle = iabContext?.handle;
		const noop = () => {
			// Intentionally empty.
		};
		// Rendering keys on kernel state so a server-resolved GVL renders the
		// IAB surfaces into the first HTML. Every action goes through the
		// provider's `run`, even when this render already has a handle: `run`
		// acts at once on the current handle, queues until the provider creates
		// one, and aborts an action from a result kept across a runtime switch
		// instead of applying it to the previous runtime's handle. Outside any
		// IAB provider there is no handle and actions are no-ops.
		const deferred =
			iabContext?.run ??
			((action: (mounted: IABHandle) => void | Promise<void>) =>
				handle ? Promise.resolve(action(handle)) : Promise.resolve());
		const act =
			<Args extends unknown[]>(
				method: (mounted: IABHandle) => (...args: Args) => void
			) =>
			(...args: Args) => {
				void deferred((mounted) => method(mounted)(...args));
			};

		return {
			...iab,
			acceptAll: act((mounted) => mounted.acceptAll),
			config: {
				cmpId: iab.cmpId,
				enabled: iab.enabled,
			},
			customVendors: iabContext?.customVendors ?? iab.customVendors,
			gvlReference:
				iab.gvlReference && iabContext?.filtered
					? { ...iab.gvlReference, summary: undefined }
					: iab.gvlReference,
			isLoadingGVL: iab.enabled && !iab.gvl,
			nonIABVendors: iabContext?.customVendors ?? iab.customVendors,
			preferenceCenterTab: iabContext?.tab ?? 'purposes',
			rejectAll: act((mounted) => mounted.rejectAll),
			save: () => deferred((mounted) => mounted.save()),
			setPreferenceCenterTab: iabContext?.setTab ?? noop,
			setPurposeConsent: act((mounted) => mounted.setPurposeConsent),
			setPurposeLegitimateInterest: act(
				(mounted) => mounted.setPurposeLegitimateInterest
			),
			setSpecialFeatureOptIn: act((mounted) => mounted.setSpecialFeatureOptIn),
			setVendorConsent: act((mounted) => mounted.setVendorConsent),
			setVendorLegitimateInterest: act(
				(mounted) => mounted.setVendorLegitimateInterest
			),
		};
	}, [iab, iabContext]);
};

export type { CreateIABOptions, IABHandle };
