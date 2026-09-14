import { createManifestTransport } from '@c15t/core/transports/manifest';
import { IABProvider, IABConsentBanner } from '@c15t/react/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	ConsentRoot,
	custom,
	hosted,
} from '@c15t/tanstack-start';
import type {
	ConsentProviderOptions,
	ConsentRootProps,
} from '@c15t/tanstack-start';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { TanstackBenchmarkProbe } from './probe';
import { getState } from './state';
import type { TanstackBenchScenario } from './state';

const BENCH_BACKEND_URL = '/api/bench-consent';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

const createOptions = function createOptions(
	scenario: TanstackBenchScenario
): ConsentProviderOptions {
	return {
		callbacks: {
			onChoiceRecorded() {
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
		consentCategories,
		mode: hosted({ url: BENCH_BACKEND_URL }),
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
	scenario: TanstackBenchScenario
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
	scenario: TanstackBenchScenario;
}) => (
	<>
		<TanstackBenchmarkProbe scenario={scenario} />
		{import.meta.env.C15T_BENCH_IAB === '1' && (
			<IABProvider cmpId={28}>
				<IABConsentBanner disableAnimation />
			</IABProvider>
		)}
		<ConsentBanner disableAnimation />
		<ConsentDialog disableAnimation />
		{children}
	</>
);

/** `client` arm: hosted mode, init and saves go straight to the fixture. */
export const TanstackClientBenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: TanstackBenchScenario;
}) => (
	<ConsentProvider options={createOptions(scenario)}>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentProvider>
);

/**
 * `manifest-client` arm: the browser fetches the same-origin cached
 * manifest route and resolves init locally; saves go to the fixture.
 */
export const TanstackManifestClientBenchmarkProvider = ({
	children,
	scenario,
}: {
	children: ReactNode;
	scenario: TanstackBenchScenario;
}) => {
	const transport = useMemo(
		() =>
			createManifestTransport({
				backendURL: BENCH_BACKEND_URL,
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

/**
 * `ssr` arm: the loader already carries the init response, so the root
 * renders the banner into the first HTML. `initRoute={false}` keeps
 * direct-init semantics for any client refresh, matching the Next arm.
 */
export const TanstackPrefetchedBenchmarkProvider = ({
	children,
	state,
	scenario,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
	scenario: TanstackBenchScenario;
}) => (
	<ConsentRoot
		backendURL={BENCH_BACKEND_URL}
		state={state}
		initRoute={false}
		options={createRootOptions(scenario)}
	>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentRoot>
);

/**
 * `manifest-ssr` and `manifest-ssr-proxy` arms: manifest-resolved
 * state plus the same-origin init route. `backendURL` decides where the
 * accept click posts: the fixture directly, or the proxy mount.
 */
export const TanstackManifestBenchmarkProvider = ({
	backendURL = BENCH_BACKEND_URL,
	children,
	state,
	initRoute,
	scenario,
}: {
	backendURL?: string;
	children: ReactNode;
	state: ConsentRootProps['state'];
	initRoute?: ConsentRootProps['initRoute'];
	scenario: TanstackBenchScenario;
}) => (
	<ConsentRoot
		backendURL={backendURL}
		state={state}
		initRoute={initRoute}
		options={createRootOptions(scenario)}
	>
		<BenchmarkContents scenario={scenario}>{children}</BenchmarkContents>
	</ConsentRoot>
);
