'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	type InitialDataPromise,
} from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { NextjsBenchmarkProbe } from './probe';
import { getState, type NextjsBenchScenario } from './state';

export function NextjsBenchmarkProvider({
	children,
	scenario,
	ssrData,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
	ssrData?: InitialDataPromise;
}) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/bench-consent',
				ssrData: scenario === 'prefetch' ? undefined : ssrData,
				callbacks: {
					onBannerFetched() {
						const state = getState(scenario);
						if (!state) {
							return;
						}
						state.onBannerFetchedCount += 1;
						if (state.onBannerFetchedMs === undefined) {
							state.onBannerFetchedMs = performance.now();
						}
					},
					onConsentSet() {
						const state = getState(scenario);
						if (state) {
							state.onConsentSetCount += 1;
						}
					},
					onError() {
						const state = getState(scenario);
						if (state) {
							state.onErrorCount += 1;
						}
					},
				},
				theme: {
					motion: {
						duration: {
							fast: '1ms',
							normal: '1ms',
							slow: '1ms',
						},
					},
				},
			}}
		>
			<NextjsBenchmarkProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</ConsentManagerProvider>
	);
}
