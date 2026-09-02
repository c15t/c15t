'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
} from '@c15t/react/v3';
import type { ConsentProviderOptions } from '@c15t/react/v3';
import type { ReactNode } from 'react';

import { getBenchState } from './state';
import type { ReactBenchScenario } from './state';
import { ReactV3BenchmarkProbe } from './v3-probe';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

export const ReactV3BenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: ReactBenchScenario;
}) => {
	const options: ConsentProviderOptions = {
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
		consentCategories,
		mode: hosted({ url: '/api/bench-consent' }),
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
		<ConsentProvider options={options}>
			<ReactV3BenchmarkProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</ConsentProvider>
	);
};
