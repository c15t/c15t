'use client';

import {
	ConsentProvider,
	hosted,
	useActiveUI,
	useConsent,
	useSaveConsents,
	useSetActiveUI,
} from '@c15t/react';
import type { ConsentProviderOptions } from '@c15t/react';
import { useEffect } from 'react';

import { getBenchState, markInteraction } from '../_bench/state';

const scenario = 'headless' as const;

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

const HeadlessBenchmarkUI = () => {
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
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Headless Benchmark</h1>
			<p data-testid="headless-status">
				Measurement consent: {hasMeasurement ? 'yes' : 'no'}
			</p>
			<div style={{ display: 'flex', gap: '1rem' }}>
				<button
					id="headless-accept"
					type="button"
					onClick={async () => {
						markInteraction(scenario, 'acceptAllMs');
						await saveConsents('all');
					}}
				>
					Accept All
				</button>
				<button
					id="headless-reject"
					type="button"
					onClick={async () => {
						markInteraction(scenario, 'rejectAllMs');
						await saveConsents('none');
					}}
				>
					Reject All
				</button>
				<button
					id="headless-open"
					type="button"
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
};

const HeadlessPage = () => (
	<ConsentProvider
		options={{
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
		}}
	>
		<HeadlessBenchmarkUI />
	</ConsentProvider>
);

export default HeadlessPage;
