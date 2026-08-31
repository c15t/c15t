'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '@c15t/react';
import type { ConsentManagerProviderProps } from '@c15t/react';
import type { ReactNode } from 'react';

import { ReactBenchmarkProbe } from './probe';
import { getBenchState } from './state';
import type { ReactBenchScenario } from './state';

export const BenchmarkProvider = ({
	children,
	scenario,
	headless = false,
}: {
	children: ReactNode;
	scenario: ReactBenchScenario;
	headless?: boolean;
}) => {
	const options: ConsentManagerProviderProps['options'] = {
		backendURL: '/api/bench-consent',
		callbacks: {
			onBannerFetched() {
				const state = getBenchState(scenario);
				if (!state) {
					return;
				}
				state.onBannerFetchedCount += 1;
				if (state.onBannerFetchedMs === undefined) {
					state.onBannerFetchedMs = performance.now();
				}
			},
			onConsentSet() {
				const state = getBenchState(scenario);
				if (!state) {
					return;
				}
				state.onConsentSetCount += 1;
			},
			onError() {
				const state = getBenchState(scenario);
				if (!state) {
					return;
				}
				state.onErrorCount += 1;
			},
		},
		mode: 'c15t',
		theme: {
			motion: {
				duration: {
					fast: '1ms',
					normal: '1ms',
					slow: '1ms',
				},
			},
		},
	};

	return (
		<ConsentManagerProvider options={options}>
			<ReactBenchmarkProbe scenario={scenario} />
			{headless ? null : (
				<>
					<ConsentBanner disableAnimation />
					<ConsentDialog disableAnimation />
				</>
			)}
			{children}
		</ConsentManagerProvider>
	);
};
