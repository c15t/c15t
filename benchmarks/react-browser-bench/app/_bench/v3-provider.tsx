'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react/v3';
import type { ReactNode } from 'react';
import { getBenchState, type ReactBenchScenario } from './state';
import { ReactV3BenchmarkProbe } from './v3-probe';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<
	ConsentManagerProviderProps['options']['consentCategories']
>;

export function ReactV3BenchmarkProvider({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: ReactBenchScenario;
}) {
	const options: ConsentManagerProviderProps['options'] = {
		mode: 'c15t',
		backendURL: '/api/bench-consent',
		consentCategories,
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
			<ReactV3BenchmarkProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</ConsentManagerProvider>
	);
}
