'use client';

import type {
	GlobalVendorList,
	KernelIABState,
	NonIABVendor,
} from '@c15t/core/v3';
import { createIAB } from '@c15t/iab/v3';
import type { CreateIABOptions, IABHandle } from '@c15t/iab/v3';
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { KernelContext } from './context';

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

interface IABContextValue {
	handle: IABHandle | null;
	tab: 'purposes' | 'vendors';
	setTab: (tab: 'purposes' | 'vendors') => void;
}

const IABContext = createContext<IABContextValue | null>(null);

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
			'useIAB must be used within <ConsentProvider options={...}> from @c15t/react/v3'
		);
	}

	const iab = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().iab,
		() => kernel.getServerSnapshot().iab
	);

	// oxlint-disable-next-line complexity -- Control flow mirrors the protocol or state matrix and is kept together.
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

		return {
			...iab,
			acceptAll: handle?.acceptAll ?? noop,
			config: {
				cmpId: iab.cmpId,
				enabled: iab.enabled && Boolean(handle),
			},
			isLoadingGVL: iab.enabled && (!iab.gvl || !handle),
			nonIABVendors: iab.customVendors,
			preferenceCenterTab: iabContext?.tab ?? 'purposes',
			rejectAll: handle?.rejectAll ?? noop,
			save: handle?.save ?? noopAsync,
			setPreferenceCenterTab: iabContext?.setTab ?? noop,
			setPurposeConsent: handle?.setPurposeConsent ?? noop,
			setPurposeLegitimateInterest:
				handle?.setPurposeLegitimateInterest ?? noop,
			setSpecialFeatureOptIn: handle?.setSpecialFeatureOptIn ?? noop,
			setVendorConsent: handle?.setVendorConsent ?? noop,
			setVendorLegitimateInterest: handle?.setVendorLegitimateInterest ?? noop,
		};
	}, [iab, iabContext]);
};

export type { CreateIABOptions, IABHandle };
