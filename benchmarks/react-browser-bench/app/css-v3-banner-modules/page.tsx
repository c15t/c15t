'use client';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import { ConsentProvider } from '@c15t/react/v3/provider';
import type { ConsentProviderOptions } from '@c15t/react/v3/provider';

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

const CssV3BannerModulesPage = () => {
	const options: ConsentProviderOptions = {
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
		consentCategories,
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
		<ConsentProvider options={options}>
			<ReactV3BenchmarkProbe scenario={scenario} />
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React v3 Banner + CSS Modules Benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
};

export default CssV3BannerModulesPage;
