'use client';

import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	ConsentRoot,
	custom,
	hosted,
} from '@c15t/nextjs';
import type { ConsentProviderOptions, ConsentRootProps } from '@c15t/nextjs';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { NextjsBenchmarkProbe } from './probe';
import { getState } from './state';
import type { NextjsBenchScenario } from './state';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

const createOptions = function createOptions(
	scenario: NextjsBenchScenario
): ConsentProviderOptions {
	return {
		callbacks: {
			onChoiceRecorded() {
				const state = getState(scenario);
				if (state) {
					state.onChoiceRecordedCount += 1;
				}
			},
			onError() {
				const state = getState(scenario);
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
};

const createRootOptions = function createRootOptions(
	scenario: NextjsBenchScenario
): ConsentRootProps['options'] {
	const { mode, ...options } = createOptions(scenario);
	void mode;
	return options;
};

const BenchmarkContents = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) => (
	<>
		<NextjsBenchmarkProbe scenario={scenario} />
		<ConsentBanner disableAnimation />
		<ConsentDialog disableAnimation />
		{children}
	</>
);

export const NextjsClientBenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) => (
	<ConsentProvider options={createOptions(scenario)}>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentProvider>
);

export const NextjsManifestClientBenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) => {
	const transport = useMemo(
		() =>
			createManifestTransport({
				backendURL: '/api/bench-consent',
				manifestURL: '/api/c15t/manifest',
			}),
		[]
	);

	return (
		<ConsentProvider
			options={{
				...createOptions(scenario),
				mode: custom(transport),
			}}
		>
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		</ConsentProvider>
	);
};

export const NextjsPrefetchedBenchmarkProvider = ({
	children,
	state,
	scenario,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
	scenario: NextjsBenchScenario;
}) => (
	// One provider: the root forwards the server-resolved state as
	// `options.prefetch` (authoritative → banner in first HTML). The old
	// wiring nested a second ConsentProvider that shadowed the root's
	// kernel — its banner-in-first-HTML came from the synthetic placeholder
	// policy, which authoritative-only rendering correctly suppresses.
	// The prefetched arm consumes server init without a second browser init.
	<ConsentRoot
		backendURL="/api/bench-consent"
		state={state}
		options={createRootOptions(scenario)}
	>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentRoot>
);

export const NextjsManifestBenchmarkProvider = ({
	children,
	state,
	scenario,
	surfaces = 'client',
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
	scenario: NextjsBenchScenario;
	/**
	 * 'client' renders the client ConsentBanner/Dialog; 'none' renders no
	 * client surfaces, keeping only the benchmark probe and children.
	 */
	surfaces?: 'client' | 'none';
}) => (
	<ConsentRoot
		config={{
			backendURL: '/api/bench-consent',
			manifestURL: '/api/c15t/manifest',
		}}
		state={state}
		options={createRootOptions(scenario)}
	>
		{surfaces === 'client' ? (
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		) : (
			<>
				<NextjsBenchmarkProbe scenario={scenario} />
				{children}
			</>
		)}
	</ConsentRoot>
);
