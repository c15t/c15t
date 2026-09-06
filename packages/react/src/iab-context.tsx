'use client';

import type {
	GlobalVendorList,
	KernelIABState,
	NonIABVendor,
} from '@c15t/core';
import { createIAB } from '@c15t/iab';
import type { CreateIABOptions, IABHandle } from '@c15t/iab';
import {
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

	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	useEffect(() => {
		const next = createIAB({ ...optionsRef.current, kernel });
		setHandle(next);
		return () => {
			next.dispose();
		};
	}, [kernel]);

	const value = useMemo<IABContextValue>(
		() => ({ handle, setTab, tab }),
		[handle, tab]
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
		const noopAsync = async () => {
			// Intentionally empty.
		};
		const fallbackTo = <Value,>(
			value: Value | undefined,
			fallback: Value
		): Value => value ?? fallback;

		return {
			...iab,
			acceptAll: fallbackTo(handle?.acceptAll, noop),
			config: {
				cmpId: iab.cmpId,
				enabled: iab.enabled && Boolean(handle),
			},
			isLoadingGVL: iab.enabled && (!iab.gvl || !handle),
			nonIABVendors: iab.customVendors,
			preferenceCenterTab: fallbackTo(iabContext?.tab, 'purposes'),
			rejectAll: fallbackTo(handle?.rejectAll, noop),
			save: fallbackTo(handle?.save, noopAsync),
			setPreferenceCenterTab: fallbackTo(iabContext?.setTab, noop),
			setPurposeConsent: fallbackTo(handle?.setPurposeConsent, noop),
			setPurposeLegitimateInterest: fallbackTo(
				handle?.setPurposeLegitimateInterest,
				noop
			),
			setSpecialFeatureOptIn: fallbackTo(handle?.setSpecialFeatureOptIn, noop),
			setVendorConsent: fallbackTo(handle?.setVendorConsent, noop),
			setVendorLegitimateInterest: fallbackTo(
				handle?.setVendorLegitimateInterest,
				noop
			),
		};
	}, [iab, iabContext]);
};

export type { CreateIABOptions, IABHandle };
