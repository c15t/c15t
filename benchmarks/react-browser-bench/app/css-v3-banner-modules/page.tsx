'use client';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import {
	ConsentProvider,
	type ConsentProviderOptions,
} from '@c15t/react/v3/provider';

import { getBenchState } from '../_bench/state';
import { ReactV3BenchmarkProbe } from '../_bench/v3-probe';

const scenario = 'css-v3-banner-modules';
const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

export default function CssV3BannerModulesPage() {
	const options: ConsentProviderOptions = {
		mode: 'c15t',
		backendURL: '/api/bench-consent',
		consentCategories,
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
		<ConsentProvider options={options}>
			<ReactV3BenchmarkProbe scenario={scenario} />
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v3 Banner + CSS Modules Benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
}
