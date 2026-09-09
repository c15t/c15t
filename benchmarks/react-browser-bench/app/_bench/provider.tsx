'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
} from '@c15t/react';
import type { ConsentProviderOptions } from '@c15t/react';
import type { ReactNode } from 'react';

import { ReactBenchmarkProbe } from './probe';
import { getBenchState } from './state';
import type { ReactBenchScenario } from './state';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

export const ReactBenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: ReactBenchScenario;
}) => {
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
			<ReactBenchmarkProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</ConsentProvider>
	);
};
