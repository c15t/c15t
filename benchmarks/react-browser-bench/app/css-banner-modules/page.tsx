'use client';

import { hosted } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/consent-banner';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';

import { ReactBenchmarkProbe } from '../_bench/probe';
import { getBenchState } from '../_bench/state';

const scenario = 'css-banner-modules' as const;
const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

const CssBannerModulesPage = () => {
	const options: ConsentProviderOptions = {
		callbacks: {
			onChoiceRecorded() {
				const state = getBenchState(scenario);
				if (state) {
					state.onChoiceRecordedCount += 1;
				}
			},
			onError() {
				const state = getBenchState(scenario);
				if (state) {
					state.onErrorCount += 1;
				}
			},
		},
		consentCategories,
		mode: hosted({ url: '/api/bench-consent' }),
		theme: {
			motion: {
				duration: { fast: '1ms', normal: '1ms', slow: '1ms' },
			},
		},
	};

	return (
		<ConsentProvider options={options}>
			<ReactBenchmarkProbe scenario={scenario} />
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React Banner + CSS Modules Benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
};

export default CssBannerModulesPage;
