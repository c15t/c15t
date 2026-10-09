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

// Keep this fixture compatible with revisions before automatic styles.
type BenchmarkProviderOptions = ConsentProviderOptions & { styles?: boolean };

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

const benchTheme: NonNullable<ConsentProviderOptions['theme']> = {
	motion: {
		duration: {
			fast: '1ms',
			normal: '1ms',
			slow: '1ms',
		},
	},
};

export const ReactBenchmarkProvider = ({
	children,
	scenario,
	styles,
	theme = benchTheme,
}: {
	children: ReactNode;
	scenario: ReactBenchScenario;
	/** Set false for experiments that import their CSS explicitly. */
	styles?: BenchmarkProviderOptions['styles'];
	/** Defaults to the 1ms motion override only. */
	theme?: ConsentProviderOptions['theme'];
}) => {
	const options: BenchmarkProviderOptions = {
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
		mode: hosted({ backendURL: '/api/bench-consent' }),
		styles,
		theme,
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
