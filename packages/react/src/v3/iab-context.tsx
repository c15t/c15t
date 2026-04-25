'use client';

import { type CreateIABOptions, createIAB, type IABHandle } from '@c15t/iab/v3';
import type { GlobalVendorList, KernelIABState, NonIABVendor } from 'c15t/v3';
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { KernelContext } from './context';

export interface ReactIABState extends KernelIABState {
	config: {
		enabled: boolean;
		cmpId: number | null;
	};
	isLoadingGVL: boolean;
	nonIABVendors: NonIABVendor[];
	preferenceCenterTab: 'purposes' | 'vendors';
	setPreferenceCenterTab(tab: 'purposes' | 'vendors'): void;
	setVendorConsent(vendorId: string | number, value: boolean): void;
	setVendorLegitimateInterest(vendorId: string | number, value: boolean): void;
	setPurposeConsent(purposeId: number, value: boolean): void;
	setPurposeLegitimateInterest(purposeId: number, value: boolean): void;
	setSpecialFeatureOptIn(featureId: number, value: boolean): void;
	acceptAll(): void;
	rejectAll(): void;
	save(): Promise<void>;
}

interface IABContextValue {
	handle: IABHandle | null;
	tab: 'purposes' | 'vendors';
	setTab(tab: 'purposes' | 'vendors'): void;
}

const IABContext = createContext<IABContextValue | null>(null);

export interface IABProviderProps
	extends Omit<CreateIABOptions, 'kernel' | 'gvl'> {
	children: ReactNode;
	gvl?: GlobalVendorList | null;
}

export function IABProvider({ children, ...options }: IABProviderProps) {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'IABProvider: no kernel in context. Wrap with <ConsentProvider kernel={kernel}> first.'
		);
	}

	const [tab, setTab] = useState<'purposes' | 'vendors'>('purposes');
	const [handle, setHandle] = useState<IABHandle | null>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		const next = createIAB({ ...optionsRef.current, kernel });
		setHandle(next);
		return () => {
			next.dispose();
		};
	}, [kernel]);

	const value = useMemo<IABContextValue>(
		() => ({ handle, tab, setTab }),
		[handle, tab]
	);

	return <IABContext.Provider value={value}>{children}</IABContext.Provider>;
}

export function useIAB(): ReactIABState | null {
	const kernel = useContext(KernelContext);
	const iabContext = useContext(IABContext);
	if (!kernel) {
		throw new Error(
			'useIAB must be used within <ConsentProvider kernel={kernel}> from @c15t/react/v3'
		);
	}

	const iab = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().iab,
		() => kernel.getSnapshot().iab
	);

	return useMemo(() => {
		if (!iab) return null;
		const handle = iabContext?.handle;
		const noop = () => {};
		const noopAsync = async () => {};

		return {
			...iab,
			config: {
				enabled: iab.enabled,
				cmpId: iab.cmpId,
			},
			isLoadingGVL: iab.enabled && !iab.gvl,
			nonIABVendors: iab.customVendors,
			preferenceCenterTab: iabContext?.tab ?? 'purposes',
			setPreferenceCenterTab: iabContext?.setTab ?? noop,
			setVendorConsent: handle?.setVendorConsent ?? noop,
			setVendorLegitimateInterest: handle?.setVendorLegitimateInterest ?? noop,
			setPurposeConsent: handle?.setPurposeConsent ?? noop,
			setPurposeLegitimateInterest:
				handle?.setPurposeLegitimateInterest ?? noop,
			setSpecialFeatureOptIn: handle?.setSpecialFeatureOptIn ?? noop,
			acceptAll: handle?.acceptAll ?? noop,
			rejectAll: handle?.rejectAll ?? noop,
			save: handle?.save ?? noopAsync,
		};
	}, [iab, iabContext]);
}

export type { CreateIABOptions, IABHandle };
