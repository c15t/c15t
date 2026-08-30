'use client';

import { createManifestTransport } from '@c15t/core/v3';
import {
	ConsentBanner,
	ConsentBoundary,
	type ConsentBoundaryProps,
	ConsentDialog,
	ConsentProvider,
	type ConsentProviderOptions,
	type InitialDataPromise,
} from '@c15t/nextjs/v3';
import { type ReactNode, useMemo } from 'react';

import { getState, type NextjsBenchScenario } from './state';
import { NextjsV3BenchmarkProbe } from './v3-probe';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

function createOptions(scenario: NextjsBenchScenario): ConsentProviderOptions {
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

function createBoundaryOptions(
	scenario: NextjsBenchScenario
): ConsentBoundaryProps['options'] {
	const { backendURL, mode, ...options } = createOptions(scenario);
	void backendURL;
	void mode;
	return options;
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
		<ConsentProvider options={createOptions(scenario)}>
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		</ConsentProvider>
	);
}

export function NextjsV3ManifestClientBenchmarkProvider({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: NextjsBenchScenario;
}) {
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
				transport,
			}}
		>
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		</ConsentProvider>
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
	// One provider: the boundary forwards the server-prefetched config as
	// `options.prefetch` (authoritative → banner in first HTML). The old
	// wiring nested a second ConsentProvider that shadowed the boundary's
	// kernel — its banner-in-first-HTML came from the synthetic placeholder
	// policy, which authoritative-only rendering correctly suppresses.
	// backendURL keeps direct-init semantics (client refresh via hosted
	// init); ssrData feeds that first client init without a second fetch.
	return (
		<ConsentBoundary
			backendURL="/api/bench-consent"
			config={config}
			options={{ ...createBoundaryOptions(scenario), ssrData }}
		>
			<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
		</ConsentBoundary>
	);
}

export function NextjsV3ManifestBenchmarkProvider({
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
}) {
	return (
		<ConsentBoundary
			config={config}
			options={createBoundaryOptions(scenario)}
		>
			{surfaces === 'client' ? (
				<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
			) : (
				<>
					<NextjsV3BenchmarkProbe scenario={scenario} />
					{children}
				</>
			)}
		</ConsentBoundary>
	);
}
