'use client';

import '@c15t/react/styles.css';
import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';
import type { ConsentManagerProviderProps } from '@c15t/react';

import { ReactBenchmarkProbe } from '../_bench/probe';
import { getBenchState } from '../_bench/state';

const scenario = 'css-v2-banner-monolith';

const CssV2BannerMonolithPage = () => {
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
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React v2 Banner + Monolith CSS Benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentManagerProvider>
	);
};

export default CssV2BannerMonolithPage;
