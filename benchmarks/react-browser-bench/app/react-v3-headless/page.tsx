'use client';

import {
	ConsentProvider,
	type ConsentProviderOptions,
	useActiveUI,
	useConsent,
	useSaveConsents,
	useSetActiveUI,
} from '@c15t/react/v3';
import { useEffect } from 'react';
import { getBenchState, markInteraction } from '../_bench/state';

const scenario = 'react-v3-headless' as const;

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

function HeadlessBenchmarkUI() {
	const activeUI = useActiveUI();
	const hasMeasurement = useConsent('measurement');
	const saveConsents = useSaveConsents();
	const setActiveUI = useSetActiveUI();

	useEffect(() => {
		const state = getBenchState(scenario);
		if (!state) {
			return;
		}
		state.activeUI = activeUI ?? 'none';
		if (activeUI === 'banner' && state.bannerReadyMs === undefined) {
			const now = performance.now();
			state.bannerReadyMs = now;
			state.bannerVisibleMs = now;
		}
	}, [activeUI]);

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>React v3 Headless Benchmark</h1>
			<p data-testid="headless-status">
				Measurement consent: {hasMeasurement ? 'yes' : 'no'}
			</p>
			<div style={{ display: 'flex', gap: '1rem' }}>
				<button
					id="react-v3-headless-accept"
					onClick={async () => {
						markInteraction(scenario, 'acceptAllMs');
						await saveConsents('all');
					}}
				>
					Accept All
				</button>
				<button
					id="react-v3-headless-reject"
					onClick={async () => {
						markInteraction(scenario, 'rejectAllMs');
						await saveConsents('none');
					}}
				>
					Reject All
				</button>
				<button
					id="react-v3-headless-open"
					onClick={() => {
						markInteraction(scenario, 'openPreferencesMs');
						setActiveUI('dialog');
					}}
				>
					Open Preferences
				</button>
			</div>
		</main>
	);
}

export default function ReactV3HeadlessPage() {
	return (
		<ConsentProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/bench-consent',
				consentCategories,
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
						if (state) {
							state.onConsentSetCount += 1;
						}
					},
					onError() {
						const state = getBenchState(scenario);
						if (state) {
							state.onErrorCount += 1;
						}
					},
				},
			}}
		>
			<HeadlessBenchmarkUI />
		</ConsentProvider>
	);
}
