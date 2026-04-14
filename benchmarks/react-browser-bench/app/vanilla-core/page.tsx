'use client';

import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { useEffect, useRef, useState } from 'react';
import { getBenchState } from '../_bench/state';

export default function VanillaCorePage() {
	const [activeUI, setActiveUI] = useState('none');
	const storeRef = useRef<ReturnType<typeof createConsentManagerStore> | null>(
		null
	);

	useEffect(() => {
		const manager = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/bench-consent',
		});
		const store = createConsentManagerStore(manager);
		storeRef.current = store;
		const state = getBenchState('vanilla-core');
		if (state) {
			state.mountCount += 1;
		}

		void store
			.getState()
			.initConsentManager()
			.then(() => {
				const current = store.getState();
				setActiveUI(current.activeUI);
				const bench = getBenchState('vanilla-core');
				if (bench) {
					bench.activeUI = current.activeUI;
					bench.bannerReadyMs = performance.now();
					bench.bannerVisibleMs = performance.now();
				}
			});
	}, []);

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Vanilla Core Benchmark</h1>
			<p data-testid="vanilla-core-state">Active UI: {activeUI}</p>
			<button
				id="vanilla-core-accept"
				onClick={async () => {
					const store = storeRef.current;
					if (!store) {
						return;
					}

					await store.getState().saveConsents('all');
					const current = store.getState();
					setActiveUI(current.activeUI);
					const bench = getBenchState('vanilla-core');
					if (bench) {
						bench.activeUI = current.activeUI;
						bench.onConsentSetCount += 1;
					}
				}}
				type="button"
			>
				Accept All
			</button>
		</main>
	);
}
