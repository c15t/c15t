'use client';

import {
	ConsentBanner,
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react';
import { useEffect, useRef } from 'react';

import { getBenchState, observeBannerVisibility } from './state';

const BENCHMARK_POLICY = {
	consent: {
		categories: ['necessary', 'measurement', 'marketing'],
		scopeMode: 'permissive' as const,
	},
	id: 'banner-visibility-benchmark',
	model: 'opt-in' as const,
	ui: {
		mode: 'banner' as const,
	},
};

const V2Probe = () => {
	const { activeUI } = useConsentManager();
	const renderRef = useRef(0);

	useEffect(() => {
		renderRef.current += 1;
		const state = getBenchState('v2');
		if (state) {
			state.renderCount = renderRef.current;
		}
	});

	useEffect(() => {
		const current = getBenchState('v2');
		if (current && current.mountMs === undefined) {
			current.mountMs = performance.now();
		}
	}, []);

	useEffect(() => observeBannerVisibility('v2', activeUI), [activeUI]);

	return null;
};

export const V2BannerVisibilityPage = () => (
	<ConsentManagerProvider
		options={{
			callbacks: {
				onError(error) {
					const state = getBenchState('v2');
					if (!state) {
						return;
					}
					state.errorCount += 1;
					state.errors.push(String(error));
				},
			},
			mode: 'offline',
			offlinePolicy: {
				policy: BENCHMARK_POLICY,
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
		}}
	>
		<V2Probe />
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>v2 banner visibility benchmark</h1>
		</main>
		<ConsentBanner disableAnimation />
	</ConsentManagerProvider>
);
