'use client';

import '@c15t/react/styles.css';
import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';
import type { ConsentManagerProviderProps } from '@c15t/react';

import { ReactBenchmarkProbe } from '../_bench/probe';
import { getBenchState } from '../_bench/state';

const scenario = 'css-v2-banner-monolith';

export default function CssV2BannerMonolithPage() {
	const options: ConsentManagerProviderProps['options'] = {
		mode: 'c15t',
		backendURL: '/api/bench-consent',
		callbacks: {
			onBannerFetched() {
				const state = getBenchState(scenario);
				if (!state) return;
				state.onBannerFetchedCount += 1;
				state.onBannerFetchedMs ??= performance.now();
			},
			onConsentSet() {
				const state = getBenchState(scenario);
				if (!state) return;
				state.onConsentSetCount += 1;
			},
			onError() {
				const state = getBenchState(scenario);
				if (!state) return;
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
			<ReactBenchmarkProbe scenario={scenario} />
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v2 Banner + Monolith CSS Benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentManagerProvider>
	);
}
