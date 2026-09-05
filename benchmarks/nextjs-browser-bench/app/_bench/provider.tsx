'use client';

import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	ConsentBanner,
	ConsentBoundary,
	ConsentDialog,
	ConsentProvider,
	custom,
	hosted,
} from '@c15t/nextjs';
import type {
	ConsentBoundaryProps,
	ConsentProviderOptions,
} from '@c15t/nextjs';
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

const createBoundaryOptions = function createBoundaryOptions(
	scenario: NextjsBenchScenario
): ConsentBoundaryProps['options'] {
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
	config,
	scenario,
}: {
	children: ReactNode;
	config: ConsentBoundaryProps['config'];
	scenario: NextjsBenchScenario;
}) => (
	// One provider: the boundary forwards the server-prefetched config as
	// `options.prefetch` (authoritative → banner in first HTML). The old
	// wiring nested a second ConsentProvider that shadowed the boundary's
	// kernel — its banner-in-first-HTML came from the synthetic placeholder
	// policy, which authoritative-only rendering correctly suppresses.
	// The prefetched arm consumes server init without a second browser init.
	<ConsentBoundary
		config={config}
		options={createBoundaryOptions(scenario)}
	>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentBoundary>
);

export const NextjsManifestBenchmarkProvider = ({
	children,
	config,
	scenario,
	surfaces = 'client',
}: {
	children: ReactNode;
	config: ConsentBoundaryProps['config'];
	scenario: NextjsBenchScenario;
	/**
	 * 'client' renders the client ConsentBanner/Dialog; 'none' renders no
	 * client surfaces (the RSC arm supplies the banner as a Server
	 * Component child instead).
	 */
	surfaces?: 'client' | 'none';
}) => (
	<ConsentBoundary
		config={config}
		options={createBoundaryOptions(scenario)}
	>
		{surfaces === 'client' ? (
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		) : (
			<>
				<NextjsBenchmarkProbe scenario={scenario} />
				{children}
			</>
		)}
	</ConsentBoundary>
);
