'use client';

import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react/headless';
import { useEffect } from 'react';
import { getBenchState, markInteraction } from '../_bench/state';

function HeadlessBenchmarkUI() {
	const { activeUI, has, saveConsents, setActiveUI } = useConsentManager();

	useEffect(() => {
		const state = getBenchState('headless');
		if (!state) {
			return;
		}
		state.activeUI = activeUI;
		if (activeUI === 'banner' && state.bannerReadyMs === undefined) {
			state.bannerReadyMs = performance.now();
			state.bannerVisibleMs = performance.now();
		}
	}, [activeUI]);

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>React Headless Benchmark</h1>
			<p data-testid="headless-status">
				Measurement consent: {has('measurement') ? 'yes' : 'no'}
			</p>
			<div style={{ display: 'flex', gap: '1rem' }}>
				<button
					id="headless-accept"
					onClick={async () => {
						markInteraction('headless', 'acceptAllMs');
						await saveConsents('all');
					}}
				>
					Accept All
				</button>
				<button
					id="headless-reject"
					onClick={async () => {
						markInteraction('headless', 'rejectAllMs');
						await saveConsents('necessary');
					}}
				>
					Reject All
				</button>
				<button
					id="headless-open"
					onClick={() => {
						markInteraction('headless', 'openPreferencesMs');
						setActiveUI('dialog', { force: true });
					}}
				>
					Open Preferences
				</button>
			</div>
		</main>
	);
}

export default function HeadlessPage() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/bench-consent',
				callbacks: {
					onBannerFetched() {
						const state = getBenchState('headless');
						if (!state) {
							return;
						}
						state.onBannerFetchedCount += 1;
						if (state.onBannerFetchedMs === undefined) {
							state.onBannerFetchedMs = performance.now();
						}
					},
					onConsentSet() {
						const state = getBenchState('headless');
						if (state) {
							state.onConsentSetCount += 1;
						}
					},
					onError() {
						const state = getBenchState('headless');
						if (state) {
							state.onErrorCount += 1;
						}
					},
				},
			}}
		>
			<HeadlessBenchmarkUI />
		</ConsentManagerProvider>
	);
}
