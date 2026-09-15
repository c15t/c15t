'use client';

import type {
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
	const [handle, setHandle] = useState<IABHandle | null>(null);
	const optionsRef = useRef(options);
	const handleRef = useRef<IABHandle | null>(null);
	// Actions taken between hydration and the effect below creating the
	// handle. A server-rendered banner is clickable in that window.
	const queuedRef = useRef<((handle: IABHandle) => void)[]>([]);

	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	useEffect(() => {
		const next = createIAB({ ...optionsRef.current, kernel });
		handleRef.current = next;
		setHandle(next);
		const queued = queuedRef.current;
		queuedRef.current = [];
		for (const action of queued) {
			action(next);
		}
		return () => {
			handleRef.current = null;
			next.dispose();
		};
	}, [kernel]);

	const run = useCallback<NonNullable<IABContextValue['run']>>((action) => {
		const { current } = handleRef;
		if (current) {
			return Promise.resolve(action(current));
		}
		return new Promise<void>((resolve, reject) => {
			queuedRef.current.push(async (mounted) => {
				try {
					await action(mounted);
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		});
	}, []);

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
		// IAB surfaces into the first HTML. Until the provider's effect has
		// created the handle, actions queue through `run` and replay against
		// it; outside any IAB provider they are no-ops.
		const deferred =
			iabContext?.run ??
			((action: (mounted: IABHandle) => void | Promise<void>) =>
				handle ? Promise.resolve(action(handle)) : Promise.resolve());
		const act =
			<Args extends unknown[]>(
				method: (mounted: IABHandle) => (...args: Args) => void
			) =>
			(...args: Args) => {
				if (handle) {
					method(handle)(...args);
					return;
				}
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
			save: () =>
				handle ? handle.save() : deferred((mounted) => mounted.save()),
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
