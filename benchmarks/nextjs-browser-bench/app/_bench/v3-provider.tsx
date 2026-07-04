'use client';

import {
	ConsentBanner,
	ConsentBoundary,
	type ConsentBoundaryProps,
	ConsentDialog,
	ConsentManagerProvider,
	type ConsentManagerProviderProps,
	type InitialDataPromise,
} from '@c15t/nextjs/v3';
import type { ReactNode } from 'react';
import { getState, type NextjsBenchScenario } from './state';
import { NextjsV3BenchmarkProbe } from './v3-probe';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<
	ConsentManagerProviderProps['options']['consentCategories']
>;

function createOptions(
	scenario: NextjsBenchScenario
): ConsentManagerProviderProps['options'] {
	return {
		mode: 'c15t',
		backendURL: '/api/bench-consent',
		consentCategories,
		callbacks: {
			onBannerFetched() {
				const state = getState(scenario);
				if (!state) {
					return;
				}
				state.onBannerFetchedCount += 1;
				if (state.onBannerFetchedMs === undefined) {
					state.onBannerFetchedMs = performance.now();
				}
			},
			onConsentSet() {
				const state = getState(scenario);
				if (state) {
					state.onConsentSetCount += 1;
				}
			},
			onError() {
				const state = getState(scenario);
				if (state) {
					state.onErrorCount += 1;
				}
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
}

function BenchmarkContents({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) {
	return (
		<>
			<NextjsV3BenchmarkProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</>
	);
}

export function NextjsV3ClientBenchmarkProvider({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) {
	return (
		<ConsentManagerProvider options={createOptions(scenario)}>
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		</ConsentManagerProvider>
	);
}

export function NextjsV3PrefetchedBenchmarkProvider({
	children,
	config,
	scenario,
	ssrData,
}: {
	children: ReactNode;
	config: ConsentBoundaryProps['config'];
	scenario: NextjsBenchScenario;
	ssrData: InitialDataPromise;
}) {
	return (
		<ConsentBoundary config={config}>
			<ConsentManagerProvider
				options={{
					...createOptions(scenario),
					ssrData,
				}}
			>
				<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
			</ConsentManagerProvider>
		</ConsentBoundary>
	);
}
