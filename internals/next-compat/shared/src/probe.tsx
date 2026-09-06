'use client';

import { useActiveUI, useSnapshot } from '@c15t/nextjs';
import { useEffect } from 'react';

/**
 * Snapshot of consent runtime state that the compatibility suite reads
 * through `window.__c15tCompat`.
 */
export interface CompatProbeState {
	scenario: string;
	activeUI: string;
	hasConsented: boolean;
	/** `true` once the kernel holds an authoritative policy. */
	hasPolicy: boolean;
	policyProvisional: boolean;
	countryCode: string | null;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
}

declare global {
	interface Window {
		__c15tCompat?: CompatProbeState;
		__c15tCompatCounters?: Pick<
			CompatProbeState,
			'onBannerFetchedCount' | 'onConsentSetCount' | 'onErrorCount'
		>;
	}
}

export const getCompatCounters = function getCompatCounters() {
	if (typeof window === 'undefined') {
		return undefined;
	}
	window.__c15tCompatCounters ??= {
		onBannerFetchedCount: 0,
		onConsentSetCount: 0,
		onErrorCount: 0,
	};
	return window.__c15tCompatCounters;
};

export const CompatProbe = ({ scenario }: { scenario: string }) => {
	const activeUI = useActiveUI();
	const snapshot = useSnapshot();

	useEffect(() => {
		const counters = getCompatCounters();
		window.__c15tCompat = {
			activeUI: activeUI ?? 'none',
			countryCode: snapshot.location?.countryCode ?? null,
			hasConsented: snapshot.hasConsented,
			hasPolicy: snapshot.policy !== null,
			onBannerFetchedCount: counters?.onBannerFetchedCount ?? 0,
			onConsentSetCount: counters?.onConsentSetCount ?? 0,
			onErrorCount: counters?.onErrorCount ?? 0,
			policyProvisional: snapshot.policyProvisional,
			scenario,
		};
	});

	return (
		<output
			data-scenario={scenario}
			data-testid="compat-probe"
		>
			{activeUI ?? 'none'}
		</output>
	);
};
