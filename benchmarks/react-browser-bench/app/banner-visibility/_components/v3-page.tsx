'use client';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import { useActiveUI } from '@c15t/react/v3/hooks';
import { ConsentProvider } from '@c15t/react/v3/provider';
import { useEffect, useRef } from 'react';
import { getBenchState, observeBannerVisibility } from './state';

const BENCHMARK_POLICY = {
	id: 'banner-visibility-benchmark',
	model: 'opt-in' as const,
	consent: {
		categories: ['necessary', 'measurement', 'marketing'],
		scopeMode: 'permissive' as const,
	},
	ui: {
		mode: 'banner' as const,
	},
};

function V3Probe() {
	const activeUI = useActiveUI();
	const renderRef = useRef(0);
	renderRef.current += 1;

	const state = getBenchState('v3');
	if (state) {
		state.renderCount = renderRef.current;
	}

	useEffect(() => {
		const current = getBenchState('v3');
		if (current && current.mountMs === undefined) {
			current.mountMs = performance.now();
		}
	}, []);

	useEffect(() => {
		return observeBannerVisibility('v3', activeUI ?? 'none');
	}, [activeUI]);

	return null;
}

export function V3BannerVisibilityPage() {
	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				offlinePolicy: {
					policy: BENCHMARK_POLICY,
				},
				persistence: false,
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
			<V3Probe />
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>v3 banner visibility benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
}
